/**
 * Study Plan Engine — selects, orders, schedules, and personalizes
 * curriculum modules based on the user's credit data.
 *
 * No API calls — everything is deterministic and instant.
 */

import {
  STUDY_CURRICULUM,
  type StudyModule,
  type ModuleCondition,
  type ModulePriority,
  type ModuleCategory,
} from "./study-curriculum";
import type { GreenReadiness } from "./green-scoring";
import type { GreenInvestment } from "./green-investments";
import type { TradelineProfile } from "./tradeline-intelligence";
import type { GeminiAnalysis } from "./gemini";
import {
  formatCurrency,
  getEstimatedRate,
  getTierLabel,
  calculateMonthlyPayment,
} from "./utils";

// ── Output types ──

export interface StudyPlanModule {
  module: StudyModule;
  weekNumber: number;
  personalizedTitle: string;
  personalizedHighlight: string;
  personalizedContent: string;
  personalizedActionItems: {
    text: string;
    priority: string;
    estimatedImpact?: string;
  }[];
  personalizedRelevance: string;
}

export interface StudyPlan {
  modules: StudyPlanModule[];
  totalWeeks: number;
  totalMinutes: number;
  moduleCount: number;
}

export interface PlanContext {
  greenReadiness: GreenReadiness;
  tradelineProfile?: TradelineProfile;
  bureauScores: Record<string, number | null>;
  investments: GreenInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
}

// ── Tier ordering for condition evaluation ──

const TIER_ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };

const PRIORITY_ORDER: Record<ModulePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const CATEGORY_ORDER: Record<ModuleCategory, number> = {
  "credit-repair": 0,
  "credit-fundamentals": 1,
  "green-finance": 2,
  "green-action": 3,
};

// ── Main entry point ──

export function generateStudyPlan(context: PlanContext): StudyPlan {
  const vars = buildTemplateVars(context);

  // 1. Filter by conditions
  const eligible = STUDY_CURRICULUM.filter((mod) =>
    evaluateConditions(mod.conditions, context)
  );

  // 2. Resolve prerequisites (auto-include any needed prereqs)
  const withPrereqs = resolvePrerequisites(eligible);

  // 3. Sort by priority + category
  const sorted = sortModules(withPrereqs);

  // 4. Assign week numbers (topological sort + capacity)
  const scheduled = assignWeeks(sorted);

  // 5. Personalize content
  const personalized: StudyPlanModule[] = scheduled.map(
    ({ module, weekNumber }) => ({
      module,
      weekNumber,
      personalizedTitle: interpolate(module.title, vars),
      personalizedHighlight: interpolate(module.highlight, vars),
      personalizedContent: interpolate(module.content, vars),
      personalizedActionItems: module.actionItems.map((ai) => ({
        text: interpolate(ai.text, vars),
        priority: (interpolate(ai.priority, vars) || ai.priority) as ModulePriority,
        estimatedImpact: ai.estimatedImpact
          ? interpolate(ai.estimatedImpact, vars)
          : undefined,
      })),
      personalizedRelevance: interpolate(module.relevance, vars),
    })
  );

  const totalWeeks =
    personalized.length > 0
      ? Math.max(...personalized.map((m) => m.weekNumber))
      : 0;

  return {
    modules: personalized,
    totalWeeks,
    totalMinutes: personalized.reduce(
      (s, m) => s + m.module.estimatedMinutes,
      0
    ),
    moduleCount: personalized.length,
  };
}

// ── Condition evaluation (all specified fields must match — AND logic) ──

function evaluateConditions(
  cond: ModuleCondition,
  ctx: PlanContext
): boolean {
  const { greenReadiness: gr, tradelineProfile: tp, bureauScores } = ctx;

  if (cond.minTier && TIER_ORDER[gr.tier] < TIER_ORDER[cond.minTier])
    return false;
  if (cond.maxTier && TIER_ORDER[gr.tier] > TIER_ORDER[cond.maxTier])
    return false;
  if (cond.minUtilization !== undefined && gr.utilization < cond.minUtilization)
    return false;
  if (cond.maxUtilization !== undefined && gr.utilization > cond.maxUtilization)
    return false;
  if (cond.minCreditScore !== undefined && gr.creditScore < cond.minCreditScore)
    return false;
  if (cond.maxCreditScore !== undefined && gr.creditScore > cond.maxCreditScore)
    return false;
  if (
    cond.minDerogatoryCount !== undefined &&
    gr.derogatoryCount < cond.minDerogatoryCount
  )
    return false;
  if (
    cond.maxTradelineCount !== undefined &&
    gr.tradelineCount > cond.maxTradelineCount
  )
    return false;

  if (cond.hasNegativeFactor) {
    const hasIt = gr.factors.some(
      (f) =>
        f.label === cond.hasNegativeFactor && f.impact === "negative"
    );
    if (!hasIt) return false;
  }

  // Tradeline profile conditions — skip if no profile available
  if (tp) {
    if (cond.isRenter !== undefined && cond.isRenter !== tp.isRenter)
      return false;
    if (cond.hasMortgage !== undefined && cond.hasMortgage !== tp.hasMortgage)
      return false;
    if (cond.hasAutoLoan !== undefined && cond.hasAutoLoan !== tp.hasAutoLoan)
      return false;
    if (
      cond.hasStudentLoan !== undefined &&
      cond.hasStudentLoan !== tp.hasStudentLoan
    )
      return false;
    if (cond.hasHighUtilCards && tp.highUtilizationCards.length === 0)
      return false;
  } else {
    // Without tradeline data, skip conditions that require it
    if (
      cond.isRenter !== undefined ||
      cond.hasMortgage !== undefined ||
      cond.hasAutoLoan !== undefined ||
      cond.hasStudentLoan !== undefined ||
      cond.hasHighUtilCards
    )
      return false;
  }

  // Bureau conditions
  if (cond.hasBureauData) {
    const valid = Object.values(bureauScores).filter(
      (s) => s != null && s > 0
    );
    if (valid.length < 2) return false;
  }
  if (cond.minBureauSpread) {
    const scores = Object.values(bureauScores).filter(
      (s): s is number => s != null && s > 0
    );
    if (scores.length < 2) return false;
    const spread = Math.max(...scores) - Math.min(...scores);
    if (spread < cond.minBureauSpread) return false;
  }

  return true;
}

// ── Prerequisite resolution ──

function resolvePrerequisites(eligible: StudyModule[]): StudyModule[] {
  const selectedIds = new Set(eligible.map((m) => m.id));
  const all = new Map(STUDY_CURRICULUM.map((m) => [m.id, m]));
  const result = [...eligible];

  // Iteratively add missing prerequisites
  let changed = true;
  while (changed) {
    changed = false;
    for (const mod of [...result]) {
      for (const prereqId of mod.prerequisiteIds) {
        if (!selectedIds.has(prereqId)) {
          const prereq = all.get(prereqId);
          if (prereq) {
            result.push(prereq);
            selectedIds.add(prereqId);
            changed = true;
          }
        }
      }
    }
  }

  return result;
}

// ── Sorting ──

function sortModules(modules: StudyModule[]): StudyModule[] {
  return [...modules].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  });
}

// ── Week assignment (topological sort + capacity constraints) ──

function assignWeeks(
  sorted: StudyModule[]
): { module: StudyModule; weekNumber: number }[] {
  const MAX_MINUTES_PER_WEEK = 25;
  const MAX_MODULES_PER_WEEK = 3;

  const result: { module: StudyModule; weekNumber: number }[] = [];
  const placed = new Set<string>();
  const queue = [...sorted];
  let currentWeek = 1;
  let minutesThisWeek = 0;
  let modulesThisWeek = 0;

  let safety = queue.length * queue.length; // prevent infinite loops

  while (queue.length > 0 && safety-- > 0) {
    // Find the first module whose prerequisites are all placed
    const idx = queue.findIndex((m) =>
      m.prerequisiteIds.every((pid) => placed.has(pid))
    );

    if (idx === -1) break; // remaining modules have unresolvable prereqs

    const mod = queue.splice(idx, 1)[0];

    // Check if we need to advance to next week
    if (
      minutesThisWeek + mod.estimatedMinutes > MAX_MINUTES_PER_WEEK ||
      modulesThisWeek >= MAX_MODULES_PER_WEEK
    ) {
      currentWeek++;
      minutesThisWeek = 0;
      modulesThisWeek = 0;
    }

    modulesThisWeek++;
    minutesThisWeek += mod.estimatedMinutes;
    result.push({ module: mod, weekNumber: currentWeek });
    placed.add(mod.id);
  }

  return result;
}

// ── Template variable builder ──

function buildTemplateVars(ctx: PlanContext): Record<string, string> {
  const { greenReadiness: gr, tradelineProfile: tp, bureauScores, investments } =
    ctx;

  const utilizationPct = Math.round(gr.utilization * 100);
  const isHighUtilization = gr.utilization >= 0.3;
  const isLowUtilization = gr.utilization < 0.1;

  const revolvingBalance = Math.round(gr.utilization * gr.totalCreditLimit);
  const target30 = Math.round(gr.totalCreditLimit * 0.3);
  const paydownToTarget = Math.max(0, revolvingBalance - target30);

  // Bureau data
  const validScores = Object.entries(bureauScores).filter(
    ([, s]) => s != null && s > 0
  ) as [string, number][];
  const bureauSpread =
    validScores.length >= 2
      ? Math.max(...validScores.map(([, s]) => s)) -
        Math.min(...validScores.map(([, s]) => s))
      : 0;
  const highBureau = validScores.length >= 2
    ? validScores.reduce((a, b) => (b[1] > a[1] ? b : a))
    : null;
  const lowBureau = validScores.length >= 2
    ? validScores.reduce((a, b) => (b[1] < a[1] ? b : a))
    : null;

  // Tier progression
  const nextTierMap: Record<string, string | null> = {
    D: "C",
    C: "B",
    B: "A",
    A: null,
  };
  const nextTier = nextTierMap[gr.tier];
  const nextTierThreshold =
    gr.tier === "D" ? 40 : gr.tier === "C" ? 60 : gr.tier === "B" ? 80 : 100;
  const pointsToNextTier = nextTier ? nextTierThreshold - gr.score : 0;
  const currentRate = getEstimatedRate(gr.tier);
  const nextTierRate = nextTier
    ? getEstimatedRate(nextTier as "A" | "B" | "C" | "D")
    : currentRate;

  // Tradeline profile
  const topCard = tp?.highUtilizationCards[0];
  const topCardPaydown = topCard
    ? Math.max(0, topCard.balance - Math.round(topCard.limit * 0.5))
    : 0;

  // Financing calculations
  const solarCost = 25000;
  const solarEffective = Math.round(solarCost * 0.7); // 30% ITC
  const solarMonthly = calculateMonthlyPayment(solarEffective, currentRate, 15);
  const evCost = 35000 - 7500; // after credit
  const evMonthly = calculateMonthlyPayment(evCost, currentRate, 6);
  const heatPumpCost = 12000 - 2000; // after credit
  const heatPumpMonthly = calculateMonthlyPayment(heatPumpCost, currentRate, 10);

  // Rate savings for tier upgrade
  const rateSavings = nextTier
    ? calculateMonthlyPayment(solarEffective, currentRate, 15) -
      calculateMonthlyPayment(solarEffective, nextTierRate, 15)
    : 0;

  // Count renter-friendly investments (no mortgage needed)
  const renterFriendlyIds = new Set([
    "community_solar", "transit_pass", "ebike", "led_upgrade",
    "composting", "green_bank_account", "energy_appliances", "smart_thermostat",
  ]);
  const renterFriendlyCount = investments.filter((i) =>
    renterFriendlyIds.has(i.id)
  ).length;

  // Home investment count
  const homeIds = new Set([
    "solar_panels", "home_battery", "heat_pump", "weatherization",
    "energy_appliances", "smart_thermostat", "green_mortgage_refi",
  ]);
  const homeInvestmentCount = investments.filter((i) =>
    homeIds.has(i.id)
  ).length;

  // Total incentives
  const incentiveMap: Record<string, number> = {
    solar_panels: solarCost * 0.3,
    home_battery: 15000 * 0.3,
    ev_new: 7500,
    ev_used: 4000,
    heat_pump: 2000,
    energy_appliances: 840,
    weatherization: 1600,
  };
  const totalIncentives = investments.reduce(
    (s, inv) => s + (incentiveMap[inv.id] || 0),
    0
  );

  // Biggest lever (which factor to focus on)
  const negativeFactors = gr.factors.filter((f) => f.impact === "negative");
  const biggestLever =
    negativeFactors.length > 0
      ? negativeFactors[0].label.toLowerCase()
      : "maintaining your current positive habits";

  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  return {
    // Core credit data
    creditScore: String(gr.creditScore),
    utilizationPct: String(utilizationPct),
    totalCreditLimitFormatted: formatCurrency(gr.totalCreditLimit),
    revolvingBalanceFormatted: formatCurrency(revolvingBalance),
    paydownToTargetFormatted: formatCurrency(paydownToTarget),
    target30Formatted: formatCurrency(target30),
    totalDebtFormatted: formatCurrency(gr.totalDebt),
    tradelineCount: String(gr.tradelineCount),
    tradelinePlural: gr.tradelineCount === 1 ? "" : "s",
    derogatoryCount: String(gr.derogatoryCount),
    derogatoryPlural: gr.derogatoryCount === 1 ? "" : "s",
    biggestLever,

    // Booleans for conditionals
    isHighUtilization: String(isHighUtilization),
    isLowUtilization: String(isLowUtilization),
    hasNextTier: String(nextTier !== null),
    isTopTier: String(gr.tier === "A"),
    noAutoLoan: String(!tp?.hasAutoLoan),

    // Tier data
    tier: gr.tier,
    tierLabel: getTierLabel(gr.tier),
    score: String(gr.score),
    estimatedRate: String(currentRate),
    investmentCount: String(investments.length),
    nextTier: nextTier || "",
    pointsToNextTier: String(pointsToNextTier),
    nextTierRate: String(nextTierRate),
    rateSavingsFormatted: formatCurrency(rateSavings),

    // Bureau data
    bureauSpread: String(bureauSpread),
    bureauCount: String(validScores.length),
    highBureauName: highBureau ? capitalize(highBureau[0]) : "",
    highBureauScore: highBureau ? String(highBureau[1]) : "",
    lowBureauName: lowBureau ? capitalize(lowBureau[0]) : "",
    lowBureauScore: lowBureau ? String(lowBureau[1]) : "",
    isLargeSpread: String(bureauSpread >= 30),
    isSmallSpread: String(bureauSpread < 30),

    // Tradeline profile
    topHighUtilCardName: topCard?.name || "",
    topHighUtilCardPct: topCard
      ? String(Math.round(topCard.utilization * 100))
      : "",
    topHighUtilCardBalanceFormatted: topCard
      ? formatCurrency(topCard.balance)
      : "",
    topHighUtilCardLimitFormatted: topCard
      ? formatCurrency(topCard.limit)
      : "",
    topHighUtilCardPaydownFormatted: formatCurrency(topCardPaydown),
    highUtilCardCount: String(tp?.highUtilizationCards.length || 0),
    hasMultipleHighUtilCards: String(
      (tp?.highUtilizationCards.length || 0) > 1
    ),
    autoLoanBalanceFormatted: tp?.autoLoanBalance
      ? formatCurrency(tp.autoLoanBalance)
      : "",
    hasAutoLoan: String(tp?.hasAutoLoan || false),
    monthlyDebtFormatted: tp
      ? formatCurrency(tp.monthlyDebtPayments)
      : "$0",

    // Investment counts
    renterFriendlyCount: String(renterFriendlyCount),
    homeInvestmentCount: String(homeInvestmentCount),
    totalIncentivesFormatted: formatCurrency(totalIncentives),

    // Financing calculations
    solarEffectiveCostFormatted: formatCurrency(solarEffective),
    solarMonthlyFormatted: formatCurrency(solarMonthly),
    evMonthlyFormatted: formatCurrency(evMonthly),
    heatPumpMonthlyFormatted: formatCurrency(heatPumpMonthly),
  };
}

// ── Template interpolation ──

function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  // Step 1: Process {{#if varName}}...{{/if}} conditional blocks
  let result = template.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName: string, content: string) => {
      const val = vars[varName];
      return val && val !== "false" && val !== "0" && val !== ""
        ? content
        : "";
    }
  );

  // Step 2: Replace {{varName}} simple variables
  result = result.replace(
    /\{\{(\w+)\}\}/g,
    (_, varName: string) => vars[varName] ?? ""
  );

  // Step 3: Clean up extra whitespace from removed conditionals
  result = result.replace(/\s{2,}/g, " ").trim();

  return result;
}
