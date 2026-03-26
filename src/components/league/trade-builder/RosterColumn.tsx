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
}

export default function RosterColumn({ title, roster, selectedNames, onToggle, side, posGrades, moveableNames }: Props) {
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

  const selectedSet = useMemo(() => new Set(selectedNames.map(n => n.toLowerCase())), [selectedNames]);

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", color: C.gold }}>{title}</span>
      </div>

      {/* Player list */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
        {grouped.map(([pos, players]) => {
          const grade = posGrades?.[pos];
          const gc = grade === "ELITE" ? C.green : grade === "STRONG" ? C.blue : grade === "AVERAGE" ? C.gold : grade === "WEAK" ? C.orange : grade === "CRITICAL" ? C.red : C.dim;

          return (
            <div key={pos}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: C.elevated, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: posColor(pos) }}>{pos}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{players.length}</span>
                {grade && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: gc, padding: "1px 5px", borderRadius: 3, background: `${gc}15` }}>{grade}</span>}
              </div>
              {players.map((p) => {
                const selected = selectedSet.has(p.name.toLowerCase());
                const isLocked = side === "receive" && moveableNames && !moveableNames.has(p.name_clean) && p.sha_value >= 2000 && p.position !== "PICK";

                return (
                  <div key={p.name}
                    onClick={() => !isLocked && onToggle(p.name)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      borderBottom: `1px solid ${C.white08}`,
                      borderLeft: selected ? `3px solid ${side === "give" ? C.red : C.green}` : "3px solid transparent",
                      background: selected ? `${side === "give" ? C.red : C.green}08` : "transparent",
                      opacity: isLocked ? 0.4 : 1,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!selected && !isLocked) e.currentTarget.style.background = C.elevated; }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                      {isLocked && " 🔒"}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{fmt(p.sha_value)}</span>
                    {p.age && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, flexShrink: 0 }}>{p.age}y</span>}
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
