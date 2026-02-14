/**
 * Hardcoded demo persona for sponsor flow: anomaly detected → user corrects → correct data.
 * Used when CRS sandbox does not behave as intended. Detect via SSN + name; skip real API
 * on first run (assess) and return mocks; on resubmit (results) APIs return "corrected" mocks.
 */

const DEMO_SSN = "111111111";
const DEMO_FIRST = "ALEX";
const DEMO_LAST = "DEMO";

export function isDemoPersona(form: { firstName?: string; lastName?: string; ssn?: string }): boolean {
  const ssn = String(form.ssn ?? "").replace(/\D/g, "");
  const first = String(form.firstName ?? "").toUpperCase().trim();
  const last = String(form.lastName ?? "").toUpperCase().trim();
  return ssn === DEMO_SSN && first === DEMO_FIRST && last === DEMO_LAST;
}

/** Single mock credit report (same for both "anomaly" and "corrected" runs). */
function getDemoCreditReportRaw(): Record<string, unknown> {
  return {
    requestData: {
      firstName: DEMO_FIRST,
      lastName: DEMO_LAST,
      ssn: DEMO_SSN,
      birthDate: "1985-06-15",
      addresses: [{ addressLine1: "123 VERIFIED ST", city: "OAKLAND", state: "CA", postalCode: "94601" }],
    },
    scores: [{ scoreValue: 680, value: 680 }],
    creditFiles: [
      {
        summaries: {
          tradeSummary: {
            balanceTotal: 5000,
            BalanceTotal: 5000,
            revolvingBalanceTotal: 4000,
            revolvingHighCreditTotal: 20000,
          },
          revolvingSummary: {
            utilization: 0.2,
            revolvingBalanceTotal: 4000,
            revolvingLimitTotal: 20000,
          },
        },
        derogatorySummary: { collectionsCount: 0, CollectionsCount: 0 },
        tradelines: [],
      },
    ],
    tradelines: [],
  };
}

/** Mock tri-bureau: all three return same report so no score spread anomaly. */
export function getDemoTriBureau(): Record<string, Record<string, unknown> | null> {
  const report = getDemoCreditReportRaw();
  return {
    experian: { ...report },
    transunion: { ...report },
    equifax: { ...report },
  };
}

/** Credit report API response shape (primary + _triBureau). */
export function getDemoCreditReportResponse(): Record<string, unknown> {
  const report = getDemoCreditReportRaw();
  return {
    ...report,
    _triBureau: getDemoTriBureau(),
  };
}

/** FlexID mock: first run (anomaly) — address does not match. */
export function getDemoFlexIdAnomaly(): {
  verified: boolean;
  summary: string;
  raw: Record<string, unknown>;
} {
  return {
    verified: false,
    summary: "Could not be fully verified",
    raw: {
      result: {
        verifiedElementSummary: {
          streetAddress: false,
          address: false,
          dateOfBirth: true,
          ssn: true,
          homePhone: true,
        },
      },
      suggestedAddress: "123 VERIFIED ST",
    },
  };
}

/** FlexID mock: resubmit (corrected) — all verified. */
export function getDemoFlexIdCorrected(): {
  verified: boolean;
  summary: string;
  raw: Record<string, unknown>;
} {
  return {
    verified: true,
    summary: "Identity verified via LexisNexis FlexID",
    raw: {
      result: {
        verifiedElementSummary: {
          streetAddress: true,
          address: true,
          dateOfBirth: true,
          ssn: true,
          homePhone: true,
        },
      },
    },
  };
}

/** Fraud Finder mock: low risk (same for both runs). */
export function getDemoFraudResult(): {
  riskLevel: "low" | "medium" | "high" | "unknown";
  signals: string[];
  summary: string;
  raw: Record<string, unknown>;
} {
  return {
    riskLevel: "low",
    signals: [],
    summary: "Low fraud risk",
    raw: { risk: { level: "low" } },
  };
}
