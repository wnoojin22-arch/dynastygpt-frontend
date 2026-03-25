"use client";

import React, { useState } from "react";
import { C, SANS, MONO, fmt, leaguePrefix } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   GLOW TABS — gold underline + shadow on active (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
function GlowTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string; onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}`, marginBottom: 8 }}>
      {tabs.map((t) => {
        const act = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{
            padding: "6px 14px", fontFamily: MONO, fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", color: act ? C.gold : C.dim, cursor: "pointer",
            borderBottom: act ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: act ? `0 3px 12px ${C.gold}40, 0 1px 4px ${C.gold}25` : "none",
            transition: "all 0.2s ease",
          }}>{t.label}</div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POWER RANKINGS WIDGET — with SHA/Dynasty/Win-Now mode tabs
   ═══════════════════════════════════════════════════════════════ */
interface RankRow {
  owner: string;
  rank: number;
  total_sha: number;
  dynasty_rank?: number;
  win_now_rank?: number;
}

interface IntelRow {
  owner: string;
  sha_rank: number;
  total_sha: number;
  dynasty_rank?: number;
  win_now_rank?: number;
}

export default function PowerRankings({ rankings, leagueIntel, leagueName }: {
  rankings: RankRow[];
  leagueIntel?: IntelRow[];
  leagueName: string;
}) {
  const prefix = leaguePrefix(leagueName);
  const [mode, setMode] = useState<"league" | "dynasty" | "winnow">("league");

  const tabs = [
    { id: "league", label: `${prefix.toUpperCase()} RANK` },
    { id: "dynasty", label: "DYNASTY" },
    { id: "winnow", label: "WIN-NOW" },
  ];

  // Build sorted list based on mode
  const rows: { owner: string; value: number; rank: number }[] = (() => {
    if (mode === "league") {
      return rankings.map((r) => ({ owner: r.owner, value: r.total_sha, rank: r.rank }));
    }
    if (!leagueIntel?.length) return rankings.map((r) => ({ owner: r.owner, value: r.total_sha, rank: r.rank }));

    if (mode === "dynasty") {
      const sorted = [...leagueIntel].sort((a, b) => (a.dynasty_rank || 99) - (b.dynasty_rank || 99));
      return sorted.map((r, i) => ({ owner: r.owner, value: r.total_sha, rank: r.dynasty_rank || i + 1 }));
    }
    // winnow
    const sorted = [...leagueIntel].sort((a, b) => (a.win_now_rank || 99) - (b.win_now_rank || 99));
    return sorted.map((r, i) => ({ owner: r.owner, value: r.total_sha, rank: r.win_now_rank || i + 1 }));
  })();

  if (!rows.length) return null;
  const topValue = rows[0]?.value || 1;

  return (
    <div>
      <GlowTabs tabs={tabs} active={mode} onChange={(id) => setMode(id as typeof mode)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r, i) => {
          const pct = (r.value / topValue) * 100;
          const color = i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? C.secondary : C.red;
          return (
            <div key={r.owner} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 4,
              background: i === 0 ? C.goldDim : "transparent",
              border: i === 0 ? `1px solid ${C.goldBorder}` : "1px solid transparent",
              transition: "background 0.12s", cursor: "pointer",
            }}
            onMouseEnter={(e) => { if (i > 0) e.currentTarget.style.background = C.elevated; }}
            onMouseLeave={(e) => { if (i > 0) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width: 18, fontSize: 11, fontWeight: 900, color, fontFamily: MONO, textAlign: "right", flexShrink: 0 }}>{r.rank}</span>
              {i === 0 && <span style={{ fontSize: 11, flexShrink: 0 }}>👑</span>}
              <span style={{
                fontSize: 12, fontWeight: i < 4 ? 700 : 500,
                color: i < 4 ? C.primary : C.secondary, fontFamily: SANS,
                minWidth: 0, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{r.owner}</span>
              <div style={{ width: 50, height: 4, background: C.border, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? "#2563eb" : C.red, transition: "width 0.8s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, fontFamily: MONO, width: 42, textAlign: "right", flexShrink: 0 }}>{(r.value / 1000).toFixed(1)}k</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
