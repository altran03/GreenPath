/**
 * Realistic demo persona for sponsor/hackathon demo flow.
 * Different scores per bureau, actual tradeline data, and realistic balance variations
 * to demonstrate deep CRS API integration. Detected via SSN + name; returns mocks
 * instead of calling CRS sandbox.
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

// ── Per-bureau tradeline data ──
// Balances differ slightly across bureaus (different reporting dates).
// Student loan late payment appears on Equifax & TransUnion but NOT Experian
// (explains the 30-point score spread: EXP 695 > TU 680 > EQF 665).

interface BureauConfig {
  score: number;
  chaseBalance: number;
  citiBalance: number;
  toyotaBalance: number;
  navientBalance: number;
  navientLate: boolean; // whether the 30-day late shows on this bureau
}

const BUREAU_CONFIGS: Record<string, BureauConfig> = {
  experian: {
    score: 695,
    chaseBalance: 6800,
    citiBalance: 1200,
    toyotaBalance: 14500,
    navientBalance: 22000,
    navientLate: false, // late payment NOT reported to Experian
  },
  transunion: {
    score: 680,
    chaseBalance: 6950,
    citiBalance: 1100,
    toyotaBalance: 14300,
    navientBalance: 22200,
    navientLate: true, // late payment reported
  },
  equifax: {
    score: 665,
    chaseBalance: 7100,
    citiBalance: 1350,
    toyotaBalance: 14200,
    navientBalance: 21800,
    navientLate: true, // late payment reported + weighs more at EQF
  },
};

function buildTradelines(cfg: BureauConfig): Record<string, unknown>[] {
  return [
    {
      subscriberName: "CHASE BANK USA",
      accountType: "Revolving",
      currentBalanceAmount: cfg.chaseBalance,
      creditLimitAmount: 8000,
      highCreditAmount: 8000,
      monthlyPaymentAmount: 210,
      dateOpened: "2019-03-15",
      accountStatus: "Open",
      paymentPattern: "CCCCCCCCCCCC",
      currentMop: "C",
      accountDesignator: "Individual",
      times30DaysLate: 0,
      times60DaysLate: 0,
      times90DaysLate: 0,
    },
    {
      subscriberName: "CITIBANK NA",
      accountType: "Revolving",
      currentBalanceAmount: cfg.citiBalance,
      creditLimitAmount: 12000,
      highCreditAmount: 12000,
      monthlyPaymentAmount: 35,
      dateOpened: "2017-06-01",
      accountStatus: "Open",
      paymentPattern: "CCCCCCCCCCCC",
      currentMop: "C",
      accountDesignator: "Individual",
      times30DaysLate: 0,
      times60DaysLate: 0,
      times90DaysLate: 0,
    },
    {
      subscriberName: "TOYOTA MOTOR CREDIT",
      accountType: "Installment",
      currentBalanceAmount: cfg.toyotaBalance,
      creditLimitAmount: 0,
      highCreditAmount: 28000,
      monthlyPaymentAmount: 485,
      dateOpened: "2022-01-10",
      accountStatus: "Open",
      paymentPattern: "CCCCCCCCCCCC",
      currentMop: "C",
      accountDesignator: "Individual",
      times30DaysLate: 0,
      times60DaysLate: 0,
      times90DaysLate: 0,
    },
    {
      subscriberName: "NAVIENT SOLUTIONS",
      accountType: "Installment",
      currentBalanceAmount: cfg.navientBalance,
      creditLimitAmount: 0,
      highCreditAmount: 35000,
      monthlyPaymentAmount: 250,
      dateOpened: "2016-08-15",
      accountStatus: "Open",
      paymentPattern: cfg.navientLate ? "CCCCCC1CCCCC" : "CCCCCCCCCCCC",
      currentMop: "C",
      accountDesignator: "Individual",
      times30DaysLate: cfg.navientLate ? 1 : 0,
      times60DaysLate: 0,
      times90DaysLate: 0,
    },
  ];
}

function getDemoCreditReportRaw(bureau: "experian" | "transunion" | "equifax"): Record<string, unknown> {
  const cfg = BUREAU_CONFIGS[bureau];
  const tradelines = buildTradelines(cfg);

  // Compute summaries from tradelines (not hardcoded)
  const revolvingBalance = cfg.chaseBalance + cfg.citiBalance;
  const revolvingLimit = 8000 + 12000; // Chase + Citi limits
  const totalBalance = cfg.chaseBalance + cfg.citiBalance + cfg.toyotaBalance + cfg.navientBalance;

  return {
    requestData: {
      firstName: DEMO_FIRST,
      lastName: DEMO_LAST,
      ssn: DEMO_SSN,
      birthDate: "1985-06-15",
      addresses: [{ addressLine1: "123 VERIFIED ST", city: "OAKLAND", state: "CA", postalCode: "94601" }],
    },
    scores: [{ scoreValue: cfg.score, value: cfg.score }],
    creditFiles: [
      {
        summaries: {
          tradeSummary: {
            balanceTotal: totalBalance,
            BalanceTotal: totalBalance,
            revolvingBalanceTotal: revolvingBalance,
            RevolvingBalanceTotal: revolvingBalance,
            revolvingHighCreditTotal: revolvingLimit,
            applicableRevolvingHighCreditTotal: revolvingLimit,
          },
          revolvingSummary: {
            utilization: revolvingBalance / revolvingLimit,
            revolvingBalanceTotal: revolvingBalance,
            revolvingLimitTotal: revolvingLimit,
          },
          derogatorySummary: {
            collectionsCount: 0,
            CollectionsCount: 0,
          },
        },
        tradelines,
      },
    ],
    tradelines,
  };
}

/** Tri-bureau: different scores and balance variations per bureau. */
export function getDemoTriBureau(): Record<string, Record<string, unknown> | null> {
  return {
    experian: getDemoCreditReportRaw("experian"),
    transunion: getDemoCreditReportRaw("transunion"),
    equifax: getDemoCreditReportRaw("equifax"),
  };
}

/** Credit report API response shape (primary + _triBureau). */
export function getDemoCreditReportResponse(): Record<string, unknown> {
  const report = getDemoCreditReportRaw("experian"); // Experian as primary
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
