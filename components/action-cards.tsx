"use client";

import { useState } from "react";
import {
  Sun, Car, Battery, Home, CarFront, Thermometer, Refrigerator,
  Gauge, Bike, Wind, Users, Lightbulb, Bus, ClipboardCheck, Sprout, Landmark,
  TreePine, DollarSign, ChevronDown, Wallet, CreditCard,
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun, Car, Battery, Home, CarFront, Thermometer, Refrigerator,
  Gauge, Bike, Wind, Users, Lightbulb, Bus, ClipboardCheck, Sprout, Landmark,
};

interface ActionCardsProps {
  investments: GreenInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
  availableSavings?: number | null;
}

export function ActionCards({ investments, geminiAnalysis, availableSavings }: ActionCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getInsight = (id: string) => {
    if (!geminiAnalysis?.investmentInsights) return null;
    return geminiAnalysis.investmentInsights.find((i) => i.investmentId === id);
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {investments.map((inv, i) => {
        const Icon = iconMap[inv.icon] || Lightbulb;
        const insight = getInsight(inv.id);
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
                <p className="text-sm text-stone leading-relaxed mb-4">{inv.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-canopy" />
                    <span className="text-soil">
                      {inv.estimatedCost === 0 ? "Free" : formatCurrency(inv.estimatedCost)}
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
                    ✨ {insight.insight}
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
                    {inv.estimatedMonthlyPayment > 0 && (
                      <div>Monthly: ~{formatCurrency(inv.estimatedMonthlyPayment)}</div>
                    )}
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
