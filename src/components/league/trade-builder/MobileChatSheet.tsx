"use client";

/**
 * MobileChatSheet — full-screen bottom sheet for the DynastyGPT Trade Advisor.
 * Consumes useChatAdvisor hook (shared with desktop ChatPanel).
 * Portal-rendered, slides up from bottom with spring animation.
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
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 10000,
              background: "rgba(0,0,0,0.7)",
            }}
          />

          <motion.div
            key="chat-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              height: "92vh", zIndex: 10001,
              background: C.bg, borderRadius: "16px 16px 0 0",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
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
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 10,
              WebkitOverflowScrolling: "touch",
            }}>
              <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

              {chat.messages.length === 0 && !chat.streaming && (
                <div style={{ textAlign: "center", padding: "24px 12px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.08em", marginBottom: 8 }}>
                    DYNASTYGPT TRADE ADVISOR
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                    Ask anything about your roster, trades, or league strategy.
                  </div>
                </div>
              )}

              {showPrompts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => chat.sendMessage(p)}
                      style={{
                        fontFamily: SANS, fontSize: 13, color: C.goldBright,
                        padding: "10px 14px", borderRadius: 10,
                        background: "rgba(212,165,50,0.06)",
                        border: "1px solid rgba(212,165,50,0.18)",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {chat.messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user"
                      ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                      : C.elevated,
                    border: msg.role === "user" ? "none" : `1px solid ${C.border}`,
                    fontFamily: SANS,
                    fontSize: 13,
                    color: msg.role === "user" ? "#000" : C.primary,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
                  {msg.role === "assistant" && i === chat.messages.length - 1 && chat.streaming && (
                    <span style={{
                      display: "inline-block", width: 6, height: 14,
                      background: C.gold, marginLeft: 2,
                      animation: "pulse-gold 0.8s ease infinite",
                    }} />
                  )}
                </div>
              ))}
              <div ref={chat.messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={chat.handleSubmit}
              style={{
                display: "flex", gap: 8,
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
                placeholder="Ask anything..."
                disabled={chat.streaming}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 10,
                  background: C.elevated, border: `1px solid ${C.border}`,
                  fontFamily: SANS, fontSize: 14, color: C.primary,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={chat.streaming || !chat.input.trim()}
                style={{
                  padding: "0 18px", borderRadius: 10, border: "none",
                  background: chat.input.trim()
                    ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                    : C.elevated,
                  color: chat.input.trim() ? "#000" : C.dim,
                  fontFamily: MONO, fontSize: 11, fontWeight: 800,
                  cursor: chat.streaming ? "wait" : "pointer",
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
