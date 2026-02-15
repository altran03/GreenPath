"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

// ---------------------------------------------------------------------------
// National averages (source constants)
// ---------------------------------------------------------------------------
const NATIONAL_AVG = {
  creditScore: 716,
  utilization: 0.3, // 30%
  co2FootprintLbs: 16_000, // avg US household per year
  greenSavings: 0, // avg person has no green investments
} as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface YouVsAverageProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return percentage width (0-100) of `value` relative to `max`. */
function barPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min((value / max) * 100, 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function YouVsAverage({ greenReadiness, investments }: YouVsAverageProps) {
  const [animated, setAnimated] = useState(false);

  // Trigger bar animation after a short mount delay
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Derived values
  const totalCO2Reduction = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.annualCO2ReductionLbs, 0),
    [investments],
  );

  const totalGreenSavings = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.annualSavings, 0),
    [investments],
  );

  // Build comparison rows ------------------------------------------------
  const rows: {
    label: string;
    userValue: number;
    avgValue: number;
    /** Max value used for bar width scaling */
    scaleMax: number;
    format: (v: number) => string;
    /** For utilization, lower is better */
    lowerIsBetter?: boolean;
  }[] = [
    {
      label: "Credit Score",
      userValue: greenReadiness.creditScore,
      avgValue: NATIONAL_AVG.creditScore,
      scaleMax: 850, // FICO max
      format: (v) => v.toLocaleString(),
    },
    {
      label: "Credit Utilization",
      userValue: greenReadiness.utilization * 100,
      avgValue: NATIONAL_AVG.utilization * 100,
      scaleMax: 100,
      format: (v) => `${Math.round(v)}%`,
      lowerIsBetter: true,
    },
    {
      label: "Potential CO\u2082 Offset",
      userValue: totalCO2Reduction,
      avgValue: NATIONAL_AVG.co2FootprintLbs,
      scaleMax: Math.max(totalCO2Reduction, NATIONAL_AVG.co2FootprintLbs, 1),
      format: (v) => `${formatNumber(Math.round(v))} lbs/yr`,
    },
    {
      label: "Green Savings",
      userValue: totalGreenSavings,
      avgValue: NATIONAL_AVG.greenSavings,
      scaleMax: Math.max(totalGreenSavings, 1),
      format: (v) => formatCurrency(v),
    },
  ];

  return (
    <Card className="rounded-2xl border-dew/40">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-canopy/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-canopy" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-grove leading-tight">
              You vs. Average American
            </h3>
            <p className="text-xs text-stone mt-0.5">
              See how your green readiness compares to the national average.
            </p>
          </div>
        </div>

        {/* Comparison rows */}
        <div className="divide-y divide-border">
          {rows.map((row, i) => {
            const isAbove = row.lowerIsBetter
              ? row.userValue < row.avgValue
              : row.userValue > row.avgValue;

            const userPct = barPercent(row.userValue, row.scaleMax);
            const avgPct = barPercent(row.avgValue, row.scaleMax);

            return (
              <div key={row.label} className="py-4 first:pt-0 last:pb-0">
                {/* Label + badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-grove">
                    {row.label}
                  </span>

                  <span
                    className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                      ${isAbove
                        ? "bg-dawn text-canopy"
                        : "bg-amber-50 text-amber-700"
                      }
                    `}
                  >
                    {isAbove ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {isAbove ? "Above avg" : "Below avg"}
                  </span>
                </div>

                {/* Bars */}
                <div className="space-y-2">
                  {/* User bar */}
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-[11px] font-medium text-grove shrink-0">
                      You
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-dawn overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-grove to-canopy"
                        style={{
                          width: animated ? `${userPct}%` : "0%",
                          transition: `width 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 100}ms`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-grove shrink-0">
                      {row.format(row.userValue)}
                    </span>
                  </div>

                  {/* National avg bar */}
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-[11px] font-medium text-stone shrink-0">
                      Avg
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-dawn overflow-hidden">
                      <div
                        className="h-full rounded-full bg-stone/40"
                        style={{
                          width: animated ? `${avgPct}%` : "0%",
                          transition: `width 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 100 + 50}ms`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-stone shrink-0">
                      {row.format(row.avgValue)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-stone/70 mt-5">
          National averages: credit score per Experian (2024); utilization at
          30% recommended threshold; CO&#8322; footprint per EPA average US
          household; green savings baseline assumes no active green investments.
        </p>
      </CardContent>
    </Card>
  );
}
