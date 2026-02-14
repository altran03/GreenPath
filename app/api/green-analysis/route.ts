import { NextRequest, NextResponse } from "next/server";
import { analyzeGreenReadiness } from "@/lib/gemini";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

const GEMINI_PAUSED =
  process.env.GEMINI_PAUSED === "true" || process.env.GEMINI_PAUSED === "1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      greenReadiness: GreenReadiness;
      recommendedInvestments: GreenInvestment[];
      bureauScores?: Record<string, number | null> | null;
    };

    if (!body.greenReadiness || !body.recommendedInvestments) {
      return NextResponse.json(
        { error: "Missing greenReadiness or recommendedInvestments" },
        { status: 400 }
      );
    }

    if (GEMINI_PAUSED) {
      return NextResponse.json({
        summary: "Analysis is temporarily paused.",
        investmentInsights: [],
        creditTips: [],
        totalImpactStatement: "",
      });
    }

    console.log("[green-analysis] Calling Gemini for analysis");
    const analysis = await analyzeGreenReadiness(
      body.greenReadiness,
      body.recommendedInvestments,
      body.bureauScores ?? null
    );
    console.log("[green-analysis] Gemini analysis complete");

    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini analysis failed";
    console.error("[green-analysis]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
