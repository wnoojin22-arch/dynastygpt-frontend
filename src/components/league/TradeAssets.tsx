"use client";

import React from "react";
import { C, SANS, MONO, posColor } from "./tokens";
import PlayerName from "./PlayerName";

/* ═══════════════════════════════════════════════════════════════
   TRADE ASSETS — renders players + picks as inline badges
   Reused in: RecentTrades, TradeReport, LeagueTradesView, WarRoom
   ═══════════════════════════════════════════════════════════════ */
export function AssetBadge({ name, type }: { name: string; type: "player" | "pick" }) {
  if (type === "pick") {
    // Subtle pick styling — small PICK tag, muted, same size as players
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontFamily: SANS, fontSize: 11, fontWeight: 600,
        color: C.secondary, whiteSpace: "nowrap",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.02em", color: C.dim, background: C.white08, padding: "0px 3px", borderRadius: 2 }}>PICK</span>
        {name.replace(/\s*\([^)]*\)/g, "")}
      </span>
    );
  }
  return (
    <PlayerName name={name} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary, whiteSpace: "nowrap" }} />
  );
}

export function TradeAssetList({ players, picks, direction, compact }: {
  players?: string[] | null;
  picks?: string[] | null;
  direction?: "sent" | "received";
  compact?: boolean;
}) {
  const playerList = players?.filter(Boolean) || [];
  const pickList = picks?.filter(Boolean) || [];
  const all = [
    ...playerList.map((p) => ({ name: p, type: "player" as const })),
    ...pickList.map((p) => ({ name: p, type: "pick" as const })),
  ];

  if (!all.length) return <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>;

  if (compact) {
    const shown = all.slice(0, 3);
    const more = all.length - 3;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {shown.map((a, i) => <AssetBadge key={i} {...a} />)}
        {more > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>+{more}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {direction && (
        <span style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
          color: direction === "sent" ? C.red : C.green,
        }}>
          {direction === "sent" ? "GAVE" : "GOT"}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {all.map((a, i) => <AssetBadge key={i} {...a} />)}
      </div>
    </div>
  );
}
