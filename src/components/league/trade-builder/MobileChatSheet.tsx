"use client";

/**
 * MobileChatSheet — Robinhood-grade AI trade advisor.
 * Full-screen bottom sheet. Fintech aesthetic: clean typography,
 * micro-animations, glass surfaces, gold accent system.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChatAdvisor } from "@/hooks/useChatAdvisor";
import { C, SANS, MONO } from "../tokens";

/* ── Markdown-lite renderer ─────────────────────────────────────────── */

function FormatContent({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length <= 1) return <span>{text}</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-–]/.test(line.trim());
        return (
          <div key={i} style={{
            paddingLeft: isBullet ? 8 : 0,
            fontWeight: i === 0 && !isBullet ? 600 : 400,
            lineHeight: 1.55,
            color: i === 0 && !isBullet ? C.primary : C.secondary,
          }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

/* ── Typing indicator ───────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

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
  isOpen, onClose, leagueId, owner, ownerId,
  activeTrade, suggestedPackages, quickPrompts,
}: MobileChatSheetProps) {
  const chat = useChatAdvisor({ leagueId, owner, ownerId, activeTrade, suggestedPackages });
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    chat.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) setTimeout(() => chat.inputRef.current?.focus(), 250);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPrompts = chat.messages.length === 0 && !chat.streaming;
  const hasMessages = chat.messages.length > 0;

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 10000,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* ── Sheet ── */}
          <motion.div
            key="chat-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              height: "94dvh", zIndex: 10001,
              background: "#080b14",
              borderRadius: "20px 20px 0 0",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -2px 20px rgba(212,165,50,0.08)",
            }}
          >
            {/* ── Header ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 18px 14px",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* AI orb */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                  boxShadow: chat.streaming
                    ? `0 0 20px ${C.gold}50, 0 0 40px ${C.gold}20`
                    : `0 0 12px ${C.gold}25`,
                  transition: "box-shadow 0.5s",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 900, color: "#000", letterSpacing: "-0.5px" }}>AI</span>
                  {/* Status ring */}
                  {chat.streaming && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{
                        position: "absolute", inset: -3,
                        borderRadius: "50%",
                        border: `2px solid transparent`,
                        borderTopColor: C.gold,
                        borderRightColor: `${C.gold}40`,
                      }}
                    />
                  )}
                </div>
                <div>
                  <div style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 800,
                    color: C.gold, letterSpacing: "0.1em", lineHeight: 1,
                  }}>
                    DYNASTYGPT
                  </div>
                  <div style={{
                    fontFamily: SANS, fontSize: 11, fontWeight: 500,
                    color: C.dim, marginTop: 2, lineHeight: 1,
                  }}>
                    {chat.streaming ? "Analyzing..." : "Trade Advisor"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {hasMessages && (
                  <button
                    onClick={chat.clearMessages}
                    style={{
                      background: `${C.red}12`, border: `1px solid ${C.red}25`,
                      borderRadius: 6, color: C.red, padding: "5px 10px",
                      fontFamily: MONO, fontSize: 9, fontWeight: 700,
                      cursor: "pointer", letterSpacing: "0.06em",
                      transition: "background 0.15s",
                    }}
                  >
                    CLEAR
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: C.elevated, border: `1px solid ${C.border}`,
                    color: C.dim, fontSize: 15, lineHeight: 1,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  &#x2715;
                </button>
              </div>
            </div>

            {/* ── Divider ── */}
            <div style={{
              height: 1, flexShrink: 0, margin: "0 18px",
              background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
            }} />

            {/* ═══════════════════════════════════════════════════════
                MESSAGE AREA
                ═══════════════════════════════════════════════════════ */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 16px 8px",
              display: "flex", flexDirection: "column", gap: 12,
              WebkitOverflowScrolling: "touch",
              minHeight: 0,
            }}>

              {/* ── Empty state — hero ── */}
              {!hasMessages && !chat.streaming && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "32px 20px 20px", gap: 16,
                }}>
                  {/* Glow orb */}
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 30px ${C.gold}30, 0 0 60px ${C.gold}10`,
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 900, color: "#000" }}>AI</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: SANS, fontSize: 18, fontWeight: 700,
                      color: C.primary, letterSpacing: "-0.01em", marginBottom: 6,
                    }}>
                      What can I help you with?
                    </div>
                    <div style={{
                      fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.5,
                      maxWidth: 280, margin: "0 auto",
                    }}>
                      I know every roster, trade history, and owner tendency in your league.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Quick prompts ── */}
              {showPrompts && (
                <div style={{
                  display: "flex", flexDirection: "column",
                  gap: 8,
                  padding: "0 2px",
                }}>
                  {quickPrompts.map((p, i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => chat.sendMessage(p)}
                      style={{
                        fontFamily: SANS, fontSize: 12, fontWeight: 500,
                        color: C.primary,
                        padding: "14px 12px",
                        borderRadius: 12,
                        background: C.elevated,
                        border: `1px solid ${C.border}`,
                        cursor: "pointer", textAlign: "left",
                        lineHeight: 1.35,
                        transition: "border-color 0.2s, background 0.2s",
                        display: "flex", alignItems: "flex-start",
                      }}
                    >
                      <span style={{
                        display: "inline-block", width: 4, height: 4,
                        borderRadius: "50%", background: C.gold,
                        marginTop: 5, marginRight: 8, flexShrink: 0,
                      }} />
                      {p}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Messages ── */}
              {chat.messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const isLast = i === chat.messages.length - 1;
                const isStreamingMsg = !isUser && isLast && chat.streaming;

                if (isUser) {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        alignSelf: "flex-end",
                        maxWidth: "82%",
                        padding: "10px 14px",
                        borderRadius: "16px 16px 4px 16px",
                        background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                        fontFamily: SANS, fontSize: 13.5, fontWeight: 500,
                        color: "#000", lineHeight: 1.5,
                      }}
                    >
                      {msg.content}
                    </motion.div>
                  );
                }

                // Assistant message
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      alignSelf: "flex-start",
                      maxWidth: "90%",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}
                  >
                    {/* Mini orb */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                      background: `${C.gold}18`, border: `1px solid ${C.gold}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 900, color: C.gold }}>AI</span>
                    </div>
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "4px 16px 16px 16px",
                      background: C.elevated,
                      border: `1px solid ${isStreamingMsg ? `${C.gold}25` : C.border}`,
                      fontFamily: SANS, fontSize: 13.5,
                      color: C.primary, lineHeight: 1.55,
                      flex: 1, minWidth: 0,
                      transition: "border-color 0.3s",
                    }}>
                      {msg.content ? (
                        <FormatContent text={msg.content} />
                      ) : (
                        isStreamingMsg && <TypingDots />
                      )}
                      {/* Streaming cursor */}
                      {isStreamingMsg && msg.content && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          style={{
                            display: "inline-block", width: 2, height: 14,
                            background: C.gold, marginLeft: 2, verticalAlign: "text-bottom",
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chat.messagesEndRef} />
            </div>

            {/* ═══════════════════════════════════════════════════════
                INPUT BAR
                ═══════════════════════════════════════════════════════ */}
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${inputFocused ? `${C.gold}30` : C.border}`,
              background: "#0a0d16",
              transition: "border-color 0.2s",
            }}>
              <form
                onSubmit={chat.handleSubmit}
                style={{
                  display: "flex", gap: 10, alignItems: "center",
                  padding: "12px 16px",
                  paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <div style={{
                  flex: 1, minWidth: 0, position: "relative",
                  borderRadius: 12,
                  background: C.elevated,
                  border: `1.5px solid ${inputFocused ? `${C.gold}50` : C.border}`,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: inputFocused ? `0 0 12px ${C.gold}10` : "none",
                }}>
                  <input
                    ref={chat.inputRef}
                    type="text"
                    value={chat.input}
                    onChange={(e) => chat.setInput(e.target.value)}
                    placeholder={chat.streaming ? "Thinking..." : "Ask about trades, strategy..."}
                    disabled={chat.streaming}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    style={{
                      width: "100%", padding: "13px 16px",
                      background: "transparent", border: "none",
                      fontFamily: SANS, fontSize: 15, color: C.primary,
                      outline: "none",
                    }}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={chat.streaming || !chat.input.trim()}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: "none",
                    flexShrink: 0,
                    background: chat.input.trim() && !chat.streaming
                      ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                      : C.elevated,
                    color: chat.input.trim() && !chat.streaming ? "#000" : C.dim,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: chat.streaming ? "wait" : "pointer",
                    transition: "background 0.15s",
                    boxShadow: chat.input.trim() && !chat.streaming
                      ? `0 0 16px ${C.gold}25`
                      : "none",
                  }}
                >
                  {chat.streaming ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: "2px solid transparent",
                        borderTopColor: C.gold, borderRightColor: `${C.gold}40`,
                      }}
                    />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : null;
}
