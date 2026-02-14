"use client";

import { useEffect, useState } from "react";
import { getTierLabel } from "@/lib/utils";

interface GreenScoreGaugeProps {
  score: number;
  tier: "A" | "B" | "C" | "D";
}

export function GreenScoreGauge({ score, tier }: GreenScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [score]);

  const tierColors: Record<string, { stroke: string; glow: string; bg: string }> = {
    A: { stroke: "#3d8b5e", glow: "rgba(61,139,94,0.3)", bg: "#eef7f0" },
    B: { stroke: "#3b82f6", glow: "rgba(59,130,246,0.3)", bg: "#eff6ff" },
    C: { stroke: "#e8a838", glow: "rgba(232,168,56,0.3)", bg: "#fffbeb" },
    D: { stroke: "#f87171", glow: "rgba(248,113,113,0.3)", bg: "#fef2f2" },
  };

  const colors = tierColors[tier];
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.bg}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              filter: `drop-shadow(0 0 8px ${colors.glow})`,
              transition: "stroke-dashoffset 0.1s ease-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-5xl text-grove leading-none">
            {animatedScore}
          </span>
          <span className="text-sm text-stone mt-1">out of 100</span>
        </div>
      </div>
      <div
        className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
        style={{ backgroundColor: colors.bg, color: colors.stroke }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.stroke }} />
        Tier {tier} — {getTierLabel(tier)}
      </div>
    </div>
  );
}
