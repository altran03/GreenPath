"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  CreditCard,
  Landmark,
  Leaf,
  Target,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  Trees,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { co2ToTrees, co2ToMilesNotDriven, getEstimatedRate, formatCurrency, formatNumber, getTierLabel } from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";
import type { LucideIcon } from "lucide-react";

interface EducationModulesProps {
  greenReadiness: GreenReadiness;
  geminiAnalysis: GeminiAnalysis | null;
  bureauScores: Record<string, number | null>;
  investments: GreenInvestment[];
}

interface Lesson {
  id: string;
  title: string;
  icon: LucideIcon;
  highlight: string;
  content: string;
  actionItem: string;
  relevance: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateLessons(
  greenReadiness: GreenReadiness,
  geminiAnalysis: GeminiAnalysis | null,
  bureauScores: Record<string, number | null>,
  investments: GreenInvestment[]
): Lesson[] {
  const lessons: Lesson[] = [];

  // Lesson: Bureau spread
  const validScores = Object.entries(bureauScores).filter(
    ([, s]) => s != null && s > 0
  ) as [string, number][];

  if (validScores.length >= 2) {
    const scores = validScores.map(([, s]) => s);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const spread = max - min;
    const highBureau = validScores.find(([, s]) => s === max)!;
    const lowBureau = validScores.find(([, s]) => s === min)!;

    if (spread > 0) {
      lessons.push({
        id: "bureau-spread",
        title: "Why your credit scores differ",
        icon: BarChart3,
        highlight: `${spread}-point spread: ${capitalize(highBureau[0])} (${highBureau[1]}) vs ${capitalize(lowBureau[0])} (${lowBureau[1]})`,
        content: spread >= 30
          ? `Your scores vary by ${spread} points across bureaus. This happens because creditors don't always report to all three bureaus, and they report at different times during the month. The bureau a lender pulls from can change your rate by 0.5-1%. GreenPath uses your lowest score (${min}) so you're prepared no matter which bureau a lender checks.`
          : `Your scores are fairly consistent across bureaus (within ${spread} points). This is a positive signal — it means your credit accounts are being reported uniformly. Lenders may pull from any bureau, and your consistent scores mean you'll get similar rate offers regardless.`,
        actionItem: spread >= 30
          ? "When applying for green financing, ask which bureau the lender uses. If your lowest score is holding you back, time your application after that bureau's next reporting cycle."
          : "Your consistent scores mean you can confidently apply to any lender without worrying about which bureau they pull.",
        relevance: "Generated from your tri-bureau credit pull",
      });
    } else {
      lessons.push({
        id: "bureau-consistent",
        title: "Your consistent credit picture",
        icon: BarChart3,
        highlight: `All ${validScores.length} bureaus report ${scores[0]}`,
        content: `All your bureau scores are identical at ${scores[0]}. This is the best scenario — it means all creditors report to all bureaus at the same time, and there are no discrepancies in your credit file. Lenders will see the same picture no matter which bureau they check.`,
        actionItem: "You're in a great position. When shopping for green financing rates, you can focus purely on comparing lender offers rather than worrying about bureau selection.",
        relevance: "Generated from your tri-bureau credit pull",
      });
    }
  }

  // Lessons per negative factor
  const negativeFactors = greenReadiness.factors.filter(
    (f) => f.impact === "negative"
  );

  const factorIcons: Record<string, LucideIcon> = {
    "Credit Score": TrendingDown,
    "Credit Utilization": CreditCard,
    "Derogatory Marks": Landmark,
    "Account Diversity": Target,
  };

  for (const factor of negativeFactors) {
    const matchingTip = geminiAnalysis?.creditTips?.find(
      (t) =>
        t.tip.toLowerCase().includes(factor.label.toLowerCase()) ||
        t.tip.toLowerCase().includes(
          factor.label === "Credit Utilization" ? "utilization" :
          factor.label === "Derogatory Marks" ? "derogatory" :
          factor.label === "Account Diversity" ? "account" :
          factor.label.toLowerCase()
        )
    );

    let content = factor.description;
    let actionItem = matchingTip
      ? `${matchingTip.tip} (Impact: ${matchingTip.impact})`
      : `Focus on improving your ${factor.label.toLowerCase()} to unlock better green financing rates.`;

    // Enrich utilization lesson with actual numbers
    if (factor.label === "Credit Utilization" && greenReadiness.totalCreditLimit > 0) {
      const currentBal = Math.round(greenReadiness.utilization * greenReadiness.totalCreditLimit);
      const target30 = Math.round(greenReadiness.totalCreditLimit * 0.3);
      const payDown = currentBal - target30;
      content += ` You're currently using ${formatCurrency(currentBal)} of your ${formatCurrency(greenReadiness.totalCreditLimit)} revolving credit limit.`;
      if (payDown > 0) {
        actionItem = `Pay down ${formatCurrency(payDown)} in revolving balances to reach the 30% utilization threshold. This is one of the fastest ways to boost your score.`;
      }
    }

    lessons.push({
      id: `factor-${factor.label.toLowerCase().replace(/\s+/g, "-")}`,
      title: `Understanding your ${factor.label.toLowerCase()}`,
      icon: factorIcons[factor.label] || TrendingDown,
      highlight: factor.description.split("—")[0]?.trim() || factor.description.slice(0, 60),
      content,
      actionItem,
      relevance: `Based on your ${factor.label.toLowerCase()} score factor`,
    });
  }

  // Lesson: Tier explanation (always)
  const tierLabels: Record<string, string> = { A: "Excellent", B: "Good", C: "Fair", D: "Building" };
  const nextTier = greenReadiness.tier === "D" ? "C" : greenReadiness.tier === "C" ? "B" : greenReadiness.tier === "B" ? "A" : null;
  const nextTierThreshold = greenReadiness.tier === "D" ? 40 : greenReadiness.tier === "C" ? 60 : greenReadiness.tier === "B" ? 80 : 100;
  const pointsToNext = nextTier ? nextTierThreshold - greenReadiness.score : 0;
  const rate = getEstimatedRate(greenReadiness.tier);

  lessons.push({
    id: "tier-explanation",
    title: `What Tier ${greenReadiness.tier} means for green financing`,
    icon: Leaf,
    highlight: `Tier ${greenReadiness.tier} (${tierLabels[greenReadiness.tier]}) — ${rate}% est. APR`,
    content: `Your Green Readiness score of ${greenReadiness.score}/100 places you in Tier ${greenReadiness.tier} (${getTierLabel(greenReadiness.tier)}). At this tier, you can expect interest rates around ${rate}% APR on green financing. You currently qualify for ${investments.length} sustainable investment options.${
      nextTier
        ? ` You're ${pointsToNext} points away from Tier ${nextTier}, which would unlock more options and lower your estimated APR to ${getEstimatedRate(nextTier as "A" | "B" | "C" | "D")}%.`
        : " You've reached the highest tier with access to all green investments at the best rates."
    }`,
    actionItem: nextTier
      ? `Improving your score by ${pointsToNext} points would move you to Tier ${nextTier}. Focus on the negative factors above — each improvement compounds to unlock better rates and more green investment options.`
      : "Maintain your excellent credit profile by continuing on-time payments and keeping utilization low. You qualify for the best available rates on all green investments.",
    relevance: "Based on your composite Green Readiness score",
  });

  // Lesson: Environmental potential (always)
  const totalCo2 = investments.reduce((sum, inv) => sum + inv.annualCO2ReductionLbs, 0);
  const trees = co2ToTrees(totalCo2);
  const miles = co2ToMilesNotDriven(totalCo2);

  lessons.push({
    id: "environmental-potential",
    title: "Your environmental potential",
    icon: Trees,
    highlight: `${formatNumber(totalCo2)} lbs CO₂/year — equivalent to ${formatNumber(trees)} trees`,
    content: `If you pursued all ${investments.length} green investments available at your tier, you could reduce your carbon footprint by ${formatNumber(totalCo2)} lbs of CO₂ per year. That's equivalent to planting ${formatNumber(trees)} trees or taking ${formatNumber(miles)} miles off the road annually. Even starting with just one action — like a transit pass or community solar — creates measurable impact.`,
    actionItem: `Start with the lowest-cost, highest-impact option available to you. Look for investments marked "Free" or "Easy" in your Green Plan tab — these require no financing and create immediate environmental impact.`,
    relevance: "Calculated from your eligible green investments",
  });

  return lessons;
}

export function EducationModules({
  greenReadiness,
  geminiAnalysis,
  bureauScores,
  investments,
}: EducationModulesProps) {
  const lessons = generateLessons(greenReadiness, geminiAnalysis, bureauScores, investments);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(lessons[0]?.id ?? null);

  const completedCount = completed.size;
  const progressValue = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-canopy/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-canopy" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-grove">
              Your Credit Education
            </h2>
            <p className="text-stone text-sm">
              Personalized lessons from your actual credit data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Progress
            value={progressValue}
            className="h-2 flex-1 bg-dew/40 [&>[data-slot=progress-indicator]]:bg-canopy"
          />
          <span className="text-sm text-stone whitespace-nowrap">
            {completedCount} of {lessons.length} completed
          </span>
        </div>
      </div>

      {/* Lesson cards */}
      <div className="space-y-3">
        {lessons.map((lesson, i) => {
          const Icon = lesson.icon;
          const isExpanded = expandedId === lesson.id;
          const isDone = completed.has(lesson.id);

          return (
            <Card
              key={lesson.id}
              className={`rounded-2xl border-dew/40 overflow-hidden transition-all duration-300 animate-fade-up ${
                isDone ? "bg-dawn/60 border-canopy/20" : ""
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardContent className="p-0">
                {/* Collapsible header */}
                <button
                  onClick={() => toggleExpand(lesson.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-dawn/40 transition-colors text-left"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDone ? "bg-canopy/15" : "bg-grove/5"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-canopy" />
                    ) : (
                      <Icon className="w-5 h-5 text-grove/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? "text-canopy" : "text-grove"}`}>
                      {lesson.title}
                    </p>
                    <p className="text-xs text-stone mt-0.5 truncate">
                      {lesson.relevance}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-stone/50 shrink-0 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 animate-fade-up">
                    {/* Highlight stat */}
                    <div className="px-4 py-3 rounded-xl bg-grove/5 border border-dew/40">
                      <p className="text-sm font-medium text-grove">{lesson.highlight}</p>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-soil/80 leading-relaxed">
                      {lesson.content}
                    </p>

                    {/* Action item */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sunbeam/8 border border-sunbeam/20">
                      <Target className="w-4 h-4 text-sunbeam mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-sunbeam uppercase tracking-wider mb-1">
                          Action Item
                        </p>
                        <p className="text-sm text-soil/80 leading-relaxed">
                          {lesson.actionItem}
                        </p>
                      </div>
                    </div>

                    {/* Mark as complete */}
                    <button
                      onClick={() => toggleComplete(lesson.id)}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        isDone
                          ? "text-canopy hover:text-canopy/70"
                          : "text-stone hover:text-grove"
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isDone ? "text-canopy" : "text-stone/40"}`} />
                      {isDone ? "Completed" : "Mark as read"}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
