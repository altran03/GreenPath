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
}

export function detectAnomalies(input: DetectionInput): AnomalyReport {
  const anomalies: Anomaly[] = [];

  // ──── FlexID Anomalies ────
  // ONLY process if FlexID returned a real response (not "notRegistered")
  if (input.flexIdResult && !input.flexIdResult.notRegistered) {
    const flex = input.flexIdResult;
    const raw = flex.raw;

    // Parse the real FlexID structure: data.result.verifiedElementSummary
    const result = (raw.result || raw) as Record<string, unknown>;
    const verifiedElements = (result.verifiedElementSummary || flex.verifiedElements || {}) as Record<string, boolean>;

    // Only flag specific field-level mismatches (where FlexID explicitly says FALSE)
    // Address mismatch — FlexID says the address doesn't match their records
    if (verifiedElements.streetAddress === false || verifiedElements.address === false) {
      anomalies.push({
        id: "flexid-address",
        field: "addressLine1",
        fieldLabel: "Address",
        source: "LexisNexis FlexID",
        severity: "warning",
        message: "Address does not match records associated with this identity.",
        userValue: input.formData.addressLine1,
      });
    }

    // Phone mismatch
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

    // SSN mismatch
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

    // Date of birth mismatch
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

    // Low CVI score ONLY if we actually got a score (not 0/undefined = no data)
    const cvi = flex.riskScore;
    if (cvi !== undefined && cvi > 0 && cvi < 20) {
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
