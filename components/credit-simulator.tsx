"use client";

import { useState } from "react";
import { Wand2, RotateCcw, TrendingUp, Unlock, ArrowRight, Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateGreenReadiness, type CreditData, type GreenReadiness } from "@/lib/green-scoring";
import { getRecommendedInvestments, type GreenInvestment } from "@/lib/green-investments";
import {
  getEstimatedRate,
  calculateMonthlyPayment,
  formatCurrency,
  co2ToTrees,
  getTierLabel,
} from "@/lib/utils";

interface CreditSimulatorProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  availableSavings?: number | null;
}

function Counter({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg border border-dew/60 flex items-center justify-center text-grove hover:bg-dawn/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-8 text-center font-medium text-grove tabular-nums">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-lg border border-dew/60 flex items-center justify-center text-grove hover:bg-dawn/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function CreditSimulator({ greenReadiness, investments, availableSavings }: CreditSimulatorProps) {
  const maxPaydown = Math.round(greenReadiness.utilization * greenReadiness.totalCreditLimit);
  const [debtPaydown, setDebtPaydown] = useState(0);
  const [scoreImprovement, setScoreImprovement] = useState(0);
  const [derogatoryRemoved, setDerogatoryRemoved] = useState(0);
  const [newAccounts, setNewAccounts] = useState(0);

  // Simulate
  const newRevolvingBalance = Math.max(0, maxPaydown - debtPaydown);
  const newUtilization = greenReadiness.totalCreditLimit > 0
    ? newRevolvingBalance / greenReadiness.totalCreditLimit
    : 0;

  const simulatedCreditData: CreditData = {
    creditScore: Math.min(850, greenReadiness.creditScore + scoreImprovement),
    utilization: newUtilization,
    totalDebt: Math.max(0, greenReadiness.totalDebt - debtPaydown),
    totalCreditLimit: greenReadiness.totalCreditLimit,
    derogatoryCount: Math.max(0, greenReadiness.derogatoryCount - derogatoryRemoved),
    tradelineCount: greenReadiness.tradelineCount + newAccounts,
  };

  const simulated = calculateGreenReadiness(simulatedCreditData, availableSavings);
  const simInvestments = getRecommendedInvestments(simulated.tier);
  const simRate = getEstimatedRate(simulated.tier);
  const currentRate = getEstimatedRate(greenReadiness.tier);

  const currentIds = new Set(investments.map((i) => i.id));
  const newlyUnlocked = simInvestments.filter((i) => !currentIds.has(i.id));

  const scoreDelta = simulated.score - greenReadiness.score;
  const tierChanged = simulated.tier !== greenReadiness.tier;
  const hasChanges = debtPaydown > 0 || scoreImprovement > 0 || derogatoryRemoved > 0 || newAccounts > 0;

  // Solar panel payment comparison
  const solarCost = 25000;
  const solarPaymentCurrent = calculateMonthlyPayment(solarCost, currentRate, 25);
  const solarPaymentSimulated = calculateMonthlyPayment(solarCost, simRate, 25);
  const monthlySaving = solarPaymentCurrent - solarPaymentSimulated;

  const totalCo2Sim = simInvestments.reduce((s, i) => s + i.annualCO2ReductionLbs, 0);
  const totalCo2Current = investments.reduce((s, i) => s + i.annualCO2ReductionLbs, 0);

  const debtFillPct = maxPaydown > 0 ? (debtPaydown / maxPaydown) * 100 : 0;
  const scoreFillPct = (scoreImprovement / 100) * 100;

  function reset() {
    setDebtPaydown(0);
    setScoreImprovement(0);
    setDerogatoryRemoved(0);
    setNewAccounts(0);
  }

  return (
    <Card className="rounded-2xl border-dew/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-grove to-grove-light">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-sunbeam" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-white">Credit Simulator</h3>
            <p className="text-xs text-meadow/70">See how changes affect your green readiness</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Sliders */}
            <div className="flex-1 space-y-6">
              {/* Pay Down Debt */}
              {maxPaydown > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-grove">Pay Down Revolving Debt</label>
                    <span className="text-sm font-medium text-canopy tabular-nums">{formatCurrency(debtPaydown)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxPaydown}
                    step={Math.max(1, Math.round(maxPaydown / 100))}
                    value={debtPaydown}
                    onChange={(e) => setDebtPaydown(Number(e.target.value))}
                    className="simulator-slider w-full"
                    style={{ "--fill": `${debtFillPct}%` } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-stone mt-1">
                    <span>$0</span>
                    <span>{formatCurrency(maxPaydown)}</span>
                  </div>
                </div>
              )}

              {/* Credit Score Improvement */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-grove">Credit Score Improvement</label>
                  <span className="text-sm font-medium text-canopy tabular-nums">+{scoreImprovement} pts</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={scoreImprovement}
                  onChange={(e) => setScoreImprovement(Number(e.target.value))}
                  className="simulator-slider w-full"
                  style={{ "--fill": `${scoreFillPct}%` } as React.CSSProperties}
                />
                <div className="flex justify-between text-xs text-stone mt-1">
                  <span>Current ({greenReadiness.creditScore})</span>
                  <span>{Math.min(850, greenReadiness.creditScore + 100)}</span>
                </div>
              </div>

              {/* Derogatory Marks */}
              {greenReadiness.derogatoryCount > 0 && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-grove">Remove Derogatory Marks</label>
                  <Counter
                    value={derogatoryRemoved}
                    min={0}
                    max={greenReadiness.derogatoryCount}
                    onChange={setDerogatoryRemoved}
                  />
                </div>
              )}

              {/* New Accounts */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-grove">Open New Accounts</label>
                <Counter value={newAccounts} min={0} max={3} onChange={setNewAccounts} />
              </div>

              {/* Reset */}
              {hasChanges && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-stone hover:text-grove gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset all
                </Button>
              )}
            </div>

            {/* Right: Live Results */}
            <div className="flex-1 space-y-4">
              {/* Score transition */}
              <div className={`rounded-2xl p-5 transition-colors duration-500 ${tierChanged ? "bg-canopy/10 border border-canopy/20" : "bg-dawn border border-dew/40"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-canopy" />
                  <span className="text-sm font-medium text-grove">Projected Readiness</span>
                </div>

                {/* Score */}
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-stone line-through text-lg tabular-nums">{greenReadiness.score}</span>
                  <ArrowRight className="w-4 h-4 text-stone/50" />
                  <span className={`text-3xl font-heading tabular-nums transition-all duration-300 ${tierChanged ? "text-canopy" : "text-grove"}`}>
                    {simulated.score}
                  </span>
                  {scoreDelta !== 0 && (
                    <span className={`text-sm font-medium ${scoreDelta > 0 ? "text-canopy" : "text-red-500"}`}>
                      {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                    </span>
                  )}
                </div>

                {/* Tier */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-stone">
                    Tier {greenReadiness.tier}
                  </Badge>
                  {tierChanged && (
                    <>
                      <ArrowRight className="w-3 h-3 text-canopy" />
                      <Badge className={`bg-canopy text-white animate-scale-in`}>
                        Tier {simulated.tier} — {getTierLabel(simulated.tier)}
                      </Badge>
                    </>
                  )}
                  {!tierChanged && (
                    <span className="text-xs text-stone">Tier {greenReadiness.tier} — {getTierLabel(greenReadiness.tier)}</span>
                  )}
                </div>
              </div>

              {/* Rate + Investments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-dawn border border-dew/40 p-3">
                  <p className="text-xs text-stone mb-1">Est. APR</p>
                  <p className="font-heading text-lg tabular-nums">
                    <span className={simRate < currentRate ? "text-canopy" : "text-grove"}>{simRate}%</span>
                    {simRate !== currentRate && (
                      <span className="text-xs text-stone ml-1">was {currentRate}%</span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-dawn border border-dew/40 p-3">
                  <p className="text-xs text-stone mb-1">Investments</p>
                  <p className="font-heading text-lg tabular-nums">
                    <span className="text-grove">{simInvestments.length}</span>
                    {newlyUnlocked.length > 0 && (
                      <span className="text-xs text-canopy ml-1">+{newlyUnlocked.length} new</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Monthly payment comparison */}
              {tierChanged && monthlySaving > 0 && (
                <div className="rounded-xl bg-sunbeam/8 border border-sunbeam/20 p-4 animate-fade-up">
                  <p className="text-sm text-soil">
                    <span className="font-medium">$25K solar panels:</span>{" "}
                    <span className="text-canopy font-medium">{formatCurrency(Math.round(solarPaymentSimulated))}/mo</span>{" "}
                    instead of {formatCurrency(Math.round(solarPaymentCurrent))}/mo
                    <span className="text-canopy font-medium"> — save {formatCurrency(Math.round(monthlySaving))}/mo</span>
                  </p>
                </div>
              )}

              {/* Newly unlocked */}
              {newlyUnlocked.length > 0 && (
                <div className="space-y-2 animate-fade-up">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-canopy" />
                    <p className="text-sm font-medium text-grove">Newly Unlocked</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {newlyUnlocked.map((inv) => (
                      <Badge
                        key={inv.id}
                        variant="outline"
                        className="text-xs bg-canopy/5 border-canopy/20 text-grove"
                      >
                        {inv.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* CO2 impact delta */}
              {totalCo2Sim !== totalCo2Current && (
                <p className="text-xs text-stone">
                  Potential impact: {co2ToTrees(totalCo2Sim).toLocaleString()} trees/yr
                  {totalCo2Sim > totalCo2Current && (
                    <span className="text-canopy"> (+{co2ToTrees(totalCo2Sim - totalCo2Current).toLocaleString()} more)</span>
                  )}
                </p>
              )}

              {!hasChanges && (
                <p className="text-sm text-stone italic">Drag the sliders to see how changes affect your green readiness.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
