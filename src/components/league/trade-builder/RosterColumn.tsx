"use client";

import React, { useMemo } from "react";
import { C, SANS, MONO, fmt, posColor } from "../tokens";
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

                return (
                  <div key={`${side}-${pos}-${p.name}-${idx}`}
                    onClick={() => onToggle(p.name)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
                      cursor: isUntouchable ? "not-allowed" : "pointer",
                      borderLeft: `3px solid ${selected ? C.gold : "transparent"}`,
                      background: selected ? `${C.gold}15` : "transparent",
                      opacity: selected ? 0.55 : isUntouchable ? 0.4 : 1,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = C.white08; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selected ? `${C.gold}15` : "transparent"; }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: SANS, fontSize: 13, fontWeight: 500, color: selected ? C.dim : C.primary,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        textDecoration: selected ? "line-through" : "none",
                      }}>
                        {p.name}
                        {isUntouchable && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>🔒</span>}
                      </span>
                    </div>
                    {/* Positional rank badge */}
                    {p.sha_pos_rank && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 5px",
                        borderRadius: 3, background: C.elevated, color: posColor(pos),
                      }}>{p.sha_pos_rank}</span>
                    )}
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold, minWidth: 48, textAlign: "right" }}>
                      {p.sha_value > 0 ? fmt(p.sha_value) : "—"}
                    </span>
                    {!isPick && p.age && (
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, minWidth: 18, textAlign: "right" }}>{p.age}</span>
                    )}
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
