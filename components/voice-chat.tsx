"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import { useVoicePlayback } from "@/hooks/use-voice-playback";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VoiceChatProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  availableSavings?: number | null;
  bureauScores?: Record<string, number | null> | null;
  flexIdVerified?: boolean | null;
  fraudRiskLevel?: string | null;
}

// Inline speech recognition to avoid any import issues
function useMic(onFinalResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(onFinalResult);
  callbackRef.current = onFinalResult;

  const start = useCallback(() => {
    setError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        callbackRef.current(final.trim());
      }
    };

    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      console.error("[mic] error:", e.error);
      setListening(false);
      if (e.error === "not-allowed") {
        setError("Microphone access denied. Allow mic permissions and try again.");
      }
    };

    setTranscript("");
    setListening(true);
    try {
      rec.start();
    } catch (err) {
      console.error("[mic] start failed:", err);
      setListening(false);
      setError("Failed to start microphone.");
    }
  }, []);

  const stop = useCallback(() => {
    setListening(false);
  }, []);

  return { listening, transcript, error, start, stop };
}

const STORAGE_KEY = "greenpath-voice-chat";

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function VoiceChat({
  greenReadiness,
  investments,
  availableSavings,
  bureauScores,
  flexIdVerified,
  fraudRiskLevel,
}: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(false);

  const { playbackState, speak, stop: stopPlayback } = useVoicePlayback();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setStreaming(true);
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: { greenReadiness, investments, availableSavings, bureauScores, flexIdVerified, fraudRiskLevel },
          voiceMode: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[VoiceChat]", errorMsg);
      setMessages([...newMessages, { role: "assistant", content: `Error: ${errorMsg}` }]);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, greenReadiness, investments, availableSavings, bureauScores, flexIdVerified, fraudRiskLevel]);

  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  const { listening, transcript, error: micError, start: startMic, stop: stopMic } = useMic((text) => {
    sendRef.current(text);
  });

  // Persist messages
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak when streaming finishes
  useEffect(() => {
    if (prevStreamingRef.current && !streaming) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content && !lastMsg.content.startsWith("Error:")) {
        speak(lastMsg.content);
      }
    }
    prevStreamingRef.current = streaming;
  }, [streaming, messages, speak]);

  const handleMicClick = () => {
    if (listening) {
      stopMic();
    } else {
      stopPlayback();
      startMic();
    }
  };

  const isIdle = !listening && !streaming && playbackState === "idle";
  const showEmptyState = messages.length === 0 && !listening;

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] rounded-2xl border border-dew/40 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dew/40 bg-grove shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-meadow" />
          <span className="text-sm font-heading text-white">GreenPath Voice Assistant</span>
        </div>
        <div className="flex items-center gap-1 bg-white/10 rounded-full p-0.5">
          <button
            onClick={() => setMode("voice")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              mode === "voice" ? "bg-white text-grove" : "text-white/60 hover:text-white"
            }`}
          >
            <Mic className="w-3 h-3 inline mr-1" />
            Voice
          </button>
          <button
            onClick={() => setMode("text")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              mode === "text" ? "bg-white text-grove" : "text-white/60 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3 h-3 inline mr-1" />
            Text
          </button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-5 space-y-4">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-dawn flex items-center justify-center mb-6">
                <Mic className="w-8 h-8 text-canopy" />
              </div>
              <h3 className="text-lg font-heading text-grove mb-2">
                Talk to GreenPath AI
              </h3>
              <p className="text-sm text-stone max-w-sm mb-6">
                Click the mic and ask about green investments, tax credits, or financing options. I&apos;ll respond with voice too.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {["How do solar tax credits work?", "What's my best green investment?", "How can I improve my score?"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-dawn border border-dew/40 text-grove-light hover:bg-canopy/10 hover:border-canopy/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-canopy/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-canopy" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-grove text-white rounded-br-md"
                    : "bg-dawn text-grove border border-dew/40 rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-grove">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : streaming ? (
                    <Loader2 className="w-4 h-4 animate-spin text-canopy" />
                  ) : null
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Voice / Status bar */}
      <div className="border-t border-dew/40 bg-dawn/30 shrink-0">
        {/* Status indicators */}
        {(listening || playbackState === "playing" || playbackState === "loading" || streaming) && (
          <div className="px-5 py-2 flex items-center justify-center gap-2 border-b border-dew/20">
            {listening && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-600 font-medium">Listening...</span>
                {transcript && <span className="text-xs text-red-400 truncate max-w-[200px]">&quot;{transcript}&quot;</span>}
              </>
            )}
            {playbackState === "playing" && (
              <>
                <div className="flex items-end gap-[2px] h-3 animate-speaker-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-[3px] bg-canopy rounded-full" style={{ height: `${4 + Math.random() * 8}px` }} />
                  ))}
                </div>
                <span className="text-xs text-canopy font-medium">Speaking...</span>
                <button type="button" onClick={stopPlayback} className="text-stone hover:text-grove">
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {playbackState === "loading" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-canopy" />
                <span className="text-xs text-canopy">Generating voice...</span>
              </>
            )}
            {streaming && playbackState === "idle" && !listening && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-canopy" />
                <span className="text-xs text-canopy">Thinking...</span>
              </>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="px-5 py-4">
          {mode === "voice" ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleMicClick}
                disabled={streaming}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  listening
                    ? "bg-red-500 text-white animate-mic-pulse scale-110"
                    : streaming
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-grove text-white hover:bg-grove-light hover:scale-105 active:scale-95 shadow-lg shadow-grove/30"
                }`}
                aria-label={listening ? "Stop listening" : "Start listening"}
              >
                {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
              <span className="text-xs text-stone">
                {listening ? "Tap to stop" : streaming ? "Waiting for response..." : "Tap to speak"}
              </span>
              {micError && (
                <p className="text-xs text-red-500 mt-1 max-w-xs text-center">{micError}</p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textInput.trim()) {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 rounded-xl border border-dew/60 focus:border-canopy bg-white px-4 py-2.5 text-sm outline-none"
                disabled={streaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={streaming || !textInput.trim()}
                className="rounded-xl bg-grove hover:bg-grove-light shrink-0"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
