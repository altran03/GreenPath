import { NextRequest } from "next/server";
import { streamChat, createChatSystemPrompt } from "@/lib/gemini";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      messages: { role: string; content: string }[];
      context: {
        greenReadiness: GreenReadiness;
        investments: GreenInvestment[];
        availableSavings?: number | null;
        bureauScores?: Record<string, number | null> | null;
        flexIdVerified?: boolean | null;
        fraudRiskLevel?: string | null;
      };
      voiceMode?: boolean;
    };

    if (!body.messages || !body.context) {
      console.error("[chat] Missing messages or context in request body");
      return new Response(JSON.stringify({ error: "Missing messages or context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const geminiPaused =
      process.env.GEMINI_PAUSED === "true" || process.env.GEMINI_PAUSED === "1";
    if (geminiPaused) {
      return new Response(
        JSON.stringify({ error: "Gemini is temporarily paused." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      console.error("[chat] GEMINI_API_KEY is not set");
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let systemPrompt = createChatSystemPrompt(
      body.context.greenReadiness,
      body.context.investments,
      body.context.availableSavings,
      body.context.bureauScores,
      body.context.flexIdVerified,
      body.context.fraudRiskLevel
    );

    if (body.voiceMode) {
      systemPrompt += `\n\nIMPORTANT — VOICE MODE: The user is talking to you by voice and will hear your response spoken aloud. Keep responses SHORT and conversational:
- Maximum 2-3 sentences per response
- Talk like a friend, not a textbook — use casual language
- No bullet points, no markdown formatting, no lists
- Don't say "here are some options" — just give your best recommendation
- Use natural speech patterns ("So basically...", "The cool thing is...", "Here's the deal...")
- Reference their actual numbers but keep it brief
- If they ask something complex, give the headline answer first, then ask if they want more detail`;
    }

    console.log("[chat] Starting stream for", body.messages.length, "messages", body.voiceMode ? "(voice)" : "");
    const stream = await streamChat(body.messages, systemPrompt);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Brief pause so the UI feels like it's thinking
          await new Promise((r) => setTimeout(r, 800));
          for await (const text of stream) {
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Stream error";
          console.error("[chat] Stream error:", errMsg);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    console.error("[chat] Unhandled error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
