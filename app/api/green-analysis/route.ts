import { NextRequest, NextResponse } from "next/server";
import { analyzeGreenReadiness } from "@/lib/gemini";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      greenReadiness: GreenReadiness;
      recommendedInvestments: GreenInvestment[];
    };

    if (!body.greenReadiness || !body.recommendedInvestments) {
      return NextResponse.json(
        { error: "Missing greenReadiness or recommendedInvestments" },
        { status: 400 }
      );
    }

    const analysis = await analyzeGreenReadiness(
      body.greenReadiness,
      body.recommendedInvestments
    );

    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini analysis failed";
    console.error("[green-analysis]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
