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
      };
    };

    if (!body.messages || !body.context) {
      console.error("[chat] Missing messages or context in request body");
      return new Response(JSON.stringify({ error: "Missing messages or context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[chat] GEMINI_API_KEY is not set");
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = createChatSystemPrompt(
      body.context.greenReadiness,
      body.context.investments,
      body.context.availableSavings
    );

    console.log("[chat] Starting stream for", body.messages.length, "messages");
    const stream = await streamChat(body.messages, systemPrompt);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text();
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
