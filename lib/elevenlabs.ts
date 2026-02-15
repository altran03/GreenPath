/**
 * ElevenLabs Text-to-Speech integration.
 * Streams audio from the ElevenLabs API using a pre-configured voice.
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const VOICE_ID = "Y4IXKUGYisXg2f1YhBmi";
const MODEL_ID = "eleven_multilingual_v2";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY || "";
}

/**
 * Generate speech audio from text. Returns a ReadableStream of audio bytes.
 */
export async function textToSpeechStream(text: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${VOICE_ID}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": getApiKey(),
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }

  if (!res.body) {
    throw new Error("No response body from ElevenLabs");
  }

  return res.body;
}
