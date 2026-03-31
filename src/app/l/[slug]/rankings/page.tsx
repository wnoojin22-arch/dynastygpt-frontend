"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useQuery } from "@tanstack/react-query";
import { getRankings, getLeagueIntel, getOverview, getPositionalPower, getGlobalPlayerRankings } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor, leaguePrefix } from "@/components/league/tokens";
import type { GlobalPlayerRanking, PositionalPowerEntry } from "@/lib/types";
import { Search, X, ChevronDown } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   SHARED — Tier System, Helpers, Reusable Components
   ═══════════════════════════════════════════════════════════════ */
const TIERS = [
  { label: "TOP DOG", color: C.gold, ranks: [1] },
  { label: "CONTENDER", color: C.green, ranks: [2, 3, 4] },
  { label: "FEISTY", color: C.orange, ranks: [5, 6, 7, 8] },
  { label: "BASEMENT", color: C.red, ranks: [9, 10, 11, 12, 13, 14] },
];
function getTier(rank: number) { return TIERS.find((t) => t.ranks.includes(rank)) || TIERS[3]; }
function ordinal(n: number) { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

const POS_COLORS: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };

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

function Skel({ n = 6, h = 40 }: { n?: number; h?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 0" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          height: h, borderRadius: 6, background: `linear-gradient(90deg, ${C.card}, ${C.elevated}, ${C.card})`,
          backgroundSize: "200% 100%",
          animation: `rk-shimmer 1.8s ease-in-out infinite`,
          animationDelay: `${i * 0.05}s`,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: TEAM POWER (existing code — preserved exactly)
   ═══════════════════════════════════════════════════════════════ */
function TeamPower({ lid, overview }: { lid: string; overview: any }) {
  const [mode, setMode] = useState("league");

  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid), enabled: !!lid, staleTime: 600000 });
  const { data: intel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid), enabled: !!lid, staleTime: 600000 });

  const prefix = leaguePrefix(overview?.name || "League");
  const tabs = [
    { id: "league", label: `${prefix.toUpperCase()} RANK` },
    { id: "dynasty", label: "DYNASTY" },
    { id: "winnow", label: "WIN-NOW" },
  ];

  const teams = useMemo(() => {
    const shaRankings = rankings?.rankings || [];
    const intelOwners = intel?.owners || [];
    const numTeams = shaRankings.length || 12;

    if (mode === "league" || !intelOwners.length) {
      return shaRankings.map((r) => ({ owner: r.owner, rank: r.rank, value: r.total_sha }));
    }

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

  if (!teams.length) return <Skel />;

  const maxVal = teams[0]?.value || 1;
  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);

  return (
    <div>
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

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: POSITIONAL POWER (ported from Shadynasty)
   ═══════════════════════════════════════════════════════════════ */
const POS_TABS = ["QB", "RB", "WR", "TE"];

function PositionalPower({ lid }: { lid: string }) {
  const [pos, setPos] = useState("QB");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["positional-power", lid, pos],
    queryFn: () => getPositionalPower(lid, pos),
    enabled: !!lid,
    staleTime: 600_000,
  });

  const teams = data?.rankings || [];
  const posCol = POS_COLORS[pos] || C.dim;

  return (
    <div>
      {/* Position tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {POS_TABS.map((p) => {
          const act = pos === p;
          const c = POS_COLORS[p] || C.dim;
          return (
            <button key={p} onClick={() => { setPos(p); setExpanded(null); }}
              style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                padding: "6px 16px", borderRadius: 4, cursor: "pointer", border: "none",
                background: act ? `${c}20` : "transparent",
                color: act ? c : C.dim,
                outline: act ? `1px solid ${c}40` : `1px solid ${C.border}`,
                transition: "all 0.15s",
              }}>{p}</button>
          );
        })}
      </div>

      {isLoading ? <Skel n={12} h={44} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {teams.map((t, i) => {
            const isChamp = t.rank === 1;
            const tier = getTier(t.rank);
            const isExp = expanded === t.owner;
            const starters = (t.players || []).slice(0, 3);
            const bench = (t.players || []).slice(3, 7);

            return (
              <React.Fragment key={t.owner}>
                <div
                  onClick={() => setExpanded(isExp ? null : t.owner)}
                  className="rk-row"
                  style={{
                    display: "grid", gridTemplateColumns: "32px 1fr auto 80px 28px",
                    alignItems: "center", gap: 10, padding: "9px 14px",
                    borderRadius: isExp ? "6px 6px 0 0" : 6,
                    background: isChamp ? C.goldDim : i % 2 === 0 ? C.card : `${C.elevated}90`,
                    border: isChamp ? `1px solid ${C.goldBorder}` : `1px solid transparent`,
                  }}>
                  {/* Rank */}
                  <span style={{
                    fontFamily: MONO, fontSize: isChamp ? 17 : 14, fontWeight: 900,
                    color: isChamp ? C.gold : tier.color, textAlign: "center",
                    display: "flex", alignItems: "center", gap: 2,
                  }}>
                    {isChamp && <Crown size={14} />}{t.rank}
                  </span>
                  {/* Owner + starter names */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>{t.owner}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {starters.map(p => p.name.split(" ").pop()).join(" · ")}
                    </div>
                  </div>
                  {/* Total value */}
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: posCol, textAlign: "right" }}>{fmt(t.total_sha)}</span>
                  {/* Bar */}
                  <div style={{ height: 3, borderRadius: 2, background: C.border, overflow: "hidden" }}>
                    <div className="rk-bar" style={{ height: "100%", borderRadius: 2, background: posCol, width: `${teams[0] ? (t.total_sha / teams[0].total_sha) * 100 : 0}%`, animationDelay: `${i * 0.06}s` }} />
                  </div>
                  {/* Expand chevron */}
                  <ChevronDown size={14} style={{
                    color: C.dim, transition: "transform 0.2s",
                    transform: isExp ? "rotate(180deg)" : "rotate(0deg)",
                  }} />
                </div>

                {/* Expanded roster */}
                {isExp && (
                  <div style={{
                    background: C.card, borderRadius: "0 0 6px 6px",
                    border: `1px solid ${C.border}`, borderTop: "none",
                    padding: "10px 14px", marginBottom: 4,
                  }}>
                    {/* Starters */}
                    <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posCol, letterSpacing: "0.10em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: posCol }} /> STARTERS
                    </div>
                    {starters.map((p, j) => (
                      <div key={j} style={{
                        display: "grid", gridTemplateColumns: "20px 1fr 50px 60px",
                        alignItems: "center", gap: 6, padding: "4px 6px",
                        background: j % 2 === 0 ? "transparent" : C.white08,
                        borderRadius: 3,
                      }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{j + 1}</span>
                        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textAlign: "right" }}>{p.age ? `${p.age} yrs` : ""}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: posCol, textAlign: "right" }}>{fmt(p.sha_value)}</span>
                      </div>
                    ))}
                    {/* Bench */}
                    {bench.length > 0 && (
                      <>
                        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.dim, letterSpacing: "0.10em", marginTop: 10, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.dim }} /> BENCH
                        </div>
                        {bench.map((p, j) => (
                          <div key={j} style={{
                            display: "grid", gridTemplateColumns: "20px 1fr 50px 60px",
                            alignItems: "center", gap: 6, padding: "4px 6px", opacity: 0.5,
                          }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{j + starters.length + 1}</span>
                            <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>{p.name}</span>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textAlign: "right" }}>{p.age ? `${p.age}` : ""}</span>
                            <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, textAlign: "right" }}>{fmt(p.sha_value)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: PLAYER RANKINGS (ported from Shadynasty Players)
   Global player search + full ranked table with position filters
   ═══════════════════════════════════════════════════════════════ */
type PlayerMode = "overall" | "dynasty" | "winnow";

const PLAYER_MODE_TABS: { id: PlayerMode; label: string }[] = [
  { id: "overall", label: "OVERALL" },
  { id: "dynasty", label: "DYNASTY" },
  { id: "winnow", label: "WIN-NOW" },
];
const POS_FILTERS = ["ALL", "QB", "RB", "WR", "TE"] as const;
const PLAYER_TIER_BREAKS: Record<number, string> = { 10: "STARTERS", 25: "FLEX WORTHY", 50: "BENCH / DEPTH" };
const MAX_PLAYERS = 100;

function getRank(p: GlobalPlayerRanking, mode: PlayerMode): number {
  if (mode === "dynasty") return p.dynasty_rank ?? 999;
  if (mode === "winnow") return p.redraft_rank ?? 999;
  return p.sha_overall_rank ?? 999;
}

function getVal(p: GlobalPlayerRanking, mode: PlayerMode): number {
  if (mode === "dynasty") return p.dynasty_value;
  if (mode === "winnow") return p.redraft_value;
  return p.sha_value;
}

function PlayerRankings({ overview }: { overview: any }) {
  const { openPlayerCard } = usePlayerCardStore();
  const [mode, setMode] = useState<PlayerMode>("overall");
  const [posFilter, setPosFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["global-player-rankings"],
    queryFn: getGlobalPlayerRankings,
    staleTime: 600_000,
  });

  const is1QB = overview?.format && !overview.format.is_superflex;
  const allPlayers = data?.players || [];

  // Apply 1QB format adjustment to QBs
  const formatAdjusted = useMemo(() => {
    if (!is1QB) return allPlayers;
    return allPlayers.map((p) => p.position !== "QB" ? p : { ...p, sha_value: Math.round(p.sha_value * 0.73) });
  }, [allPlayers, is1QB]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search for dropdown suggestions
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 150); return () => clearTimeout(t); }, [search]);

  const suggestions = useMemo(() => {
    if (!debounced || debounced.length < 2) return [];
    const q = debounced.toLowerCase();
    return formatAdjusted.filter(p => p.player_name.toLowerCase().includes(q)).slice(0, 8);
  }, [debounced, formatAdjusted]);

  // Filtered + sorted players for table
  const filtered = useMemo(() => {
    const sq = search.toLowerCase().trim();
    let list = formatAdjusted;
    if (posFilter !== "ALL") list = list.filter(p => p.position === posFilter);
    if (sq.length >= 2) list = list.filter(p => p.player_name.toLowerCase().includes(sq) || (p.team || "").toLowerCase().includes(sq));
    return [...list].sort((a, b) => getRank(a, mode) - getRank(b, mode)).slice(0, MAX_PLAYERS);
  }, [formatAdjusted, posFilter, search, mode]);

  // Determine column headers based on mode
  const valKey = mode === "overall" ? "VALUE" : mode === "dynasty" ? "DYNASTY" : "WIN-NOW";
  const showTierBreaks = posFilter === "ALL" && !search;

  return (
    <div>
      {/* Search + Position filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {/* Search bar with auto-suggest */}
        <div ref={wrapRef} style={{ position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6,
            background: C.card,
            border: `1px solid ${focused ? C.gold : C.border}`,
            boxShadow: focused ? `0 0 0 1px ${C.gold}30` : "none",
            transition: "all 0.15s",
          }}>
            <Search size={14} style={{ color: focused ? C.gold : C.dim, flexShrink: 0 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setFocused(true)}
              placeholder="Search any player..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.dim }} /></button>}
          </div>
          {/* Suggest dropdown */}
          {focused && suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 50,
              background: C.elevated, border: `1px solid ${C.borderLt}`, borderRadius: 6,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
            }}>
              {suggestions.map((p, i) => {
                const pc = posColor(p.position);
                return (
                  <div key={p.player_name + i}
                    onClick={() => { openPlayerCard(p.player_name); setFocused(false); }}
                    className="rk-dense"
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer",
                      borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none",
                    }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: `${pc}15`, color: pc, border: `1px solid ${pc}30` }}>{p.position}</span>
                    <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, flex: 1 }}>{p.player_name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.team || "FA"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold }}>{fmt(getVal(p, mode))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Position pills + mode tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {POS_FILTERS.map((p) => {
              const act = posFilter === p;
              const c = p === "ALL" ? C.gold : posColor(p);
              return (
                <button key={p} onClick={() => setPosFilter(p)}
                  style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                    padding: "4px 12px", borderRadius: 4, cursor: "pointer", border: "none",
                    background: act ? `${c}20` : "transparent",
                    color: act ? c : C.dim,
                    outline: act ? `1px solid ${c}40` : `1px solid ${C.border}`,
                    transition: "all 0.15s",
                  }}>{p}</button>
              );
            })}
          </div>
          <GlowTabs size="sm" tabs={PLAYER_MODE_TABS} active={mode} onChange={(id) => setMode(id as PlayerMode)} />
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "0.8fr 4fr 1.2fr 1.5fr",
        alignItems: "center", gap: 8, padding: "10px 20px",
        position: "sticky", top: 0, zIndex: 2,
        background: C.panel, borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.dim }}>RK</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.dim }}>PLAYER</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.dim, textAlign: "center" }}>POS RK</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, textAlign: "right" }}>{valKey}</span>
      </div>

      {/* Player rows */}
      {isLoading ? <Skel n={20} h={44} /> : filtered.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: MONO, fontSize: 13, color: C.dim }}>
          {search ? "No players match your search" : "No player data available"}
        </div>
      ) : (
        <div style={{ maxHeight: 680, overflowY: "auto" }}>
          {filtered.map((p, idx) => {
            const rank = getRank(p, mode);
            const value = getVal(p, mode);
            const isElite = rank <= 3;
            const isEven = idx % 2 === 0;
            const pc = posColor(p.position);

            // Tier break
            const prevRank = idx > 0 ? getRank(filtered[idx - 1], mode) : 0;
            const tierBreak = showTierBreaks ? Object.keys(PLAYER_TIER_BREAKS).map(Number).find(tb => prevRank < tb && rank >= tb) : undefined;

            return (
              <React.Fragment key={p.player_name + p.position}>
                {tierBreak != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px" }}>
                    <div style={{ height: 1, flex: 1, background: C.border }} />
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: C.dim }}>{PLAYER_TIER_BREAKS[tierBreak]}</span>
                    <div style={{ height: 1, flex: 1, background: C.border }} />
                  </div>
                )}
                <div className="rk-dense"
                  onClick={() => openPlayerCard(p.player_name)}
                  style={{
                    display: "grid", gridTemplateColumns: "0.8fr 4fr 1.2fr 1.5fr",
                    alignItems: "center", gap: 8, padding: "10px 20px", cursor: "pointer",
                    background: isEven ? C.card : `${C.elevated}90`,
                    borderBottom: `1px solid ${C.white08}`,
                  }}>
                  {/* Rank */}
                  <span style={{
                    fontFamily: MONO, fontSize: 17, fontWeight: 900,
                    color: isElite ? C.gold : C.dim,
                    textShadow: isElite ? `0 0 12px ${C.gold}40` : "none",
                  }}>{rank <= 999 ? rank : "\u2014"}</span>
                  {/* Player + Position + Age */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <div className="hover:text-gold transition-colors"
                        style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.primary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.player_name}
                      </div>
                      <span style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                        padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                        background: `${pc}15`, color: pc, border: `1px solid ${pc}30`,
                      }}>{p.position}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1, display: "flex", gap: 8 }}>
                      <span>{p.team || "FA"}</span>
                      {p.age != null && <span>{p.age} yrs</span>}
                    </div>
                  </div>
                  {/* Pos Rank */}
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.secondary, textAlign: "center" }}>
                    {p.sha_pos_rank || "\u2014"}
                  </span>
                  {/* Value */}
                  <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: C.gold, textAlign: "right" }}>
                    {fmt(value)}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
          {filtered.length >= MAX_PLAYERS && (
            <div style={{ padding: "12px 20px", textAlign: "center", fontFamily: MONO, fontSize: 10, color: C.dim }}>
              Top {MAX_PLAYERS} shown \u00B7 Use search to find specific players
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RANKINGS PAGE — 3 sub-tabs matching Shadynasty layout
   ═══════════════════════════════════════════════════════════════ */
const SUB_TABS = [
  { id: "team", label: "TEAM POWER" },
  { id: "positional", label: "POSITIONAL" },
  { id: "players", label: "PLAYERS" },
];

export default function RankingsPage() {
  const { currentLeagueId: lid } = useLeagueStore();
  const [subTab, setSubTab] = useState("team");

  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid, staleTime: 3600000 });

  if (!lid) return <div style={{ padding: 40, textAlign: "center", fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</div>;

  return (
    <div style={{ padding: "16px 20px" }}>
      <style>{`
        @keyframes rk-barFill { from { width: 0%; } }
        @keyframes rk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes rk-pulseGold { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,50,0.15); } 50% { box-shadow: 0 0 20px 2px rgba(212,165,50,0.08); } }
        .rk-row:hover { background: ${C.elevated} !important; transform: translateX(2px); }
        .rk-row { transition: all 0.15s ease; cursor: pointer; }
        .rk-dense:hover { border-left: 2px solid ${C.gold}; }
        .rk-dense { transition: all 0.12s ease; border-left: 2px solid transparent; }
        .rk-bar { animation: rk-barFill 0.8s ease-out both; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Power Rankings</span>
      </div>

      {/* Sub-tabs: TEAM POWER | POSITIONAL | PLAYERS */}
      <div style={{ marginBottom: 16 }}>
        <GlowTabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
      </div>

      {/* Content */}
      {subTab === "team" && <TeamPower lid={lid} overview={overview} />}
      {subTab === "positional" && <PositionalPower lid={lid} />}
      {subTab === "players" && <PlayerRankings overview={overview} />}
    </div>
  );
}
