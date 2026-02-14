export interface GreenReadiness {
  tier: "A" | "B" | "C" | "D";
  score: number;
  creditScore: number;
  utilization: number;
  totalDebt: number;
  totalCreditLimit: number;
  derogatoryCount: number;
  tradelineCount: number;
  factors: {
    label: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
}

export interface CreditData {
  creditScore: number;
  utilization: number;
  totalDebt: number;
  totalCreditLimit: number;
  derogatoryCount: number;
  tradelineCount: number;
}

export function calculateGreenReadiness(creditData: CreditData): GreenReadiness {
  const {
    creditScore,
    utilization,
    totalDebt,
    totalCreditLimit,
    derogatoryCount,
    tradelineCount,
  } = creditData;

  const factors: GreenReadiness["factors"] = [];

  // Credit score contributes 50%
  let creditScorePoints = 0;
  if (creditScore >= 800) {
    creditScorePoints = 50;
    factors.push({
      label: "Credit Score",
      impact: "positive",
      description: `Your credit score of ${creditScore} is in the 'Excellent' range — you qualify for the best green financing rates.`,
    });
  } else if (creditScore >= 740) {
    creditScorePoints = 42;
    factors.push({
      label: "Credit Score",
      impact: "positive",
      description: `Your credit score of ${creditScore} is in the 'Very Good' range — you qualify for most green financing options.`,
    });
  } else if (creditScore >= 670) {
    creditScorePoints = 30;
    factors.push({
      label: "Credit Score",
      impact: "neutral",
      description: `Your credit score of ${creditScore} is in the 'Good' range — many green financing options are available to you.`,
    });
  } else if (creditScore >= 580) {
    creditScorePoints = 18;
    factors.push({
      label: "Credit Score",
      impact: "negative",
      description: `Your credit score of ${creditScore} is in the 'Fair' range — some green financing options may have higher rates.`,
    });
  } else {
    creditScorePoints = 8;
    factors.push({
      label: "Credit Score",
      impact: "negative",
      description: `Your credit score of ${creditScore} is below average — focus on free/low-cost green actions while building credit.`,
    });
  }

  // Credit utilization contributes 25%
  let utilizationPoints = 0;
  const utilizationPct = utilization * 100;
  if (utilizationPct < 10) {
    utilizationPoints = 25;
    factors.push({
      label: "Credit Utilization",
      impact: "positive",
      description: `Excellent utilization at ${utilizationPct.toFixed(0)}% — well below the recommended 30% threshold.`,
    });
  } else if (utilizationPct < 30) {
    utilizationPoints = 20;
    factors.push({
      label: "Credit Utilization",
      impact: "positive",
      description: `Good utilization at ${utilizationPct.toFixed(0)}% — within the healthy range.`,
    });
  } else if (utilizationPct < 50) {
    utilizationPoints = 12;
    factors.push({
      label: "Credit Utilization",
      impact: "negative",
      description: `Credit utilization at ${utilizationPct.toFixed(0)}% is higher than ideal — paying down balances could unlock better rates.`,
    });
  } else if (utilizationPct < 75) {
    utilizationPoints = 6;
    factors.push({
      label: "Credit Utilization",
      impact: "negative",
      description: `High utilization at ${utilizationPct.toFixed(0)}% — reducing this should be a priority for better financing options.`,
    });
  } else {
    utilizationPoints = 2;
    factors.push({
      label: "Credit Utilization",
      impact: "negative",
      description: `Very high utilization at ${utilizationPct.toFixed(0)}% — this significantly limits green financing options.`,
    });
  }

  // Derogatory items contributes 15%
  let derogatoryPoints = 0;
  if (derogatoryCount === 0) {
    derogatoryPoints = 15;
    factors.push({
      label: "Derogatory Marks",
      impact: "positive",
      description: "No derogatory marks on your report — great for loan approvals.",
    });
  } else if (derogatoryCount === 1) {
    derogatoryPoints = 10;
    factors.push({
      label: "Derogatory Marks",
      impact: "negative",
      description: `${derogatoryCount} derogatory mark found — this may affect some financing applications.`,
    });
  } else if (derogatoryCount <= 3) {
    derogatoryPoints = 5;
    factors.push({
      label: "Derogatory Marks",
      impact: "negative",
      description: `${derogatoryCount} derogatory marks found — working to resolve these will improve your options.`,
    });
  } else {
    derogatoryPoints = 0;
    factors.push({
      label: "Derogatory Marks",
      impact: "negative",
      description: `${derogatoryCount} derogatory marks found — resolving these is critical for accessing green financing.`,
    });
  }

  // Account diversity contributes 10%
  let diversityPoints = 0;
  if (tradelineCount >= 5) {
    diversityPoints = 10;
    factors.push({
      label: "Account Diversity",
      impact: "positive",
      description: `${tradelineCount} accounts show a well-established credit history.`,
    });
  } else if (tradelineCount >= 3) {
    diversityPoints = 7;
    factors.push({
      label: "Account Diversity",
      impact: "neutral",
      description: `${tradelineCount} accounts — a decent credit history foundation.`,
    });
  } else if (tradelineCount >= 1) {
    diversityPoints = 4;
    factors.push({
      label: "Account Diversity",
      impact: "negative",
      description: `Only ${tradelineCount} account(s) — building more credit history will help.`,
    });
  } else {
    diversityPoints = 0;
    factors.push({
      label: "Account Diversity",
      impact: "negative",
      description: "No accounts found — establishing credit history is the first step.",
    });
  }

  const score = creditScorePoints + utilizationPoints + derogatoryPoints + diversityPoints;

  let tier: GreenReadiness["tier"];
  if (score >= 80) tier = "A";
  else if (score >= 60) tier = "B";
  else if (score >= 40) tier = "C";
  else tier = "D";

  return {
    tier,
    score,
    creditScore,
    utilization,
    totalDebt,
    totalCreditLimit,
    derogatoryCount,
    tradelineCount,
    factors,
  };
}

function getNum(obj: Record<string, unknown> | undefined, ...keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) {
      const n = parseFloat(String(v));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getTradeSummary(report: Record<string, unknown>): Record<string, unknown> | null {
  const getFromSummaries = (s: Record<string, unknown> | undefined) =>
    (s?.tradeSummary ?? s?.TradeSummary) as Record<string, unknown> | undefined;

  let summaries = report.summaries as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  if (Array.isArray(summaries) && summaries.length > 0) summaries = summaries[0] as Record<string, unknown>;
  let tradeSummary = summaries && typeof summaries === "object" ? getFromSummaries(summaries as Record<string, unknown>) : undefined;
  if (tradeSummary) return tradeSummary;

  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    let cfSummaries = creditFiles[0].summaries as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    if (Array.isArray(cfSummaries) && cfSummaries.length > 0) cfSummaries = cfSummaries[0] as Record<string, unknown>;
    tradeSummary = cfSummaries && typeof cfSummaries === "object" ? getFromSummaries(cfSummaries as Record<string, unknown>) : undefined;
    if (tradeSummary) return tradeSummary;
  }
  return null;
}

/**
 * Utilization & debt from CRS tradeSummary (works for any person).
 * Reference: natalie_experian.json, natalie_transunion.json, natalie_equifax.json
 *
 * Path: report.summaries.tradeSummary (or creditFiles[0].summaries.tradeSummary)
 *
 * Total debt:     tradeSummary.balanceTotal (string, e.g. "208336")
 * Utilization:    tradeSummary.revolvingCreditUtilization (0–100, e.g. "0" or "3")
 * Revolving bal:  tradeSummary.revolvingBalanceTotal
 * Revolving limit: tradeSummary.applicableRevolvingHighCreditTotal (prefer) | revolvingHighCreditTotal
 *
 * Key variants for all bureaus: camelCase above; also BalanceTotal, RevolvingBalanceTotal, etc.
 * Tradeline: currentBalanceAmount, creditLimitAmount, highBalanceAmount (Equifax); accountType "Revolving"
 */
function getRevolvingFromReport(report: Record<string, unknown>): {
  utilization: number;
  revolvingBalanceTotal: number;
  revolvingLimitTotal: number;
} {
  const tradeSummary = getTradeSummary(report);
  if (!tradeSummary) return { utilization: 0, revolvingBalanceTotal: 0, revolvingLimitTotal: 0 };

  const balance = getNum(tradeSummary, "revolvingBalanceTotal", "RevolvingBalanceTotal", "revolving_balance_total");
  const applicableLimit = getNum(
    tradeSummary,
    "applicableRevolvingHighCreditTotal",
    "ApplicableRevolvingHighCreditTotal",
    "applicable_revolving_high_credit_total"
  );
  const limit =
    applicableLimit > 0
      ? applicableLimit
      : getNum(tradeSummary, "revolvingHighCreditTotal", "RevolvingHighCreditTotal", "revolving_high_credit_total");

  let utilization = 0;
  const rawUtil =
    tradeSummary.revolvingCreditUtilization ??
    tradeSummary.RevolvingCreditUtilization ??
    tradeSummary.revolving_credit_utilization;
  if (rawUtil !== undefined && rawUtil !== null) {
    const s = String(rawUtil).trim();
    if (s.startsWith(">")) {
      utilization = limit > 0 ? balance / limit : 1;
    } else {
      const n = parseFloat(s);
      if (!Number.isNaN(n)) utilization = n / 100;
    }
  } else if (limit > 0) {
    utilization = balance / limit;
  }

  return { utilization: Math.min(utilization, 2), revolvingBalanceTotal: balance, revolvingLimitTotal: limit };
}

function getTradelineBalance(tl: Record<string, unknown>): number {
  return getNum(
    tl as Record<string, unknown>,
    "currentBalanceAmount",
    "currentBalance",
    "balanceAmount",
    "balance",
    "CurrentBalanceAmount",
    "BalanceAmount"
  );
}

function getTradelineLimit(tl: Record<string, unknown>): number {
  return getNum(
    tl as Record<string, unknown>,
    "creditLimitAmount",
    "creditLimit",
    "highCreditAmount",
    "highCredit",
    "highBalanceAmount",
    "CreditLimitAmount",
    "HighCreditAmount",
    "HighBalanceAmount"
  );
}

function isRevolvingTradeline(tl: Record<string, unknown>): boolean {
  const accountType = String(tl.accountType ?? tl.type ?? "").toLowerCase();
  return (
    accountType.includes("revolv") ||
    accountType.includes("credit") ||
    accountType === "revolving" ||
    accountType === "credit card"
  );
}

// Extract credit data from a CRS standard format response (aligns with bureau cards and Postman/CRS JSON)
export function extractCreditData(crsResponse: Record<string, unknown>): CreditData {
  let creditScore = 0;
  let totalDebt = 0;
  let totalCreditLimit = 0;
  let tradelineCount = 0;
  let derogatoryCount = 0;

  // Extract score (support scoreValue, value)
  const scores = crsResponse.scores as Array<Record<string, unknown>> | undefined;
  if (scores && scores.length > 0) {
    creditScore = parseInt(String(scores[0].scoreValue ?? scores[0].value ?? "0"), 10);
  }

  const tradeSummary = getTradeSummary(crsResponse);
  const fromSummary = getRevolvingFromReport(crsResponse);

  // Total Debt = all debt (CRS tradeSummary.balanceTotal or sum of all tradelines)
  totalDebt = getNum(
    tradeSummary ?? undefined,
    "balanceTotal",
    "BalanceTotal",
    "balance_total"
  );

  // Extract tradelines (top-level or under creditFiles[0] per CRS)
  const rawTradelines = crsResponse.tradelines as Array<Record<string, unknown>> | undefined;
  const tradelines = Array.isArray(rawTradelines)
    ? rawTradelines
    : ((crsResponse.creditFiles as Array<Record<string, unknown>>)?.[0]?.tradelines as Array<Record<string, unknown>> | undefined) ?? [];

  if (tradelines.length > 0) {
    tradelineCount = tradelines.length;
    if (totalDebt === 0) {
      for (const tl of tradelines) {
        totalDebt += getTradelineBalance(tl);
      }
    }
    // Revolving limit: from summary first, else sum revolving tradelines
    totalCreditLimit = fromSummary.revolvingLimitTotal;
    if (totalCreditLimit === 0) {
      for (const tl of tradelines) {
        if (isRevolvingTradeline(tl)) totalCreditLimit += getTradelineLimit(tl);
      }
    }
  }

  // Utilization = revolving only (summary or revolving balance/limit from tradelines)
  let utilization = fromSummary.utilization;
  if (utilization <= 0 && totalCreditLimit > 0) {
    const revBalance = fromSummary.revolvingBalanceTotal > 0
      ? fromSummary.revolvingBalanceTotal
      : tradelines.reduce((sum, tl) => sum + (isRevolvingTradeline(tl) ? getTradelineBalance(tl) : 0), 0);
    utilization = Math.min(revBalance / totalCreditLimit, 2);
  }

  // Derogatory: summaries.derogatorySummary (top-level or under creditFiles[0].summaries)
  let summariesObj = crsResponse.summaries as Record<string, unknown> | undefined;
  if (!summariesObj) {
    const cfSummaries = (crsResponse.creditFiles as Array<Record<string, unknown>>)?.[0]?.summaries;
    summariesObj = Array.isArray(cfSummaries) ? (cfSummaries[0] as Record<string, unknown>) : (cfSummaries as Record<string, unknown>);
  }
  const derogSummary = summariesObj?.derogatorySummary as Record<string, unknown> | undefined;
  if (derogSummary) {
    derogatoryCount = parseInt(
      String(derogSummary.collectionsCount ?? derogSummary.CollectionsCount ?? "0"),
      10
    );
  }

  return {
    creditScore,
    utilization: Math.min(utilization, 2),
    totalDebt,
    totalCreditLimit,
    derogatoryCount,
    tradelineCount,
  };
}
