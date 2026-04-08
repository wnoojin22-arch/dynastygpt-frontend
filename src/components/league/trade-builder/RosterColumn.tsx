"use client";

import React, { useMemo } from "react";
import { C, SANS, MONO, fmt, posColor } from "../tokens";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import type { RosterPlayer } from "./types";

interface Props {
  title: string;
  roster: RosterPlayer[];
  selectedNames: string[];
  onToggle: (name: string) => void;
  side: "give" | "receive";
  posGrades?: Record<string, string>;
  moveableNames?: Set<string>;
  windowToggle?: React.ReactNode;
}

export default function RosterColumn({ title, roster, selectedNames, onToggle, side, posGrades, moveableNames, windowToggle }: Props) {
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const grouped = useMemo(() => {
    const groups: Record<string, RosterPlayer[]> = { QB: [], RB: [], WR: [], TE: [], PICK: [] };
    for (const p of roster) {
      const pos = p.position in groups ? p.position : "PICK";
      groups[pos].push(p);
    }
    for (const pos of Object.keys(groups)) {
      groups[pos].sort((a, b) => (b.sha_value || 0) - (a.sha_value || 0));
    }
    return Object.entries(groups).filter(([_, players]) => players.length > 0);
  }, [roster]);

  const selectedSet = useMemo(() => new Set(selectedNames.map((n) => n.toLowerCase())), [selectedNames]);

  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {/* Header with optional window toggle */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        {windowToggle}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: windowToggle ? 6 : 0 }}>
          <span style={{ fontFamily: "Archivo Black, sans-serif", fontSize: 14, letterSpacing: "0.05em", color: C.primary }}>{title}</span>
        </div>
      </div>

      {/* Player list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {grouped.map(([pos, players]) => {
          const grade = posGrades?.[pos];
          const gc = grade === "ELITE" || grade === "STRONG" ? C.green : grade === "WEAK" || grade === "CRITICAL" ? C.red : C.gold;

          return (
            <div key={pos} style={{ marginBottom: 2 }}>
              {/* Position header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", background: C.white08 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: posColor(pos), letterSpacing: "0.1em" }}>{pos}</span>
                {grade && (
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                    background: grade === "WEAK" || grade === "CRITICAL" ? `${C.red}15` : grade === "ELITE" || grade === "STRONG" ? `${C.green}15` : `${C.gold}15`,
                    color: gc,
                  }}>{grade}</span>
                )}
              </div>

              {/* Players */}
              {players.map((p, idx) => {
                const selected = selectedSet.has(p.name.toLowerCase());
                const isPick = p.position === "PICK";
                const isUntouchable = side === "receive" && !isPick && p.sha_value > 2000 && moveableNames && moveableNames.size > 0 && !moveableNames.has(p.name_clean);
                const accentColor = side === "give" ? C.red : C.green;

                return (
                  <div key={`${side}-${pos}-${p.name}-${idx}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 14px",
                      borderLeft: `3px solid ${selected ? accentColor : "transparent"}`,
                      background: selected ? `${accentColor}08` : "transparent",
                      opacity: isUntouchable ? 0.4 : 1,
                      transition: "all 0.15s",
                      cursor: isUntouchable ? "not-allowed" : "default",
                    }}
                    onMouseEnter={(e) => { if (!selected && !isUntouchable) e.currentTarget.style.background = C.white08; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selected ? `${accentColor}08` : "transparent"; }}>

                    {/* Checkbox */}
                    <div
                      onClick={() => !isUntouchable && onToggle(p.name)}
                      style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: isUntouchable ? "not-allowed" : "pointer",
                        border: `2px solid ${selected ? accentColor : C.border}`,
                        background: selected ? accentColor : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.12s",
                      }}
                    >
                      {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Name + age inline */}
                    <div
                      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 5, cursor: !isPick ? "pointer" : "default" }}
                      onClick={() => !isPick && openPlayerCard(p.name)}
                    >
                      <span style={{
                        fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {p.name}
                        {isUntouchable && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>🔒</span>}
                      </span>
                      {!isPick && p.age && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flexShrink: 0 }}>{p.age}</span>
                      )}
                    </div>

                    {/* Market vs consensus % — same logic as dashboard roster */}
                    {!isPick && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: p.mkt_vs_pct != null ? 700 : 400,
                        minWidth: 40, textAlign: "right",
                        color: p.mkt_vs_pct == null ? C.dim : p.mkt_vs_pct > 0 ? C.green : p.mkt_vs_pct < 0 ? C.red : C.dim,
                      }}>
                        {p.mkt_vs_pct == null ? "—" : `${p.mkt_vs_pct > 0 ? "+" : ""}${Math.round(p.mkt_vs_pct)}%`}
                      </span>
                    )}

                    {/* Dynasty value */}
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold, minWidth: 48, textAlign: "right" }}>
                      {p.sha_value > 0 ? fmt(p.sha_value) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
