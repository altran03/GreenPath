"use client";

import { TrendingUp, ArrowRight, Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTierLabel, getTierBgColor } from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GeminiAnalysis } from "@/lib/gemini";

interface CreditPathProps {
  greenReadiness: GreenReadiness;
  geminiAnalysis: GeminiAnalysis | null;
}

export function CreditPath({ greenReadiness, geminiAnalysis }: CreditPathProps) {
  // Only show for tier C and D
  if (greenReadiness.tier !== "C" && greenReadiness.tier !== "D") return null;

  const targetTier = greenReadiness.tier === "D" ? "C" : "B";
  const tips = geminiAnalysis?.creditTips || [];

  const unlockedAtTarget = greenReadiness.tier === "D"
    ? ["E-Bike", "Community Solar", "LED Upgrade", "Weatherization"]
    : ["Used EV", "Heat Pump", "Energy Star Appliances", "Smart Thermostat"];

  return (
    <Card className="animate-fade-up delay-500 rounded-2xl border-sunbeam/30 bg-gradient-to-br from-sunbeam/5 via-white to-sunbeam/5 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-sunbeam/20 bg-sunbeam/5">
          <div className="w-9 h-9 rounded-xl bg-sunbeam/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-sunbeam" />
          </div>
          <div>
            <h3 className="font-semibold text-grove text-lg">Credit Improvement Path</h3>
            <p className="text-xs text-stone">Steps to unlock more green investments</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`px-3 py-1.5 rounded-full text-white text-sm font-semibold ${getTierBgColor(greenReadiness.tier)}`}>
              Tier {greenReadiness.tier}
            </div>
            <div className="flex-1 h-2 bg-dew rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sunbeam to-canopy rounded-full transition-all duration-1000"
                style={{ width: `${greenReadiness.score}%` }}
              />
            </div>
            <div className={`px-3 py-1.5 rounded-full text-white text-sm font-semibold ${getTierBgColor(targetTier)}`}>
              Tier {targetTier}
            </div>
          </div>

          <p className="text-sm text-soil mb-5">
            You&apos;re currently at <strong>Tier {greenReadiness.tier} ({getTierLabel(greenReadiness.tier)})</strong>. Here&apos;s how to reach{" "}
            <strong>Tier {targetTier} ({getTierLabel(targetTier)})</strong> and unlock more green investments:
          </p>

          {/* Tips */}
          {tips.length > 0 ? (
            <div className="space-y-3 mb-6">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-dew/40">
                  <div className="w-7 h-7 rounded-lg bg-canopy/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-canopy">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-grove font-medium">{tip.tip}</p>
                    {tip.impact && <p className="text-xs text-stone mt-1">{tip.impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {greenReadiness.factors
                .filter((f) => f.impact === "negative")
                .map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-dew/40">
                    <div className="w-7 h-7 rounded-lg bg-canopy/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-canopy">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-grove font-medium">{f.label}</p>
                      <p className="text-xs text-stone mt-1">{f.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* What unlocks */}
          <div className="p-4 rounded-xl bg-dawn border border-dew/40">
            <div className="flex items-center gap-2 mb-3">
              <Unlock className="w-4 h-4 text-canopy" />
              <span className="text-sm font-semibold text-grove">
                Reaching Tier {targetTier} unlocks:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedAtTarget.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-canopy/10 text-canopy text-xs font-medium">
                  <Lock className="w-3 h-3" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
