"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Leaf, TreePine, X, Sparkles, TrendingUp, ChevronRight, Zap } from "lucide-react";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import { formatCurrency } from "@/lib/utils";

interface GreenWrappedProps {
  userName: string;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  bureauScores?: Record<string, number | null>;
  onClose: () => void;
}

const TOTAL_SLIDES = 6;
const AUTO_ADVANCE_MS = 4000;

const tierLabels: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Needs Work",
};

const tierRates: Record<string, string> = {
  A: "~5.5%",
  B: "~8.5%",
  C: "~14%",
  D: "~22%",
};

const tierGlowColors: Record<string, string> = {
  A: "rgba(16, 185, 129, 0.6)",
  B: "rgba(59, 130, 246, 0.6)",
  C: "rgba(245, 158, 11, 0.6)",
  D: "rgba(239, 68, 68, 0.5)",
};

const tierRingColors: Record<string, string> = {
  A: "#10b981",
  B: "#3b82f6",
  C: "#f59e0b",
  D: "#ef4444",
};

function useAnimatedCounter(
  target: number,
  durationMs: number,
  shouldAnimate: boolean
): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setValue(0);
      return;
    }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs, shouldAnimate]);

  return value;
}

export default function GreenWrapped({
  userName,
  greenReadiness,
  investments,
  onClose,
}: GreenWrappedProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = userName.split(" ")[0];

  // Computed data
  const topInvestment = investments[0] ?? null;
  const totalCO2 = investments.reduce(
    (sum, inv) => sum + inv.annualCO2ReductionLbs,
    0
  );
  const totalTrees = Math.round(totalCO2 / 48);
  const totalSavings = investments.reduce(
    (sum, inv) => sum + inv.annualSavings,
    0
  );

  // Animated counters
  const animatedScore = useAnimatedCounter(
    greenReadiness.score,
    2000,
    currentSlide === 1
  );
  const animatedTrees = useAnimatedCounter(
    totalTrees,
    2000,
    currentSlide === 4
  );

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const goToSlide = useCallback(
    (next: number) => {
      if (isTransitioning || next === currentSlide) return;
      setIsTransitioning(true);

      // Short delay for exit transition before entering the new slide
      setTimeout(() => {
        setCurrentSlide(next);
        setIsTransitioning(false);
      }, 300);
    },
    [isTransitioning, currentSlide]
  );

  const advance = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      goToSlide(currentSlide + 1);
    }
  }, [currentSlide, goToSlide]);

  // Auto-advance timer
  useEffect(() => {
    if (currentSlide >= TOTAL_SLIDES - 1) return;
    timerRef.current = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlide, advance]);

  const goBack = useCallback(() => {
    if (currentSlide > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      goToSlide(currentSlide - 1);
    }
  }, [currentSlide, goToSlide]);

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    advance();
  };

  // Global keyboard navigation (arrow keys work without focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advance, goBack, onClose]);

  // Score ring SVG values
  const ringRadius = 88;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const scorePercent = greenReadiness.score / 100;
  const ringOffset = ringCircumference * (1 - (currentSlide === 1 ? animatedScore / 100 : 0));

  // Slide content visibility classes
  const slideClass = (slideIndex: number) =>
    `absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-500 ease-out ${
      currentSlide === slideIndex && !isTransitioning
        ? "opacity-100 scale-100"
        : "opacity-0 scale-95 pointer-events-none"
    }`;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-700 cursor-pointer ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ fontFamily: "var(--font-body)" }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Tap to advance to next slide"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-grove via-[#1a3a2a] to-black" />

      {/* Ambient glow particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #3d8b5e, transparent)",
            top: "10%",
            left: "-10%",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #e8a838, transparent)",
            bottom: "5%",
            right: "-5%",
            animation: "float 6s ease-in-out infinite 2s",
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #5ba67c, transparent)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "float 10s ease-in-out infinite 1s",
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 z-10 flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm font-medium"
      >
        Skip
        <X className="w-4 h-4" />
      </button>

      {/* Slides container */}
      <div className="relative w-full h-full">
        {/* ---- Slide 0: Intro ---- */}
        <div className={slideClass(0)}>
          <div className="animate-float">
            <Leaf className="w-16 h-16 text-meadow mb-8" strokeWidth={1.5} />
          </div>
          <h1
            className="text-4xl md:text-5xl font-display text-white font-bold text-center leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Hey {firstName}...
          </h1>
          <p className="text-white/60 text-lg mt-4 text-center max-w-md">
            We analyzed your credit profile and found your path to a greener
            future. Let&apos;s see what we discovered.
          </p>
          <div className="mt-12 flex items-center gap-2 text-white/40 text-sm">
            <span>Tap to continue</span>
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        {/* ---- Slide 1: Score Reveal ---- */}
        <div className={slideClass(1)}>
          <p className="text-white/60 text-sm uppercase tracking-widest mb-8 font-medium">
            Your Green Readiness Score
          </p>
          <div className="relative">
            {/* Glow behind ring */}
            <div
              className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-1000"
              style={{
                background: tierGlowColors[greenReadiness.tier],
                opacity: currentSlide === 1 ? 0.4 : 0,
                transform: "scale(1.2)",
              }}
            />
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="relative z-10"
            >
              {/* Background ring */}
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              {/* Score ring */}
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                fill="none"
                stroke={tierRingColors[greenReadiness.tier]}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 110 110)"
                className="transition-all duration-100 ease-linear"
                style={{
                  filter: `drop-shadow(0 0 8px ${tierGlowColors[greenReadiness.tier]})`,
                }}
              />
              {/* Score text */}
              <text
                x="110"
                y="105"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-bold"
                style={{ fontSize: "56px", fontFamily: "var(--font-body)" }}
              >
                {animatedScore}
              </text>
              <text
                x="110"
                y="140"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white/50"
                style={{ fontSize: "14px", fontFamily: "var(--font-body)" }}
              >
                out of 100
              </text>
            </svg>
          </div>
          <div className="mt-6 flex items-center gap-2 text-meadow">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              Based on your credit profile
            </span>
          </div>
        </div>

        {/* ---- Slide 2: Tier Reveal ---- */}
        <div className={slideClass(2)}>
          <p className="text-white/60 text-sm uppercase tracking-widest mb-6 font-medium">
            Your Green Tier
          </p>
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6 transition-all duration-700"
            style={{
              background: `linear-gradient(135deg, ${tierRingColors[greenReadiness.tier]}33, ${tierRingColors[greenReadiness.tier]}11)`,
              border: `2px solid ${tierRingColors[greenReadiness.tier]}66`,
              boxShadow: `0 0 40px ${tierGlowColors[greenReadiness.tier]}, inset 0 0 30px ${tierGlowColors[greenReadiness.tier]}`,
            }}
          >
            <span
              className="text-5xl font-bold"
              style={{ color: tierRingColors[greenReadiness.tier] }}
            >
              {greenReadiness.tier}
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold text-white text-center"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {tierLabels[greenReadiness.tier]}
          </h2>
          <p className="text-white/50 text-base mt-3 text-center max-w-sm">
            Estimated financing rate
          </p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp
              className="w-5 h-5"
              style={{ color: tierRingColors[greenReadiness.tier] }}
            />
            <span
              className="text-2xl font-bold"
              style={{ color: tierRingColors[greenReadiness.tier] }}
            >
              {tierRates[greenReadiness.tier]} APR
            </span>
          </div>
        </div>

        {/* ---- Slide 3: Top Investment ---- */}
        <div className={slideClass(3)}>
          {topInvestment ? (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: "rgba(143, 204, 169, 0.15)",
                  border: "1px solid rgba(143, 204, 169, 0.3)",
                }}
              >
                <Zap className="w-8 h-8 text-meadow" />
              </div>
              <p className="text-white/60 text-sm uppercase tracking-widest mb-4 font-medium">
                #1 Recommendation
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-white text-center leading-tight max-w-md"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {topInvestment.name}
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-meadow text-3xl font-bold">
                    {formatCurrency(topInvestment.annualSavings)}
                  </p>
                  <p className="text-white/50 text-sm mt-1">saved per year</p>
                </div>
                <div className="text-center">
                  <p className="text-honey text-3xl font-bold">
                    {topInvestment.annualCO2ReductionLbs.toLocaleString()}
                  </p>
                  <p className="text-white/50 text-sm mt-1">lbs CO2 reduced</p>
                </div>
              </div>
              {topInvestment.estimatedCost > 0 && (
                <p className="text-white/40 text-sm mt-6">
                  Estimated cost: {formatCurrency(topInvestment.estimatedCost)}
                </p>
              )}
            </>
          ) : (
            <>
              <Leaf className="w-12 h-12 text-meadow mb-4" />
              <h2 className="text-2xl text-white font-bold">
                No investments matched your tier yet
              </h2>
              <p className="text-white/50 mt-2">
                Keep building your credit to unlock green investments.
              </p>
            </>
          )}
        </div>

        {/* ---- Slide 4: Impact (Trees) ---- */}
        <div className={slideClass(4)}>
          <p className="text-white/60 text-sm uppercase tracking-widest mb-6 font-medium">
            Your Potential Annual Impact
          </p>
          <div className="animate-float mb-4">
            <TreePine
              className="w-20 h-20 text-canopy"
              strokeWidth={1.2}
            />
          </div>
          <h2
            className="text-5xl md:text-6xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {animatedTrees}
          </h2>
          <p className="text-white/60 text-xl mt-2">
            trees worth of CO2 offset
          </p>
          <div
            className="mt-8 rounded-2xl px-6 py-4 text-center max-w-sm"
            style={{
              background: "rgba(143, 204, 169, 0.1)",
              border: "1px solid rgba(143, 204, 169, 0.2)",
            }}
          >
            <p className="text-white/70 text-sm">
              That&apos;s{" "}
              <span className="text-meadow font-bold">
                {totalCO2.toLocaleString()} lbs
              </span>{" "}
              of CO2 per year across{" "}
              <span className="text-white font-semibold">
                {investments.length} investments
              </span>
              , saving you{" "}
              <span className="text-honey font-bold">
                {formatCurrency(totalSavings)}/yr
              </span>
            </p>
          </div>
        </div>

        {/* ---- Slide 5: CTA ---- */}
        <div className={slideClass(5)}>
          <div className="relative mb-8">
            <div
              className="absolute inset-0 blur-3xl rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(143, 204, 169, 0.3), transparent)",
                transform: "scale(2)",
              }}
            />
            <Leaf
              className="w-14 h-14 text-meadow relative z-10"
              strokeWidth={1.5}
            />
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white text-center leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your green future
            <br />
            starts now.
          </h2>
          <p className="text-white/50 text-base mt-4 text-center max-w-sm">
            Explore your personalized green investment plan and start
            saving money while saving the planet.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="relative z-10 mt-10 px-8 py-4 rounded-full text-grove font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, #8fcca9, #5ba67c)",
              boxShadow:
                "0 0 30px rgba(143, 204, 169, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)",
            }}
          >
            Let&apos;s Get Started
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (timerRef.current) clearTimeout(timerRef.current);
              goToSlide(i);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === currentSlide
                ? "w-8 h-2.5 bg-meadow"
                : "w-2.5 h-2.5 bg-white/25 hover:bg-white/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
