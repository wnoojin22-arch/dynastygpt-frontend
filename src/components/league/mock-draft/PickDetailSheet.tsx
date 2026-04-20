"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { C, MONO, SANS } from "../tokens";

const POS_COLORS: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };

interface Props {
  pick: {
    slot: string;
    owner: string;
    window: string;
    prospect_name: string;
    prospect_position: string;
    prospect_tier: number;
    prospect_boom_bust: string;
    board_position: number;
  };
  probs: Array<{ prospect: string; position: string; pct: number }>;
  tradeFlag: { trade_probability: number; likelihood: string; likely_buyers: Array<{ buyer: string }> } | null;
  isUser: boolean;
  onClose: () => void;
}

export default function PickDetailSheet({ pick, probs, tradeFlag, isUser, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          maxHeight: "75vh", zIndex: 9999,
          background: C.bg, borderRadius: "16px 16px 0 0",
          border: `1px solid ${C.border}`, borderBottom: "none",
          overflowY: "auto", overscrollBehavior: "contain",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.borderLt }} />
        </div>

        <div style={{ padding: "0 16px 16px" }}>
          {/* Header */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.10em" }}>
              PICK {pick.slot}
            </div>
            <div style={{
              fontFamily: SANS, fontSize: 16, fontWeight: 800,
              color: isUser ? C.gold : C.primary,
            }}>
              {pick.owner}
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 800,
              padding: "2px 6px", borderRadius: 3,
              color: pick.window === "CONTENDER" ? C.green : pick.window === "REBUILDER" ? C.red : C.secondary,
              background: pick.window === "CONTENDER" ? C.greenDim : pick.window === "REBUILDER" ? C.redDim : C.elevated,
            }}>
              {pick.window}
            </span>
          </div>

          {/* Predicted pick */}
          <div style={{
            padding: "10px 12px", borderRadius: 6,
            background: C.card, border: `1px solid ${C.border}`, marginBottom: 12,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginBottom: 4 }}>PREDICTED PICK</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 900,
                color: POS_COLORS[pick.prospect_position] || C.dim,
                background: `${POS_COLORS[pick.prospect_position] || C.dim}18`,
                padding: "2px 6px", borderRadius: 3,
              }}>
                {pick.prospect_position}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>
                {pick.prospect_name}
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4 }}>
              Tier {pick.prospect_tier} · {pick.prospect_boom_bust} · Consensus #{pick.board_position}
            </div>
          </div>

          {/* Probabilities */}
          {probs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 6 }}>
                PROBABILITY BREAKDOWN
              </div>
              {probs.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 900,
                    color: POS_COLORS[p.position] || C.dim,
                    background: `${POS_COLORS[p.position] || C.dim}18`,
                    padding: "1px 5px", borderRadius: 3, minWidth: 26, textAlign: "center",
                  }}>
                    {p.position}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>
                    {p.prospect}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 800,
                    color: p.pct >= 50 ? C.green : p.pct >= 25 ? C.gold : C.dim,
                  }}>
                    {p.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Trade flag */}
          {tradeFlag && (
            <div style={{
              padding: "10px 12px", borderRadius: 6,
              background: `${C.gold}08`, border: `1px dashed ${C.gold}40`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, marginBottom: 4 }}>
                TRADE CANDIDATE — {tradeFlag.likelihood}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, lineHeight: 1.4 }}>
                {tradeFlag.trade_probability}% trade probability.
                {tradeFlag.likely_buyers.length > 0 && (
                  <> Likely buyer: {tradeFlag.likely_buyers[0].buyer}</>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
