"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { UIMessage } from "ai";

interface Props {
  chatId: string;
  initialMessages?: UIMessage[];
}

export function ChatPanel({ chatId, initialMessages = [] }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId },
    }),
    onFinish: () => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  }

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-base font-medium text-gray-900">
              Ask the HR Assistant
            </h3>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Try: <em>"How many engineers do we have?"</em>,{" "}
              <em>"Who is on leave?"</em>, or{" "}
              <em>"Show the department breakdown"</em>
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nexus-100 text-nexus-700">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-nexus-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                const t = part as unknown as {
                  type: string;
                  state?: string;
                  toolName?: string;
                };
                if (typeof t.type === "string" && t.type.startsWith("tool-")) {
                  return (
                    <div
                      key={i}
                      className="mt-1 text-xs italic text-gray-500"
                    >
                      {t.state === "output-available"
                        ? `✓ Used ${t.toolName ?? "tool"}`
                        : `⏳ Calling ${t.toolName ?? "tool"}…`}
                    </div>
                  );
                }
                return null;
              })}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nexus-100 text-nexus-700">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            Error: {error.message}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the workforce…"
            disabled={isLoading}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-nexus-500 px-3 py-2 text-sm font-medium text-white hover:bg-nexus-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
