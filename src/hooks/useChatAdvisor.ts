"use client";

import { useState, useRef, useCallback } from "react";
import { useTrack } from "@/hooks/useTrack";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseChatAdvisorProps {
  leagueId: string;
  owner: string;
  activeTrade: unknown | null;
  suggestedPackages: unknown[] | null;
}

export function useChatAdvisor({
  leagueId,
  owner,
  activeTrade,
  suggestedPackages,
}: UseChatAdvisorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastInjectedRef = useRef<string | null>(null);
  const track = useTrack();

  const injectMessage = useCallback(
    (text: string | null | undefined) => {
      if (!text || text === lastInjectedRef.current) return;
      lastInjectedRef.current = text;
      const clean = text.replace(/\n\d{13}$/, "").replace(/\*\*/g, "");
      setMessages((prev) => [...prev, { role: "assistant", content: clean }]);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    lastInjectedRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const cleanText = text.trim();
      track("trade_advisor_message_sent", {
        league_id: leagueId,
        message: cleanText.slice(0, 500),
        msg_length: cleanText.length,
        has_active_trade: !!activeTrade,
        conversation_turn: messages.length,
      });
      setMessages((prev) => [...prev, { role: "user", content: cleanText }]);
      setInput("");
      setStreaming(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const { authHeaders } = await import("@/lib/api");
        const hdrs = await authHeaders();
        const res = await fetch(
          `/api/league/${leagueId}/trade-builder/chat`,
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({
              owner,
              message: cleanText,
              conversation_history: messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              active_trade: activeTrade,
              suggested_packages: suggestedPackages,
            }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = {
              role: "assistant",
              content: `Error: ${err.error || err.detail || "Request failed"}`,
            };
            return u;
          });
          setStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setStreaming(false);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                const clean = parsed.text.replace(/\*\*/g, "");
                setMessages((prev) => {
                  const u = [...prev];
                  u[u.length - 1] = {
                    ...u[u.length - 1],
                    content: u[u.length - 1].content + clean,
                  };
                  return u;
                });
              }
            } catch {
              /* skip malformed SSE frames */
            }
          }
        }
      } catch (e: unknown) {
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = {
            role: "assistant",
            content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
          };
          return u;
        });
      } finally {
        setStreaming(false);
      }
    },
    [leagueId, owner, messages, activeTrade, suggestedPackages, streaming, track],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [sendMessage, input],
  );

  return {
    messages,
    input,
    setInput,
    streaming,
    messagesEndRef,
    inputRef,
    sendMessage,
    handleSubmit,
    injectMessage,
    clearMessages,
  };
}
