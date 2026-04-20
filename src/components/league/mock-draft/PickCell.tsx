"use client";

import React from "react";
import { C, MONO, SANS } from "../tokens";

const POS_COLORS: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };

interface Props {
  slot: string;
  owner: string;
  prospectName: string;
  prospectPosition: string;
  confidence: number;
  isUser: boolean;
  isTradeCandidate: boolean;
  isLocked: boolean;
  isActive: boolean;
  mobile: boolean;
  onClick: () => void;
}

export default function PickCell({
  slot, owner, prospectName, prospectPosition, confidence,
  isUser, isTradeCandidate, isLocked, isActive, mobile, onClick,
}: Props) {
  const pc = POS_COLORS[prospectPosition] || C.dim;

  // Confidence → opacity: 100% = 1.0, 30% = 0.55
  const prospectOpacity = Math.max(0.45, Math.min(1, confidence / 100));

  const borderColor = isUser
    ? C.gold
    : isTradeCandidate
      ? `${C.gold}60`
      : isActive
        ? C.border
        : C.border;

  const borderStyle = isTradeCandidate && !isUser ? "dashed" : "solid";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: mobile ? 10 : 12,
        padding: mobile ? "10px 12px" : "10px 16px",
        minHeight: mobile ? 60 : 56,
        borderRadius: 8,
        background: isUser
          ? `linear-gradient(135deg, ${C.gold}08, ${C.gold}04)`
          : isLocked
            ? `${C.elevated}80`
            : C.card,
        border: `${isUser ? 2 : 1}px ${borderStyle} ${borderColor}`,
        boxShadow: isUser
          ? `0 0 16px ${C.gold}15, inset 0 0 20px ${C.gold}05`
          : isActive
            ? `0 0 8px ${C.border}`
            : "none",
        cursor: "pointer",
        transition: "all 0.15s",
        opacity: isLocked && !isUser ? 0.6 : 1,
      }}
    >
      {/* Slot */}
      <div style={{
        fontFamily: MONO, fontSize: mobile ? 11 : 12, fontWeight: 800,
        color: isUser ? C.gold : C.dim, minWidth: 36,
        letterSpacing: "0.02em",
      }}>
        {slot}
      </div>

      {/* Owner + prospect */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: SANS, fontSize: mobile ? 11 : 12, fontWeight: 700,
          color: isUser ? C.gold : C.secondary,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 2,
        }}>
          {owner}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          opacity: prospectOpacity,
        }}>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 900, color: pc,
            background: `${pc}18`, padding: "1px 5px", borderRadius: 3,
          }}>
            {prospectPosition}
          </span>
          <span style={{
            fontFamily: SANS, fontSize: mobile ? 13 : 14, fontWeight: 700,
            color: C.primary,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {prospectName}
          </span>
        </div>
      </div>

      {/* Confidence badge */}
      <div style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 800,
        color: confidence >= 60 ? C.green : confidence >= 35 ? C.gold : C.dim,
        minWidth: 36, textAlign: "right",
      }}>
        {confidence}%
      </div>

      {/* Trade icon */}
      {isTradeCandidate && !isUser && (
        <div style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 800,
          color: C.gold, padding: "2px 5px", borderRadius: 3,
          background: `${C.gold}12`, border: `1px solid ${C.gold}25`,
        }}>
          TRADE
        </div>
      )}

      {/* User indicator */}
      {isUser && !isLocked && (
        <div style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 900,
          color: C.bg, padding: "4px 8px", borderRadius: 4,
          background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
          letterSpacing: "0.06em",
        }}>
          YOUR PICK
        </div>
      )}
    </div>
  );
}
