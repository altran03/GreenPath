/**
 * Anomaly detection engine — cross-references FlexID, Fraud Finder, and
 * tri-bureau results against user-submitted form data.
 *
 * KEY DESIGN PRINCIPLE: Only flag MISMATCHING data (actual contradictions
 * between what the user entered and what CRS returned). Do NOT flag
 * MISSING data — if an identity doesn't exist in a vendor's sandbox or
 * a bureau returns no data, that simply means "not registered" and is
 * not an anomaly.
 */

export interface Anomaly {
  id: string;
  field: string;          // form field key (e.g. "phone", "email", "addressLine1")
  fieldLabel: string;     // human-readable label
  source: string;         // which CRS product flagged it
  severity: "warning" | "critical";
  message: string;
  userValue: string;      // what the user submitted
  suggestedValue?: string; // what CRS data suggests (if available)
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  hasAnomalies: boolean;
  hasCritical: boolean;
}

interface DetectionInput {
  formData: {
    firstName: string;
    lastName: string;
    ssn: string;
    birthDate: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    email: string;
  };
  flexIdResult: {
    verified: boolean;
    notRegistered?: boolean;
    riskScore?: number;
    summary: string;
    raw: Record<string, unknown>;
    verifiedElements?: Record<string, boolean>;
    nameAddressSSNSummary?: number;
  } | null;
  fraudResult: {
    riskLevel: "low" | "medium" | "high" | "unknown";
    signals: string[];
    summary: string;
    raw: Record<string, unknown>;
  } | null;
  bureauScores: Record<string, number | null>;
  /** Optional: raw tri-bureau reports for cross-bureau identity comparison */
  triBureau?: Record<string, Record<string, unknown> | null>;
}

export function detectAnomalies(input: DetectionInput): AnomalyReport {
  const anomalies: Anomaly[] = [];

  // ──── FlexID Anomalies ────
  // ONLY process if FlexID returned a real response (not "notRegistered")
  if (input.flexIdResult && !input.flexIdResult.notRegistered) {
    const flex = input.flexIdResult;
    const raw = flex.raw;

    // When FlexID overall verification passed (verified === true), do NOT flag per-field
    // "mismatches". The vendor has accepted the identity; sandbox may not populate
    // verifiedElementSummary for test personas, which would otherwise false-positive.
    const flexVerified = flex.verified === true;

    if (!flexVerified) {
      const result = (raw.result || raw) as Record<string, unknown>;
      const verifiedElements = (result.verifiedElementSummary || flex.verifiedElements || {}) as Record<string, boolean>;

      // Only flag field-level mismatches when identity was NOT verified overall
      if (verifiedElements.streetAddress === false || verifiedElements.address === false) {
        const suggestedAddress = (raw as Record<string, unknown>).suggestedAddress as string | undefined;
        anomalies.push({
          id: "flexid-address",
          field: "addressLine1",
          fieldLabel: "Address",
          source: "LexisNexis FlexID",
          severity: "warning",
          message: "Address does not match records associated with this identity.",
          userValue: input.formData.addressLine1,
          ...(suggestedAddress && { suggestedValue: suggestedAddress }),
        });
      }

      if (verifiedElements.homePhone === false || verifiedElements.phone === false) {
        anomalies.push({
          id: "flexid-phone",
          field: "phone",
          fieldLabel: "Phone Number",
          source: "LexisNexis FlexID",
          severity: "warning",
          message: "Phone number does not match records for this identity.",
          userValue: input.formData.phone,
        });
      }

      if (verifiedElements.ssn === false) {
        anomalies.push({
          id: "flexid-ssn",
          field: "ssn",
          fieldLabel: "SSN",
          source: "LexisNexis FlexID",
          severity: "critical",
          message: "SSN does not match records for this identity.",
          userValue: "••••" + input.formData.ssn.slice(-4),
        });
      }

      if (verifiedElements.dateOfBirth === false || verifiedElements.dob === false) {
        anomalies.push({
          id: "flexid-dob",
          field: "birthDate",
          fieldLabel: "Date of Birth",
          source: "LexisNexis FlexID",
          severity: "critical",
          message: "Date of birth does not match records for this identity.",
          userValue: input.formData.birthDate,
        });
      }
    }

    // Low CVI only when identity was not verified (don't flag when FlexID already said verified)
    const cvi = flex.riskScore;
    if (!flexVerified && cvi !== undefined && cvi > 0 && cvi < 20) {
      anomalies.push({
        id: "flexid-cvi-low",
        field: "ssn",
        fieldLabel: "Identity Confidence",
        source: "LexisNexis FlexID",
        severity: "critical",
        message: `Low verification confidence (CVI: ${cvi}). Multiple identity fields may not match.`,
        userValue: "••••" + input.formData.ssn.slice(-4),
      });
    }
  }

  // ──── Fraud Finder Anomalies ────
  // Process only if Fraud Finder returned actual data
  if (input.fraudResult && input.fraudResult.riskLevel !== "unknown") {
    const fraud = input.fraudResult;
    const raw = fraud.raw;

    // Parse real AtData Fraud Finder structure
    const riskData = (raw.risk || {}) as Record<string, unknown>;
    const postal = (riskData.postal || {}) as Record<string, unknown>;
    const emailVal = (raw.email_validation || {}) as Record<string, unknown>;

    // Email mismatch/invalid — only if explicitly flagged
    if (emailVal.status === "invalid") {
      anomalies.push({
        id: "fraud-email",
        field: "email",
        fieldLabel: "Email Address",
        source: "CRS Fraud Finder",
        severity: "critical",
        message: "Email address is invalid or does not exist.",
        userValue: input.formData.email,
      });
    }

    // Address undeliverable — actual mismatch with USPS data
    if (postal.deliverability === "undeliverable") {
      anomalies.push({
        id: "fraud-address-undeliverable",
        field: "addressLine1",
        fieldLabel: "Address",
        source: "CRS Fraud Finder",
        severity: "warning",
        message: "Address flagged as undeliverable by postal service.",
        userValue: `${input.formData.addressLine1}, ${input.formData.city}, ${input.formData.state}`,
      });
    }

    // Name mismatch at address — only flag explicit "mismatch", not "no_data"
    if (postal.first_name_match === "mismatch") {
      anomalies.push({
        id: "fraud-firstname-mismatch",
        field: "firstName",
        fieldLabel: "First Name",
        source: "CRS Fraud Finder",
        severity: "warning",
        message: "First name does not match postal records at this address.",
        userValue: input.formData.firstName,
      });
    }
    if (postal.last_name_match === "mismatch") {
      anomalies.push({
        id: "fraud-lastname-mismatch",
        field: "lastName",
        fieldLabel: "Last Name",
        source: "CRS Fraud Finder",
        severity: "warning",
        message: "Last name does not match postal records at this address.",
        userValue: input.formData.lastName,
      });
    }

    // Commercial address (CMRA) — user says they live here, but it's commercial
    if (postal.address_type === "Commercial") {
      anomalies.push({
        id: "fraud-address-commercial",
        field: "addressLine1",
        fieldLabel: "Address",
        source: "CRS Fraud Finder",
        severity: "warning",
        message: "Address identified as a commercial location, not a residential address.",
        userValue: `${input.formData.addressLine1}, ${input.formData.city}, ${input.formData.state}`,
      });
    }
  }

  // ──── Cross-Bureau Identity Comparison ────
  // Compare name/SSN/DOB across bureaus when raw reports are available
  if (input.triBureau) {
    const bureauIdentities = extractBureauIdentities(input.triBureau);
    const identityMismatches = compareBureauIdentities(bureauIdentities);
    for (const m of identityMismatches) {
      anomalies.push({
        id: m.id,
        field: m.field,
        fieldLabel: m.fieldLabel,
        source: "Cross-Bureau Identity",
        severity: m.severity,
        message: m.message,
        userValue: m.userValue,
        suggestedValue: m.suggestedValue,
      });
    }
  }

  // ──── Tri-Bureau Score Discrepancy Anomaly ────
  // Only compare scores from bureaus that actually returned data
  const scores = Object.entries(input.bureauScores)
    .filter(([, s]) => s != null && s > 0)
    .map(([bureau, score]) => ({ bureau, score: score! }));

  if (scores.length >= 2) {
    const max = Math.max(...scores.map((s) => s.score));
    const min = Math.min(...scores.map((s) => s.score));
    const spread = max - min;

    if (spread >= 80) {
      const lowest = scores.find((s) => s.score === min)!;
      const highest = scores.find((s) => s.score === max)!;
      anomalies.push({
        id: "bureau-spread-extreme",
        field: "ssn",
        fieldLabel: "Credit Identity",
        source: "Tri-Bureau Comparison",
        severity: "critical",
        message: `Extreme score discrepancy (${spread} pts) between ${capitalize(highest.bureau)} (${highest.score}) and ${capitalize(lowest.bureau)} (${lowest.score}). This may indicate a mixed credit file or data entry error.`,
        userValue: "••••" + input.formData.ssn.slice(-4),
      });
    } else if (spread >= 50) {
      const lowest = scores.find((s) => s.score === min)!;
      const highest = scores.find((s) => s.score === max)!;
      anomalies.push({
        id: "bureau-spread-large",
        field: "addressLine1",
        fieldLabel: "Address / Identity",
        source: "Tri-Bureau Comparison",
        severity: "warning",
        message: `Large score spread (${spread} pts) between ${capitalize(highest.bureau)} (${highest.score}) and ${capitalize(lowest.bureau)} (${lowest.score}). Verify your address and name are consistent across all accounts.`,
        userValue: input.formData.addressLine1,
      });
    }
  }

  // Deduplicate by field — keep the highest severity per field
  const deduped = deduplicateAnomalies(anomalies);

  return {
    anomalies: deduped,
    hasAnomalies: deduped.length > 0,
    hasCritical: deduped.some((a) => a.severity === "critical"),
  };
}

function deduplicateAnomalies(anomalies: Anomaly[]): Anomaly[] {
  const byField = new Map<string, Anomaly>();

  for (const a of anomalies) {
    const existing = byField.get(a.field);
    if (!existing) {
      byField.set(a.field, a);
    } else if (a.severity === "critical" && existing.severity !== "critical") {
      byField.set(a.field, a);
    }
    // Otherwise keep existing (first occurrence)
  }

  return Array.from(byField.values());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ──── Cross-bureau identity extraction and comparison ────

type BureauKey = "experian" | "transunion" | "equifax";

interface BureauIdentity {
  bureau: BureauKey;
  firstName: string;
  lastName: string;
  ssnLast4: string;
  dateOfBirth: string;
}

function getStr(obj: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

/** Extract consumer identity from a single bureau report (CRS Standard Format). */
function extractIdentityFromReport(report: Record<string, unknown> | null): Partial<BureauIdentity> | null {
  if (!report) return null;
  const tryBlock = (block: Record<string, unknown> | undefined): Partial<BureauIdentity> | null => {
    if (!block) return null;
    const firstName = getStr(block, "firstName", "FirstName", "first_name", "givenName");
    const lastName = getStr(block, "lastName", "LastName", "last_name", "surname", "familyName");
    const ssn = getStr(block, "ssn", "SSN", "socialSecurityNumber", "socialSecurityNumberValue");
    const ssnLast4 = ssn.replace(/\D/g, "").slice(-4);
    const dateOfBirth = getStr(block, "dateOfBirth", "birthDate", "dateofBirth", "dob", "DateOfBirth");
    if (!firstName && !lastName && !ssnLast4 && !dateOfBirth) return null;
    return { firstName, lastName, ssnLast4, dateOfBirth };
  };

  const consumer = (report.consumer ?? report.Consumer ?? report.person ?? report.subject) as Record<string, unknown> | undefined;
  let out = tryBlock(consumer ?? undefined);
  if (out) return out;

  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    const cf = creditFiles[0];
    const primary = (cf.consumer ?? cf.primaryApplicant ?? cf.PrimaryApplicant ?? cf.person) as Record<string, unknown> | undefined;
    out = tryBlock(primary ?? undefined);
    if (out) return out;
  }
  return null;
}

function extractBureauIdentities(triBureau: Record<string, Record<string, unknown> | null>): Map<BureauKey, BureauIdentity> {
  const map = new Map<BureauKey, BureauIdentity>();
  const bureaus: BureauKey[] = ["experian", "transunion", "equifax"];
  for (const bureau of bureaus) {
    const report = triBureau[bureau];
    const partial = extractIdentityFromReport(report ?? null);
    if (partial && (partial.firstName || partial.lastName || partial.ssnLast4 || partial.dateOfBirth)) {
      map.set(bureau, {
        bureau,
        firstName: partial.firstName ?? "",
        lastName: partial.lastName ?? "",
        ssnLast4: partial.ssnLast4 ?? "",
        dateOfBirth: partial.dateOfBirth ?? "",
      });
    }
  }
  return map;
}

function normalizeForCompare(s: string): string {
  return s.toUpperCase().replace(/\s+/g, " ").trim();
}

interface IdentityMismatch {
  id: string;
  field: string;
  fieldLabel: string;
  severity: "warning" | "critical";
  message: string;
  userValue: string;
  suggestedValue?: string;
}

function compareBureauIdentities(bureauIdentities: Map<BureauKey, BureauIdentity>): IdentityMismatch[] {
  const mismatches: IdentityMismatch[] = [];
  const entries = Array.from(bureauIdentities.entries());
  if (entries.length < 2) return mismatches;

  const allFirst = new Set(entries.map(([, id]) => normalizeForCompare(id.firstName)).filter(Boolean));
  const allLast = new Set(entries.map(([, id]) => normalizeForCompare(id.lastName)).filter(Boolean));
  const allSsn = new Set(entries.map(([, id]) => id.ssnLast4).filter((s) => s.length >= 4));
  const allDob = new Set(entries.map(([, id]) => id.dateOfBirth).filter(Boolean));

  if (allFirst.size > 1) {
    const bureaus = entries.map(([b, id]) => `${capitalize(b)}: ${id.firstName || "(empty)"}`).join("; ");
    mismatches.push({
      id: "cross-bureau-firstname",
      field: "firstName",
      fieldLabel: "First name",
      severity: "warning",
      message: `First name differs across bureaus — ${bureaus}. This can indicate a mixed file or reporting error.`,
      userValue: entries[0][1].firstName || "(varies)",
      suggestedValue: entries.find(([, id]) => id.firstName)?.[1].firstName,
    });
  }
  if (allLast.size > 1) {
    const bureaus = entries.map(([b, id]) => `${capitalize(b)}: ${id.lastName || "(empty)"}`).join("; ");
    mismatches.push({
      id: "cross-bureau-lastname",
      field: "lastName",
      fieldLabel: "Last name",
      severity: "warning",
      message: `Last name differs across bureaus — ${bureaus}. This can indicate a mixed file or reporting error.`,
      userValue: entries[0][1].lastName || "(varies)",
      suggestedValue: entries.find(([, id]) => id.lastName)?.[1].lastName,
    });
  }
  if (allSsn.size > 1) {
    const bureaus = entries.map(([b, id]) => `${capitalize(b)}: ••••${id.ssnLast4}`).join("; ");
    mismatches.push({
      id: "cross-bureau-ssn",
      field: "ssn",
      fieldLabel: "SSN",
      severity: "critical",
      message: `SSN (last 4) differs across bureaus — ${bureaus}. This may indicate a mixed credit file.`,
      userValue: "••••" + (entries[0][1].ssnLast4 || "????"),
    });
  }
  if (allDob.size > 1) {
    const bureaus = entries.map(([b, id]) => `${capitalize(b)}: ${id.dateOfBirth || "(empty)"}`).join("; ");
    mismatches.push({
      id: "cross-bureau-dob",
      field: "birthDate",
      fieldLabel: "Date of birth",
      severity: "warning",
      message: `Date of birth differs across bureaus — ${bureaus}. This can indicate a mixed file or reporting error.`,
      userValue: entries[0][1].dateOfBirth || "(varies)",
      suggestedValue: entries.find(([, id]) => id.dateOfBirth)?.[1].dateOfBirth,
    });
  }
  return mismatches;
}
