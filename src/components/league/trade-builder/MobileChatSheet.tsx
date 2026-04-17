"use client";

/**
 * MobileChatSheet — full-screen bottom sheet for the DynastyGPT Trade Advisor.
 * Consumes useChatAdvisor hook (shared with desktop ChatPanel).
 * Portal-rendered, slides up from bottom with spring animation.
 * Premium mobile-first UX: safe-area-inset, gold design, streaming cursor.
 */
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChatAdvisor } from "@/hooks/useChatAdvisor";
import { C, SANS, MONO } from "../tokens";

function formatContent(text: string) {
  if (!text) return null;
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length <= 1) return <span>{text}</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-–]/.test(line.trim());
        return (
          <div key={i} style={{ paddingLeft: isBullet ? 4 : 0, fontWeight: i === 0 && !isBullet ? 600 : 400, lineHeight: 1.6 }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

interface MobileChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  activeTrade: unknown | null;
  suggestedPackages: unknown[] | null;
  quickPrompts: string[];
}

export default function MobileChatSheet({
  isOpen,
  onClose,
  leagueId,
  owner,
  ownerId,
  activeTrade,
  suggestedPackages,
  quickPrompts,
}: MobileChatSheetProps) {
  const chat = useChatAdvisor({ leagueId, owner, ownerId, activeTrade, suggestedPackages });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    chat.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) setTimeout(() => chat.inputRef.current?.focus(), 200);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPrompts = chat.messages.length === 0 && !chat.streaming;

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 10000,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="chat-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              height: "92dvh", zIndex: 10001,
              background: C.bg,
              borderRadius: "16px 16px 0 0",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Gold accent line at top ── */}
            <div style={{
              height: 2, width: "100%", flexShrink: 0,
              background: `linear-gradient(90deg, transparent 5%, ${C.gold} 30%, ${C.gold} 70%, transparent 95%)`,
              opacity: 0.6,
            }} />

            {/* ── Header ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${C.gold}20`,
              background: `linear-gradient(135deg, rgba(16,19,29,0.95), rgba(23,27,40,0.95))`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${C.gold}15`, border: `1px solid ${C.gold}40`,
                  boxShadow: `0 0 16px ${C.gold}20`,
                  animation: chat.streaming ? "pulse-gold 1.5s ease infinite" : "none",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: C.gold }}>AI</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: "0.06em" }}>
                  DYNASTYGPT ADVISOR
                </span>
                {/* Alive dot when streaming */}
                {chat.streaming && (
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: C.gold,
                    boxShadow: `0 0 8px ${C.gold}`,
                    animation: "pulse-gold 1.5s ease infinite",
                  }} />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {chat.messages.length > 0 && (
                  <button
                    onClick={chat.clearMessages}
                    style={{
                      background: "none", border: "none", color: C.dim,
                      fontFamily: MONO, fontSize: 10, fontWeight: 700,
                      cursor: "pointer", padding: "4px 6px",
                    }}
                  >
                    CLEAR
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    background: C.elevated, border: `1px solid ${C.border}`,
                    borderRadius: 8, color: C.dim, fontSize: 16,
                    cursor: "pointer", padding: "4px 10px", lineHeight: 1,
                  }}
                >
                  &#x2715;
                </button>
              </div>
            </div>

            {/* ── Messages area ── */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 10,
              WebkitOverflowScrolling: "touch",
              minHeight: 0,
            }}>
              <style>{`
                @keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.4}}
                @keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}
              `}</style>

              {/* Empty state */}
              {chat.messages.length === 0 && !chat.streaming && (
                <div style={{
                  textAlign: "center", padding: "24px 12px",
                  background: `radial-gradient(ellipse at center, ${C.gold}06 0%, transparent 70%)`,
                  borderRadius: 12,
                }}>
                  <div style={{
                    fontFamily: MONO, fontSize: 12, fontWeight: 800,
                    color: C.gold, letterSpacing: "0.08em", marginBottom: 8,
                  }}>
                    DYNASTYGPT TRADE ADVISOR
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                    Ask anything about your roster, trades, or league strategy.
                  </div>
                </div>
              )}

              {/* Quick prompts */}
              {showPrompts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => chat.sendMessage(p)}
                      style={{
                        fontFamily: SANS, fontSize: 13, color: C.goldBright,
                        padding: "11px 14px", borderRadius: 10,
                        background: "rgba(212,165,50,0.06)",
                        border: "1px solid rgba(212,165,50,0.18)",
                        borderLeft: `3px solid ${C.gold}40`,
                        cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <span>{p}</span>
                      <span style={{ color: `${C.gold}50`, fontSize: 14, marginLeft: 8 }}>&rsaquo;</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Message bubbles */}
              {chat.messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const isLast = i === chat.messages.length - 1;
                const isStreamingMsg = !isUser && isLast && chat.streaming;
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "88%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isUser
                        ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                        : C.elevated,
                      border: isUser ? "none" : `1px solid ${isStreamingMsg ? `${C.gold}30` : C.border}`,
                      borderLeft: !isUser ? `2px solid ${isStreamingMsg ? C.gold : `${C.gold}40`}` : undefined,
                      fontFamily: SANS,
                      fontSize: 13,
                      color: isUser ? "#000" : C.primary,
                      lineHeight: 1.5,
                      transition: "border-color 0.3s",
                    }}
                  >
                    {isUser ? msg.content : formatContent(msg.content)}
                    {/* Streaming cursor */}
                    {isStreamingMsg && msg.content && (
                      <span style={{
                        display: "inline-block", width: 2, height: 14,
                        background: C.gold, marginLeft: 2, verticalAlign: "text-bottom",
                        animation: "cursor-blink 0.8s ease infinite",
                      }} />
                    )}
                    {/* Thinking state */}
                    {isStreamingMsg && !msg.content && (
                      <span style={{ color: C.gold, fontFamily: MONO, fontSize: 12 }}>
                        <span style={{ animation: "pulse-gold 1s ease infinite" }}>&#x25CF;</span> thinking...
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={chat.messagesEndRef} />
            </div>

            {/* ── Input bar ── */}
            <form
              onSubmit={chat.handleSubmit}
              style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "10px 14px",
                paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
                borderTop: `1px solid ${C.border}`,
                background: C.panel,
                flexShrink: 0,
              }}
            >
              <input
                ref={chat.inputRef}
                type="text"
                value={chat.input}
                onChange={(e) => chat.setInput(e.target.value)}
                placeholder={chat.streaming ? "Generating..." : "Ask anything..."}
                disabled={chat.streaming}
                style={{
                  flex: 1, minWidth: 0,
                  padding: "12px 14px", borderRadius: 10,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  fontFamily: SANS, fontSize: 14, color: C.primary,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = `${C.gold}60`;
                  e.currentTarget.style.boxShadow = `0 0 8px ${C.gold}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                disabled={chat.streaming || !chat.input.trim()}
                style={{
                  padding: "12px 18px", borderRadius: 10, border: "none",
                  flexShrink: 0,
                  background: chat.input.trim() && !chat.streaming
                    ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                    : C.elevated,
                  color: chat.input.trim() && !chat.streaming ? "#000" : C.dim,
                  fontFamily: MONO, fontSize: 11, fontWeight: 800,
                  cursor: chat.streaming ? "wait" : "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {chat.streaming ? "..." : "SEND"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : null;
}
