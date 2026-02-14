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
      };
    };

    if (!body.messages || !body.context) {
      return new Response(JSON.stringify({ error: "Missing messages or context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = createChatSystemPrompt(
      body.context.greenReadiness,
      body.context.investments.map((i) => i.name)
    );

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
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`
            )
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
