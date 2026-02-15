"use client";

import { useState } from "react";
import {
  Sun, Car, Battery, Home, CarFront, Thermometer, Refrigerator,
  Gauge, Bike, Wind, Users, Lightbulb, Bus, ClipboardCheck, Sprout, Landmark,
  TreePine, DollarSign, ChevronDown, Wallet, CreditCard, BadgeDollarSign, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type GreenInvestment,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/green-investments";
import { formatCurrency, co2ToTrees } from "@/lib/utils";
import type { GeminiAnalysis } from "@/lib/gemini";
import type { PersonalizedInvestment } from "@/lib/tradeline-intelligence";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun, Car, Battery, Home, CarFront, Thermometer, Refrigerator,
  Gauge, Bike, Wind, Users, Lightbulb, Bus, ClipboardCheck, Sprout, Landmark,
};

interface ActionCardsProps {
  investments: GreenInvestment[];
  personalizedInvestments?: PersonalizedInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
  availableSavings?: number | null;
  tier?: "A" | "B" | "C" | "D";
}

export function ActionCards({ investments, personalizedInvestments, geminiAnalysis, availableSavings }: ActionCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getInsight = (id: string) => {
    if (!geminiAnalysis?.investmentInsights) return null;
    return geminiAnalysis.investmentInsights.find((i) => i.investmentId === id);
  };

  const getPersonalized = (id: string): PersonalizedInvestment | undefined => {
    return personalizedInvestments?.find((p) => p.investment.id === id);
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {investments.map((inv, i) => {
        const Icon = iconMap[inv.icon] || Lightbulb;
        const insight = getInsight(inv.id);
        const personalized = getPersonalized(inv.id);
        const isExpanded = expandedId === inv.id;
        const trees = co2ToTrees(inv.annualCO2ReductionLbs);

        return (
          <Card
            key={inv.id}
            className="animate-fade-up rounded-2xl border-dew/40 hover:shadow-md hover:shadow-canopy/10 transition-all duration-300 overflow-hidden group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardContent className="p-0">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-dawn flex items-center justify-center group-hover:bg-canopy/10 transition-colors">
                    <Icon className="w-5 h-5 text-canopy" />
                  </div>
                  <Badge variant="outline" className={`text-xs rounded-full ${getCategoryColor(inv.category)}`}>
                    {getCategoryLabel(inv.category)}
                  </Badge>
                </div>

                <h3 className="font-semibold text-grove text-lg mb-1">{inv.name}</h3>
                <p className="text-sm text-stone leading-relaxed mb-3">{inv.description}</p>

                {/* Match Reason */}
                {personalized?.matchReason && (
                  <div className="mb-3 p-2.5 rounded-lg bg-canopy/5 border border-canopy/15 text-xs text-grove-light leading-relaxed">
                    <span className="font-medium text-canopy">Why this fits you:</span>{" "}
                    {personalized.matchReason}
                  </div>
                )}

                {/* Federal Incentive */}
                {personalized && personalized.federalIncentive > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 text-canopy">
                    <BadgeDollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium">
                      {formatCurrency(inv.estimatedCost)} → {formatCurrency(personalized.effectiveCost)} after {personalized.incentiveLabel}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-canopy" />
                    <span className="text-soil">
                      {inv.estimatedCost === 0
                        ? "Free"
                        : personalized && personalized.federalIncentive > 0
                          ? formatCurrency(personalized.effectiveCost)
                          : formatCurrency(inv.estimatedCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TreePine className="w-3.5 h-3.5 text-canopy" />
                    <span className="text-soil">≈{trees} trees/yr</span>
                  </div>
                  {inv.annualSavings > 0 && (
                    <div className="text-canopy font-medium col-span-2">
                      Save {formatCurrency(inv.annualSavings)}/yr
                    </div>
                  )}
                </div>

                {/* Affordability badge */}
                {availableSavings != null && availableSavings > 0 && (
                  <div className="mt-3">
                    {inv.estimatedCost === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-canopy bg-canopy/10 px-2.5 py-1 rounded-full">
                        <Wallet className="w-3 h-3" /> Free — no cost
                      </span>
                    ) : inv.estimatedCost <= availableSavings ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-canopy bg-canopy/10 px-2.5 py-1 rounded-full">
                        <Wallet className="w-3 h-3" /> Can pay upfront from savings
                      </span>
                    ) : inv.estimatedCost <= availableSavings * 2 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sunbeam bg-sunbeam/10 px-2.5 py-1 rounded-full">
                        <CreditCard className="w-3 h-3" /> Partial savings + financing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-stone bg-stone/10 px-2.5 py-1 rounded-full">
                        <CreditCard className="w-3 h-3" /> Requires financing
                      </span>
                    )}
                  </div>
                )}

                {/* Gemini insight */}
                {insight && (
                  <div className="mt-3 p-3 rounded-lg bg-dawn/60 border border-dew/30 text-xs text-grove-light leading-relaxed">
                    <Sparkles className="w-3 h-3 inline mr-1 text-canopy" />
                    {insight.insight}
                  </div>
                )}
              </div>

              {/* Expandable detail */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-stone hover:text-grove bg-dawn/30 border-t border-dew/30 transition-colors"
              >
                {isExpanded ? "Less" : "More"} details
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 animate-fade-in text-sm text-soil leading-relaxed border-t border-dew/20">
                  <p className="pt-3">{inv.longDescription}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone">
                    {personalized && personalized.dynamicMonthlyPayment > 0 ? (
                      <div>Monthly at your rate: ~{formatCurrency(personalized.dynamicMonthlyPayment)}</div>
                    ) : inv.estimatedMonthlyPayment > 0 ? (
                      <div>Monthly: ~{formatCurrency(inv.estimatedMonthlyPayment)}</div>
                    ) : null}
                    {inv.roiYears > 0 && <div>Break-even: {inv.roiYears} yrs</div>}
                    <div>CO₂ saved: {inv.annualCO2ReductionLbs.toLocaleString()} lbs/yr</div>
                    <div>Difficulty: {inv.difficulty}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
