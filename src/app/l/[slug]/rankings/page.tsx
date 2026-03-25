"use client";

import React, { useState, useMemo } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getRankings, getLeagueIntel, getOverview } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, leaguePrefix } from "@/components/league/tokens";

/* ═══════════════════════════════════════════════════════════════
   TIER SYSTEM (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
const TIERS = [
  { label: "TOP DOG", color: C.gold, ranks: [1] },
  { label: "CONTENDER", color: C.green, ranks: [2, 3, 4] },
  { label: "FEISTY", color: C.orange, ranks: [5, 6, 7, 8] },
  { label: "BASEMENT", color: C.red, ranks: [9, 10, 11, 12, 13, 14] },
];
function getTier(rank: number) { return TIERS.find((t) => t.ranks.includes(rank)) || TIERS[3]; }
function ordinal(n: number) { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

function TierBadge({ tier }: { tier: { label: string; color: string } }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 4,
      background: `${tier.color}15`, color: tier.color,
      border: `1px solid ${tier.color}30`, whiteSpace: "nowrap",
    }}>{tier.label}</span>
  );
}

function Crown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4, marginBottom: 2 }}>
      <path d="M2 18L4 8L8 12L12 4L16 12L20 8L22 18H2Z" fill={C.gold} opacity="0.9"/>
      <path d="M2 18L4 8L8 12L12 4L16 12L20 8L22 18H2Z" stroke={C.goldBright} strokeWidth="1" fill="none"/>
      <circle cx="4" cy="8" r="1.5" fill={C.goldBright}/><circle cx="12" cy="4" r="1.5" fill={C.goldBright}/><circle cx="20" cy="8" r="1.5" fill={C.goldBright}/>
    </svg>
  );
}

function GlowTabs({ tabs, active, onChange, size = "md" }: {
  tabs: { id: string; label: string }[];
  active: string; onChange: (id: string) => void;
  size?: "lg" | "md" | "sm";
}) {
  const s = size === "lg" ? { px: 28, py: 10, fs: 15, ls: "0.12em" }
    : size === "md" ? { px: 20, py: 8, fs: 13, ls: "0.10em" }
    : { px: 16, py: 6, fs: 11, ls: "0.08em" };
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}` }}>
      {tabs.map((t) => {
        const act = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{
            padding: `${s.py}px ${s.px}px`,
            fontFamily: size === "sm" ? MONO : SANS,
            fontSize: s.fs, fontWeight: 800, letterSpacing: s.ls,
            color: act ? C.gold : C.dim, cursor: "pointer",
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
   RANKINGS PAGE — Team Power with mode tabs, podium, tier breaks
   ═══════════════════════════════════════════════════════════════ */
export default function RankingsPage() {
  const { currentLeagueId: lid } = useLeagueStore();
  const [mode, setMode] = useState("league");

  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid, staleTime: 3600000 });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid!), enabled: !!lid, staleTime: 600000 });
  const { data: intel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid!), enabled: !!lid, staleTime: 600000 });

  const prefix = leaguePrefix(overview?.name || "League");
  const tabs = [
    { id: "league", label: `${prefix.toUpperCase()} RANK` },
    { id: "dynasty", label: "DYNASTY" },
    { id: "winnow", label: "WIN-NOW" },
  ];

  // Build sorted teams based on mode
  const teams = useMemo(() => {
    const shaRankings = rankings?.rankings || [];
    const intelOwners = intel?.owners || [];
    const intelMap = new Map(intelOwners.map((o) => [o.owner.toLowerCase(), o]));
    const numTeams = shaRankings.length || 12;

    if (mode === "league" || !intelOwners.length) {
      return shaRankings.map((r) => ({ owner: r.owner, rank: r.rank, value: r.total_sha }));
    }

    // Sort by dynasty_rank or win_now_rank
    const shaMap = new Map(shaRankings.map((r) => [r.owner.toLowerCase(), r.total_sha]));
    return [...intelOwners]
      .sort((a, b) => {
        const aR = mode === "dynasty" ? (a.dynasty_rank || 99) : (a.win_now_rank || 99);
        const bR = mode === "dynasty" ? (b.dynasty_rank || 99) : (b.win_now_rank || 99);
        return aR - bR;
      })
      .map((r, i) => {
        const rank = mode === "dynasty" ? (r.dynasty_rank || i + 1) : (r.win_now_rank || i + 1);
        const baseSha = shaMap.get(r.owner.toLowerCase()) || r.total_sha;
        const factor = 1 + (numTeams - rank) * 0.05;
        return { owner: r.owner, rank, value: Math.round(baseSha * factor) };
      });
  }, [mode, rankings, intel]);

  if (!lid) return <div style={{ padding: 40, textAlign: "center", fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</div>;

  const maxVal = teams[0]?.value || 1;
  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);

  return (
    <div style={{ padding: "16px 20px" }}>
      <style>{`
        @keyframes rk-barFill { from { width: 0%; } }
        @keyframes rk-pulseGold { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,50,0.15); } 50% { box-shadow: 0 0 20px 2px rgba(212,165,50,0.08); } }
        .rk-row:hover { background: ${C.elevated} !important; transform: translateX(2px); }
        .rk-row { transition: all 0.15s ease; cursor: pointer; }
        .rk-bar { animation: rk-barFill 0.8s ease-out both; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Power Rankings</span>
        <div style={{ width: 1, height: 18, background: C.border }} />
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>{teams.length} teams</span>
      </div>

      {/* Mode Tabs */}
      <div style={{ marginBottom: 12 }}>
        <GlowTabs size="sm" tabs={tabs} active={mode} onChange={setMode} />
      </div>

      {/* PODIUM: Top 3 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4 }}>
        {top3.map((t, i) => {
          const isChamp = i === 0;
          const tier = getTier(t.rank);
          const pct = Math.round((t.value / maxVal) * 100);
          return (
            <div key={t.rank} className="rk-row" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: isChamp ? "10px 14px" : "8px 14px",
              borderRadius: 6, position: "relative", overflow: "hidden",
              background: isChamp ? C.goldDim : C.card,
              border: `1px solid ${isChamp ? C.goldBorder : "transparent"}`,
              animation: isChamp ? "rk-pulseGold 4s ease-in-out infinite" : undefined,
            }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `${tier.color}06`, pointerEvents: "none" }} />
              <span style={{
                fontFamily: MONO, fontWeight: 900, fontSize: isChamp ? 18 : 15,
                color: tier.color, minWidth: 28, textAlign: "center",
                display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1,
              }}>
                {isChamp && <Crown size={16} />}
                {ordinal(t.rank)}
              </span>
              <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: isChamp ? 15 : 14, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>{t.owner}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.secondary, marginTop: 1 }}>{Math.round(t.value).toLocaleString()}</div>
              </div>
              <div style={{ width: 80, height: 3, borderRadius: 2, background: C.border, overflow: "hidden", position: "relative", zIndex: 1 }}>
                <div className="rk-bar" style={{ height: "100%", borderRadius: 2, background: tier.color, width: `${pct}%`, animationDelay: `${i * 0.12}s` }} />
              </div>
              <div style={{ position: "relative", zIndex: 1 }}><TierBadge tier={tier} /></div>
            </div>
          );
        })}
      </div>

      {/* REST: #4+ with tier breaks */}
      <div>
        {rest.map((t, i) => {
          const tier = getTier(t.rank);
          const val = t.value;
          const pct = Math.round((val / maxVal) * 100);
          const prevTier = i > 0 ? getTier(rest[i - 1].rank) : getTier(top3[2]?.rank || 3);
          const showTierBreak = tier.label !== prevTier.label;

          return (
            <React.Fragment key={t.rank}>
              {showTierBreak && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 4px" }}>
                  <div style={{ height: 1, flex: 1, background: `${tier.color}25` }} />
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: tier.color, opacity: 0.7 }}>{tier.label}</span>
                  <div style={{ height: 1, flex: 1, background: `${tier.color}25` }} />
                </div>
              )}
              <div className="rk-row" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 12px", borderRadius: 5, marginBottom: 2,
                background: C.card, border: "1px solid transparent",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `${tier.color}06`, pointerEvents: "none" }} />
                <span style={{ fontFamily: MONO, fontWeight: 900, fontSize: 13, color: tier.color, width: 22, textAlign: "center", position: "relative", zIndex: 1 }}>{t.rank}</span>
                <div style={{ width: 1, height: 14, background: `${tier.color}30`, position: "relative", zIndex: 1 }} />
                <span style={{ fontFamily: SANS, flex: 1, fontSize: 13, fontWeight: 600, color: C.primary, position: "relative", zIndex: 1 }}>{t.owner}</span>
                <div style={{ width: 80, height: 3, borderRadius: 2, background: C.border, overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <div className="rk-bar" style={{ height: "100%", borderRadius: 2, background: tier.color, width: `${pct}%`, animationDelay: `${(i + 3) * 0.08}s` }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.secondary, minWidth: 54, textAlign: "right", position: "relative", zIndex: 1 }}>{Math.round(val).toLocaleString()}</span>
                <div style={{ position: "relative", zIndex: 1 }}><TierBadge tier={tier} /></div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
