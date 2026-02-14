"use client";

import { Sparkles, ChevronDown, ChevronUp, TrendingUp, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import type { GeminiAnalysis } from "@/lib/gemini";

interface GeminiInsightsProps {
  analysis: GeminiAnalysis | null;
}

export function GeminiInsights({ analysis }: GeminiInsightsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!analysis) {
    return (
      <Card className="rounded-2xl border-dew/40 bg-dawn/30">
        <CardContent className="p-6 text-center text-stone">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-stone/50" />
          AI insights unavailable — showing algorithmic results only.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up delay-300 rounded-2xl border-canopy/20 bg-gradient-to-br from-dawn via-white to-dawn overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-dew/40 bg-dawn/40">
          <div className="w-9 h-9 rounded-xl bg-canopy/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-canopy" />
          </div>
          <div>
            <h3 className="font-semibold text-grove text-lg">GreenPath AI Insights</h3>
            <p className="text-xs text-stone">Powered by Google Gemini</p>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-5">
          <p className="text-grove leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Credit Tips (if any) */}
        {analysis.creditTips && analysis.creditTips.length > 0 && (
          <div className="px-6 pb-4">
            <div className="p-4 rounded-xl bg-sunbeam/10 border border-sunbeam/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-sunbeam" />
                <span className="text-sm font-semibold text-bark">Credit Improvement Tips</span>
              </div>
              <ul className="space-y-2">
                {analysis.creditTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-soil">
                    <Lightbulb className="w-4 h-4 text-sunbeam shrink-0 mt-0.5" />
                    <div>
                      <span>{tip.tip}</span>
                      {tip.impact && (
                        <span className="block text-xs text-stone mt-0.5">{tip.impact}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Expandable Investment Insights */}
        {analysis.investmentInsights && analysis.investmentInsights.length > 0 && (
          <div className="px-6 pb-5">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-canopy hover:text-grove transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Hide" : "Show"} personalized investment insights ({analysis.investmentInsights.length})
            </button>
            {expanded && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {analysis.investmentInsights.map((insight, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white border border-dew/40 text-sm text-soil"
                  >
                    <span className="font-medium text-grove">{insight.investmentId}:</span>{" "}
                    {insight.insight}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total Impact */}
        {analysis.totalImpactStatement && (
          <div className="px-6 py-4 bg-grove/5 border-t border-dew/40">
            <p className="text-sm text-grove font-medium">
              🌍 {analysis.totalImpactStatement}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
