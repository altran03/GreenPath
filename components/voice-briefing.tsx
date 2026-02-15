"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Volume2, Pause, Play, Loader2, RotateCcw, Captions } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getEstimatedRate, getTierLabel } from "@/lib/utils";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import type { GeminiAnalysis } from "@/lib/gemini";

interface VoiceBriefingProps {
  userName: string;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  geminiAnalysis: GeminiAnalysis | null;
  bureauScores?: Record<string, number | null>;
}

type BriefingState = "idle" | "generating" | "playing" | "paused" | "done" | "error";

function buildBriefingScript(
  userName: string,
  gr: GreenReadiness,
  investments: GreenInvestment[],
  gemini: GeminiAnalysis | null,
  bureauScores?: Record<string, number | null>
): string {
  const rate = getEstimatedRate(gr.tier);
  const tierLabel = getTierLabel(gr.tier);
  const totalCo2 = investments.reduce((s, i) => s + i.annualCO2ReductionLbs, 0);
  const totalSavings = investments.reduce((s, i) => s + i.annualSavings, 0);

  const validScores = bureauScores
    ? (Object.entries(bureauScores).filter(([, s]) => s != null && s > 0) as [string, number][])
    : [];
  const highBureau = validScores.length >= 2
    ? validScores.reduce((a, b) => (b[1] > a[1] ? b : a))
    : null;
  const lowBureau = validScores.length >= 2
    ? validScores.reduce((a, b) => (b[1] < a[1] ? b : a))
    : null;

  const firstName = userName.split(" ")[0] || "there";

  let script = `Hey ${firstName}, here's your GreenPath briefing. `;

  // Score + tier
  script += `Your Green Readiness score is ${gr.score} out of 100, placing you in Tier ${gr.tier}, which is ${tierLabel}. `;
  script += `At this tier, you can expect green financing rates around ${rate}% APR. `;

  // Bureau scores
  if (highBureau && lowBureau && highBureau[1] !== lowBureau[1]) {
    script += `Looking at your credit, your scores range from ${lowBureau[1]} on ${lowBureau[0]} to ${highBureau[1]} on ${highBureau[0]}. `;
    if (highBureau[1] - lowBureau[1] >= 30) {
      script += `That's a ${highBureau[1] - lowBureau[1]} point spread, so when you apply for green financing, look for lenders that pull ${highBureau[0]} to get the best rate. `;
    }
  } else if (gr.creditScore > 0) {
    script += `Your credit score is ${gr.creditScore}. `;
  }

  // Utilization
  if (gr.utilization >= 0.3) {
    const balance = Math.round(gr.utilization * gr.totalCreditLimit);
    script += `Your credit utilization is at ${Math.round(gr.utilization * 100)}%, which means you're using ${formatCurrency(balance)} of your ${formatCurrency(gr.totalCreditLimit)} limit. Bringing that below 30% would be one of your fastest score improvements. `;
  } else if (gr.utilization > 0) {
    script += `Your utilization is a healthy ${Math.round(gr.utilization * 100)}%, which is great. `;
  }

  // Investments summary
  script += `You qualify for ${investments.length} green investment options. `;
  if (investments.length > 0) {
    const top3 = investments.slice(0, 3).map((i) => i.name);
    script += `Your top recommendations include ${top3.join(", ")}. `;
  }

  // Impact
  if (totalCo2 > 0) {
    script += `If you pursued all of them, you'd reduce your carbon footprint by ${totalCo2.toLocaleString()} pounds of CO2 per year and save ${formatCurrency(totalSavings)} annually. `;
  }

  // Gemini summary (use first sentence if available)
  if (gemini?.summary) {
    const firstSentence = gemini.summary.split(". ")[0];
    script += firstSentence + ". ";
  }

  // Tier-specific closing
  if (gr.tier === "A") {
    script += `You're in the best position for green financing. Explore your options and start making an impact today.`;
  } else if (gr.tier === "B") {
    script += `You're close to unlocking the best rates. Check out your study plan to see exactly how to level up.`;
  } else {
    script += `Your study plan has a personalized roadmap to improve your score and unlock better green financing options. You've got this.`;
  }

  return script;
}

export function VoiceBriefing({
  userName,
  greenReadiness,
  investments,
  geminiAnalysis,
  bureauScores,
}: VoiceBriefingProps) {
  const [state, setState] = useState<BriefingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationRef = useRef<number>(0);
  const [scriptText, setScriptText] = useState("");
  const [captionsOn, setCaptionsOn] = useState(true);
  const captionRef = useRef<HTMLDivElement | null>(null);

  // Bars for visualizer
  const [bars, setBars] = useState<number[]>(new Array(24).fill(4));
  const barsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startVisualizer = useCallback(() => {
    if (barsIntervalRef.current) clearInterval(barsIntervalRef.current);
    barsIntervalRef.current = setInterval(() => {
      setBars((prev) => prev.map(() => 4 + Math.random() * 28));
    }, 120);
  }, []);

  const stopVisualizer = useCallback(() => {
    if (barsIntervalRef.current) {
      clearInterval(barsIntervalRef.current);
      barsIntervalRef.current = null;
    }
    setBars(new Array(24).fill(4));
  }, []);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
      if (!audioRef.current.paused) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopVisualizer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stopVisualizer]);

  const generateAndPlay = useCallback(async () => {
    setState("generating");
    setError(null);
    setProgress(0);
    setDuration(0);

    try {
      const script = buildBriefingScript(userName, greenReadiness, investments, geminiAnalysis, bureauScores);
      setScriptText(script);

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "TTS request failed" }));
        throw new Error(data.error || `TTS failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("playing", () => {
        setState("playing");
        startVisualizer();
        animationRef.current = requestAnimationFrame(updateProgress);
        try { localStorage.setItem("greenpath-briefing-played", "true"); } catch {}
      });

      audio.addEventListener("pause", () => {
        if (!audio.ended) {
          setState("paused");
          stopVisualizer();
        }
      });

      audio.addEventListener("ended", () => {
        setState("done");
        stopVisualizer();
        setProgress(audio.duration);
      });

      audio.addEventListener("error", () => {
        setState("error");
        setError("Audio playback failed");
        stopVisualizer();
      });

      await audio.play();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      stopVisualizer();
    }
  }, [userName, greenReadiness, investments, geminiAnalysis, bureauScores, startVisualizer, stopVisualizer, updateProgress]);

  function togglePlayPause() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }

  function replay() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  }

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  // Split script into words for live caption reveal
  const words = useMemo(() => scriptText.split(/\s+/).filter(Boolean), [scriptText]);
  const visibleWordCount = duration > 0 && words.length > 0
    ? Math.min(words.length, Math.ceil((progress / duration) * words.length) + 1)
    : state === "done" ? words.length : 0;

  // Auto-scroll captions to bottom
  useEffect(() => {
    if (captionRef.current) {
      captionRef.current.scrollTop = captionRef.current.scrollHeight;
    }
  }, [visibleWordCount]);

  function formatTime(sec: number): string {
    if (!sec || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <Card className="rounded-2xl border-grove/20 bg-gradient-to-br from-grove via-grove to-grove-light overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Play button */}
          <button
            onClick={
              state === "idle" || state === "error" ? generateAndPlay :
              state === "done" ? replay :
              togglePlayPause
            }
            disabled={state === "generating"}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
          >
            {state === "generating" ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : state === "playing" ? (
              <Pause className="w-5 h-5 text-white" />
            ) : state === "done" ? (
              <RotateCcw className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-white/70" />
              <p className="text-sm font-semibold text-white">
                {state === "idle" ? "Audio Briefing" :
                 state === "generating" ? "Generating your briefing..." :
                 state === "playing" ? "Playing briefing..." :
                 state === "paused" ? "Paused" :
                 state === "done" ? "Briefing complete" :
                 "Audio Briefing"}
              </p>
              {duration > 0 && (
                <span className="text-xs text-white/50 ml-auto">
                  {formatTime(progress)} / {formatTime(duration)}
                </span>
              )}
            </div>

            {/* Visualizer / idle state */}
            {state === "playing" || state === "paused" || state === "done" ? (
              <div className="space-y-2">
                {/* Bar visualizer */}
                <div className="flex items-end gap-[2px] h-8">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-white/30 transition-all duration-100"
                      style={{ height: `${state === "playing" ? h : 4}px` }}
                    />
                  ))}
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-full transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : state === "generating" ? (
              <div className="flex items-end gap-[2px] h-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-white/20 animate-pulse"
                    style={{
                      height: `${4 + Math.sin(i * 0.5) * 8}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50">
                Listen to a personalized walkthrough of your credit profile and green readiness
              </p>
            )}
          </div>
        </div>

        {/* Captions toggle */}
        {state !== "idle" && state !== "generating" && words.length > 0 && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setCaptionsOn((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                captionsOn ? "bg-white/20 text-white" : "bg-white/5 text-white/40"
              }`}
            >
              <Captions className="w-3.5 h-3.5" />
              {captionsOn ? "CC On" : "CC Off"}
            </button>
          </div>
        )}

        {/* Live transcript */}
        {captionsOn && visibleWordCount > 0 && (
          <div
            ref={captionRef}
            className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-black/20 px-4 py-3 scrollbar-thin scrollbar-thumb-white/20"
          >
            <p className="text-sm text-white/90 leading-relaxed">
              {words.slice(0, visibleWordCount).map((word, i) => (
                <span
                  key={i}
                  className={i === visibleWordCount - 1 ? "text-white font-medium" : "text-white/70"}
                >
                  {word}{" "}
                </span>
              ))}
              {visibleWordCount < words.length && (
                <span className="inline-block w-0.5 h-4 bg-white/60 animate-pulse align-middle" />
              )}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-200 mt-2 pl-16">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
