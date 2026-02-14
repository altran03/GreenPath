"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BureauComparisonProps {
  bureauScores: Record<string, number | null>;
  triBureau: Record<string, Record<string, unknown> | null>;
}

const BUREAU_LABELS: Record<string, { name: string; color: string; bgColor: string }> = {
  experian: { name: "Experian", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  transunion: { name: "TransUnion", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  equifax: { name: "Equifax", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
};

// CRS Standard Format may use different field names per bureau; try all common variants
function getTradelineBalance(tl: Record<string, unknown>): number {
  const raw =
    tl.currentBalanceAmount ??
    tl.currentBalance ??
    tl.balanceAmount ??
    tl.balance ??
    "0";
  return parseFloat(String(raw));
}

function getTradelineLimit(tl: Record<string, unknown>): number {
  const raw =
    tl.creditLimitAmount ??
    tl.creditLimit ??
    tl.highCreditAmount ??
    tl.highCredit ??
    tl.highBalanceAmount ??
    tl.limitAmount ??
    "0";
  return parseFloat(String(raw));
}

function getTradelines(report: Record<string, unknown>): Array<Record<string, unknown>> {
  const top = report.tradelines as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(top) && top.length > 0) return top;
  const creditFiles = report.creditFiles as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    const fromFile = (creditFiles[0].tradelines ?? creditFiles[0].trades) as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(fromFile)) return fromFile;
  }
  return [];
}

// Try multiple key variants (bureaus may use camelCase, PascalCase, or snake_case)
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

/** Find tradeSummary from report (top-level summaries or under creditFiles[0].summaries) */
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
 * Utilization from CRS tradeSummary (see natalie_*.json): revolvingCreditUtilization (0–100),
 * revolvingBalanceTotal, applicableRevolvingHighCreditTotal | revolvingHighCreditTotal.
 */
function getUtilizationFromReport(report: Record<string, unknown>): {
  utilizationPct: number | null;
  revolvingBalanceTotal: number;
  revolvingLimitTotal: number;
} {
  const tradeSummary = getTradeSummary(report);
  if (!tradeSummary) return { utilizationPct: null, revolvingBalanceTotal: 0, revolvingLimitTotal: 0 };

  const balance = getNum(
    tradeSummary,
    "revolvingBalanceTotal",
    "RevolvingBalanceTotal",
    "revolving_balance_total"
  );
  const applicableLimit = getNum(
    tradeSummary,
    "applicableRevolvingHighCreditTotal",
    "ApplicableRevolvingHighCreditTotal",
    "applicable_revolving_high_credit_total"
  );
  const limit =
    applicableLimit > 0
      ? applicableLimit
      : getNum(
          tradeSummary,
          "revolvingHighCreditTotal",
          "RevolvingHighCreditTotal",
          "revolving_high_credit_total"
        );

  let utilizationPct: number | null = null;
  const rawUtil =
    tradeSummary.revolvingCreditUtilization ??
    tradeSummary.RevolvingCreditUtilization ??
    tradeSummary.revolving_credit_utilization;
  if (rawUtil !== undefined && rawUtil !== null) {
    const s = String(rawUtil).trim();
    if (s.startsWith(">")) {
      utilizationPct = limit > 0 ? (balance / limit) * 100 : 100;
    } else {
      const n = parseFloat(s);
      if (!Number.isNaN(n)) utilizationPct = n;
    }
  }
  if (utilizationPct === null && limit > 0) {
    utilizationPct = (balance / limit) * 100;
  }

  return { utilizationPct, revolvingBalanceTotal: balance, revolvingLimitTotal: limit };
}

function extractBureauDetails(report: Record<string, unknown> | null) {
  if (!report) return null;

  const scores = report.scores as Array<Record<string, unknown>> | undefined;
  const score = scores?.[0] ? parseInt(String(scores[0].scoreValue ?? scores[0].value ?? "0"), 10) : 0;

  const fromSummary = getUtilizationFromReport(report);

  const tradelines = getTradelines(report);
  const tradelineCount = tradelines.length;

  // Total Debt = sum of ALL account balances (revolving + installment + etc.), not just revolving
  const tradeSummary = getTradeSummary(report);
  let totalDebt = getNum(
    tradeSummary ?? undefined,
    "balanceTotal",
    "BalanceTotal",
    "balance_total"
  );
  if (totalDebt === 0) {
    for (const tl of tradelines) {
      totalDebt += getTradelineBalance(tl);
    }
  }

  // Revolving limit only for utilization
  let totalLimit = fromSummary.revolvingLimitTotal;
  if (totalLimit === 0) {
    for (const tl of tradelines) {
      const accountType = String(tl.accountType ?? tl.type ?? "").toLowerCase();
      const isRevolving =
        accountType.includes("revolv") ||
        accountType.includes("credit") ||
        accountType === "revolving" ||
        accountType === "credit card";
      if (isRevolving) totalLimit += getTradelineLimit(tl);
    }
  }

  // Utilization: revolving only (from tradeSummary or revolving balance/limit)
  const utilization =
    fromSummary.utilizationPct != null
      ? fromSummary.utilizationPct / 100
      : totalLimit > 0
        ? fromSummary.revolvingBalanceTotal / totalLimit
        : NaN;

  return {
    score,
    tradelineCount,
    totalDebt,
    totalLimit,
    utilization,
  };
}

function getScoreColor(score: number): string {
  if (score >= 800) return "text-emerald-600";
  if (score >= 740) return "text-green-600";
  if (score >= 670) return "text-yellow-600";
  if (score >= 580) return "text-orange-600";
  return "text-red-600";
}

function getScoreLabel(score: number): string {
  if (score >= 800) return "Excellent";
  if (score >= 740) return "Very Good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

export function BureauComparison({ bureauScores, triBureau }: BureauComparisonProps) {
  const bureaus = ["experian", "transunion", "equifax"] as const;
  const available = bureaus.filter((b) => bureauScores[b] != null && bureauScores[b]! > 0);
  const scores = available.map((b) => bureauScores[b]!);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const spread = maxScore - minScore;
  const highestBureau = scores.length > 0 ? available.find((b) => bureauScores[b] === maxScore) : null;
  const lowestBureau = scores.length > 0 ? available.find((b) => bureauScores[b] === minScore) : null;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        {bureaus.map((bureau) => {
          const meta = BUREAU_LABELS[bureau];
          const details = extractBureauDetails(triBureau[bureau]);

          if (!details || details.score === 0) {
            return (
              <Card key={bureau} className="rounded-2xl border border-slate-200 bg-slate-50/50">
                <CardContent className="p-5 text-center">
                  <p className={`font-heading text-sm ${meta.color} mb-3 uppercase tracking-wide`}>{meta.name}</p>
                  <div className="mb-4">
                    <span className="text-2xl font-heading text-slate-400">—</span>
                    <p className="text-xs mt-1 text-slate-400">Not registered</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    No credit record found with this bureau
                  </p>
                </CardContent>
              </Card>
            );
          }

          const isHighest = details.score === maxScore && available.length > 1;
          const isLowest = details.score === minScore && available.length > 1 && spread > 0;

          return (
            <Card key={bureau} className={`rounded-2xl border ${meta.bgColor} relative overflow-hidden`}>
              {isHighest && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0.5">Highest</Badge>
                </div>
              )}
              {isLowest && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">Lowest</Badge>
                </div>
              )}
              <CardContent className="p-5">
                <p className={`font-heading text-sm ${meta.color} mb-3 uppercase tracking-wide`}>{meta.name}</p>

                {/* Score */}
                <div className="mb-4">
                  <span className={`text-4xl font-heading ${getScoreColor(details.score)}`}>
                    {details.score}
                  </span>
                  <p className={`text-xs mt-0.5 ${getScoreColor(details.score)}`}>
                    {getScoreLabel(details.score)}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone">Accounts</span>
                    <span className="font-medium text-grove">{details.tradelineCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone">Total Debt</span>
                    <span className="font-medium text-grove">${details.totalDebt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone">Utilization</span>
                    <span className="font-medium text-grove">
                      {Number.isNaN(details.utilization)
                        ? "N/A"
                        : details.utilization >= 1
                          ? ">100%"
                          : `${(details.utilization * 100).toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Spread insight — only when we have 2+ bureaus with valid scores */}
      {available.length >= 2 && spread >= 0 && (
        <div className="p-4 rounded-xl bg-dawn/50 border border-dew/40 text-sm text-grove-light">
          <strong className="text-grove">
            Score spread: {spread} point{spread !== 1 ? "s" : ""}
            {highestBureau && lowestBureau && highestBureau !== lowestBureau
              ? ` (${BUREAU_LABELS[highestBureau].name} ${maxScore} vs ${BUREAU_LABELS[lowestBureau].name} ${minScore})`
              : ""}
          </strong>
          {spread >= 50 ? (
            <span> — Large variation. Lenders may pull from any bureau; shop around for the best rate. Scores can differ because creditors report to bureaus at different times.</span>
          ) : spread >= 20 ? (
            <span> — Moderate variation. Your scores are fairly consistent. When applying for green financing, consider that different lenders may use different bureaus.</span>
          ) : spread > 0 ? (
            <span> — Scores are very consistent across bureaus, which is a good sign for financing applications.</span>
          ) : (
            <span> — All reported bureau scores match.</span>
          )}
        </div>
      )}
    </div>
  );
}
