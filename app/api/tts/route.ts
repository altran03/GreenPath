import { NextRequest, NextResponse } from "next/server";
import { textToSpeechStream } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const body = (await request.json()) as { text: string };

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const text = body.text.slice(0, 2000);
    const audioStream = await textToSpeechStream(text);

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    console.error("[tts]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
