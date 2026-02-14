"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { GreenChat } from "@/components/green-chat";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

interface ChatFABProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  availableSavings: number | null;
  bureauScores?: Record<string, number | null>;
  flexIdVerified?: boolean;
  fraudRiskLevel?: string;
}

export function ChatFAB({
  greenReadiness,
  investments,
  availableSavings,
  bureauScores,
  flexIdVerified,
  fraudRiskLevel,
}: ChatFABProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-grove hover:bg-grove-light text-white shadow-lg shadow-grove/30 hover:shadow-xl hover:shadow-grove/40 transition-all duration-300 flex items-center justify-center group animate-pulse-glow"
          aria-label="Open AI chat"
        >
          <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sunbeam text-[10px] font-bold text-grove flex items-center justify-center">
            AI
          </span>
        </button>
      )}

      {/* Floating chat panel — no overlay, page stays interactive */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] sm:w-[400px] h-[600px] max-h-[85vh] rounded-2xl border border-dew/40 shadow-2xl bg-white flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-grove text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-meadow" />
              <span className="text-sm font-heading">GreenPath AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Chat body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <GreenChat
              greenReadiness={greenReadiness}
              investments={investments}
              availableSavings={availableSavings}
              bureauScores={bureauScores}
              flexIdVerified={flexIdVerified}
              fraudRiskLevel={fraudRiskLevel}
              embedded
            />
          </div>
        </div>
      )}
    </>
  );
}
