"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type PlaybackState = "idle" | "loading" | "playing" | "error";

interface UseVoicePlaybackReturn {
  playbackState: PlaybackState;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function useVoicePlayback(): UseVoicePlaybackReturn {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setPlaybackState("idle");
  }, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      cleanup();
      setPlaybackState("loading");

      try {
        const cleaned = stripMarkdown(text).slice(0, 3000);
        if (!cleaned) {
          setPlaybackState("idle");
          return;
        }

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
        });

        if (!res.ok) {
          throw new Error(`TTS failed: ${res.status}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener("playing", () => setPlaybackState("playing"));
        audio.addEventListener("ended", () => {
          setPlaybackState("idle");
          cleanup();
        });
        audio.addEventListener("error", () => {
          setPlaybackState("error");
          cleanup();
        });

        await audio.play();
      } catch (err) {
        console.error("[voice-playback]", err);
        setPlaybackState("error");
        // Reset to idle after a moment so user can retry
        setTimeout(() => setPlaybackState("idle"), 2000);
      }
    },
    [cleanup]
  );

  return { playbackState, speak, stop };
}
