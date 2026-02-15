"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatNumber,
  co2ToTrees,
  co2ToMilesNotDriven,
  getTierLabel,
  getEstimatedRate,
} from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";
import type { PersonalizedInvestment } from "@/lib/tradeline-intelligence";

interface ResultsData {
  userName: string;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  personalizedInvestments?: PersonalizedInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
  availableSavings: number | null;
  bureauScores?: Record<string, number | null>;
}

export default function ReportPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("greenpath-results");
    if (!stored) {
      router.push("/assess");
      return;
    }
    try {
      setData(JSON.parse(stored) as ResultsData);
    } catch {
      router.push("/assess");
    }
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone">Loading report...</p>
      </div>
    );
  }

  const { greenReadiness, investments, geminiAnalysis, bureauScores } = data;
  const totalCo2 = investments.reduce((s, i) => s + i.annualCO2ReductionLbs, 0);
  const totalSavings = investments.reduce((s, i) => s + i.annualSavings, 0);
  const trees = co2ToTrees(totalCo2);
  const miles = co2ToMilesNotDriven(totalCo2);
  const rate = getEstimatedRate(greenReadiness.tier);
  const topInvestments = investments.slice(0, 6);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <Button
          onClick={() => window.print()}
          className="bg-grove hover:bg-grove-light text-white gap-2 shadow-lg"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grove flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GreenPath</h1>
              <p className="text-sm text-gray-500">Green Readiness Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">{data.userName}</p>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Score + Tier */}
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Green Readiness Score</p>
              <p className="text-5xl font-bold text-gray-900">{greenReadiness.score}<span className="text-xl text-gray-400">/100</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Tier</p>
              <p className="text-3xl font-bold text-gray-900">
                {greenReadiness.tier} — {getTierLabel(greenReadiness.tier)}
              </p>
              <p className="text-sm text-gray-500">Est. APR: {rate}%</p>
            </div>
          </div>
        </div>

        {/* Bureau Scores */}
        {bureauScores && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Tri-Bureau Credit Scores</h2>
            <div className="grid grid-cols-3 gap-4">
              {(["experian", "transunion", "equifax"] as const).map((bureau) => (
                <div key={bureau} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{bureau}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bureauScores[bureau] ?? "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit Snapshot */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Credit Snapshot</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Credit Score</p>
              <p className="text-xl font-bold">{greenReadiness.creditScore}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Utilization</p>
              <p className="text-xl font-bold">{(greenReadiness.utilization * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Total Debt</p>
              <p className="text-xl font-bold">{formatCurrency(greenReadiness.totalDebt)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Open Accounts</p>
              <p className="text-xl font-bold">{greenReadiness.tradelineCount}</p>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {geminiAnalysis?.summary && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Assessment</h2>
            <p className="text-gray-700 leading-relaxed">{geminiAnalysis.summary}</p>
          </div>
        )}

        {/* Top Investments */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Recommended Green Investments ({investments.length} total)
          </h2>
          <div className="space-y-3">
            {topInvestments.map((inv, i) => {
              const personalized = data.personalizedInvestments?.find((p) => p.investment.id === inv.id);
              return (
                <div key={inv.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-400 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{inv.name}</p>
                    <p className="text-sm text-gray-500">{inv.description}</p>
                    {personalized?.incentiveLabel && personalized.federalIncentive > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">
                        {formatCurrency(inv.estimatedCost)} → {formatCurrency(personalized.effectiveCost)} after {personalized.incentiveLabel}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">
                      {inv.estimatedCost > 0
                        ? personalized && personalized.federalIncentive > 0
                          ? formatCurrency(personalized.effectiveCost)
                          : formatCurrency(inv.estimatedCost)
                        : "Free"}
                    </p>
                    <p className="text-xs text-gray-500">Save {formatCurrency(inv.annualSavings)}/yr</p>
                    <p className="text-xs text-gray-500">{co2ToTrees(inv.annualCO2ReductionLbs)} trees/yr</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Combined Environmental Impact</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalCo2)}</p>
              <p className="text-xs text-gray-500">lbs CO2/year saved</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(trees)}</p>
              <p className="text-xs text-gray-500">tree equivalents</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(miles)}</p>
              <p className="text-xs text-gray-500">miles not driven</p>
            </div>
          </div>
        </div>

        {/* Total Savings */}
        <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
          <p className="text-sm text-gray-500">Estimated Annual Savings (all investments)</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSavings)}/year</p>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t-2 border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5" />
            <span>Generated by GreenPath — Powered by CRS Credit API</span>
          </div>
          <span>SF Hacks 2026</span>
        </div>
      </div>
    </div>
  );
}
