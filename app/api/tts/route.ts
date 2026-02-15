import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MODEL = "openai/gpt-audio-mini";

// Build a WAV header for raw PCM16 data (mono, 24kHz)
function buildWavHeader(pcmLength: number): Buffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmLength;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);        // fmt chunk size
  header.writeUInt16LE(1, 20);         // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const body = await request.json() as { text: string };

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const text = body.text.slice(0, 2000);

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        modalities: ["text", "audio"],
        audio: { voice: "nova", format: "pcm16" },
        stream: true,
        messages: [
          {
            role: "system",
            content: "Read the user's text aloud exactly as written. Do not add or change any words.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[tts] OpenRouter error:", res.status, errText);
      return NextResponse.json({ error: `TTS failed: ${res.status}` }, { status: 502 });
    }

    // Read SSE stream, collect base64 audio chunks
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 502 });
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const audioChunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const audioData = parsed.choices?.[0]?.delta?.audio?.data;
          if (audioData) {
            audioChunks.push(audioData);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    if (audioChunks.length === 0) {
      console.error("[tts] No audio chunks received");
      return NextResponse.json({ error: "No audio generated" }, { status: 502 });
    }

    // Combine all base64 chunks into PCM buffer
    const pcmBuffer = Buffer.concat(audioChunks.map((chunk) => Buffer.from(chunk, "base64")));

    // Add WAV header
    const wavHeader = buildWavHeader(pcmBuffer.length);
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    return new Response(wavBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    console.error("[tts]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
