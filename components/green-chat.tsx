"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, User, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useVoicePlayback } from "@/hooks/use-voice-playback";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GreenChatProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
  availableSavings?: number | null;
  bureauScores?: Record<string, number | null> | null;
  flexIdVerified?: boolean | null;
  fraudRiskLevel?: string | null;
  embedded?: boolean;
}

const SUGGESTIONS = [
  "How do solar tax credits work?",
  "What credit score do I need for an EV loan?",
  "How can I lower my utilization?",
  "What are the best green investments for beginners?",
];

const STORAGE_KEY = "greenpath-chat";

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function GreenChat({ greenReadiness, investments, availableSavings, bureauScores, flexIdVerified, fraudRiskLevel, embedded }: GreenChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevStreamingRef = useRef(false);

  // Voice hooks
  const sendMessageRef = useRef<(content: string) => void>(undefined);

  const { playbackState, speak, stop: stopPlayback } = useVoicePlayback();

  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    onResult: (finalTranscript) => {
      if (finalTranscript.trim()) {
        setInput("");
        sendMessageRef.current?.(finalTranscript);
      }
    },
  });

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show live transcript in input while listening
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [isListening, transcript]);

  // Auto-speak AI response when streaming finishes and voice mode is on
  useEffect(() => {
    if (prevStreamingRef.current && !streaming && voiceMode) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content && !lastMsg.content.startsWith("\u26A0\uFE0F")) {
        speak(lastMsg.content);
      }
    }
    prevStreamingRef.current = streaming;
  }, [streaming, voiceMode, messages, speak]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: { greenReadiness, investments, availableSavings, bureauScores, flexIdVerified, fraudRiskLevel },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream available");

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
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantContent },
              ]);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[GreenChat]", errorMsg);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `\u26A0\uFE0F ${errorMsg}`,
        },
      ]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, streaming, greenReadiness, investments, availableSavings, bureauScores, flexIdVerified, fraudRiskLevel]);

  // Keep ref in sync for speech recognition callback
  sendMessageRef.current = sendMessage;

  const chatBody = (
    <>
      {/* Messages */}
      <ScrollArea className={embedded ? "flex-1 min-h-0" : "h-72"} ref={scrollRef}>
        <div className="p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-dew mx-auto mb-3" />
              <p className="text-sm text-stone mb-4">
                Ask me anything about green investments, financing, or sustainability!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
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
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-grove/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-grove" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Speaking / listening status bar */}
      {(isListening || playbackState === "playing" || playbackState === "loading") && (
        <div className="px-5 py-2 border-t border-dew/40 flex items-center justify-center gap-2 shrink-0">
          {isListening && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 font-medium">Listening...</span>
              <span className="text-xs text-red-400 truncate max-w-[150px]">{transcript || "Speak now"}</span>
            </>
          )}
          {playbackState === "playing" && (
            <>
              <div className="flex items-end gap-[2px] h-3 animate-speaker-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-canopy rounded-full"
                    style={{ height: `${4 + Math.random() * 8}px` }}
                  />
                ))}
              </div>
              <span className="text-xs text-canopy">Speaking...</span>
              <button type="button" onClick={stopPlayback} className="text-stone hover:text-grove">
                <VolumeX className="w-3 h-3" />
              </button>
            </>
          )}
          {playbackState === "loading" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-stone" />
              <span className="text-xs text-stone">Generating speech...</span>
            </>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-dew/40 bg-dawn/30 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          {/* Mic button — toggles voice mode, or starts/stops listening */}
          <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                if (!voiceMode) {
                  // Turn on voice mode and start listening
                  setVoiceMode(true);
                  resetTranscript();
                  startListening();
                } else if (isListening) {
                  stopListening();
                } else {
                  stopPlayback();
                  resetTranscript();
                  startListening();
                }
              }}
              disabled={streaming}
              className={`rounded-xl shrink-0 transition-all ${
                isListening
                  ? "bg-red-100 text-red-600 animate-mic-pulse"
                  : voiceMode
                  ? "bg-grove/10 text-grove"
                  : "text-stone hover:bg-dawn hover:text-grove"
              }`}
              aria-label={isListening ? "Stop listening" : "Speak your question"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "Listening..."
                : "Ask about green investments, tax credits, financing..."
            }
            className={`rounded-xl border-dew/60 focus:border-canopy bg-white ${
              isListening ? "border-red-300 bg-red-50/30" : ""
            }`}
            disabled={streaming || isListening}
          />
          <Button
            type="submit"
            size="icon"
            disabled={streaming || !input.trim() || isListening}
            className="rounded-xl bg-grove hover:bg-grove-light shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full overflow-hidden">{chatBody}</div>;
  }

  return (
    <Card className="animate-fade-up delay-600 rounded-2xl border-dew/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-dew/40 bg-grove">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-meadow" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Ask GreenPath AI</h3>
            <p className="text-xs text-meadow/70">Ask anything about green finance</p>
          </div>
        </div>
        {chatBody}
      </CardContent>
    </Card>
  );
}
