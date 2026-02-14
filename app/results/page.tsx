"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, ArrowLeft, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenScoreGauge } from "@/components/green-score-gauge";
import { CreditSummary } from "@/components/credit-summary";
import { GeminiInsights } from "@/components/gemini-insights";
import { ActionCards } from "@/components/action-cards";
import { ImpactChart } from "@/components/impact-chart";
import { CreditPath } from "@/components/credit-path";
import { GreenChat } from "@/components/green-chat";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";

interface ResultsData {
  userName: string;
  creditReport: Record<string, unknown>;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
}

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("greenpath-results");
    if (!stored) {
      router.push("/assess");
      return;
    }
    try {
      setData(JSON.parse(stored));
    } catch {
      router.push("/assess");
    }
    setLoading(false);
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen organic-bg grid-pattern">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-52 w-52 rounded-full mx-auto mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen organic-bg grid-pattern">
      {/* Header */}
      <nav className="glass-card border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/assess"
            className="flex items-center gap-2 text-grove hover:text-grove-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-grove flex items-center justify-center">
                <Leaf className="w-4 h-4 text-meadow" />
              </div>
              <span className="font-heading text-xl text-grove">
                GreenPath
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg border-dew/60 text-grove gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg border-dew/60 text-grove gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div className="animate-fade-up text-center">
          <h1 className="font-heading text-3xl sm:text-4xl text-grove mb-2">
            {data.userName}&apos;s Green Readiness Report
          </h1>
          <p className="text-stone text-sm">
            Generated on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Green Score Gauge */}
        <section className="animate-fade-up delay-100 flex justify-center">
          <GreenScoreGauge score={data.greenReadiness.score} tier={data.greenReadiness.tier} />
        </section>

        {/* Gemini Summary (under gauge) */}
        {data.geminiAnalysis?.summary && (
          <div className="animate-fade-up delay-200 max-w-2xl mx-auto text-center">
            <p className="text-soil leading-relaxed">{data.geminiAnalysis.summary}</p>
          </div>
        )}

        {/* Credit Snapshot */}
        <section>
          <h2 className="font-heading text-2xl text-grove mb-4">
            Credit Snapshot
          </h2>
          <CreditSummary data={data.greenReadiness} />
        </section>

        {/* Gemini AI Insights */}
        <section>
          <h2 className="font-heading text-2xl text-grove mb-4">
            AI Insights
          </h2>
          <GeminiInsights analysis={data.geminiAnalysis} />
        </section>

        {/* Green Action Plan */}
        <section>
          <h2 className="font-heading text-2xl text-grove mb-2">
            Your Green Action Plan
          </h2>
          <p className="text-stone text-sm mb-5">
            {data.investments.length} investments matched to your Tier {data.greenReadiness.tier} profile, sorted by environmental impact.
          </p>
          <ActionCards investments={data.investments} geminiAnalysis={data.geminiAnalysis} />
        </section>

        {/* Environmental Impact */}
        <section>
          <h2 className="font-heading text-2xl text-grove mb-4">
            Environmental Impact Dashboard
          </h2>
          <ImpactChart investments={data.investments} />
        </section>

        {/* Credit Improvement Path (only for C/D) */}
        <section>
          <CreditPath greenReadiness={data.greenReadiness} geminiAnalysis={data.geminiAnalysis} />
        </section>

        {/* Chat */}
        <section>
          <h2 className="font-heading text-2xl text-grove mb-4">
            Ask GreenPath AI
          </h2>
          <GreenChat greenReadiness={data.greenReadiness} investments={data.investments} />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dew/40 mt-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-canopy" />
            <span>GreenPath — Built for SF Hacks 2026</span>
          </div>
          <p>Powered by CRS Credit API &amp; Google Gemini</p>
        </div>
      </footer>
    </div>
  );
}
