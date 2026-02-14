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

// Extract credit data from a CRS standard format response
export function extractCreditData(crsResponse: Record<string, unknown>): CreditData {
  let creditScore = 0;
  let totalDebt = 0;
  let totalCreditLimit = 0;
  let tradelineCount = 0;
  let derogatoryCount = 0;

  // Extract score
  const scores = crsResponse.scores as Array<Record<string, unknown>> | undefined;
  if (scores && scores.length > 0) {
    creditScore = parseInt(String(scores[0].scoreValue || "0"), 10);
  }

  // Extract tradelines
  const tradelines = crsResponse.tradelines as Array<Record<string, unknown>> | undefined;
  if (tradelines) {
    tradelineCount = tradelines.length;
    for (const tl of tradelines) {
      const balance = parseFloat(String(tl.currentBalanceAmount || "0"));
      totalDebt += balance;
      const accountType = String(tl.accountType || "").toLowerCase();
      if (accountType.includes("revolv") || accountType.includes("credit")) {
        const limit = parseFloat(String(tl.creditLimitAmount || "0"));
        totalCreditLimit += limit;
      }
    }
  }

  // Extract derogatory count
  const summaries = crsResponse.summaries as Record<string, unknown> | undefined;
  if (summaries) {
    const derogSummary = summaries.derogatorySummary as Record<string, unknown> | undefined;
    if (derogSummary) {
      derogatoryCount = parseInt(String(derogSummary.collectionsCount || "0"), 10);
    }
  }

  const utilization = totalCreditLimit > 0 ? totalDebt / totalCreditLimit : 0;

  return {
    creditScore,
    utilization: Math.min(utilization, 1),
    totalDebt,
    totalCreditLimit,
    derogatoryCount,
    tradelineCount,
  };
}
