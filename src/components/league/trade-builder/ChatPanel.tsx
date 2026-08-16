"use client";
/**
 * TRADE ADVISOR — live chat panel (relaunch 2026-08-16).
 *
 * Bloomberg-terminal-meets-group-chat aesthetic per Billy's spec:
 *   - Bordered card surface, gold accents, mono metadata
 *   - Streaming assistant messages with soft fade-in
 *   - User bubbles right-aligned, assistant bubbles left-aligned
 *   - Persistent beta disclaimer strip at the top of the body
 *   - Collapsed = vertical tab on right edge (desktop), sheet trigger (mobile)
 *
 * Wired to useChatAdvisor for SSE streaming against
 * POST /api/league/{leagueId}/trade-builder/chat.
 * The BE validator layer strips CONTRADICTED sentences before the SSE
 * stream reaches the FE, so what the user sees is post-strip only.
 *
 * Tailwind v4 utilities keyed to the design tokens in globals.css.
 * Inline styles are intentionally avoided in this rewrite (Billy spec).
 */

import { useEffect, useMemo } from "react";
import { useChatAdvisor } from "@/hooks/useChatAdvisor";

interface ChatPanelProps {
  leagueId?: string;
  owner?: string;
  ownerId?: string | null;
  activeTrade?: unknown | null;
  suggestedPackages?: unknown[] | null;
  partner?: string;
  collapsed: boolean;
  onToggle: () => void;
  injectedMessage?: string | null;
}

// Beta disclaimer copy — Billy picks from options below (design element,
// not legal boilerplate). Locked to the middle option for now; swap the
// _BETA_MESSAGE literal below to change.
const _BETA_MESSAGE =
  "Beta — AI can be wrong. Push back on any read that feels off and it will re-check.";

export default function ChatPanel({
  leagueId,
  owner,
  ownerId,
  activeTrade,
  suggestedPackages,
  collapsed,
  onToggle,
  injectedMessage,
}: ChatPanelProps) {
  const chat = useChatAdvisor({
    leagueId: leagueId ?? "",
    owner: owner ?? "",
    ownerId: ownerId ?? null,
    activeTrade: activeTrade ?? null,
    suggestedPackages: suggestedPackages ?? null,
  });

  // Injection from surrounding UI (e.g., "which suggested trade is best?"
  // from the swipe modal). Fired once per new value.
  useEffect(() => {
    if (injectedMessage) chat.injectMessage(injectedMessage);
  }, [injectedMessage, chat]);

  // Auto-scroll to bottom on every message change or stream tick.
  useEffect(() => {
    chat.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.streaming]);

  const hasMessages = chat.messages.length > 0;

  // ── COLLAPSED: gold vertical tab on right edge ────────────────────
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        aria-label="Open AI Trade Advisor"
        className="group flex h-full w-12 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-3 border-l-2 border-border bg-gradient-to-b from-gold/[0.06] via-gold/[0.03] to-gold/[0.06] transition-colors hover:from-gold/[0.10] hover:via-gold/[0.06] hover:to-gold/[0.10]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-elevated shadow-[0_0_12px_rgba(212,165,50,0.15)] transition-shadow group-hover:shadow-[0_0_18px_rgba(212,165,50,0.35)]">
          <span className="font-mono text-[11px] font-black text-gold">AI</span>
        </div>
        <span
          className="font-mono text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold"
          style={{ writingMode: "vertical-rl" }}
        >
          Trade Advisor
        </span>
        <span
          className="font-mono text-[8px] font-bold uppercase tracking-[0.10em] text-dim"
          style={{ writingMode: "vertical-rl" }}
        >
          Beta · Tap to open
        </span>
      </button>
    );
  }

  // ── EXPANDED: full chat panel ──────────────────────────────────────
  return (
    <div className="flex h-full w-[380px] flex-shrink-0 flex-col overflow-hidden border-l border-gold/30 bg-gradient-to-b from-bg/[0.97] to-bg backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gold/20 bg-gradient-to-br from-panel/90 to-elevated/90 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-gold/[0.15]">
            <span className="font-mono text-[9px] font-black text-gold">AI</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-[14px] font-bold tracking-wide text-gold-bright">
              TRADE ADVISOR
            </span>
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-dim">
              Beta · Streaming
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Collapse chat"
          className="text-[15px] leading-none text-dim transition-colors hover:text-gold"
        >
          &rarr;
        </button>
      </div>

      {/* Beta disclaimer strip — always visible, subtle, at top of body */}
      <div className="flex-shrink-0 border-b border-gold/15 bg-gold/[0.06] px-3.5 py-2">
        <p className="font-sans text-[10.5px] leading-relaxed text-dim">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-gold">
            Beta
          </span>{" "}
          — AI can be wrong. Push back on any read that feels off and it
          will re-check.
        </p>
      </div>

      {/* Body — messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!hasMessages && !chat.streaming && (
          <EmptyState owner={owner} onPick={(t) => chat.sendMessage(t)} />
        )}
        {hasMessages && (
          <div className="flex flex-col gap-3">
            {chat.messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                streaming={
                  chat.streaming &&
                  i === chat.messages.length - 1 &&
                  m.role === "assistant"
                }
              />
            ))}
            <div ref={chat.messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input row */}
      <form
        onSubmit={chat.handleSubmit}
        className="flex flex-shrink-0 items-center gap-2 border-t border-gold/20 bg-panel/95 px-3 py-2.5"
      >
        <input
          ref={chat.inputRef}
          type="text"
          value={chat.input}
          onChange={(e) => chat.setInput(e.target.value)}
          disabled={chat.streaming}
          placeholder={
            chat.streaming
              ? "Thinking..."
              : "Ask about a trade, a partner, a player…"
          }
          className="flex-1 rounded-lg border border-border-lt bg-elevated px-3 py-2 font-sans text-[13px] text-primary placeholder:text-dim/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={chat.streaming || !chat.input.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-dark font-mono text-[12px] font-black text-bg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          &uarr;
        </button>
      </form>
    </div>
  );
}

// ── Empty-state prompt suggestions ─────────────────────────────────
function EmptyState({
  owner,
  onPick,
}: {
  owner?: string;
  onPick: (text: string) => void;
}) {
  const suggestions = useMemo(
    () => [
      "Who should I trade with?",
      "What are my biggest needs?",
      "Who overpays in this league?",
      "Find me a WR upgrade.",
    ],
    []
  );
  return (
    <div className="flex flex-col items-center gap-3 pt-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-elevated shadow-[0_0_20px_rgba(212,165,50,0.15)]">
        <span className="font-mono text-[15px] font-black text-gold">AI</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-[15px] font-bold text-gold-bright">
          Ask anything about your league
        </p>
        <p className="max-w-[260px] font-sans text-[11px] leading-relaxed text-dim">
          {owner ? `Signed in as ${owner}. ` : ""}The advisor has full
          rosters, values, and behavioral data for every owner.
        </p>
      </div>
      <div className="mt-1 flex w-full flex-col gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-md border border-border-lt bg-card/60 px-2.5 py-1.5 text-left font-sans text-[11.5px] leading-tight text-secondary transition-colors hover:border-gold/40 hover:bg-elevated hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────
function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          isUser
            ? "rounded-br-md bg-gradient-to-br from-gold/[0.22] to-gold/[0.10] text-primary"
            : "rounded-bl-md border border-border-lt bg-card text-secondary"
        }`}
      >
        {content ? (
          <BubbleContent text={content} />
        ) : streaming ? (
          <TypingDots />
        ) : null}
      </div>
    </div>
  );
}

// ── Lightweight formatter: renders bullets, keeps line breaks ──────
function BubbleContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5 font-sans text-[12.5px] leading-relaxed">
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return null;
        const isBullet = /^[•\-–]/.test(line);
        if (isBullet) {
          return (
            <div key={i} className="flex gap-1.5 pl-1 text-secondary">
              <span className="text-gold">•</span>
              <span>{line.replace(/^[•\-–]\s*/, "")}</span>
            </div>
          );
        }
        return (
          <p key={i} className={i === 0 ? "font-medium text-primary" : ""}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ── Typing dots (assistant is thinking) ────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gold"
          style={{
            animation: `chatTypingDots 1.2s ease-in-out ${i * 0.15}s infinite`,
            opacity: 0.4,
          }}
        />
      ))}
      <style>{`
        @keyframes chatTypingDots {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
