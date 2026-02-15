"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  Shield,
  Fingerprint,
  Building,
  ScanSearch,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractCreditData, calculateGreenReadiness } from "@/lib/green-scoring";
import { getRecommendedInvestments } from "@/lib/green-investments";
import { extractTradelineProfile, personalizeInvestments, getBureauLendingTip } from "@/lib/tradeline-intelligence";
import {
  isDemoPersona,
  getDemoTriBureau,
  getDemoCreditReportResponse,
  getDemoFlexIdAnomaly,
  getDemoFraudResult,
} from "@/lib/demo-persona";
import type { LucideIcon } from "lucide-react";

interface LoadingStep {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  status: "pending" | "active" | "complete" | "error";
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const STEP_SUBLABELS: Record<string, string[]> = {
  auth: [
    "Connecting to CRS Gateway",
    "Establishing secure connection",
    "Handshaking with CRS servers",
    "Initializing encrypted session",
  ],
  flexid: [
    "Checking LexisNexis records",
    "Cross-referencing identity data",
    "Validating personal information",
    "Running FlexID verification",
  ],
  credit: [
    "Experian, TransUnion, and Equifax",
    "Requesting tri-bureau data",
    "Fetching reports from 3 bureaus",
    "Pulling VantageScore 4.0 data",
  ],
  fraud: [
    "CRS Fraud Finder by AtData",
    "Scanning for suspicious activity",
    "Checking fraud risk indicators",
    "Analyzing identity risk signals",
  ],
  green: [
    "Scoring across 4 factors",
    "Evaluating credit utilization & history",
    "Analyzing green investment eligibility",
    "Computing tier placement",
  ],
  gemini: [
    "Gemini analyzing your profile",
    "AI building personalized recommendations",
    "Generating tailored green insights",
    "Crafting your financial roadmap",
  ],
};

function buildInitialSteps(): Omit<LoadingStep, "status">[] {
  return [
    { id: "auth", label: "Authenticating with CRS", sublabel: pick(STEP_SUBLABELS.auth), icon: Shield },
    { id: "flexid", label: "Verifying identity", sublabel: pick(STEP_SUBLABELS.flexid), icon: Fingerprint },
    { id: "credit", label: "Pulling credit reports", sublabel: pick(STEP_SUBLABELS.credit), icon: Building },
    { id: "fraud", label: "Running fraud analysis", sublabel: pick(STEP_SUBLABELS.fraud), icon: ScanSearch },
    { id: "green", label: "Calculating green readiness", sublabel: pick(STEP_SUBLABELS.green), icon: Leaf },
    { id: "gemini", label: "Generating AI insights", sublabel: pick(STEP_SUBLABELS.gemini), icon: Sparkles },
  ];
}

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

export default function LoadingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<LoadingStep[]>(
    buildInitialSteps().map((s) => ({ ...s, status: "pending" as const }))
  );
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const setStepStatus = useCallback((index: number, status: LoadingStep["status"]) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  }, []);

  const completedCount = steps.filter((s) => s.status === "complete").length;
  const progressValue = Math.round((completedCount / steps.length) * 100);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const raw = sessionStorage.getItem("greenpath-pending");
    if (!raw) {
      router.push("/assess");
      return;
    }

    const form = JSON.parse(raw) as Record<string, string>;
    runPipeline(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPipeline(form: Record<string, string>) {
    try {
      // Demo persona: simulated cinematic sequence — match real API pacing
      if (isDemoPersona(form)) {
        const basePacing = [1200, 1400, 2000, 800, 900, 1000];
        for (let i = 0; i < steps.length; i++) {
          setStepStatus(i, "active");
          // Randomize timing: ±30% of base + random jitter
          const jitter = basePacing[i] * (0.7 + Math.random() * 0.6);
          await delay(jitter + Math.random() * 400);
          setStepStatus(i, "complete");
        }
        const creditReportPayload = getDemoCreditReportResponse();
        const triBureau = getDemoTriBureau();
        const primaryReport = triBureau.experian ?? creditReportPayload;
        const creditData = extractCreditData(primaryReport as Record<string, unknown>);
        const savings = form.availableSavings ? parseFloat(form.availableSavings) : null;
        const greenReadiness = calculateGreenReadiness(creditData, savings);
        const investments = getRecommendedInvestments(greenReadiness.tier);
        const bureauScores = {
          experian: extractScore(triBureau.experian as Record<string, unknown>),
          transunion: extractScore(triBureau.transunion as Record<string, unknown>),
          equifax: extractScore(triBureau.equifax as Record<string, unknown>),
        };

        // Tradeline intelligence
        const tradelineProfile = extractTradelineProfile(primaryReport as Record<string, unknown>);
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
          if (analysisRes.ok) {
            geminiAnalysis = await analysisRes.json();
          } else {
            console.warn("[demo] Gemini analysis returned", analysisRes.status, await analysisRes.text());
          }
        } catch (err) {
          console.warn("[demo] Gemini analysis failed:", err);
        }

        const results = {
          userName: `${form.firstName} ${form.lastName}`,
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
          flexIdResult: getDemoFlexIdAnomaly(),
          fraudResult: getDemoFraudResult(),
          originalForm: { ...form },
        };
        sessionStorage.setItem("greenpath-results", JSON.stringify(results));
        sessionStorage.removeItem("greenpath-pending");
        await delay(300);
        router.push("/results");
        return;
      }

      // ── Minimum display times per step ──
      // Early API steps get longer minimums so they feel deliberate.
      // Gemini is naturally slow, so no padding needed.
      const MIN_AUTH    = 1200;  // "Authenticating with CRS"
      const MIN_FLEXID  = 1400;  // "Verifying identity"
      const MIN_BUREAU  = 2000;  // "Pulling credit reports" (the big one)
      const MIN_FRAUD   = 800;   // fraud completes in parallel, short pad
      const MIN_CALC    = 900;   // local calculation, brief pause
      const MIN_GEMINI  = 0;     // Gemini takes 3-10s naturally

      // Step 1: Authenticate
      setStepStatus(0, "active");
      const authTask = (async () => {
        let authRes: Response;
        try {
          authRes = await fetch("/api/auth", { method: "POST" });
        } catch {
          throw new Error(
            "Cannot reach the server. Check that the app is running and .env.local has CRS_USERNAME and CRS_PASSWORD set."
          );
        }
        if (!authRes.ok) {
          let data: { error?: string } = {};
          try { data = await authRes.json(); } catch { /* response may not be JSON */ }
          throw new Error(data.error || "Authentication failed");
        }
      })();
      await withMinDelay(authTask, MIN_AUTH);
      setStepStatus(0, "complete");

      // Step 2: FlexID Identity Verification (non-blocking)
      setStepStatus(1, "active");
      let flexIdResult = null;
      const flexTask = (async () => {
        try {
          const flexRes = await fetch("/api/flex-id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: form.firstName,
              lastName: form.lastName,
              ssn: form.ssn,
              dateOfBirth: form.birthDate,
              streetAddress: form.addressLine1,
              city: form.city,
              state: form.state,
              zipCode: form.postalCode,
              homePhone: form.phone,
            }),
          });
          if (flexRes.ok) flexIdResult = await flexRes.json();
        } catch {
          console.warn("FlexID verification failed, continuing...");
        }
      })();
      await withMinDelay(flexTask, MIN_FLEXID);
      setStepStatus(1, "complete");

      // Step 3 + 4: Credit Reports + Fraud Finder (parallel)
      setStepStatus(2, "active");
      setStepStatus(3, "active");

      // Track fraud completion separately so we can pad it
      let fraudRes: Record<string, unknown> | null = null;
      let fraudDone = false;
      const fraudTask = (async () => {
        try {
          const res = await fetch("/api/fraud-finder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email || undefined,
              phoneNumber: form.phone || undefined,
              addressLine1: form.addressLine1,
              city: form.city,
              state: form.state,
              postalCode: form.postalCode,
            }),
          });
          if (res.ok) fraudRes = await res.json();
        } catch {
          /* non-fatal */
        }
        fraudDone = true;
      })();

      const creditTask = fetch("/api/credit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // Wait for both with minimum display time for the bureau step
      const [reportRes] = await withMinDelay(
        Promise.all([creditTask, fraudTask]),
        MIN_BUREAU
      );

      // If fraud finished before the bureau min-delay, mark it done partway through
      if (fraudDone) setStepStatus(3, "complete");
      else {
        await withMinDelay(fraudTask, MIN_FRAUD);
        setStepStatus(3, "complete");
      }

      if (!reportRes.ok) {
        let data: { error?: string } = {};
        try { data = await reportRes.json(); } catch { /* response may not be JSON */ }
        throw new Error(data.error || "Credit report pull failed");
      }
      let creditReport: Record<string, unknown>;
      try {
        creditReport = await reportRes.json();
      } catch {
        throw new Error("Invalid response from credit report service.");
      }
      setStepStatus(2, "complete");

      // Step 5: Calculate green readiness (local, but give it a brief pause)
      setStepStatus(4, "active");
      const calcTask = (async () => {
        type TriBureau = { experian: Record<string, unknown> | null; transunion: Record<string, unknown> | null; equifax: Record<string, unknown> | null };
        const tb: TriBureau = (creditReport._triBureau as TriBureau | undefined) ?? {
          experian: creditReport,
          transunion: null,
          equifax: null,
        };
        return { triBureau: tb };
      })();
      const { triBureau } = await withMinDelay(calcTask, MIN_CALC);

      const bureauScores: Record<string, number | null> = {
        experian: extractScore(triBureau.experian),
        transunion: extractScore(triBureau.transunion),
        equifax: extractScore(triBureau.equifax),
      };
      const bureaus: (keyof typeof triBureau)[] = ["experian", "transunion", "equifax"];
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
      const savings = form.availableSavings ? parseFloat(form.availableSavings) : null;
      const greenReadiness = calculateGreenReadiness(creditData, savings);
      const investments = getRecommendedInvestments(greenReadiness.tier);

      // Tradeline intelligence
      const tradelineProfile = extractTradelineProfile(displayReport);
      const personalizedInvestments = personalizeInvestments(investments, tradelineProfile, greenReadiness.tier);
      const bureauTip = getBureauLendingTip(bureauScores);
      setStepStatus(4, "complete");

      // Step 6: Gemini analysis (naturally slow — no padding)
      setStepStatus(5, "active");
      let geminiAnalysis = null;
      const geminiTask = (async () => {
        try {
          const analysisRes = await fetch("/api/green-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ greenReadiness, recommendedInvestments: investments, bureauScores, tradelineProfile }),
          });
          if (analysisRes.ok) {
            geminiAnalysis = await analysisRes.json();
          } else {
            console.warn("[loading] Gemini analysis returned", analysisRes.status, await analysisRes.text());
          }
        } catch (err) {
          console.warn("[loading] Gemini analysis failed:", err);
        }
      })();
      await withMinDelay(geminiTask, MIN_GEMINI);
      setStepStatus(5, "complete");

      // Store results and navigate
      const results = {
        userName: `${form.firstName} ${form.lastName}`,
        creditReport: displayReport,
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
        originalForm: { ...form },
      };
      sessionStorage.setItem("greenpath-results", JSON.stringify(results));
      sessionStorage.removeItem("greenpath-pending");
      await delay(400);
      router.push("/results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      const isNetworkFailure =
        message === "Failed to fetch" ||
        message.includes("Load failed") ||
        message.includes("NetworkError") ||
        message.includes("Cannot reach the server");
      setError(
        isNetworkFailure
          ? "Cannot reach the server. Make sure the app is running (npm run dev or Docker) and .env.local has CRS_USERNAME and CRS_PASSWORD set."
          : message
      );
      // Mark the active step as error
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s))
      );
    }
  }

  function handleRetry() {
    const raw = sessionStorage.getItem("greenpath-pending");
    if (!raw) {
      router.push("/assess");
      return;
    }
    setError(null);
    setSteps(buildInitialSteps().map((s) => ({ ...s, status: "pending" as const })));
    hasStarted.current = false;
    const form = JSON.parse(raw) as Record<string, string>;
    runPipeline(form);
  }

  return (
    <div className="min-h-screen bg-grove grid-pattern relative overflow-hidden flex flex-col">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full bg-canopy/10 blur-3xl animate-float" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full bg-sunbeam/8 blur-3xl animate-float delay-500" />
      </div>

      {/* Thin progress bar at top */}
      <div className="relative z-10">
        <Progress
          value={progressValue}
          className="h-1 rounded-none bg-white/10 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-canopy [&>[data-slot=progress-indicator]]:to-meadow [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-700"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-canopy/20 flex items-center justify-center animate-pulse-glow">
            <Leaf className="w-7 h-7 text-meadow" />
          </div>
        </div>
        <h1 className="font-heading text-2xl text-white/90 mb-1 animate-fade-in">
          GreenPath
        </h1>
        <p className="text-meadow/60 text-sm mb-12 animate-fade-in delay-100">
          Analyzing your credit profile
        </p>

        {/* Timeline steps */}
        <div className="w-[384px] max-w-full space-y-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isComplete = step.status === "complete";
            const isActive = step.status === "active";
            const isError = step.status === "error";
            const isPending = step.status === "pending";
            const isLast = i === steps.length - 1;

            return (
              <div key={step.id} className="relative">
                <div className="flex items-start gap-4 py-3">
                  {/* Icon circle */}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isComplete ? "bg-canopy/30" :
                    isActive ? "bg-canopy/20 animate-pulse-glow" :
                    isError ? "bg-red-500/20" :
                    "bg-white/5"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-meadow animate-step-complete" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-meadow animate-spin" />
                    ) : isError ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Icon className="w-5 h-5 text-white/20" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="pt-0.5 min-w-0">
                    <p className={`text-sm font-medium transition-colors duration-500 ${
                      isComplete ? "text-meadow" :
                      isActive ? "text-white" :
                      isError ? "text-red-400" :
                      "text-white/30"
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-xs mt-0.5 transition-colors duration-500 ${
                      isComplete ? "text-meadow/50" :
                      isActive ? "text-white/50" :
                      isError ? "text-red-400/60" :
                      "text-white/15"
                    }`}>
                      {step.sublabel}
                    </p>
                  </div>
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="absolute left-5 top-[52px] w-px h-[12px]">
                    <div className={`w-full h-full transition-all duration-500 ${
                      isComplete ? "bg-canopy/40" : "bg-white/10"
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-8 w-full max-w-sm animate-fade-up">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4">
              {error}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRetry}
                className="flex-1 rounded-xl bg-canopy hover:bg-canopy/80 text-white gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </Button>
              <Link href="/assess" className="flex-1">
                <Button variant="outline" className="w-full rounded-xl border-white/20 text-white/70 hover:text-white hover:bg-white/5 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to form
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Trust footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 py-6 px-6">
        <div className="max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-meadow/40" />
            <span className="text-xs text-meadow/40 uppercase tracking-wider font-medium">Secure & Private</span>
          </div>
          <p className="text-xs text-white/25 leading-relaxed">
            Your data is encrypted and never stored on our servers. This is a soft pull with no impact to your credit score.
          </p>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run an async task but ensure at least `ms` milliseconds have elapsed before resolving. */
async function withMinDelay<T>(task: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([task, delay(ms)]);
  return result;
}
