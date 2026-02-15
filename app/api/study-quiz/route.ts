import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/gemini";

const GEMINI_PAUSED =
  process.env.GEMINI_PAUSED === "true" || process.env.GEMINI_PAUSED === "1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      moduleTitle: string;
      moduleContent: string;
      userProfile: Record<string, unknown>;
    };

    if (!body.moduleTitle || !body.moduleContent) {
      return NextResponse.json(
        { error: "Missing moduleTitle or moduleContent" },
        { status: 400 }
      );
    }

    if (GEMINI_PAUSED) {
      return NextResponse.json({ questions: [] });
    }

    const questions = await generateQuiz(
      body.moduleTitle,
      body.moduleContent,
      body.userProfile || {}
    );

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz generation failed";
    console.error("[study-quiz]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
