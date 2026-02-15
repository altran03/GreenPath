/**
 * Tradeline-aware investment personalization.
 * Analyzes individual credit accounts from CRS bureau reports to:
 * 1. Build a profile of the user's financial situation (homeowner, auto loan, etc.)
 * 2. Personalize green investment recommendations with match reasons
 * 3. Calculate dynamic financing with federal incentives
 * 4. Provide bureau-optimized lending tips
 */

import type { GreenInvestment } from "./green-investments";
import { getEstimatedRate, calculateMonthlyPayment, formatCurrency } from "./utils";

// ── Types ──

export interface TradelineProfile {
  hasAutoLoan: boolean;
  hasMortgage: boolean;
  hasStudentLoan: boolean;
  isRenter: boolean;
  highUtilizationCards: {
    name: string;
    balance: number;
    limit: number;
    utilization: number;
  }[];
  totalRevolvingBalance: number;
  totalRevolvingLimit: number;
  overallUtilization: number;
  autoLoanBalance: number | null;
  monthlyDebtPayments: number;
  tradelineCount: number;
}

export interface PersonalizedInvestment {
  investment: GreenInvestment;
  matchScore: number;
  matchReason: string;
  federalIncentive: number;
  effectiveCost: number;
  dynamicMonthlyPayment: number;
  incentiveLabel: string | null;
}

export interface BureauTip {
  tip: string;
  bestBureau: string;
  score: number;
}

// ── Federal Incentives (IRA / 25C / Clean Vehicle Credit) ──

const FEDERAL_INCENTIVES: Record<string, { amount: number; type: "percentage" | "fixed"; label: string }> = {
  solar_panels:       { amount: 0.30, type: "percentage", label: "30% Federal ITC (Inflation Reduction Act)" },
  home_battery:       { amount: 0.30, type: "percentage", label: "30% Federal ITC (paired with solar)" },
  ev_new:             { amount: 7500, type: "fixed",      label: "$7,500 Clean Vehicle Credit" },
  ev_used:            { amount: 4000, type: "fixed",      label: "$4,000 Used Clean Vehicle Credit" },
  heat_pump:          { amount: 2000, type: "fixed",      label: "$2,000 Heat Pump Tax Credit (25C)" },
  energy_appliances:  { amount: 840,  type: "fixed",      label: "Up to $840 IRA Appliance Rebate" },
  weatherization:     { amount: 1600, type: "fixed",      label: "Up to $1,600 Insulation/Sealing Rebate" },
  smart_thermostat:   { amount: 0,    type: "fixed",      label: "" },
  ebike:              { amount: 0,    type: "fixed",      label: "" },
  community_solar:    { amount: 0,    type: "fixed",      label: "" },
  led_upgrade:        { amount: 0,    type: "fixed",      label: "" },
  transit_pass:       { amount: 0,    type: "fixed",      label: "" },
  energy_audit:       { amount: 0,    type: "fixed",      label: "" },
  composting:         { amount: 0,    type: "fixed",      label: "" },
  green_bank_account: { amount: 0,    type: "fixed",      label: "" },
  green_mortgage_refi:{ amount: 0,    type: "fixed",      label: "" },
};

// ── Tradeline Helpers ──

function getTradelines(report: Record<string, unknown>): Record<string, unknown>[] {
  const top = report.tradelines as Record<string, unknown>[] | undefined;
  if (Array.isArray(top) && top.length > 0) return top;
  const creditFiles = report.creditFiles as Record<string, unknown>[] | undefined;
  if (Array.isArray(creditFiles) && creditFiles[0]) {
    const fromFile = (creditFiles[0].tradelines ?? creditFiles[0].trades) as Record<string, unknown>[] | undefined;
    if (Array.isArray(fromFile)) return fromFile;
  }
  return [];
}

function getBalance(tl: Record<string, unknown>): number {
  for (const k of ["currentBalanceAmount", "currentBalance", "balanceAmount", "balance"]) {
    const v = tl[k];
    if (v !== undefined && v !== null) {
      const n = parseFloat(String(v));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getLimit(tl: Record<string, unknown>): number {
  for (const k of ["creditLimitAmount", "creditLimit", "highCreditAmount", "highCredit", "highBalanceAmount"]) {
    const v = tl[k];
    if (v !== undefined && v !== null) {
      const n = parseFloat(String(v));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getMonthlyPayment(tl: Record<string, unknown>): number {
  for (const k of ["monthlyPaymentAmount", "monthlyPayment", "MonthlyPaymentAmount"]) {
    const v = tl[k];
    if (v !== undefined && v !== null) {
      const n = parseFloat(String(v));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getName(tl: Record<string, unknown>): string {
  return String(tl.subscriberName ?? tl.creditorName ?? tl.companyName ?? "Unknown").trim();
}

function getAccountType(tl: Record<string, unknown>): string {
  return String(tl.accountType ?? tl.type ?? "").toLowerCase();
}

function isRevolving(type: string): boolean {
  return type.includes("revolv") || type.includes("credit") || type === "revolving" || type === "credit card";
}

const AUTO_KEYWORDS = ["toyota", "ford", "gm", "ally", "cap one auto", "carmax", "honda", "hyundai", "nissan", "bmw", "mercedes", "auto", "vehicle", "motor credit"];
const MORTGAGE_KEYWORDS = ["mortgage", "home loan", "housing", "fannie", "freddie", "fha"];
const STUDENT_KEYWORDS = ["navient", "nelnet", "mohela", "fed loan", "student", "sallie mae", "great lakes", "aidvantage"];

function matchesKeywords(name: string, type: string, keywords: string[]): boolean {
  const combined = `${name} ${type}`.toLowerCase();
  return keywords.some((kw) => combined.includes(kw));
}

// ── Core Functions ──

export function extractTradelineProfile(report: Record<string, unknown>): TradelineProfile {
  const tradelines = getTradelines(report);

  let totalRevolvingBalance = 0;
  let totalRevolvingLimit = 0;
  let autoLoanBalance: number | null = null;
  let hasMortgage = false;
  let hasAutoLoan = false;
  let hasStudentLoan = false;
  let monthlyDebtPayments = 0;
  const highUtilizationCards: TradelineProfile["highUtilizationCards"] = [];

  for (const tl of tradelines) {
    const name = getName(tl);
    const type = getAccountType(tl);
    const balance = getBalance(tl);
    const limit = getLimit(tl);
    const monthly = getMonthlyPayment(tl);

    monthlyDebtPayments += monthly;

    if (isRevolving(type)) {
      totalRevolvingBalance += balance;
      totalRevolvingLimit += limit;
      if (limit > 0) {
        const util = balance / limit;
        if (util > 0.50) {
          highUtilizationCards.push({ name, balance, limit, utilization: util });
        }
      }
    }

    if (matchesKeywords(name, type, AUTO_KEYWORDS)) {
      hasAutoLoan = true;
      autoLoanBalance = balance;
    }
    if (matchesKeywords(name, type, MORTGAGE_KEYWORDS)) {
      hasMortgage = true;
    }
    if (matchesKeywords(name, type, STUDENT_KEYWORDS)) {
      hasStudentLoan = true;
    }
  }

  // Sort high-util cards by utilization descending
  highUtilizationCards.sort((a, b) => b.utilization - a.utilization);

  return {
    hasAutoLoan,
    hasMortgage,
    hasStudentLoan,
    isRenter: !hasMortgage,
    highUtilizationCards,
    totalRevolvingBalance,
    totalRevolvingLimit,
    overallUtilization: totalRevolvingLimit > 0 ? totalRevolvingBalance / totalRevolvingLimit : 0,
    autoLoanBalance,
    monthlyDebtPayments,
    tradelineCount: tradelines.length,
  };
}

export function personalizeInvestments(
  investments: GreenInvestment[],
  profile: TradelineProfile,
  tier: "A" | "B" | "C" | "D"
): PersonalizedInvestment[] {
  const rate = getEstimatedRate(tier);
  const topHighUtilCard = profile.highUtilizationCards[0] ?? null;

  return investments
    .map((inv) => {
      // Federal incentive calculation
      const incentiveEntry = FEDERAL_INCENTIVES[inv.id];
      let federalIncentive = 0;
      let incentiveLabel: string | null = null;

      if (incentiveEntry && incentiveEntry.amount > 0) {
        federalIncentive =
          incentiveEntry.type === "percentage"
            ? Math.round(inv.estimatedCost * incentiveEntry.amount)
            : incentiveEntry.amount;
        incentiveLabel = incentiveEntry.label;
      }

      const effectiveCost = Math.max(0, inv.estimatedCost - federalIncentive);
      const dynamicMonthlyPayment =
        inv.financingTermYears > 0 && effectiveCost > 0
          ? calculateMonthlyPayment(effectiveCost, rate, inv.financingTermYears)
          : 0;

      // Match scoring + reason generation
      let matchScore = 50; // baseline
      const reasons: string[] = [];

      // Home investment logic
      const isHomeInvestment = ["solar_panels", "home_battery", "heat_pump", "weatherization", "green_mortgage_refi"].includes(inv.id);
      if (isHomeInvestment) {
        if (profile.hasMortgage) {
          matchScore += 25;
          reasons.push("Great fit — you're a homeowner");
        } else {
          matchScore -= 30;
          reasons.push("Requires homeownership");
        }
      }

      // EV logic
      if (inv.id === "ev_new" || inv.id === "ev_used") {
        if (profile.hasAutoLoan && profile.autoLoanBalance) {
          matchScore += 25;
          reasons.push(
            `You have an auto loan (${formatCurrency(profile.autoLoanBalance)} remaining) — switching to an EV could save $1,500+/yr in fuel costs`
          );
        } else if (!profile.hasAutoLoan) {
          matchScore += 10;
          reasons.push("No current auto loan — clean financing opportunity");
        }
      }

      // Renter-friendly options
      const renterFriendly = ["community_solar", "transit_pass", "ebike", "led_upgrade", "composting", "green_bank_account", "energy_audit", "smart_thermostat"].includes(inv.id);
      if (renterFriendly && profile.isRenter) {
        matchScore += 15;
        reasons.push("Works great for renters");
      }

      // Free/low-cost boost when utilization is high
      if (inv.estimatedCost === 0 && profile.overallUtilization > 0.40) {
        matchScore += 10;
        reasons.push("No upfront cost — smart while paying down balances");
      }

      // High utilization warning for expensive investments
      if (inv.estimatedCost > 5000 && topHighUtilCard && topHighUtilCard.utilization > 0.70) {
        reasons.push(
          `Tip: paying down your ${topHighUtilCard.name} (${Math.round(topHighUtilCard.utilization * 100)}% utilized) could improve your financing rate`
        );
      }

      // Student loan context
      if (profile.hasStudentLoan && inv.estimatedCost > 10000) {
        matchScore -= 5;
      }

      const matchReason = reasons.length > 0 ? reasons.join(". ") + "." : "";

      return {
        investment: inv,
        matchScore: Math.max(0, Math.min(100, matchScore)),
        matchReason,
        federalIncentive,
        effectiveCost,
        dynamicMonthlyPayment,
        incentiveLabel,
      };
    })
    .sort((a, b) => {
      // Primary: CO2 impact (desc)
      const co2Diff = b.investment.annualCO2ReductionLbs - a.investment.annualCO2ReductionLbs;
      if (co2Diff !== 0) return co2Diff;
      // Secondary: match score (desc)
      return b.matchScore - a.matchScore;
    });
}

export function getBureauLendingTip(
  bureauScores: Record<string, number | null>
): BureauTip | null {
  const entries = Object.entries(bureauScores)
    .filter((e): e is [string, number] => e[1] != null && e[1] > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length < 2) return null;

  const [bestBureau, bestScore] = entries[0];
  const worstScore = entries[entries.length - 1][1];
  const spread = bestScore - worstScore;

  if (spread < 10) return null;

  const bureauName = bestBureau.charAt(0).toUpperCase() + bestBureau.slice(1);
  return {
    tip: `Your ${bureauName} score (${bestScore}) is your highest. When applying for green financing, look for lenders that pull ${bureauName} to get the best rate.`,
    bestBureau,
    score: bestScore,
  };
}
