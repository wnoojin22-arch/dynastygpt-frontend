"use client";

/**
 * useChatAdvisorV2 — wraps the new /trade-builder/chat/v2 SSE endpoint.
 *
 * Differences from useChatAdvisor (legacy):
 *   • Hits /chat/v2 (Sonnet 4.6 + factbook + validator pipeline).
 *   • Parses NAMED SSE events: chunk, correction, meta, done, error.
 *   • Surfaces a `lastCorrection` payload for the UI to render an inline
 *     "I should correct that" frame.
 *   • Optional `lastMeta` (validator status, freshness, timings) for debug.
 *
 * The hook is shape-compatible with useChatAdvisor where it can be —
 * messages/input/streaming/refs/handlers — so the UI layer is unchanged.
 */
import { useState, useRef, useCallback } from "react";
import { useTrack } from "@/hooks/useTrack";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatCorrection {
  text: string;
  violations: { severity: string; claim_type: string; detail: string }[];
}

interface UseChatAdvisorV2Props {
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  activeTrade: unknown | null;
}

export function useChatAdvisorV2({
  leagueId,
  owner,
  ownerId,
  activeTrade,
}: UseChatAdvisorV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastCorrection, setLastCorrection] = useState<ChatCorrection | null>(null);
  const [lastMeta, setLastMeta] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastInjectedRef = useRef<string | null>(null);
  const track = useTrack();

  const injectMessage = useCallback((text: string | null | undefined) => {
    if (!text || text === lastInjectedRef.current) return;
    lastInjectedRef.current = text;
    const clean = text.replace(/\n\d{13}$/, "").replace(/\*\*/g, "");
    setMessages((prev) => [...prev, { role: "assistant", content: clean }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastCorrection(null);
    setLastMeta(null);
    lastInjectedRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const cleanText = text.trim();
      track("trade_advisor_message_sent_v2", {
        league_id: leagueId,
        message: cleanText.slice(0, 500),
        msg_length: cleanText.length,
        has_active_trade: !!activeTrade,
        conversation_turn: messages.length,
      });
      setMessages((prev) => [...prev, { role: "user", content: cleanText }]);
      setInput("");
      setStreaming(true);
      setLastCorrection(null);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const { authHeaders } = await import("@/lib/api");
        const hdrs = await authHeaders();
        const res = await fetch(
          `/api/league/${leagueId}/trade-builder/chat/v2`,
          {
            method: "POST",
            headers: hdrs,
            body: JSON.stringify({
              owner,
              owner_user_id: ownerId || undefined,
              message: cleanText,
              conversation_history: messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              active_trade: activeTrade,
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
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by blank lines. Process any complete
          // frame in the buffer, leaving the trailing partial frame.
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            currentEvent = "message";
            let dataLine = "";
            for (const line of frame.split("\n")) {
              if (line.startsWith(":")) continue; // comment / heartbeat
              if (line.startsWith("event:")) {
                currentEvent = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLine += line.slice(5).trim();
              }
            }
            if (!dataLine) continue;

            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(dataLine);
            } catch {
              continue;
            }

            if (currentEvent === "chunk" && typeof parsed.text === "string") {
              const delta = (parsed.text as string).replace(/\*\*/g, "");
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = {
                  ...u[u.length - 1],
                  content: u[u.length - 1].content + delta,
                };
                return u;
              });
            } else if (currentEvent === "correction") {
              setLastCorrection({
                text: (parsed.text as string) ?? "",
                violations:
                  (parsed.violations as ChatCorrection["violations"]) ?? [],
              });
            } else if (currentEvent === "meta") {
              setLastMeta(parsed);
            } else if (currentEvent === "error") {
              const msg =
                (parsed.message as string) ||
                (parsed.detail as string) ||
                "Stream failed";
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = {
                  role: "assistant",
                  content: `Error: ${msg}`,
                };
                return u;
              });
            }
            // "done" is a terminator; loop exits via reader.read() done flag.
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
    [leagueId, owner, ownerId, messages, activeTrade, streaming, track],
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
    lastCorrection,
    lastMeta,
  };
}
