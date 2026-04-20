"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PickCell from "./PickCell";
import PickDetailSheet from "./PickDetailSheet";
import { C, MONO, SANS } from "../tokens";

interface ChalkPick {
  slot: string;
  owner: string;
  window: string;
  prospect_name: string;
  prospect_position: string;
  prospect_tier: number;
  prospect_boom_bust: string;
  board_position: number;
  [key: string]: unknown;
}

interface Props {
  simulation: Record<string, unknown>;
  currentRound: number;
  userPicks: Record<string, string>;
  onUserPick: (slot: string, prospect: string) => void;
  userOwner: string;
  mobile: boolean;
}

export default function MockDraftBoard({ simulation, currentRound, userPicks, onUserPick, userOwner, mobile }: Props) {
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const chalk = (simulation.chalk || []) as ChalkPick[];
  const pickProbs = (simulation.pick_probabilities || {}) as Record<string, Array<{ prospect: string; position: string; pct: number }>>;
  const tradeFlags = (simulation.trade_flags || []) as Array<{ slot: string; trade_probability: number; likelihood: string; likely_buyers: Array<{ buyer: string }> }>;
  const tradeFlagSlots = new Set(tradeFlags.map((t) => t.slot));

  // Filter to current round
  const roundPicks = chalk.filter((p) => {
    const rd = parseInt(p.slot.split(".")[0], 10);
    return rd === currentRound;
  });

  // Find active pick detail
  const activePick = activeSlot ? chalk.find((p) => p.slot === activeSlot) : null;
  const activeProbs = activeSlot ? pickProbs[activeSlot] || [] : [];
  const activeTradeFlag = activeSlot ? tradeFlags.find((t) => t.slot === activeSlot) : null;

  return (
    <div style={{
      flex: 1, overflowY: "auto", overscrollBehavior: "contain",
      display: mobile ? "block" : "flex",
    }}>
      {/* Left: pick grid */}
      <div style={{
        flex: mobile ? undefined : "0 0 60%",
        padding: mobile ? "8px 10px" : "16px 20px",
        display: "flex", flexDirection: "column", gap: mobile ? 6 : 8,
      }}>
        <AnimatePresence>
          {roundPicks.map((pick, i) => {
            const isUser = pick.owner.toLowerCase() === userOwner.toLowerCase();
            const isTradeCandidate = tradeFlagSlots.has(pick.slot);
            const isLocked = !!userPicks[pick.slot];
            const lockedProspect = userPicks[pick.slot];
            const topProb = pickProbs[pick.slot]?.[0];

            return (
              <motion.div
                key={pick.slot}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                <PickCell
                  slot={pick.slot}
                  owner={pick.owner}
                  prospectName={isLocked ? lockedProspect : pick.prospect_name}
                  prospectPosition={pick.prospect_position}
                  confidence={topProb?.pct || 0}
                  isUser={isUser}
                  isTradeCandidate={isTradeCandidate}
                  isLocked={isLocked}
                  isActive={activeSlot === pick.slot}
                  mobile={mobile}
                  onClick={() => setActiveSlot(activeSlot === pick.slot ? null : pick.slot)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Right: detail panel (desktop only) */}
      {!mobile && activePick && (
        <div style={{
          flex: "0 0 40%", position: "sticky", top: 0,
          height: "calc(100vh - 140px)", overflowY: "auto",
          borderLeft: `1px solid ${C.border}`, padding: "16px 20px",
          background: C.panel,
        }}>
          <PickDetail
            pick={activePick}
            probs={activeProbs}
            tradeFlag={activeTradeFlag}
            isUser={activePick.owner.toLowerCase() === userOwner.toLowerCase()}
          />
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {mobile && activePick && (
        <PickDetailSheet
          pick={activePick}
          probs={activeProbs}
          tradeFlag={activeTradeFlag}
          isUser={activePick.owner.toLowerCase() === userOwner.toLowerCase()}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </div>
  );
}


/* ── Inline detail component for desktop panel ── */
function PickDetail({ pick, probs, tradeFlag, isUser }: {
  pick: ChalkPick;
  probs: Array<{ prospect: string; position: string; pct: number }>;
  tradeFlag: { slot: string; trade_probability: number; likelihood: string; likely_buyers: Array<{ buyer: string }> } | null;
  isUser: boolean;
}) {
  return (
    <div>
      {/* Owner header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.10em" }}>
          PICK {pick.slot}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: isUser ? C.gold : C.primary }}>
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
        padding: "12px 14px", borderRadius: 8,
        background: C.card, border: `1px solid ${C.border}`, marginBottom: 12,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 4 }}>
          PREDICTED PICK
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PosBadge pos={pick.prospect_position} />
          <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.primary }}>
            {pick.prospect_name}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>Tier {pick.prospect_tier}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{pick.prospect_boom_bust}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>Consensus #{pick.board_position}</span>
        </div>
      </div>

      {/* Probability breakdown */}
      {probs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 6 }}>
            PROBABILITY BREAKDOWN
          </div>
          {probs.slice(0, 5).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 0", borderBottom: i < probs.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <PosBadge pos={p.position} />
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
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 4 }}>
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
  );
}


function PosBadge({ pos }: { pos: string }) {
  const colors: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };
  const c = colors[pos] || C.dim;
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 900, color: c,
      background: `${c}18`, padding: "2px 6px", borderRadius: 3,
      minWidth: 26, textAlign: "center", display: "inline-block",
    }}>
      {pos}
    </span>
  );
}
