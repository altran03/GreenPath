"use client";

import { useEffect, useRef, useState } from "react";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import { formatCurrency, getTierLabel } from "@/lib/utils";
import {
  Leaf,
  Copy,
  Share2,
  Download,
  Check,
  TrendingUp,
  CreditCard,
  TreePine,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ShareCardProps {
  userName: string;
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
}

const tierStyles: Record<
  GreenReadiness["tier"],
  { badge: string; ring: string; glow: string }
> = {
  A: {
    badge: "bg-emerald-400/20 text-emerald-100 ring-emerald-400/40",
    ring: "ring-emerald-400/50",
    glow: "shadow-[0_0_40px_rgba(52,211,153,0.25)]",
  },
  B: {
    badge: "bg-green-400/20 text-green-100 ring-green-400/40",
    ring: "ring-green-400/50",
    glow: "shadow-[0_0_40px_rgba(74,222,128,0.25)]",
  },
  C: {
    badge: "bg-amber-400/20 text-amber-100 ring-amber-400/40",
    ring: "ring-amber-400/50",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.25)]",
  },
  D: {
    badge: "bg-red-400/20 text-red-100 ring-red-400/40",
    ring: "ring-red-400/50",
    glow: "shadow-[0_0_40px_rgba(248,113,113,0.25)]",
  },
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function ShareCard({
  userName,
  greenReadiness,
  investments,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const { tier, score, creditScore, utilization } = greenReadiness;
  const style = tierStyles[tier];

  const totalCO2 = investments.reduce(
    (sum, inv) => sum + inv.annualCO2ReductionLbs,
    0
  );
  const topInvestments = investments.slice(0, 3);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s GreenPath Score`,
          text: `I scored ${score}/100 (Tier ${tier}) on GreenPath! Check out your green financing readiness.`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `greenpath-score-${userName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // html2canvas not available
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ---------- Shareable Card ---------- */}
      <div
        ref={cardRef}
        className={
          "relative max-w-sm w-full mx-auto rounded-2xl overflow-hidden " +
          "bg-gradient-to-br from-grove to-grove-light text-white p-6 " +
          style.glow
        }
        style={{ aspectRatio: "3 / 4" }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/[0.03]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Header / Branding */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Leaf className="h-4 w-4 text-meadow" />
              </div>
              <span className="font-heading text-lg tracking-tight">
                GreenPath
              </span>
            </div>
            <p className="mt-3 text-sm text-white/60">Green Readiness Score</p>
            <p className="text-xl font-semibold tracking-tight">{userName}</p>
          </div>

          {/* Score Display */}
          <div className="flex flex-col items-center py-4">
            <div className="relative flex items-center justify-center">
              {/* Outer ring */}
              <div
                className={
                  "absolute inset-0 rounded-full ring-2 " +
                  style.ring +
                  " opacity-40 scale-[1.18]"
                }
              />
              <div
                className={
                  "flex h-28 w-28 flex-col items-center justify-center rounded-full " +
                  "bg-white/10 ring-2 " +
                  style.ring
                }
              >
                <span className="font-heading text-5xl leading-none">
                  {score}
                </span>
                <span className="text-[11px] text-white/50 mt-0.5">
                  / 100
                </span>
              </div>
            </div>
            <div
              className={
                "mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 " +
                "text-xs font-semibold ring-1 " +
                style.badge
              }
            >
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (tier === "A"
                    ? "bg-emerald-400"
                    : tier === "B"
                      ? "bg-green-400"
                      : tier === "C"
                        ? "bg-amber-400"
                        : "bg-red-400")
                }
              />
              Tier {tier} &mdash; {getTierLabel(tier)}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-xl bg-white/10 px-2 py-3">
              <CreditCard className="h-3.5 w-3.5 text-white/50 mb-1" />
              <span className="text-lg font-bold leading-none">
                {creditScore}
              </span>
              <span className="text-[10px] text-white/50 mt-1">
                Credit Score
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/10 px-2 py-3">
              <TrendingUp className="h-3.5 w-3.5 text-white/50 mb-1" />
              <span className="text-lg font-bold leading-none">
                {Math.round(utilization * 100)}%
              </span>
              <span className="text-[10px] text-white/50 mt-1">
                Utilization
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/10 px-2 py-3">
              <TreePine className="h-3.5 w-3.5 text-white/50 mb-1" />
              <span className="text-lg font-bold leading-none">
                {formatNumber(totalCO2)}
              </span>
              <span className="text-[10px] text-white/50 mt-1 text-center leading-tight">
                CO₂ lbs/yr
              </span>
            </div>
          </div>

          {/* Top Investments */}
          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/40 mb-2">
              Top Recommendations
            </p>
            <div className="space-y-1.5">
              {topInvestments.map((inv, i) => (
                <div
                  key={inv.name}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{inv.name}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-meadow font-medium">
                    {formatCurrency(inv.annualSavings)}/yr
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-[10px] text-white/30">
            Generated on {today}
          </p>
        </div>
      </div>

      {/* ---------- Action Buttons ---------- */}
      <Card className="max-w-sm w-full mx-auto border-0 bg-transparent shadow-none">
        <CardContent className="flex items-center justify-center gap-3 p-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className={
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium " +
              "bg-grove/10 text-grove hover:bg-grove/20 transition-colors cursor-pointer"
            }
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </button>

          {canShare && (
              <button
                type="button"
                onClick={handleShare}
                className={
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium " +
                  "bg-grove/10 text-grove hover:bg-grove/20 transition-colors cursor-pointer"
                }
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}

          <button
            type="button"
            onClick={handleDownload}
            className={
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium " +
              "bg-grove text-white hover:bg-grove-light transition-colors cursor-pointer"
            }
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
