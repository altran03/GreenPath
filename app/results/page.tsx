"use client";

import { useEffect, useState, useCallback } from "react";
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
import { BureauComparison } from "@/components/bureau-comparison";
import { VerificationBadges } from "@/components/verification-badges";
import { AnomalyBanner } from "@/components/anomaly-banner";
import { DataQualityReport } from "@/components/data-quality-report";
import { DuplicateAccounts } from "@/components/duplicate-accounts";
import { detectAnomalies, type AnomalyReport } from "@/lib/anomaly-detection";
import { runDataQualityReport, type DataQualityReport as DataQualityReportType } from "@/lib/data-quality";
import { detectDuplicateTradelines, type DuplicateGroup } from "@/lib/duplicate-tradelines";
import { extractCreditData, calculateGreenReadiness } from "@/lib/green-scoring";
import { getRecommendedInvestments } from "@/lib/green-investments";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";

interface ResultsData {
  userName: string;
  creditReport: Record<string, unknown>;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
  availableSavings: number | null;
  // CRS data
  bureauScores?: Record<string, number | null>;
  triBureau?: Record<string, Record<string, unknown> | null>;
  flexIdResult?: { verified: boolean; notRegistered?: boolean; riskScore?: number; summary: string; raw?: Record<string, unknown> } | null;
  fraudResult?: { riskLevel: "low" | "medium" | "high" | "unknown"; signals: string[]; summary: string; raw?: Record<string, unknown> } | null;
  // Original form for anomaly correction
  originalForm?: Record<string, string>;
}

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [dataQualityReport, setDataQualityReport] = useState<DataQualityReportType | null>(null);
  const [duplicateTradelines, setDuplicateTradelines] = useState<DuplicateGroup[]>([]);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("greenpath-results");
    if (!stored) {
      router.push("/assess");
      return;
    }
    try {
      const parsed = JSON.parse(stored) as ResultsData;
      setData(parsed);

      // Run anomaly detection
      if (parsed.originalForm) {
        const report = detectAnomalies({
          formData: {
            firstName: parsed.originalForm.firstName || "",
            lastName: parsed.originalForm.lastName || "",
            ssn: parsed.originalForm.ssn || "",
            birthDate: parsed.originalForm.birthDate || "",
            addressLine1: parsed.originalForm.addressLine1 || "",
            city: parsed.originalForm.city || "",
            state: parsed.originalForm.state || "",
            postalCode: parsed.originalForm.postalCode || "",
            phone: parsed.originalForm.phone || "",
            email: parsed.originalForm.email || "",
          },
          flexIdResult: parsed.flexIdResult
            ? { ...parsed.flexIdResult, raw: parsed.flexIdResult.raw || {} }
            : null,
          fraudResult: parsed.fraudResult
            ? { ...parsed.fraudResult, raw: parsed.fraudResult.raw || {} }
            : null,
          bureauScores: parsed.bureauScores || {},
          triBureau: parsed.triBureau,
        });
        setAnomalyReport(report);
      }
      // Data quality and duplicate tradelines (run on stored CRS payloads)
      setDataQualityReport(
        runDataQualityReport({
          triBureau: parsed.triBureau,
          flexIdResult: parsed.flexIdResult ?? null,
          fraudResult: parsed.fraudResult ?? null,
        })
      );
      setDuplicateTradelines(detectDuplicateTradelines({ triBureau: parsed.triBureau }) ?? []);
    } catch {
      router.push("/assess");
    }
    setLoading(false);
  }, [router]);

  /** Re-run the entire pipeline with corrected form data */
  const handleResubmit = useCallback(async (correctedForm: Record<string, string>) => {
    if (!data) return;
    setResubmitting(true);

    try {
      // Step 1: Auth
      const authRes = await fetch("/api/auth", { method: "POST" });
      if (!authRes.ok) throw new Error("Authentication failed");

      // Step 2: FlexID re-verification
      let flexIdResult = null;
      try {
        const flexRes = await fetch("/api/flex-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: correctedForm.firstName,
            lastName: correctedForm.lastName,
            ssn: correctedForm.ssn,
            dateOfBirth: correctedForm.birthDate,
            streetAddress: correctedForm.addressLine1,
            city: correctedForm.city,
            state: correctedForm.state,
            zipCode: correctedForm.postalCode,
            homePhone: correctedForm.phone,
          }),
        });
        if (flexRes.ok) flexIdResult = await flexRes.json();
      } catch {
        console.warn("FlexID re-verification failed");
      }

      // Step 3: Credit + Fraud in parallel
      const [reportRes, fraudRes] = await Promise.all([
        fetch("/api/credit-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(correctedForm),
        }),
        (async () => {
          try {
            const res = await fetch("/api/fraud-finder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: correctedForm.firstName,
                lastName: correctedForm.lastName,
                email: correctedForm.email || undefined,
                phoneNumber: correctedForm.phone || undefined,
                addressLine1: correctedForm.addressLine1,
                city: correctedForm.city,
                state: correctedForm.state,
                postalCode: correctedForm.postalCode,
              }),
            });
            if (res.ok) return res.json();
            return null;
          } catch {
            return null;
          }
        })(),
      ]);

      if (!reportRes.ok) throw new Error("Credit report re-pull failed");
      const creditReport = await reportRes.json();

      const triBureau = creditReport._triBureau || {
        experian: creditReport,
        transunion: null,
        equifax: null,
      };

      const bureauScores: Record<string, number | null> = {
        experian: extractScore(triBureau.experian),
        transunion: extractScore(triBureau.transunion),
        equifax: extractScore(triBureau.equifax),
      };
      const bureaus = ["experian", "transunion", "equifax"] as const;
      const scoresWithBureaus = bureaus
        .map((b) => ({ bureau: b, score: bureauScores[b], report: triBureau[b] }))
        .filter((x) => x.score != null && x.score > 0 && x.report);
      const minEntry =
        scoresWithBureaus.length > 0
          ? scoresWithBureaus.reduce((a, b) => (a.score! <= b.score! ? a : b))
          : null;
      const displayReport =
        minEntry?.report ?? triBureau.experian ?? triBureau.transunion ?? triBureau.equifax ?? creditReport;
      const creditData = extractCreditData(displayReport);
      const greenReadiness = calculateGreenReadiness(creditData);
      const investments = getRecommendedInvestments(greenReadiness.tier);
      const primaryReport = displayReport;

      // Gemini re-analysis
      let geminiAnalysis = null;
      try {
        const analysisRes = await fetch("/api/green-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ greenReadiness, recommendedInvestments: investments, bureauScores }),
        });
        if (analysisRes.ok) geminiAnalysis = await analysisRes.json();
      } catch {
        /* non-fatal */
      }

      const savings = correctedForm.availableSavings ? parseFloat(correctedForm.availableSavings) : null;
      const newResults: ResultsData = {
        userName: `${correctedForm.firstName} ${correctedForm.lastName}`,
        creditReport: primaryReport,
        greenReadiness,
        investments,
        geminiAnalysis,
        availableSavings: savings,
        bureauScores,
        triBureau,
        flexIdResult,
        fraudResult: fraudRes,
        originalForm: correctedForm,
      };

      // Update session + state
      sessionStorage.setItem("greenpath-results", JSON.stringify(newResults));
      setData(newResults);

      // Re-run anomaly detection
      const report = detectAnomalies({
        formData: {
          firstName: correctedForm.firstName || "",
          lastName: correctedForm.lastName || "",
          ssn: correctedForm.ssn || "",
          birthDate: correctedForm.birthDate || "",
          addressLine1: correctedForm.addressLine1 || "",
          city: correctedForm.city || "",
          state: correctedForm.state || "",
          postalCode: correctedForm.postalCode || "",
          phone: correctedForm.phone || "",
          email: correctedForm.email || "",
        },
        flexIdResult: flexIdResult ? { ...flexIdResult, raw: flexIdResult.raw || {} } : null,
        fraudResult: fraudRes ? { ...fraudRes, raw: fraudRes.raw || {} } : null,
        bureauScores,
        triBureau: newResults.triBureau,
      });
      setAnomalyReport(report);
      setDataQualityReport(
        runDataQualityReport({
          triBureau: newResults.triBureau,
          flexIdResult: newResults.flexIdResult ?? null,
          fraudResult: newResults.fraudResult ?? null,
        })
      );
      setDuplicateTradelines(detectDuplicateTradelines({ triBureau: newResults.triBureau }) ?? []);
    } catch (err) {
      console.error("[anomaly-resubmit]", err);
      alert(err instanceof Error ? err.message : "Re-verification failed. Please try again.");
    } finally {
      setResubmitting(false);
    }
  }, [data]);

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

  // Count how many CRS products were used
  const crsProductsUsed: string[] = ["Experian Prequal"];
  if (data.triBureau?.transunion) crsProductsUsed.push("TransUnion Prequal");
  if (data.triBureau?.equifax) crsProductsUsed.push("Equifax Prequal");
  if (data.flexIdResult) crsProductsUsed.push("LexisNexis FlexID");
  if (data.fraudResult) crsProductsUsed.push("Fraud Finder");

  return (
    <div className="min-h-screen organic-bg grid-pattern">
      {/* Header */}
      <nav className="glass-card border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/assess"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-grove hover:text-grove-light hover:bg-white/10 transition-colors"
              aria-label="Back to assessment"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-grove hover:text-grove-light transition-colors"
              aria-label="GreenPath home"
            >
              <div className="w-7 h-7 rounded-lg bg-grove flex items-center justify-center">
                <Leaf className="w-4 h-4 text-meadow" />
              </div>
              <span className="font-heading text-xl text-grove">
                GreenPath
              </span>
            </Link>
          </div>
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
            {data.userName}&apos;s Credit Health &amp; Green Readiness
          </h1>
          <p className="text-stone text-sm">
            Based on your verified credit profile. Generated on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            <span className="text-canopy font-medium">{crsProductsUsed.length} CRS products used</span>
          </p>
        </div>

        {/* Anomaly Banner — top of dashboard when anomalies exist */}
        {anomalyReport?.hasAnomalies && data.originalForm && (
          <section className="animate-fade-up">
            <AnomalyBanner
              anomalyReport={anomalyReport}
              originalForm={data.originalForm}
              onResubmit={handleResubmit}
              resubmitting={resubmitting}
            />
          </section>
        )}

        {/* Verification Badges (FlexID + Fraud) */}
        {(data.flexIdResult || data.fraudResult) && (
          <section className="animate-fade-up delay-100">
            <VerificationBadges
              flexIdResult={data.flexIdResult || null}
              fraudResult={data.fraudResult || null}
            />
          </section>
        )}

        {/* Tri-Bureau Credit Comparison — above score so user sees full credit picture first */}
        {data.bureauScores && data.triBureau && (
          <section className="animate-fade-up delay-150">
            <h2 className="font-heading text-2xl text-grove mb-4">
              Your Credit Picture
            </h2>
            {!anomalyReport?.hasAnomalies && (
              <p className="text-stone text-sm mb-4">
                Here’s how you look across the bureaus — we use this to show what sustainable financing you qualify for below.
              </p>
            )}
            <BureauComparison bureauScores={data.bureauScores} triBureau={data.triBureau} />
          </section>
        )}

        {/* Data quality & duplicate accounts */}
        {(dataQualityReport || duplicateTradelines.length > 0) && (
          <section className="animate-fade-up delay-175 space-y-4">
            <h2 className="font-heading text-2xl text-grove mb-2">
              Data quality &amp; duplicate accounts
            </h2>
            <p className="text-stone text-sm mb-4">
              We check your credit data for completeness and flag possible duplicate accounts so you have a clear picture.
            </p>
            <div className="grid gap-4">
              {dataQualityReport && <DataQualityReport report={dataQualityReport} />}
              {duplicateTradelines.length > 0 && <DuplicateAccounts groups={duplicateTradelines} />}
            </div>
          </section>
        )}

        {/* Green Score Gauge — score/tier use lowest bureau when multiple exist */}
        <section className="animate-fade-up delay-200 flex flex-col items-center">
          <GreenScoreGauge score={data.greenReadiness.score} tier={data.greenReadiness.tier} />
          {data.bureauScores && Object.values(data.bureauScores).filter((s) => s != null).length >= 2 && (
            <p className="text-xs text-stone mt-3 max-w-sm text-center">
              Green Readiness uses your lowest bureau score so you&apos;re prepared no matter which bureau a lender pulls.
            </p>
          )}
        </section>

        {/* Gemini Summary (under gauge) */}
        {data.geminiAnalysis?.summary && (
          <div className="animate-fade-up delay-300 max-w-2xl mx-auto text-center">
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
          <p className="text-stone text-sm mb-1">
            Based on your verified profile: {data.investments.length} sustainable financing options you qualify for (Tier {data.greenReadiness.tier}), sorted by environmental impact. Below is your roadmap to unlock more as your credit improves.
          </p>
          <p className="text-stone text-xs mb-5">
            Each card shows estimated cost, annual savings, and tree-equivalent impact. Start with high-impact, low-cost options like transit or community solar if they fit your lifestyle.
          </p>
          <ActionCards investments={data.investments} geminiAnalysis={data.geminiAnalysis} availableSavings={data.availableSavings} />
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
          <GreenChat
            greenReadiness={data.greenReadiness}
            investments={data.investments}
            availableSavings={data.availableSavings}
            bureauScores={data.bureauScores}
            flexIdVerified={data.flexIdResult?.verified}
            fraudRiskLevel={data.fraudResult?.riskLevel}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dew/40 mt-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-canopy" />
            <span>GreenPath — Built for SF Hacks 2026</span>
          </div>
          <p>Powered by CRS Credit API ({crsProductsUsed.length} products) &amp; Google Gemini</p>
        </div>
      </footer>
    </div>
  );
}

/** Helper to extract score from a CRS response */
function extractScore(report: Record<string, unknown> | null): number | null {
  if (!report) return null;
  const scores = report.scores as Array<Record<string, unknown>> | undefined;
  if (scores && scores.length > 0) {
    const raw = scores[0].scoreValue ?? scores[0].value ?? "0";
    const val = parseInt(String(raw), 10);
    return val > 0 ? val : null;
  }
  return null;
}
