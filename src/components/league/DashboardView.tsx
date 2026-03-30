"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getRoster, getPicks, getOwnerTrending, getOwnerNeeds,
  getGradedTradesByOwner, getTradePartners, getRankings,
  getOwnerRecord, getChampionships, getOwnerProfiles,
  getRivalries, getFranchiseIntel, getActions, getOverview, getLeagueIntel,
  getOwnerTendencies, getMarketFeed, getCoachesCorner,
} from "@/lib/api";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  LineChart, Line,
} from "recharts";
import type { RosterPlayer, GradedTrade } from "@/lib/types";
import PlayerName from "@/components/league/PlayerName";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { ChevronRight, Plus } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  goldGlow: "rgba(212,165,50,0.06)",
  green: "#7dd3a0", greenDim: "rgba(125,211,160,0.12)",
  red: "#e47272", redDim: "rgba(228,114,114,0.12)",
  blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
};
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B", PICK: "#8B5CF6" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const DISPLAY = "'Archivo Black', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

function fmt(n: number | null | undefined, d = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
function safe(v: unknown): string {
  if (v == null || v === "nan" || v === "null" || v === "") return "—";
  return String(v);
}
function posRankColor(rank: string | null | undefined): string {
  if (!rank || rank === "nan" || rank === "—") return C.dim;
  const num = parseInt(rank.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return C.dim;
  if (num <= 10) return C.gold;
  if (num <= 24) return C.primary;
  return C.red;
}
function gradeColor(g: string): string {
  if (!g) return C.dim;
  if (g.startsWith("A") || g === "ELITE") return C.green;
  if (g.startsWith("B") || g === "STRONG") return C.blue;
  if (g.startsWith("C") || g === "AVERAGE") return C.gold;
  if (g.startsWith("D") || g === "WEAK") return C.orange;
  return C.red;
}
function rankToGrade(rank: number): { grade: string; color: string } {
  if (rank <= 1) return { grade: "A+", color: C.green };
  if (rank === 2) return { grade: "A", color: C.green };
  if (rank === 3) return { grade: "A-", color: C.green };
  if (rank <= 5) return { grade: "B+", color: C.blue };
  if (rank <= 7) return { grade: "B", color: C.blue };
  if (rank <= 9) return { grade: "C", color: C.gold };
  if (rank <= 11) return { grade: "D", color: C.red };
  return { grade: "F", color: C.red };
}
function getVerdictStyle(v: string) {
  if (v === "Win-Win") return { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" };
  if (v === "ROBBERY") return { color: "#ff4444", bg: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.30)" };
  if (v === "Push") return { color: C.secondary, bg: "rgba(176,178,200,0.10)", border: "rgba(176,178,200,0.20)" };
  if (v.includes("Won")) return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v.includes("Lost")) return { color: C.red, bg: "rgba(255,68,68,0.10)", border: "rgba(255,68,68,0.25)" };
  return { color: C.dim, bg: "transparent", border: C.border };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ─── Card component ────────────────────────────────────────── */
function DCard({ label, right, children, className = "" }: { label?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      {label && (
        <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
          {right}
        </div>
      )}
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

/* ─── Loading skeleton ──────────────────────────────────────── */
function Skel({ h = 20, w = "100%" }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, background: C.elevated, borderRadius: 4, animation: "pulse 1.5s ease infinite" }} />;
}

/* ═══════════════════════════════════════════════════════════════
   MARKET INTEL SECTION
   ═══════════════════════════════════════════════════════════════ */
function MarketIntelSection({ feed, loading }: { feed: any; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = (feed?.market_feed || []) as any[];

  if (loading) {
    return (
      <DCard label="MARKET INTEL" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, animation: "pulse 1.5s ease infinite" }}>SCANNING MATCHING LEAGUES...</span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={36} />)}
        </div>
      </DCard>
    );
  }

  if (!items.length) {
    return (
      <DCard label="MARKET INTEL" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>No recent activity</span>}>
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.dim, padding: 8 }}>No recent market activity for your roster in matching formats.</p>
      </DCard>
    );
  }

  return (
    <DCard label="MARKET INTEL" right={
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>
        {feed?.players_with_activity || 0} players active · {feed?.format || ""} · {feed?.days || 90}d
      </span>
    }>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.slice(0, 8).map((item: any) => {
          const isExpanded = expanded === item.player;
          const posColor = POS[item.position] || C.dim;
          return (
            <div key={item.player}>
              {/* Player row */}
              <div
                onClick={() => setExpanded(isExpanded ? null : item.player)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  borderRadius: 4, cursor: "pointer", transition: "background 0.12s",
                  borderLeft: `3px solid ${posColor}`,
                  background: isExpanded ? C.elevated : "transparent",
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = C.white08; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Position badge */}
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor, width: 22 }}>{item.position}</span>
                {/* Player name */}
                <span style={{ fontFamily: "-apple-system, 'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 600, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.player}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{item.pos_rank || fmt(item.sha_value)}</span>
                {/* Trade count badge */}
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                  color: item.recent_trades >= 5 ? C.green : item.recent_trades >= 3 ? C.gold : C.secondary,
                  background: item.recent_trades >= 5 ? "rgba(125,211,160,0.12)" : item.recent_trades >= 3 ? C.goldDim : C.white08,
                }}>
                  {item.recent_trades} trades
                </span>
                {/* Expand arrow */}
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>▸</span>
              </div>

              {/* Expanded trade details */}
              {isExpanded && (
                <div style={{ marginLeft: 33, padding: "4px 0 8px", borderLeft: `1px solid ${C.border}`, marginBottom: 4 }}>
                  {(item.trades || []).slice(0, 4).map((t: any, j: number) => {
                    // Format assets: objects have {name, pos_rank} or are plain strings
                    const fmtAssets = (assets: any[]) => (assets || []).slice(0, 3).map((a: any) => {
                      if (typeof a === "string") return a;
                      const name = (a.name || "").replace(/\s*\([^)]*\)/g, "");
                      const rank = a.pos_rank ? ` (${a.pos_rank})` : "";
                      return `${name}${rank}`;
                    }).join(", ");
                    // Fix NoneT format label
                    const fmt = (t.format || "").replace(/NoneT\s*/i, "").trim() || "Unknown";
                    // Tier tag for non-exact matches
                    const tierTag = t.match_tier && t.match_tier > 1
                      ? t.match_tier === 2 ? "diff scoring" : t.match_tier === 3 ? "diff size" : "diff format"
                      : null;
                    return (
                      <div key={j} style={{ padding: "4px 12px", borderBottom: `1px solid ${C.white08}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{t.days_ago}d ago</span>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>{fmt}</span>
                          {tierTag && <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim, fontStyle: "italic" }}>{tierTag}</span>}
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: t.was_sold ? C.red : C.green }}>{t.was_sold ? "SOLD" : "ACQUIRED"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontFamily: "-apple-system, 'Inter', system-ui, sans-serif", fontSize: 11 }}>
                          <span style={{ color: `${C.red}cc` }}>Gave</span>
                          <span style={{ color: C.secondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtAssets(t.gave)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontFamily: "-apple-system, 'Inter', system-ui, sans-serif", fontSize: 11 }}>
                          <span style={{ color: `${C.green}cc` }}>Got&nbsp;</span>
                          <span style={{ color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtAssets(t.got)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DCard>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ lid, owner }: { lid: string; owner: string }) {
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();

  const { data: roster, isLoading: loadingRoster } = useQuery({ queryKey: ["roster", lid, owner], queryFn: () => getRoster(lid, owner), enabled: !!lid && !!owner });
  const { data: picks } = useQuery({ queryKey: ["picks", lid, owner], queryFn: () => getPicks(lid, owner), enabled: !!lid && !!owner });
  const { data: trending } = useQuery({ queryKey: ["trending-owner", lid, owner], queryFn: () => getOwnerTrending(lid, owner), enabled: !!lid && !!owner });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, owner], queryFn: () => getOwnerNeeds(lid, owner), enabled: !!lid && !!owner });
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, owner], queryFn: () => getGradedTradesByOwner(lid, owner), enabled: !!lid && !!owner });
  const { data: partners } = useQuery({ queryKey: ["partners", lid, owner], queryFn: () => getTradePartners(lid, owner), enabled: !!lid && !!owner });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, owner], queryFn: () => getOwnerRecord(lid, owner), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, owner], queryFn: () => getChampionships(lid, owner), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid), enabled: !!lid });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid), enabled: !!lid, staleTime: 600000 });
  // ── New queries for enhanced dashboard ──
  const { data: tendencies } = useQuery({ queryKey: ["tendencies", lid, owner], queryFn: () => getOwnerTendencies(lid, owner), enabled: !!lid && !!owner, staleTime: 600000 });
  const { data: franchiseIntel } = useQuery({ queryKey: ["franchise-intel", lid, owner], queryFn: () => getFranchiseIntel(lid, owner), enabled: !!lid && !!owner, staleTime: 600000 });
  const { data: marketFeed, isLoading: loadingMarket } = useQuery({ queryKey: ["market-feed", lid, owner], queryFn: () => getMarketFeed(lid, owner, 120), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: coachesCorner } = useQuery({ queryKey: ["coaches-corner", lid, owner], queryFn: () => getCoachesCorner(lid, owner), enabled: !!lid && !!owner, staleTime: 600000 });

  // Match owner in rankings — exact first, then startsWith fallback for disambiguated names like "I am Sam (#1)"
  const _findOwner = (list: any[] | undefined, key = "owner") =>
    list?.find((r: any) => r[key]?.toLowerCase() === owner.toLowerCase())
    || list?.find((r: any) => r[key]?.toLowerCase().startsWith(owner.toLowerCase() + " (#"))
    || list?.find((r: any) => r[key]?.toLowerCase().replace(/\s*\(#\d+\)/, "") === owner.toLowerCase());
  const myRank = _findOwner(rankings?.rankings);
  const myIntel = _findOwner(leagueIntel?.owners);
  const radarData = (needs?.needs || []).map((n: any) => {
    const g = rankToGrade(n.league_rank);
    return { position: n.position, grade: g.grade, gradeColor: g.color, you: n.total_sha, league: n.league_avg };
  });
  const wins = graded?.wins || 0, losses = graded?.losses || 0, pushes = graded?.pushes || 0;
  const donut = [
    { name: "W", value: wins, color: C.green },
    { name: "L", value: losses, color: C.red },
    { name: "P", value: pushes, color: "#4a4d5e" },
  ].filter((d) => d.value > 0);

  function tierBadge(rank: number | undefined) {
    if (!rank) return { label: "—", bg: C.elevated, color: C.dim };
    if (rank <= 3) return { label: "TOP DOG", bg: "rgba(125,211,160,0.15)", color: C.green };
    if (rank <= 6) return { label: "CONTENDER", bg: C.goldDim, color: C.gold };
    if (rank <= 9) return { label: "FEISTY", bg: "rgba(224,156,107,0.12)", color: C.orange };
    return { label: "BASEMENT", bg: "rgba(228,114,114,0.12)", color: C.red };
  }
  const tier = tierBadge(myRank?.rank);

  // Most recent season from record.seasons
  const seasons: any[] = (record as any)?.seasons || [];
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  // season_finishes from champs (API extension)
  const seasonFinishes: any[] = (champs as any)?.season_finishes || [];
  const latestFinish = latestSeason
    ? seasonFinishes.find((sf: any) => String(sf.season) === String(latestSeason.season))
    : null;
  const ppg = (record as any)?.ppg as number | undefined;

  // Scatter chart data
  const scatterAll = (leagueIntel?.owners || []).map((o: any) => {
    const r = rankings?.rankings?.find((rk: any) => rk.owner.toLowerCase() === o.owner.toLowerCase());
    return {
      owner: o.owner,
      x: o.dynasty_rank,
      y: o.win_now_rank,
      sha: r?.total_sha ?? 0,
      isMe: o.owner.toLowerCase() === owner.toLowerCase() || o.owner.toLowerCase().replace(/\s*\(#\d+\)/, "") === owner.toLowerCase(),
    };
  });
  const totalTeams = scatterAll.length || 12;

  // Season trajectory data: merge record.seasons + season_finishes
  const trajectoryData = seasons
    .filter((s: any) => Number(s.season) < 2026) // Filter out incomplete/future seasons
    .map((s: any) => {
      const sf = seasonFinishes.find((f: any) => String(f.season) === String(s.season));
      const champYear = (champs?.championship_years || []).includes(String(s.season));
      return {
        season: String(s.season),
        finish: sf?.finish ?? null,
        ppgRank: null as number | null,
        isChamp: champYear,
      };
    });

  // Positional grades for report card (from needs)
  const posGrades: Record<string, { grade: string; color: string; rank: number }> = {};
  (needs?.needs || []).forEach((n: any) => {
    const g = rankToGrade(n.league_rank);
    posGrades[n.position] = { grade: g.grade, color: g.color, rank: n.league_rank };
  });

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ══════════════════════════════════════════════════════════
          BLOCK A: COMMAND STRIP — rendered FIRST (physically after IIFE but uses CSS flexbox order)
          ══════════════════════════════════════════════════════════ */}

      {/* ── Your move — Linear-style suggestion rows ── */}
      <div style={{ display: "contents" }}>
      {(() => {
        const cc = coachesCorner as Record<string, unknown> | undefined;
        const openCard = usePlayerCardStore.getState().openPlayerCard;

        const rows: Array<{ tag: "sell high" | "buy low" | "upgrade"; name: string; context: string; playerName?: string }> = [];

        // ── Pull from coaches corner — single source of truth ──
        const moveNow = ((cc?.move_now || []) as Array<Record<string, unknown>>);
        const sellHigh = ((cc?.sell_high || []) as Array<Record<string, unknown>>);
        const buyLow = ((cc?.buy_low || []) as Array<Record<string, unknown>>);

        // Build owned-player set for buy-low safety filter
        const bp = (roster as any)?.by_position || {};
        const ownedSet = new Set<string>();
        for (const pos of ["QB", "RB", "WR", "TE"]) {
          for (const p of (bp[pos] || [])) ownedSet.add(String(p.name || "").toLowerCase().trim());
        }
        const safeBuyLow = buyLow.filter(t => !ownedSet.has(String(t.name || t.player || "").toLowerCase().trim()));

        // 1. Sell signals
        for (const item of moveNow.slice(0, 2)) {
          const name = String(item.name || "");
          const signal = String(item.signal || item.reason || "");
          const pos = String(item.position || "");
          const hasATH = signal.includes("ATH");
          const hasDeclining = signal.includes("declining");
          const hasAge = signal.includes("age");
          rows.push({
            tag: "sell high",
            name,
            context: `${pos} · ${hasATH ? "near all-time high value" : hasDeclining ? "production trending down" : hasAge ? "aging asset window" : signal.slice(0, 50)}`,
            playerName: name,
          });
        }

        // 2. Positional needs
        const myIntelData = leagueIntel?.owners?.find((o: any) =>
          o.owner.toLowerCase() === owner.toLowerCase() || o.owner.toLowerCase().replace(/\s*\(#\d+\)/, "") === owner.toLowerCase());
        const criticalNeeds = (myIntelData?.positional_needs || []) as string[];
        if (criticalNeeds.length > 0 && rows.length < 3) {
          const pos = criticalNeeds[0];
          const pg = myIntelData?.positional_grades?.[pos] || "WEAK";
          if (pg === "CRITICAL" || pg === "WEAK") {
            const sellCandidate = sellHigh.find((s) => String(s.action) === "SELL" && String(s.position) !== pos);
            if (sellCandidate) {
              rows.push({
                tag: "upgrade",
                name: `${pos} via ${sellCandidate.name}`,
                context: `${sellCandidate.position} is sellable — convert to a ${pos} upgrade`,
                playerName: String(sellCandidate.name),
              });
            } else {
              rows.push({
                tag: "upgrade",
                name: `${pos} room`,
                context: `graded ${pg} — find an upgrade in the trade builder`,
              });
            }
          }
        }

        // 3. Buy-low
        if (rows.length < 3) {
          for (const target of safeBuyLow.slice(0, 1)) {
            const name = String(target.name || target.player || "");
            const pos = String(target.position || "");
            const age = target.age ? String(target.age) : "";
            const trend = String(target.trend || "");
            // Clean context: position + age/trend signal, no owner names, no SHA
            const ctx = age && trend === "ascending"
              ? `young ${pos} · ascending value`
              : trend === "ascending"
              ? `${pos} · ascending value`
              : age
              ? `${pos} · ${age} yrs old, undervalued`
              : `${pos} · undervalued`;
            if (name) {
              rows.push({ tag: "buy low", name, context: ctx, playerName: name });
            }
          }
        }

        const tagStyles = {
          "sell high": "text-red-400 bg-red-400/10",
          "buy low": "text-emerald-400 bg-emerald-400/10",
          "upgrade": "text-amber-400 bg-amber-400/10",
        };

        return (
          <div>
            {rows.length > 0 && (
              <p className="text-[13px] font-medium text-secondary mb-1.5 pl-0.5">Your move</p>
            )}
            <div className="flex items-center rounded-xl bg-elevated/50 p-1">
              {rows.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center flex-1 min-w-0">
                  {i > 0 && <div className="w-px self-stretch bg-white/5" />}
                  <div
                    onClick={() => r.playerName ? openCard(r.playerName) : router.push(`/l/${currentLeagueSlug}/trades`)}
                    className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-0.5 px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                  >
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${tagStyles[r.tag]}`}>
                      {r.tag}
                    </span>
                    <span className="text-sm font-medium text-primary whitespace-nowrap">{r.name}</span>
                    <span className="text-[11px] text-dim">{r.context}</span>
                  </div>
                </div>
              ))}
              {/* Build a trade CTA */}
              {rows.length > 0 && <div className="w-px self-stretch bg-white/5" />}
              <div
                onClick={() => router.push(`/l/${currentLeagueSlug}/trades`)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors hover:bg-amber-400/10 whitespace-nowrap"
              >
                <Plus size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm font-medium text-amber-400">Build a trade</span>
              </div>
            </div>
          </div>
        );
      })()}
      </div>

      {/* ══════════════════════════════════════════════════════════
          COMMAND STRIP — tells you WHO you are (MUST BE FIRST VISUALLY)
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap",
        padding: "7px 14px", borderRadius: 6, background: C.panel,
        border: `1px solid ${C.border}`, justifyContent: "center",
        order: -1,
      }}>
        {/* Tier badge */}
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em",
          padding: "3px 10px", borderRadius: 4,
          background: tier.bg, color: tier.color,
          border: `1px solid ${tier.color}40`,
        }}>{tier.label}</span>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />

        {/* Most recent season */}
        {latestSeason && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>{latestSeason.season}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>
                {latestSeason.wins}W-{latestSeason.losses}L
                {latestFinish && <span style={{ color: C.dim }}> ({ordinal(latestFinish.finish)})</span>}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* All-time record */}
        {record && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>ALL-TIME</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>
                {record.all_time_wins}W-{record.all_time_losses}L
                {record.win_pct != null && (
                  <span style={{ color: C.dim }}> .{Math.round(record.win_pct * 1000).toString().padStart(3, "0")}</span>
                )}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* PPG removed — data inaccurate, needs recalculation */}

        {/* Playoffs */}
        {champs && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>PLAYOFFS</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>
                {champs.playoff_appearances}/{record?.seasons_played ?? "—"}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* Titles */}
        {champs && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>TITLES</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: champs.championships > 0 ? C.gold : C.secondary }}>
                {champs.championships}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {myRank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>OVERALL</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold }}>#{myRank.rank}</span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}
        {myIntel?.dynasty_rank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>DYNASTY</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.blue }}>#{myIntel.dynasty_rank}</span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}
        {myIntel?.win_now_rank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>WIN-NOW</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.green }}>#{myIntel.win_now_rank}</span>
            </div>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* Archetype badge from tendencies */}
        {tendencies && tendencies.badges.length > 0 && (
          <>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
              padding: "2px 8px", borderRadius: 4,
              color: tendencies.trade_win_rate >= 0.6 ? C.green : tendencies.trade_win_rate >= 0.45 ? C.gold : C.red,
              background: `${tendencies.trade_win_rate >= 0.6 ? C.green : tendencies.trade_win_rate >= 0.45 ? C.gold : C.red}15`,
              border: `1px solid ${tendencies.trade_win_rate >= 0.6 ? C.green : tendencies.trade_win_rate >= 0.45 ? C.gold : C.red}30`,
            }}>
              {tendencies.badges[0]}
            </span>
            <div style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* Momentum from trending */}
        {trending && trending.total_roster_delta !== 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              color: trending.total_roster_delta > 0 ? C.green : C.red,
            }}>
              {trending.total_roster_delta > 0 ? "▲" : "▼"} {fmt(Math.abs(trending.total_roster_delta))}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{trending.period_days}d</span>
          </div>
        )}
      </div>

      {/* REPORT CARD + HERO rows removed — Radar+DraftCapital moved into right column below */}

      {/* ══════════════════════════════════════════════════════════
          RADAR + DRAFT CAPITAL — now inside the right column (rendered below)
          ══════════════════════════════════════════════════════════ */}

      {/* HIDDEN: content moved to right column of two-column grid */}
      <div style={{ display: "none" }}>
        {/* Positional Radar — visual centerpiece */}
        <DCard label="POSITIONAL RADAR">
          {radarData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={radarData} margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="position" tick={(props: any) => {
                    const d = radarData[props.payload.index];
                    if (!d) return <text x={props.x} y={props.y} textAnchor="middle" fill={C.dim} fontSize={10}>{props.payload.value}</text>;
                    return (
                      <g>
                        <text x={props.x} y={props.y - 5} textAnchor="middle" fill={POS[d.position] || C.dim} fontSize={11} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{d.position}</text>
                        <text x={props.x} y={props.y + 9} textAnchor="middle" fill={d.gradeColor} fontSize={14} fontFamily="'Archivo Black', sans-serif" fontWeight={900}>{d.grade}</text>
                      </g>
                    );
                  }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="You" dataKey="you" stroke={C.gold} fill={C.gold} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="League" dataKey="league" stroke="#4a4d5e" fill="#4a4d5e" fillOpacity={0.08} strokeWidth={1} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 2 }}>
                {[{ label: "You", color: C.gold }, { label: "Lg Avg", color: "#4a4d5e" }].map((leg) => (
                  <span key={leg.label} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: leg.color }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: leg.color, display: "inline-block" }} />
                    {leg.label}
                  </span>
                ))}
              </div>
            </>
          ) : <Skel h={190} />}
        </DCard>

        {/* Draft Capital */}
        <DCard label="DRAFT CAPITAL">
          {picks ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(picks.by_year).map(([year, yp]: [string, any]) => (
                <div key={year}>
                  <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 4, letterSpacing: "0.06em" }}>{year}</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {yp.map((pk: any, i: number) => (
                      <span key={`${year}-${i}`} style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 4,
                        background: pk.is_own_pick ? C.goldDim : "rgba(139,92,246,0.10)",
                        color: pk.is_own_pick ? C.gold : "#8B5CF6",
                        border: `1px solid ${pk.is_own_pick ? C.goldBorder : "rgba(139,92,246,0.25)"}`,
                      }}>
                        R{pk.round}
                        {!pk.is_own_pick && <span style={{ opacity: 0.6, marginLeft: 2 }}>({pk.original_owner.slice(0, 5)})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>
                {picks.total_picks} picks ·{" "}
                <span style={{ color: C.gold }}>{fmt(picks.total_sha_value)} value</span>
              </p>
            </div>
          ) : <Skel h={80} />}
        </DCard>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 4: TWO-COLUMN WORKING AREA — Roster + Market Intel (order 4)
          ══════════════════════════════════════════════════════════ */}
      <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "55fr 45fr", gap: 10, /* order removed */ }}>

        {/* ──────────────────────────────────────────────────────
            LEFT — ROSTER & ASSETS
            ────────────────────────────────────────────────────── */}
        <DCard
          label="ROSTER & ASSETS"
          right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roster?.roster_size || 0} players</span>}
        >
          {loadingRoster ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Array.from({ length: 14 }).map((_, i) => <Skel key={i} h={22} />)}
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div style={{
                display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.55fr 0.55fr",
                padding: "0 8px 5px", marginBottom: 2,
              }}>
                {["PLAYER", "VALUE", "POS RK", "30D"].map((h) => (
                  <span key={h} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: C.dim, textAlign: h === "PLAYER" ? "left" : "center" }}>{h}</span>
                ))}
              </div>

              {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                const players: RosterPlayer[] = roster?.by_position?.[pos] || [];
                if (!players.length) return null;
                const posNeed = needs?.needs?.find((n: any) => n.position === pos);
                const pg = posNeed ? rankToGrade(posNeed.league_rank) : null;
                const posOrdinal = posNeed ? ordinal(posNeed.league_rank) : null;
                return (
                  <div key={pos} style={{ marginBottom: 4 }}>
                    {/* Position group header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "4px 8px", background: C.elevated,
                      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: POS[pos], letterSpacing: "0.08em" }}>{pos}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{players.length}</span>
                      {pg && posOrdinal && (
                        <span style={{
                          marginLeft: "auto", fontFamily: MONO, fontSize: 10, fontWeight: 800,
                          padding: "1px 7px", borderRadius: 3,
                          color: pg.color, background: `${pg.color}18`,
                          border: `1px solid ${pg.color}30`,
                        }}>
                          {posOrdinal} — {pg.grade}
                        </span>
                      )}
                    </div>

                    {/* Player rows */}
                    {players.map((p: RosterPlayer, idx: number) => {
                      const isTop = idx === 0;
                      const t30 = (p as any).trend_30d;
                      const trendColor = t30?.direction === "up" ? C.green : t30?.direction === "down" ? C.red : C.dim;
                      const trendVal = t30?.delta ? `${t30.delta > 0 ? "▲" : "▼"} ${Math.abs(t30.delta)}` : "—";
                      const isHovered = hoveredPlayer === `${pos}-${idx}`;
                      return (
                        <div key={p.name_clean} style={{
                          display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.55fr 0.55fr",
                          padding: "4px 8px",
                          borderLeft: isTop ? `3px solid ${C.gold}` : `3px solid transparent`,
                          borderBottom: `1px solid ${C.white08}`,
                          background: isHovered ? C.elevated : "transparent",
                          cursor: "pointer",
                          transition: "background 0.12s ease",
                        }}
                          onMouseEnter={() => setHoveredPlayer(`${pos}-${idx}`)}
                          onMouseLeave={() => setHoveredPlayer(null)}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 5, overflow: "hidden" }}>
                            <PlayerName name={p.name} style={{ fontSize: 13, fontWeight: 500, color: isTop ? C.primary : C.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                            {p.age && (
                              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flexShrink: 0 }}>{p.age}</span>
                            )}
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, textAlign: "center", color: C.gold, alignSelf: "center" }}>
                            {fmt(p.sha_value)}
                          </span>
                          <span style={{
                            fontFamily: MONO, fontSize: 10, textAlign: "center", alignSelf: "center",
                            padding: "1px 4px", borderRadius: 3,
                            color: posRankColor(p.sha_pos_rank),
                            background: `${posRankColor(p.sha_pos_rank)}15`,
                          }}>
                            {safe(p.sha_pos_rank)}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 10, textAlign: "center", alignSelf: "center", color: trendColor, fontWeight: t30?.delta ? 700 : 400 }}>
                            {trendVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Draft picks appended */}
              {picks && picks.total_picks > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 8px", background: C.elevated,
                    borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: POS["PICK"], letterSpacing: "0.08em" }}>PICKS</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{picks.total_picks}</span>
                    <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: C.gold }}>{fmt(picks.total_sha_value)} value</span>
                  </div>
                  <div style={{ padding: "6px 8px", display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {Object.entries(picks.by_year).flatMap(([year, yp]: [string, any]) =>
                      yp.map((pk: any, i: number) => (
                        <span key={`${year}-${i}`} style={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 700,
                          padding: "2px 6px", borderRadius: 4,
                          background: pk.is_own_pick ? C.goldDim : "rgba(139,92,246,0.10)",
                          color: pk.is_own_pick ? C.gold : "#8B5CF6",
                          border: `1px solid ${pk.is_own_pick ? C.goldBorder : "rgba(139,92,246,0.25)"}`,
                        }}>
                          {year} R{pk.round}
                          {!pk.is_own_pick && <span style={{ opacity: 0.6, marginLeft: 2 }}>({pk.original_owner.slice(0, 4)})</span>}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DCard>

        {/* ──────────────────────────────────────────────────────
            RIGHT — STACKED PANELS
            ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Positional Radar + Draft Capital — side by side at top of right column */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <DCard label="POSITIONAL RADAR">
              {radarData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <RadarChart data={radarData} margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="position" tick={(props: any) => {
                        const d = radarData[props.payload.index];
                        if (!d) return <text x={props.x} y={props.y} textAnchor="middle" fill={C.dim} fontSize={10}>{props.payload.value}</text>;
                        return (<g><text x={props.x} y={props.y - 5} textAnchor="middle" fill={POS[d.position] || C.dim} fontSize={11} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{d.position}</text><text x={props.x} y={props.y + 9} textAnchor="middle" fill={d.gradeColor} fontSize={14} fontFamily="'Archivo Black', sans-serif" fontWeight={900}>{d.grade}</text></g>);
                      }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar name="You" dataKey="you" stroke={C.gold} fill={C.gold} fillOpacity={0.2} strokeWidth={2} />
                      <Radar name="League" dataKey="league" stroke="#4a4d5e" fill="#4a4d5e" fillOpacity={0.08} strokeWidth={1} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 2 }}>
                    {[{ label: "You", color: C.gold }, { label: "Lg Avg", color: "#4a4d5e" }].map((leg) => (
                      <span key={leg.label} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: leg.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: leg.color, display: "inline-block" }} /> {leg.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : <Skel h={190} />}
            </DCard>
            <DCard label="DRAFT CAPITAL">
              {picks ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(picks.by_year).map(([year, yp]: [string, any]) => (
                    <div key={year}>
                      <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 4, letterSpacing: "0.06em" }}>{year}</p>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {yp.map((pk: any, i: number) => (
                          <span key={`rc-${year}-${i}`} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                            background: pk.is_own_pick ? C.goldDim : "rgba(139,92,246,0.10)", color: pk.is_own_pick ? C.gold : "#8B5CF6",
                            border: `1px solid ${pk.is_own_pick ? C.goldBorder : "rgba(139,92,246,0.25)"}` }}>
                            R{pk.round}{!pk.is_own_pick && <span style={{ opacity: 0.6, marginLeft: 2 }}>({pk.original_owner.slice(0, 5)})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>
                    {picks.total_picks} picks · <span style={{ color: C.gold }}>{fmt(picks.total_sha_value)} value</span>
                  </p>
                </div>
              ) : <Skel h={80} />}
            </DCard>
          </div>

          {/* Market Intel (scrollable, compact) */}
          <div style={{ maxHeight: 500, overflowY: "auto", borderRadius: 8 }}>
            <MarketIntelSection feed={marketFeed as any} loading={loadingMarket} />
          </div>

          {/* Row 2: Trade Grades donut + Trade Intelligence */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Trade Grades donut */}
            <DCard label="TRADE GRADES">
              {donut.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ResponsiveContainer width={88} height={88}>
                    <PieChart>
                      <Pie data={donut} dataKey="value" innerRadius={24} outerRadius={40} paddingAngle={3} strokeWidth={0}>
                        {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontFamily: MONO, fontSize: 12 }}>
                    {[
                      { label: "W", val: wins, color: C.green },
                      { label: "L", val: losses, color: C.red },
                      { label: "P", val: pushes, color: C.dim },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                        <span style={{ color: row.color }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: C.primary }}>{row.val}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                      Rate:{" "}
                      <span style={{ color: C.gold, fontWeight: 700 }}>
                        {graded?.win_rate ? `${(graded.win_rate * 100).toFixed(0)}%` : "—"}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>No graded trades</p>
              )}
            </DCard>

            {/* Trade Intelligence */}
            <DCard label="TRADE INTELLIGENCE">
              {partners ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {partners.partners.slice(0, 5).map((p: any, i: number) => (
                    <div key={`${p.owner}-${i}`} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 5px", borderRadius: 4,
                      borderBottom: `1px solid ${C.white08}`,
                      cursor: "pointer", transition: "background 0.12s ease",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>
                        {p.owner}
                      </span>
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {p.badges.slice(0, 2).map((b: string) => {
                          const isBest = b === "BEST FIT";
                          const isSurplus = b.includes("SURPLUS");
                          return (
                            <span key={b} style={{
                              fontFamily: MONO, fontSize: 9, fontWeight: 700,
                              padding: "1px 4px", borderRadius: 3,
                              background: isBest ? C.greenDim : isSurplus ? "rgba(107,184,224,0.10)" : "rgba(149,150,165,0.10)",
                              color: isBest ? C.green : isSurplus ? C.blue : C.dim,
                              border: `1px solid ${isBest ? "rgba(125,211,160,0.25)" : isSurplus ? "rgba(107,184,224,0.25)" : "rgba(149,150,165,0.15)"}`,
                            }}>{b}</span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Skel h={100} />}
            </DCard>
          </div>

          {/* Row 3: Recent Trades */}
          <DCard label="RECENT TRADES">
            {graded?.trades && graded.trades.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {graded.trades.slice(0, 6).map((t: GradedTrade) => {
                  const ol = owner.toLowerCase();
                  const isA = t.side_a_owner?.toLowerCase() === ol || t.side_a_owner?.toLowerCase().replace(/\s*\(#\d+\)/, "") === ol;
                  const myVerdict = isA ? t.side_a_verdict : t.side_b_verdict;
                  const myLetter = isA ? t.side_a_letter : t.side_b_letter;
                  const counterParty = isA ? t.side_b_owner : t.side_a_owner;
                  const vs = getVerdictStyle(myVerdict || t.verdict || "—");
                  const assetsIn = (isA ? t.players_received : t.players_sent) || [];
                  const assetsOut = (isA ? t.players_sent : t.players_received) || [];
                  const picksIn = (isA ? t.picks_received : t.picks_sent) || [];
                  const picksOut = (isA ? t.picks_sent : t.picks_received) || [];
                  const allIn = [...assetsIn, ...picksIn].slice(0, 3).join(", ");
                  const allOut = [...assetsOut, ...picksOut].slice(0, 3).join(", ");
                  return (
                    <div key={t.trade_id} style={{
                      padding: "5px 8px", borderRadius: 4,
                      borderBottom: `1px solid ${C.white08}`,
                      display: "flex", alignItems: "center", gap: 8,
                      cursor: "pointer", transition: "background 0.12s ease",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      {/* Date */}
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flexShrink: 0, minWidth: 50 }}>
                        {t.date ? t.date.slice(5, 10) : "—"}
                      </span>
                      {/* vs */}
                      <span style={{ fontSize: 12, fontWeight: 500, color: C.secondary, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>
                        vs {counterParty ?? t.counter_party}
                      </span>
                      {/* Assets */}
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.dim, flexWrap: "wrap" }}>
                          {allIn && (
                            <span style={{ color: C.green, fontFamily: MONO, fontSize: 10 }}>+{allIn}</span>
                          )}
                          {allOut && (
                            <span style={{ color: C.red, fontFamily: MONO, fontSize: 10 }}>-{allOut}</span>
                          )}
                        </div>
                      </div>
                      {/* Verdict */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                        {myLetter && (
                          <span style={{
                            fontFamily: MONO, fontSize: 13, fontWeight: 900,
                            color: gradeColor(myLetter),
                          }}>{myLetter}</span>
                        )}
                        <span style={{
                          fontFamily: MONO, fontSize: 8, fontWeight: 800,
                          padding: "2px 5px", borderRadius: 3, letterSpacing: "0.06em",
                          color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`,
                        }}>
                          {myVerdict ?? t.verdict ?? "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>No graded trades yet</p>
            )}
          </DCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FULL-WIDTH BELOW BOTH COLUMNS
          ══════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

        {/* Season Trajectory LineChart */}
        <DCard label="SEASON TRAJECTORY">
          {trajectoryData.length > 1 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trajectoryData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="season" tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                  <YAxis
                    reversed
                    domain={[1, totalTeams]}
                    tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }}
                    axisLine={false} tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ padding: "6px 10px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                          <p style={{ fontFamily: MONO, fontSize: 11, color: C.gold, marginBottom: 3 }}>{label}</p>
                          {payload.map((entry: any) => (
                            <p key={entry.dataKey} style={{ fontFamily: MONO, fontSize: 10, color: entry.dataKey === "finish" ? C.gold : C.dim }}>
                              {entry.dataKey === "finish" ? "Finish" : "PPG Rank"}: {entry.value != null ? ordinal(entry.value) : "—"}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone" dataKey="finish" stroke={C.gold} strokeWidth={2.5}
                    dot={(props: any) => {
                      const d = trajectoryData[props.index];
                      if (!d) return <circle key={props.key} />;
                      if (d.isChamp) {
                        return (
                          <text key={props.key} x={props.cx} y={props.cy + 4} textAnchor="middle" fontSize={14}>⭐</text>
                        );
                      }
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={C.gold} stroke={C.panel} strokeWidth={1.5} />;
                    }}
                    activeDot={{ r: 4, fill: C.goldBright }}
                    connectNulls
                  />
                  {trajectoryData.some((d: any) => d.ppgRank != null) && (
                    <Line
                      type="monotone" dataKey="ppgRank" stroke={C.dim} strokeWidth={1.5}
                      strokeDasharray="4 3" dot={false} connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: C.gold }}>
                  <span style={{ width: 18, height: 2, background: C.gold, display: "inline-block", borderRadius: 1 }} />
                  Finish
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: C.dim }}>
                  <span style={{ width: 18, height: 2, background: C.dim, display: "inline-block", borderRadius: 1, opacity: 0.5 }} />
                  PPG Rank
                </span>
              </div>
            </>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Skel h={140} />
            </div>
          )}
        </DCard>

        {/* Dynasty vs Win-Now Scatter */}
        <DCard label="DYNASTY vs WIN-NOW">
          {scatterAll.length > 0 ? (
            <ResponsiveContainer width="100%" height={204}>
              <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis
                  type="number" dataKey="x" name="Dynasty Rank"
                  domain={[1, totalTeams + 1]}
                  reversed
                  tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
                  axisLine={false} tickLine={false}
                  label={{ value: "Dynasty →", position: "insideBottomRight", offset: -4, fill: C.dim, fontSize: 9, fontFamily: MONO }}
                />
                <YAxis
                  type="number" dataKey="y" name="Win-Now Rank"
                  domain={[1, totalTeams + 1]}
                  reversed
                  tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
                  axisLine={false} tickLine={false}
                  width={28}
                  label={{ value: "Win-Now →", angle: -90, position: "insideLeft", offset: 8, fill: C.dim, fontSize: 9, fontFamily: MONO }}
                />
                <Tooltip
                  contentStyle={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: MONO, fontSize: 11 }}
                  itemStyle={{ color: C.primary }}
                  cursor={{ strokeDasharray: "3 3", stroke: C.borderLt }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ padding: "6px 10px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                        <p style={{ fontFamily: MONO, fontSize: 11, color: d.isMe ? C.gold : C.primary, fontWeight: d.isMe ? 700 : 400 }}>{d.owner}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Dynasty #{d.x} · Win-Now #{d.y}</p>
                      </div>
                    );
                  }}
                />
                {/* Midpoint reference lines for quadrant split */}
                <ReferenceLine x={(totalTeams + 1) / 2} stroke={C.borderLt} strokeDasharray="4 3" />
                <ReferenceLine y={(totalTeams + 1) / 2} stroke={C.borderLt} strokeDasharray="4 3" />

                {/* Other teams */}
                <Scatter
                  data={scatterAll.filter((d: any) => !d.isMe)}
                  fill="rgba(176,178,200,0.25)"
                  shape={(props: any) => {
                    const d = props as any;
                    return (
                      <g>
                        <circle cx={d.cx} cy={d.cy} r={5} fill="rgba(176,178,200,0.20)" stroke={C.borderLt} strokeWidth={1} />
                        <text x={d.cx + 7} y={d.cy + 3} fill={C.dim} fontSize={8} fontFamily={MONO}>{d.owner?.split(" ")[0]}</text>
                      </g>
                    );
                  }}
                />
                {/* My team */}
                <Scatter
                  data={scatterAll.filter((d: any) => d.isMe)}
                  fill={C.gold}
                  shape={(props: any) => {
                    const d = props as any;
                    return (
                      <g>
                        <circle cx={d.cx} cy={d.cy} r={7} fill={C.gold} stroke={C.goldBright} strokeWidth={1.5} />
                        <text x={d.cx + 10} y={d.cy + 4} fill={C.gold} fontSize={10} fontFamily={MONO} fontWeight={700}>{d.owner?.split(" ")[0]}</text>
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 204, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Skel h={160} />
            </div>
          )}
          {/* Quadrant labels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
            {[
              { label: "WIN NOW", color: C.green, desc: "top-left" },
              { label: "CONTENDER", color: C.gold, desc: "top-right" },
              { label: "REBUILDER", color: C.red, desc: "bottom-left" },
              { label: "FUTURE", color: C.blue, desc: "bottom-right" },
            ].map((q) => (
              <span key={q.label} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: `${q.color}90`, letterSpacing: "0.08em", textAlign: q.desc.includes("right") ? "right" : "left" }}>
                {q.label}
              </span>
            ))}
          </div>
        </DCard>
      </div>
    </div>
  );
}

export default DashboardView;
