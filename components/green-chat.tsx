"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GreenReadiness } from "@/lib/green-scoring";
import type { GreenInvestment } from "@/lib/green-investments";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GreenChatProps {
  greenReadiness: GreenReadiness;
  investments: GreenInvestment[];
}

const SUGGESTIONS = [
  "How do solar tax credits work?",
  "What credit score do I need for an EV loan?",
  "How can I lower my utilization?",
  "What are the best green investments for beginners?",
];

export function GreenChat({ greenReadiness, investments }: GreenChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(content: string) {
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
          context: { greenReadiness, investments },
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

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
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantContent },
              ]);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
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

        {/* Messages */}
        <ScrollArea className="h-72" ref={scrollRef}>
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
                  {msg.content}
                  {msg.role === "assistant" && !msg.content && streaming && (
                    <Loader2 className="w-4 h-4 animate-spin text-canopy" />
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

        {/* Input */}
        <div className="px-5 py-4 border-t border-dew/40 bg-dawn/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about green investments, tax credits, financing..."
              className="rounded-xl border-dew/60 focus:border-canopy bg-white"
              disabled={streaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-grove hover:bg-grove-light shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
