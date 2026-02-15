"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  ArrowLeft,
  Download,
  Share2,
  Shield,
  GraduationCap,
  Sparkles,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GreenScoreGauge } from "@/components/green-score-gauge";
import { CreditSummary } from "@/components/credit-summary";
import { GeminiInsights } from "@/components/gemini-insights";
import { ActionCards } from "@/components/action-cards";
import { ImpactChart } from "@/components/impact-chart";
import { CreditPath } from "@/components/credit-path";
import { GreenChat } from "@/components/green-chat";
import { VoiceChat } from "@/components/voice-chat";
import { BureauComparison } from "@/components/bureau-comparison";
import { VerificationBadges } from "@/components/verification-badges";
import { AnomalyBanner } from "@/components/anomaly-banner";
import { DataQualityReport } from "@/components/data-quality-report";
import { DuplicateAccounts } from "@/components/duplicate-accounts";
import { StudyPlan } from "@/components/study-plan";
import { VoiceBriefing } from "@/components/voice-briefing";
import { ChatFAB } from "@/components/chat-fab";
import { CreditSimulator } from "@/components/credit-simulator";
import GreenWrapped from "@/components/green-wrapped";
import { ShareCard } from "@/components/share-card";
import { YouVsAverage } from "@/components/you-vs-average";
import { AchievementBadges } from "@/components/achievement-badges";
import { ImpactVisualizer } from "@/components/impact-visualizer";
import { getTierLabel, getEstimatedRate } from "@/lib/utils";
import { detectAnomalies, type AnomalyReport } from "@/lib/anomaly-detection";
import { runDataQualityReport, type DataQualityReport as DataQualityReportType } from "@/lib/data-quality";
import { detectDuplicateTradelines, type DuplicateGroup } from "@/lib/duplicate-tradelines";
import { extractCreditData, calculateGreenReadiness } from "@/lib/green-scoring";
import { getRecommendedInvestments } from "@/lib/green-investments";
import {
  isDemoPersona,
  getDemoCreditReportResponse,
  getDemoFlexIdCorrected,
  getDemoFraudResult,
} from "@/lib/demo-persona";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";
import type { PersonalizedInvestment, TradelineProfile, BureauTip } from "@/lib/tradeline-intelligence";
import { extractTradelineProfile, personalizeInvestments, getBureauLendingTip } from "@/lib/tradeline-intelligence";

interface ResultsData {
  userName: string;
  creditReport: Record<string, unknown>;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  personalizedInvestments?: PersonalizedInvestment[];
  tradelineProfile?: TradelineProfile;
  bureauTip?: BureauTip | null;
  geminiAnalysis: GeminiAnalysis | null;
  availableSavings: number | null;
  bureauScores?: Record<string, number | null>;
  triBureau?: Record<string, Record<string, unknown> | null>;
  flexIdResult?: { verified: boolean; notRegistered?: boolean; riskScore?: number; summary: string; raw?: Record<string, unknown> } | null;
  fraudResult?: { riskLevel: "low" | "medium" | "high" | "unknown"; signals: string[]; summary: string; raw?: Record<string, unknown> } | null;
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
  const [activeTab, setActiveTab] = useState("profile");
  const [showAllActions, setShowAllActions] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWrapped, setShowWrapped] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("greenpath-wrapped-seen");
  });

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
      // Data quality and duplicate tradelines
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
      // Demo persona: use corrected mocks directly
      if (isDemoPersona(correctedForm)) {
        const creditReportPayload = getDemoCreditReportResponse() as Record<string, unknown>;
        const triBureau = creditReportPayload._triBureau as Record<string, Record<string, unknown> | null> | undefined;
        const resolvedTriBureau = triBureau ?? {
          experian: creditReportPayload,
          transunion: creditReportPayload,
          equifax: creditReportPayload,
        };
        const displayReport = resolvedTriBureau.experian ?? creditReportPayload;
        const creditData = extractCreditData(displayReport);
        const savings = correctedForm.availableSavings ? parseFloat(correctedForm.availableSavings) : null;
        const greenReadiness = calculateGreenReadiness(creditData, savings);
        const investments = getRecommendedInvestments(greenReadiness.tier);
        const bureauScores = {
          experian: extractScore(resolvedTriBureau.experian),
          transunion: extractScore(resolvedTriBureau.transunion),
          equifax: extractScore(resolvedTriBureau.equifax),
        };
        const flexIdResult = getDemoFlexIdCorrected();
        const fraudRes = getDemoFraudResult();

        // Tradeline intelligence
        const tradelineProfile = extractTradelineProfile(displayReport);
        const personalizedInvestments = personalizeInvestments(investments, tradelineProfile, greenReadiness.tier);
        const bureauTip = getBureauLendingTip(bureauScores);

        // Call Gemini analysis for demo too
        let geminiAnalysis = null;
        try {
          const analysisRes = await fetch("/api/green-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ greenReadiness, recommendedInvestments: investments, bureauScores, tradelineProfile }),
          });
          if (analysisRes.ok) geminiAnalysis = await analysisRes.json();
        } catch {
          /* non-fatal */
        }

        const newResults: ResultsData = {
          userName: `${correctedForm.firstName} ${correctedForm.lastName}`,
          creditReport: displayReport,
          greenReadiness,
          investments,
          personalizedInvestments,
          tradelineProfile,
          bureauTip,
          geminiAnalysis,
          availableSavings: savings,
          bureauScores,
          triBureau: resolvedTriBureau,
          flexIdResult,
          fraudResult: fraudRes,
          originalForm: correctedForm,
        };
        sessionStorage.setItem("greenpath-results", JSON.stringify(newResults));
        setData(newResults);
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
          flexIdResult: { ...flexIdResult, raw: flexIdResult.raw || {} },
          fraudResult: { ...fraudRes, raw: fraudRes.raw || {} },
          bureauScores,
          triBureau: resolvedTriBureau,
        });
        setAnomalyReport(report);
        setDataQualityReport(
          runDataQualityReport({
            triBureau: resolvedTriBureau,
            flexIdResult,
            fraudResult: fraudRes,
          })
        );
        setDuplicateTradelines(detectDuplicateTradelines({ triBureau: resolvedTriBureau }) ?? []);
        setResubmitting(false);
        return;
      }

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
      const savings = correctedForm.availableSavings ? parseFloat(correctedForm.availableSavings) : null;
      const greenReadiness = calculateGreenReadiness(creditData, savings);
      const investments = getRecommendedInvestments(greenReadiness.tier);
      const primaryReport = displayReport;

      // Tradeline intelligence
      const tradelineProfile = extractTradelineProfile(primaryReport);
      const personalizedInvestments = personalizeInvestments(investments, tradelineProfile, greenReadiness.tier);
      const bureauTip = getBureauLendingTip(bureauScores);

      // Gemini re-analysis
      let geminiAnalysis = null;
      try {
        const analysisRes = await fetch("/api/green-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ greenReadiness, recommendedInvestments: investments, bureauScores, tradelineProfile }),
        });
        if (analysisRes.ok) geminiAnalysis = await analysisRes.json();
      } catch {
        /* non-fatal */
      }
      const newResults: ResultsData = {
        userName: `${correctedForm.firstName} ${correctedForm.lastName}`,
        creditReport: primaryReport,
        greenReadiness,
        investments,
        personalizedInvestments,
        tradelineProfile,
        bureauTip,
        geminiAnalysis,
        availableSavings: savings,
        bureauScores,
        triBureau,
        flexIdResult,
        fraudResult: fraudRes,
        originalForm: correctedForm,
      };

      sessionStorage.setItem("greenpath-results", JSON.stringify(newResults));
      setData(newResults);

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
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-dew/60 text-grove gap-1.5"
              onClick={() => {
                const summary = [
                  `GreenPath Report for ${data.userName}`,
                  `Green Readiness: ${data.greenReadiness.score}/100 (Tier ${data.greenReadiness.tier} — ${getTierLabel(data.greenReadiness.tier)})`,
                  `Credit Score: ${data.greenReadiness.creditScore}`,
                  `Utilization: ${(data.greenReadiness.utilization * 100).toFixed(0)}%`,
                  `${data.investments.length} green investments available`,
                  `Estimated APR: ${getEstimatedRate(data.greenReadiness.tier)}%`,
                  ``,
                  `Check your own green readiness at GreenPath!`,
                  `Built for SF Hacks 2026 — Powered by CRS Credit API`,
                ].join("\n");
                navigator.clipboard.writeText(summary).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Share"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-dew/60 text-grove gap-1.5"
              onClick={() => window.open("/report", "_blank")}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </nav>

      {/* Title */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-2">
        <div className="animate-fade-up text-center">
          <h1 className="font-heading text-3xl sm:text-4xl text-grove mb-2">
            {data.userName}&apos;s Credit Health &amp; Green Readiness
          </h1>
          <p className="text-stone text-sm">
            Based on your verified credit profile. Generated on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            <span className="text-canopy font-medium">{crsProductsUsed.length} CRS products used</span>
            {" · "}
            <button
              onClick={() => setShowWrapped(true)}
              className="inline-flex items-center gap-1 text-grove hover:text-canopy transition-colors font-medium"
            >
              <Play className="w-3 h-3" />
              Replay Wrapped
            </button>
          </p>
        </div>
      </div>

      {/* Voice Briefing */}
      <div className="max-w-5xl mx-auto px-6 mt-4">
        <VoiceBriefing
          userName={data.userName}
          greenReadiness={data.greenReadiness}
          investments={data.investments}
          geminiAnalysis={data.geminiAnalysis}
          bureauScores={data.bureauScores}
        />
      </div>

      {/* Sticky tab navigation */}
      <div className="sticky top-[65px] z-40 glass-card border-b border-white/30 mt-4">
        <div className="max-w-5xl mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="w-full justify-start bg-transparent h-12 gap-0">
              <TabsTrigger value="profile" className="gap-2 text-sm px-4 data-[state=active]:text-grove">
                <Shield className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="learn" className="gap-2 text-sm px-4 data-[state=active]:text-grove">
                <GraduationCap className="w-4 h-4" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="plan" className="gap-2 text-sm px-4 data-[state=active]:text-grove">
                <Leaf className="w-4 h-4" />
                Green Plan
              </TabsTrigger>
              <TabsTrigger value="tutor" className="gap-2 text-sm px-4 data-[state=active]:text-grove">
                <Sparkles className="w-4 h-4" />
                AI Tutor
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ─── Profile Tab ─── */}
          <TabsContent value="profile" className="space-y-6 mt-0">
            {/* Anomaly Banner */}
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

            {/* Credit at a Glance — most important, moved to top */}
            <section className="animate-fade-up delay-100">
              <CreditSummary data={data.greenReadiness} />
            </section>

            {/* Verified Credit Picture — badges + bureau merged */}
            {(data.flexIdResult || data.fraudResult || (data.bureauScores && data.triBureau)) && (
              <section className="animate-fade-up delay-200 space-y-4">
                <h2 className="font-heading text-xl text-grove">
                  Your Verified Credit Picture
                </h2>
                {(data.flexIdResult || data.fraudResult) && (
                  <VerificationBadges
                    flexIdResult={data.flexIdResult || null}
                    fraudResult={data.fraudResult || null}
                  />
                )}
                {data.bureauScores && data.triBureau && (
                  <BureauComparison bureauScores={data.bureauScores} triBureau={data.triBureau} />
                )}
                {data.bureauTip && (
                  <div className="p-4 rounded-xl bg-canopy/5 border border-canopy/20 text-sm text-grove flex items-start gap-3">
                    <Shield className="w-5 h-5 text-canopy shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-grove">Lending Tip:</strong>{" "}
                      {data.bureauTip.tip}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Data Quality & Duplicates — collapsed by default */}
            {(dataQualityReport || duplicateTradelines.length > 0) && (
              <details className="animate-fade-up delay-300 rounded-2xl border border-dew/40 bg-white/60 overflow-hidden group">
                <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between hover:bg-dawn/40 transition-colors [&::-webkit-details-marker]:hidden">
                  <span className="font-heading text-base text-grove">
                    Data Quality &amp; Diagnostics
                  </span>
                  <span className="text-sm text-stone">
                    {dataQualityReport ? `Score: ${dataQualityReport.score}/100` : ""}
                    {duplicateTradelines.length > 0 ? ` · ${duplicateTradelines.length} duplicate group${duplicateTradelines.length > 1 ? "s" : ""}` : ""}
                  </span>
                </summary>
                <div className="px-5 pb-5 space-y-4 border-t border-dew/30">
                  {dataQualityReport && <DataQualityReport report={dataQualityReport} />}
                  {duplicateTradelines.length > 0 && <DuplicateAccounts groups={duplicateTradelines} />}
                </div>
              </details>
            )}

            {/* Achievement Badges */}
            <section className="animate-fade-up delay-300">
              <AchievementBadges
                greenReadiness={data.greenReadiness}
                investments={data.investments}
                bureauScores={data.bureauScores}
              />
            </section>

            {/* Shareable Score Card */}
            <section className="animate-fade-up delay-400">
              <h2 className="font-heading text-xl text-grove mb-4">Share Your Score</h2>
              <ShareCard
                userName={data.userName}
                greenReadiness={data.greenReadiness}
                investments={data.investments}
              />
            </section>
          </TabsContent>

          {/* ─── Learn Tab ─── */}
          <TabsContent value="learn" className="mt-0">
            <StudyPlan
              greenReadiness={data.greenReadiness}
              geminiAnalysis={data.geminiAnalysis}
              bureauScores={data.bureauScores || {}}
              investments={data.investments}
              tradelineProfile={data.tradelineProfile}
              personalizedInvestments={data.personalizedInvestments}
            />
          </TabsContent>

          {/* ─── Green Plan Tab ─── */}
          <TabsContent value="plan" className="space-y-6 mt-0">
            {/* Score + AI Overview — side by side on desktop */}
            <section className="animate-fade-up">
              <div className="flex flex-col lg:flex-row items-start gap-6">
                {/* Left: Gauge */}
                <div className="flex flex-col items-center shrink-0 mx-auto lg:mx-0">
                  <GreenScoreGauge key={activeTab} score={data.greenReadiness.score} tier={data.greenReadiness.tier} />
                  {data.bureauScores && Object.values(data.bureauScores).filter((s) => s != null).length >= 2 && (
                    <p className="text-xs text-stone mt-2 max-w-[200px] text-center">
                      Uses your lowest bureau score for conservative readiness.
                    </p>
                  )}
                </div>
                {/* Right: AI Insights */}
                <div className="flex-1 min-w-0 space-y-4">
                  {data.geminiAnalysis?.summary && (
                    <p className="text-soil leading-relaxed">{data.geminiAnalysis.summary}</p>
                  )}
                  <GeminiInsights analysis={data.geminiAnalysis} />
                </div>
              </div>
            </section>

            {/* Impact Visualizer — animated counters */}
            <section className="animate-fade-up delay-100">
              <ImpactVisualizer investments={data.investments} />
            </section>

            {/* You vs. Average American */}
            <section className="animate-fade-up delay-100">
              <YouVsAverage
                greenReadiness={data.greenReadiness}
                investments={data.investments}
              />
            </section>

            {/* Credit Simulator — What-If Tool */}
            <section className="animate-fade-up delay-200">
              <CreditSimulator
                greenReadiness={data.greenReadiness}
                investments={data.investments}
                availableSavings={data.availableSavings}
              />
            </section>

            {/* Green Action Plan — capped at 6, expandable */}
            <section className="animate-fade-up delay-200">
              <h2 className="font-heading text-xl text-grove mb-1">
                Your Green Action Plan
              </h2>
              <p className="text-stone text-sm mb-4">
                {data.investments.length} options for Tier {data.greenReadiness.tier}, sorted by impact.
              </p>
              <ActionCards
                investments={showAllActions ? data.investments : data.investments.slice(0, 6)}
                personalizedInvestments={
                  showAllActions
                    ? data.personalizedInvestments
                    : data.personalizedInvestments?.slice(0, 6)
                }
                geminiAnalysis={data.geminiAnalysis}
                availableSavings={data.availableSavings}
                tier={data.greenReadiness.tier}
              />
              {data.investments.length > 6 && !showAllActions && (
                <button
                  onClick={() => setShowAllActions(true)}
                  className="mt-4 w-full py-3 rounded-xl border border-dew/60 text-sm font-medium text-canopy hover:bg-dawn/60 transition-colors"
                >
                  Show all {data.investments.length} options
                </button>
              )}
            </section>

            {/* Environmental Impact — collapsed by default */}
            <section className="animate-fade-up delay-200">
              {!showImpact ? (
                <button
                  onClick={() => setShowImpact(true)}
                  className="w-full py-4 rounded-2xl border border-dew/40 bg-white/60 hover:bg-dawn/40 transition-colors flex items-center justify-center gap-2"
                >
                  <Leaf className="w-4 h-4 text-canopy" />
                  <span className="font-heading text-base text-grove">View Environmental Impact Dashboard</span>
                </button>
              ) : (
                <div className="animate-fade-up">
                  <h2 className="font-heading text-xl text-grove mb-4">
                    Environmental Impact Dashboard
                  </h2>
                  <ImpactChart investments={data.investments} />
                </div>
              )}
            </section>

            {/* Credit Improvement Path */}
            <section>
              <CreditPath greenReadiness={data.greenReadiness} geminiAnalysis={data.geminiAnalysis} />
            </section>
          </TabsContent>

          {/* ─── AI Tutor Tab ─── */}
          <TabsContent value="tutor" className="mt-0">
            <div className="animate-fade-up max-w-3xl mx-auto">
              <VoiceChat
                greenReadiness={data.greenReadiness}
                investments={data.investments}
                availableSavings={data.availableSavings}
                bureauScores={data.bureauScores}
                flexIdVerified={data.flexIdResult?.verified}
                fraudRiskLevel={data.fraudResult?.riskLevel}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Chat FAB (hidden on AI Tutor tab) */}
      {activeTab !== "tutor" && (
        <ChatFAB
          greenReadiness={data.greenReadiness}
          investments={data.investments}
          availableSavings={data.availableSavings}
          bureauScores={data.bureauScores}
          flexIdVerified={data.flexIdResult?.verified}
          fraudRiskLevel={data.fraudResult?.riskLevel}
        />
      )}

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

      {/* Green Score Wrapped overlay */}
      {showWrapped && (
        <GreenWrapped
          userName={data.userName}
          greenReadiness={data.greenReadiness}
          investments={data.investments}
          bureauScores={data.bureauScores}
          onClose={() => {
            setShowWrapped(false);
            sessionStorage.setItem("greenpath-wrapped-seen", "true");
          }}
        />
      )}
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
