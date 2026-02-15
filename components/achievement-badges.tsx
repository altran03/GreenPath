"use client";

import { useState, useEffect, type ComponentType } from "react";
import {
  Trophy,
  Leaf,
  Star,
  CreditCard,
  PieChart,
  Building2,
  BookOpen,
  Brain,
  Volume2,
  TrendingUp,
  Award,
  CloudOff,
  Sword,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  unlocked: boolean;
}

interface AchievementBadgesProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  bureauScores?: Record<string, number | null>;
}

// ---------------------------------------------------------------------------
// localStorage helpers (always safe for SSR / errors)
// ---------------------------------------------------------------------------

function readLocalFlag(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === "true";
  } catch {
    return false;
  }
}

function readLocalArrayLength(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
    return 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Badge evaluation
// ---------------------------------------------------------------------------

function evaluateBadges(
  greenReadiness: GreenReadiness,
  investments: GreenInvestment[],
  bureauScores?: Record<string, number | null>,
): Badge[] {
  const { tier, score, creditScore, utilization, totalDebt, totalCreditLimit } =
    greenReadiness;

  const nonNullBureaus = bureauScores
    ? Object.values(bureauScores).filter((v) => v !== null && v !== undefined).length
    : 0;

  const studyCount = readLocalArrayLength("greenpath-study-completed");
  const quizDone = readLocalFlag("greenpath-quiz-completed");
  const briefingPlayed = readLocalFlag("greenpath-briefing-played");

  const totalCO2 = investments.reduce(
    (sum, inv) => sum + inv.annualCO2ReductionLbs,
    0,
  );

  return [
    {
      id: "green_pioneer",
      name: "Green Pioneer",
      description: "Started your green finance journey",
      icon: Leaf,
      unlocked: true,
    },
    {
      id: "score_master",
      name: "Score Master",
      description: "Green readiness score above 70",
      icon: Star,
      unlocked: score >= 70,
    },
    {
      id: "credit_elite",
      name: "Credit Elite",
      description: "Credit score in the 700+ club",
      icon: CreditCard,
      unlocked: creditScore >= 700,
    },
    {
      id: "low_utilization",
      name: "Low Utilization",
      description: "Keeping utilization under 30%",
      icon: PieChart,
      unlocked: utilization < 0.3,
    },
    {
      id: "bureau_pro",
      name: "Bureau Pro",
      description: "Checked all three credit bureaus",
      icon: Building2,
      unlocked: nonNullBureaus >= 2,
    },
    {
      id: "study_starter",
      name: "Study Starter",
      description: "Completed your first study module",
      icon: BookOpen,
      unlocked: studyCount > 0,
    },
    {
      id: "quiz_whiz",
      name: "Quiz Whiz",
      description: "Passed your first quiz",
      icon: Brain,
      unlocked: quizDone,
    },
    {
      id: "voice_listener",
      name: "Voice Listener",
      description: "Listened to your audio briefing",
      icon: Volume2,
      unlocked: briefingPlayed,
    },
    {
      id: "green_investor",
      name: "Green Investor",
      description: "Qualified for 5+ green investments",
      icon: TrendingUp,
      unlocked: investments.length >= 5,
    },
    {
      id: "top_tier",
      name: "Top Tier",
      description: "Achieved Tier A green readiness",
      icon: Award,
      unlocked: tier === "A",
    },
    {
      id: "carbon_crusher",
      name: "Carbon Crusher",
      description: "Potential to offset 5,000+ lbs CO\u2082/yr",
      icon: CloudOff,
      unlocked: totalCO2 > 5000,
    },
    {
      id: "debt_warrior",
      name: "Debt Warrior",
      description: "Managing debt responsibly",
      icon: Sword,
      unlocked: totalCreditLimit > 0 && totalDebt < totalCreditLimit * 0.5,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AchievementBadges({
  greenReadiness,
  investments,
  bureauScores,
}: AchievementBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Evaluate badges after mount so localStorage is available
  useEffect(() => {
    setBadges(evaluateBadges(greenReadiness, investments, bureauScores));
  }, [greenReadiness, investments, bureauScores]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const selectedBadge = badges.find((b) => b.id === selectedId) ?? null;

  if (badges.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-dew/40 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-canopy/10">
              <Trophy className="w-5 h-5 text-canopy" />
            </div>
            <h3 className="font-heading text-sm text-grove">Achievements</h3>
          </div>
          <span className="text-xs font-medium text-stone tabular-nums">
            {unlockedCount} / {badges.length} unlocked
          </span>
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            const isSelected = selectedId === badge.id;

            return (
              <button
                key={badge.id}
                onClick={() =>
                  setSelectedId(isSelected ? null : badge.id)
                }
                className="animate-badge-pop flex flex-col items-center gap-1.5 focus:outline-none group"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div
                  className={`
                    w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                    ${
                      badge.unlocked
                        ? "bg-gradient-to-br from-canopy to-grove shadow-md shadow-canopy/20 group-hover:shadow-lg group-hover:shadow-canopy/30 group-hover:scale-105"
                        : "bg-gray-100 opacity-50 grayscale"
                    }
                    ${isSelected ? "ring-2 ring-canopy ring-offset-2" : ""}
                  `}
                >
                  {badge.unlocked ? (
                    <Icon className="w-6 h-6 text-white" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <span
                  className={`text-xs text-center leading-tight truncate w-full ${
                    badge.unlocked ? "text-grove font-medium" : "text-gray-400"
                  }`}
                >
                  {badge.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedBadge && (
          <div className="animate-scale-in mt-4 p-4 rounded-xl border border-dew/40 bg-dawn/50 flex items-start gap-3">
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                selectedBadge.unlocked
                  ? "bg-gradient-to-br from-canopy to-grove"
                  : "bg-gray-100"
              }`}
            >
              {selectedBadge.unlocked ? (
                <selectedBadge.icon className="w-5 h-5 text-white" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-heading text-sm text-grove">
                  {selectedBadge.name}
                </h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    selectedBadge.unlocked
                      ? "bg-canopy/10 text-canopy border border-canopy/20"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {selectedBadge.unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
              <p className="text-xs text-stone leading-relaxed mt-1">
                {selectedBadge.description}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
