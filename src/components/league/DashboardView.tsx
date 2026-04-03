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
  getDynastyScore, getAllDynastyScores, getOwners, getRosterValueChange,
} from "@/lib/api";
import type { DynastyScoreResponse } from "@/lib/api";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  LineChart, Line,
} from "recharts";
import type { RosterPlayer, GradedTrade } from "@/lib/types";
import PlayerName from "@/components/league/PlayerName";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import { ChevronRight, Plus, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import DashboardMobile from "@/components/league/DashboardMobile";

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
  const totalTrades = items.reduce((s: number, i: any) => s + (i.recent_trades || 0), 0);
  const SANS = "-apple-system, 'Inter', system-ui, sans-serif";

  if (loading) {
    return (
      <DCard label="Real trades · your players" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, animation: "pulse 1.5s ease infinite" }}>Scanning matching leagues...</span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={36} />)}
        </div>
      </DCard>
    );
  }

  if (!items.length) {
    return (
      <DCard label="Real trades · your players" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>No recent activity</span>}>
        <p style={{ fontFamily: SANS, fontSize: 12, color: C.dim, padding: 8 }}>No recent market activity for your roster in matching formats.</p>
      </DCard>
    );
  }

  return (
    <DCard label="Real trades · your players" right={
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>
        {feed?.players_with_activity || 0} players · {feed?.format || ""} · last {feed?.days || 90} days
      </span>
    }>
      {/* Subtitle — credibility line */}
      <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "0 8px 6px", borderBottom: `1px solid ${C.white08}`, marginBottom: 4 }}>
        {totalTrades} trades across matching leagues
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.slice(0, 8).map((item: any) => {
          const isExpanded = expanded === item.player;
          const pc = POS[item.position] || C.dim;
          const mostRecent = item.trades?.[0]?.days_ago;
          return (
            <div key={item.player}>
              <div
                onClick={() => setExpanded(isExpanded ? null : item.player)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  borderRadius: 4, cursor: "pointer", transition: "background 0.12s",
                  borderLeft: `3px solid ${pc}`,
                  background: isExpanded ? C.elevated : "transparent",
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = C.white08; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: pc, width: 22 }}>{item.position}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.player}
                  </span>
                  {mostRecent != null && <span style={{ fontFamily: SANS, fontSize: 10, color: C.dim }}>Last traded {mostRecent} days ago</span>}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{item.pos_rank || ""}</span>
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                  color: item.recent_trades >= 5 ? C.green : item.recent_trades >= 3 ? C.gold : C.secondary,
                  background: item.recent_trades >= 5 ? "rgba(125,211,160,0.12)" : item.recent_trades >= 3 ? C.goldDim : C.white08,
                }}>
                  {item.recent_trades} trades
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>▸</span>
              </div>

              {isExpanded && (
                <div style={{ marginLeft: 33, padding: "4px 0 8px", borderLeft: `1px solid ${C.border}`, marginBottom: 4 }}>
                  {(item.trades || []).slice(0, 4).map((t: any, j: number) => {
                    const fmtA = (assets: any[]) => (assets || []).slice(0, 3).map((a: any) => {
                      if (typeof a === "string") return a;
                      const name = (a.name || "").replace(/\s*\([^)]*\)/g, "");
                      const rank = a.pos_rank ? ` (${a.pos_rank})` : "";
                      return `${name}${rank}`;
                    }).join(", ");
                    const fmtLabel = (t.format || "").replace(/NoneT\s*/i, "").replace(/^(\d+)T/, "$1-team ·").replace("SF", "SF ·").trim() || "Unknown format";
                    const tierTag = t.match_tier && t.match_tier > 1
                      ? t.match_tier === 2 ? "similar format" : t.match_tier === 3 ? "similar size" : "broader match"
                      : null;
                    return (
                      <div key={j} style={{ padding: "4px 12px", borderBottom: `1px solid ${C.white08}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{t.days_ago} days ago</span>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>{fmtLabel}</span>
                          {tierTag && <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim, fontStyle: "italic" }}>{tierTag}</span>}
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: t.was_sold ? C.red : C.green }}>{t.was_sold ? "SOLD" : "ACQUIRED"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontFamily: SANS, fontSize: 11 }}>
                          <span style={{ color: `${C.red}cc` }}>Gave</span>
                          <span style={{ color: C.secondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtA(t.gave)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontFamily: SANS, fontSize: 11 }}>
                          <span style={{ color: `${C.green}cc` }}>Got&nbsp;</span>
                          <span style={{ color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtA(t.got)}</span>
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

      {/* Credibility footer */}
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, padding: "8px 8px 2px", borderTop: `1px solid ${C.white08}`, textAlign: "center", letterSpacing: "0.04em" }}>
        Powered by 1,039,859 real dynasty trades
      </div>
    </DCard>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DYNASTY SCORE CARD
   ═══════════════════════════════════════════════════════════════ */
const TIER_COLORS: Record<string, string> = {
  "Elite Manager": "#7dd3a0",
  "Sharp": "#6bb8e0",
  "Solid": C.gold,
  "Average": C.primary,
  "Needs Work": "#e09c6b",
  "Taco": "#e47272",
};

const COMPONENT_LABELS: Record<string, string> = {
  trade_win_rate: "Trade Win Rate",
  value_extraction: "Value Extraction",
  roster_construction: "Roster Construction",
  draft_capital: "Draft Capital",
  behavioral_intelligence: "Behavioral IQ",
  activity: "Activity",
};

function DynastyScoreCard({ lid, owner, ownerId }: { lid: string; owner: string; ownerId?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const { data: myScore, isLoading: loadingScore, isError: errorScore } = useQuery({
    queryKey: ["dynasty-score", lid, owner],
    queryFn: () => getDynastyScore(lid, owner, ownerId),
    enabled: !!lid && !!owner,
    staleTime: 1800000,
  });

  const { data: overview } = useQuery({
    queryKey: ["overview", lid],
    queryFn: () => getOverview(lid),
    enabled: !!lid,
    staleTime: 3600000,
  });
  const leagueName = overview?.name || "";

  const { data: allScores, isLoading: loadingAll, isError: errorAll } = useQuery({
    queryKey: ["dynasty-scores-all", lid],
    queryFn: async () => {
      const data = await getAllDynastyScores(lid);
      return data.scores;
    },
    enabled: !!lid,
    staleTime: 1800000,
  });

  // Don't render if error
  if (errorScore && errorAll) return null;
  if (!loadingScore && !myScore) return null;

  // Compute league rank — try exact match, then normalize quotes/whitespace
  const leagueRank = allScores
    ? (() => {
        const ol = owner.toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").trim();
        const idx = allScores.findIndex((s) => {
          const sl = s.owner.toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").trim();
          return sl === ol;
        });
        return idx >= 0 ? idx + 1 : null;
      })()
    : null;

  // Compute global stats from percentile
  const percentile = myScore?.percentile;
  const topPct = percentile != null ? Math.max(1, 100 - percentile) : null;
  // Rough global population estimate
  const globalManagers = percentile != null ? Math.round(myScore!.score > 0 ? 92847 : 0) : null;
  const globalRank = topPct != null && globalManagers ? Math.max(1, Math.round((topPct / 100) * globalManagers)) : null;

  const tierColor = myScore ? (TIER_COLORS[myScore.tier.label] || C.dim) : C.dim;

  if (loadingScore) {
    return (
      <div className="w-full" style={{ order: -1 }}>
        <div style={{
          borderRadius: 6, overflow: "hidden", background: C.card,
          borderTop: `2px solid ${C.goldDark}`,
          borderRight: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          borderLeft: `1px solid ${C.border}`,
        }}>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <Skel h={24} w="40%" />
            <div style={{ display: "flex", gap: 24 }}>
              <Skel h={48} w="30%" />
              <Skel h={48} w="30%" />
            </div>
            <Skel h={16} w="60%" />
            <Skel h={14} w="80%" />
            <Skel h={14} w="70%" />
          </div>
        </div>
      </div>
    );
  }

  if (!myScore) return null;

  const bullets = (myScore.bullets || []).slice(0, 3);

  return (
    <div className="w-full" style={{ order: -1 }}>
      <div style={{
        borderRadius: 8, overflow: "hidden",
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, transparent 50%), ${C.card}`,
        borderTop: `2px solid ${C.goldDark}`,
        borderRight: `1px solid ${C.goldBorder}`,
        borderBottom: `1px solid ${C.goldBorder}`,
        borderLeft: `1px solid ${C.goldBorder}`,
      }}>
        {/* Header: DYNASTYGPT MANAGER RANKS */}
        <div style={{
          padding: "5px 12px", borderBottom: `1px solid ${C.border}`,
          background: C.goldDim, textAlign: "center",
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", color: C.gold }}>
            DYNASTYGPT MANAGER RANKS
          </span>
        </div>

        {/* Score body */}
        <div style={{ padding: "10px 14px 8px" }}>
          {/* Left: league rank — Right: global rank */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            {/* Left side */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: C.gold, lineHeight: 1 }}>
                #{leagueRank || "—"}
              </span>
              <span style={{ fontFamily: DISPLAY, fontSize: 14, letterSpacing: "-0.3px", background: `linear-gradient(180deg, ${C.goldBright}, ${C.gold}, ${C.goldDark})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {leagueName || "League"}
              </span>
            </div>
            {/* Right side */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: C.gold, lineHeight: 1 }}>
                #{globalRank?.toLocaleString() || "—"}
              </span>
              <span style={{ fontFamily: DISPLAY, fontSize: 14, letterSpacing: "-0.3px", background: `linear-gradient(180deg, ${C.goldBright}, ${C.gold}, ${C.goldDark})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                DynastyGPT
              </span>
              <span style={{ color: C.dim, fontSize: 11 }}>·</span>
              <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.secondary }}>
                Top {topPct ?? "—"}% of {globalManagers?.toLocaleString() ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* CTA to expand full scouting card */}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", userSelect: "none",
            padding: "8px 12px", margin: "0 12px 10px",
            borderRadius: 6, transition: "all 0.2s",
            background: expanded ? "transparent" : `linear-gradient(135deg, ${C.goldDark}, ${C.gold}20)`,
            border: `1px solid ${expanded ? C.goldBorder : C.gold}40`,
          }}
        >
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em",
            color: C.gold,
            textShadow: expanded ? "none" : `0 0 12px ${C.gold}50`,
          }}>
            {expanded ? "HIDE REPORT ▴" : "TAP TO SEE YOUR DYNASTYGPT CARD ▾"}
          </span>
        </div>

          {/* Expanded content — compact, fits one screen */}
          {expanded && (() => {
            // Parse record stats from component details (no regex — simple string parsing)
            const comps = myScore.components as Record<string, { score: number; max: number; detail: string }>;
            const wr = comps.winning_record?.detail || "";
            const cp = comps.championship_pedigree?.detail || "";
            // "35-35 career (50.0%), 2/6 winning seasons"
            const wrParts = wr.split(" career");
            const wrRecord = wrParts[0] || "—";
            const wrPctStart = wr.indexOf("(");
            const wrPctEnd = wr.indexOf("%)");
            const winPctNum = wrPctStart >= 0 && wrPctEnd > wrPctStart ? wr.slice(wrPctStart + 1, wrPctEnd) : "—";
            const wrDash = wrRecord.indexOf("-");
            const wins = wrDash > 0 ? wrRecord.slice(0, wrDash) : "—";
            const losses = wrDash > 0 ? wrRecord.slice(wrDash + 1) : "—";
            // "2x champion, 2/6 playoff appearances"
            const cpX = cp.indexOf("x ");
            const titles = cpX > 0 ? cp.slice(0, cpX) : "0";
            const cpSlash = cp.indexOf("/");
            const cpSpace = cp.indexOf(" playoff");
            const playoffApps = cpSlash > 0 && cpSpace > cpSlash ? cp.slice(cpSlash - 1, cpSpace) : "—";

            return (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px 10px" }}>

                {/* TITLES — full width hero pill, gold glow, centered */}
                <div style={{
                  textAlign: "center", padding: "10px 0", marginBottom: 8, borderRadius: 8,
                  background: `linear-gradient(135deg, rgba(139,105,20,0.15), rgba(212,165,50,0.10))`,
                  border: `1.5px solid ${C.goldBorder}`,
                  boxShadow: `0 0 20px rgba(212,165,50,0.08), inset 0 0 30px rgba(212,165,50,0.04)`,
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: C.dim, marginBottom: 2 }}>CHAMPIONSHIPS</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 900, color: C.gold, lineHeight: 1 }}>
                    {parseInt(titles) > 0 ? `${titles}x CHAMPION` : "0 TITLES"}
                  </div>
                </div>

                {/* RECORD / PLAYOFFS / WIN% — 3 boxes in a row */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[
                    { val: `${wins}-${losses}`, label: "RECORD" },
                    { val: playoffApps, label: "PLAYOFFS" },
                    { val: `${winPctNum}%`, label: "WIN%" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 6,
                      background: C.elevated, border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: C.dim, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Component bars — tight */}
                <div style={{ marginBottom: 8 }}>
                  {Object.entries(myScore.components).map(([key, comp]) => {
                    const pct = comp.max > 0 ? (comp.score / comp.max) * 100 : 0;
                    const label = COMPONENT_LABELS[key] || key;
                    const barColor = pct >= 75 ? C.green : pct >= 50 ? C.gold : pct >= 30 ? C.orange : C.red;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: C.dim, width: 80, textAlign: "right", flexShrink: 0 }}>{label}</span>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: C.elevated, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: barColor }} />
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.secondary, width: 28, textAlign: "right", flexShrink: 0 }}>{comp.score}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Insight */}
                {bullets.length > 0 && (
                  <div style={{ fontFamily: SANS, fontSize: 10, color: C.gold, textAlign: "center", marginBottom: 8 }}>
                    {bullets.map((b) => b.text).join(" · ")}
                  </div>
                )}

                {/* SHARE FOR BRAGGING RIGHTS button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                    window.dispatchEvent(new CustomEvent("open-manager-card"));
                  }}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                    fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    color: C.bg, cursor: "pointer", textAlign: "center",
                  }}
                >
                  SHARE FOR BRAGGING RIGHTS ↗
                </button>

                {/* League leaderboard — compact */}
                {allScores && allScores.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 4 }}>
                      LEAGUE LEADERBOARD
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {allScores.map((s, idx) => {
                        const isMe = s.owner.toLowerCase() === owner.toLowerCase();
                        const sTierColor = TIER_COLORS[s.tier.label] || C.dim;
                        return (
                          <div key={s.owner} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "3px 6px", borderRadius: 3,
                            background: isMe ? C.goldDim : "transparent",
                            borderBottom: `1px solid ${C.white08}`,
                          }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: isMe ? C.gold : C.dim, minWidth: 18, textAlign: "right" }}>{idx + 1}</span>
                            <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: isMe ? 700 : 400, color: isMe ? C.gold : C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.owner}</span>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.secondary }}>{s.score}</span>
                            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 2, color: sTierColor, background: `${sTierColor}15`, textTransform: "uppercase" }}>{s.tier.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {loadingAll && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={20} />)}
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ lid, owner, ownerId }: { lid: string; owner: string; ownerId?: string | null }) {
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const router = useRouter();
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const { currentLeagueSlug } = useLeagueStore();

  const { data: roster, isLoading: loadingRoster } = useQuery({ queryKey: ["roster", lid, owner], queryFn: () => getRoster(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: picks } = useQuery({ queryKey: ["picks", lid, owner], queryFn: () => getPicks(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: trending } = useQuery({ queryKey: ["trending-owner", lid, owner], queryFn: () => getOwnerTrending(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: rosterValueChange } = useQuery({ queryKey: ["roster-value-change", lid, owner], queryFn: () => getRosterValueChange(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, owner], queryFn: () => getOwnerNeeds(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, owner], queryFn: () => getGradedTradesByOwner(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: partners } = useQuery({ queryKey: ["partners", lid, owner], queryFn: () => getTradePartners(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, owner], queryFn: () => getOwnerRecord(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, owner], queryFn: () => getChampionships(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid), enabled: !!lid });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid), enabled: !!lid, staleTime: 600000 });
  // ── New queries for enhanced dashboard ──
  const { data: tendencies } = useQuery({ queryKey: ["tendencies", lid, owner], queryFn: () => getOwnerTendencies(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 600000 });
  const { data: franchiseIntel } = useQuery({ queryKey: ["franchise-intel", lid, owner], queryFn: () => getFranchiseIntel(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 600000 });
  const { data: marketFeed, isLoading: loadingMarket } = useQuery({ queryKey: ["market-feed", lid, owner], queryFn: () => getMarketFeed(lid, owner, ownerId, 120), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: coachesCorner } = useQuery({ queryKey: ["coaches-corner", lid, owner], queryFn: () => getCoachesCorner(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 600000 });

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
  const wins = graded?.wins || 0, losses = graded?.losses || 0, even = graded?.even || 0;
  const donut = [
    { name: "W", value: wins, color: C.green },
    { name: "L", value: losses, color: C.red },
    { name: "E", value: even, color: "#4a4d5e" },
  ].filter((d) => d.value > 0);

  function tierBadge(rank: number | undefined) {
    if (!rank) return { label: "—", bg: C.elevated, color: C.dim };
    if (rank <= 3) return { label: "TOP DOG", bg: "rgba(125,211,160,0.15)", color: C.green };
    if (rank <= 6) return { label: "CONTENDER", bg: C.goldDim, color: C.gold };
    if (rank <= 9) return { label: "FEISTY", bg: "rgba(224,156,107,0.12)", color: C.orange };
    return { label: "BASEMENT", bg: "rgba(228,114,114,0.12)", color: C.red };
  }
  const tier = tierBadge(myRank?.rank);

  // Most recent season with actual games played
  const seasons: any[] = (record as any)?.seasons || [];
  const currentYear = new Date().getFullYear();
  const currentSeason = seasons.find((s: any) => Number(s.season) === currentYear && (s.wins > 0 || s.losses > 0));
  const lastPlayed = [...seasons].reverse().find((s: any) => s.wins > 0 || s.losses > 0);
  const latestSeason = currentSeason || lastPlayed || null;
  const isOffseason = !currentSeason && lastPlayed && Number(lastPlayed.season) < currentYear;
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
  // Use season_finishes for finish position, fall back to computing from W-L if missing
  const trajectoryData = seasons
    .filter((s: any) => Number(s.season) < 2026 && (s.wins > 0 || s.losses > 0))
    .map((s: any) => {
      const sf = seasonFinishes.find((f: any) => String(f.season) === String(s.season));
      const champYear = (champs?.championship_years || []).includes(String(s.season));
      // Use explicit finish if available, otherwise estimate from W-L
      // (lower wins = higher finish number = worse)
      const finish = sf?.finish ?? null;
      return {
        season: String(s.season),
        finish,
        wins: s.wins,
        isChamp: champYear,
        ppgRank: null as number | null,
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
          FULL WIDTH TOP: STATS TICKER
          ══════════════════════════════════════════════════════════ */}
      <div className="mobile-col" style={{
        display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap",
        padding: "7px 14px", borderRadius: 6, background: C.panel,
        border: `1px solid ${C.border}`, justifyContent: "center",
      }}>
        {/* Tier badge */}
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em",
          padding: "3px 10px", borderRadius: 4,
          background: tier.bg, color: tier.color,
          border: `1px solid ${tier.color}40`,
        }}>{tier.label}</span>

        {/* Divider */}
        <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />

        {/* Season record */}
        {isOffseason ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold, letterSpacing: "0.06em" }}>{currentYear} OFFSEASON</span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        ) : latestSeason ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>{latestSeason.season}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>
                {latestSeason.wins}W-{latestSeason.losses}L
                {latestFinish && <span style={{ color: C.dim }}> ({ordinal(latestFinish.finish)})</span>}
              </span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        ) : null}

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
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* Playoffs */}
        {champs && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>PLAYOFFS</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>
                {champs.playoff_appearances}/{record?.seasons_played ?? "—"}
              </span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
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
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {myRank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>OVERALL</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold }}>#{myRank.rank}</span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}
        {myIntel?.dynasty_rank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>DYNASTY</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.blue }}>#{myIntel.dynasty_rank}</span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}
        {myIntel?.win_now_rank && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>WIN-NOW</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.green }}>#{myIntel.win_now_rank}</span>
            </div>
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
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
            <div className="hidden sm:block" style={{ width: 1, height: 16, background: C.borderLt, margin: "0 12px" }} />
          </>
        )}

        {/* Roster value change — format-adjusted, 30d */}
        {rosterValueChange && rosterValueChange.delta !== 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>ROSTER VALUE</span>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              color: rosterValueChange.delta > 0 ? C.green : C.red,
            }}>
              {rosterValueChange.delta > 0 ? "▲" : "▼"} {fmt(Math.abs(rosterValueChange.delta))}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>({rosterValueChange.window_days}d)</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW: MANAGER RANKS (left) + ACTION BOXES (right) — same height
          ══════════════════════════════════════════════════════════ */}
      <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "55fr 45fr", gap: 10, alignItems: "stretch" }}>
        <DynastyScoreCard lid={lid} owner={owner} ownerId={ownerId} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "stretch" }}>
          {/* BUILD TRADE */}
          <div
            onClick={() => router.push(`/l/${currentLeagueSlug}/trades`)}
            className="cursor-pointer transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: `linear-gradient(135deg, ${C.card} 0%, rgba(212,165,50,0.08) 100%)`,
              border: `1px solid ${C.goldBorder}`,
              borderTop: `2px solid ${C.gold}`,
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              boxShadow: `0 4px 24px rgba(212,165,50,0.08), inset 0 1px 0 rgba(212,165,50,0.10)`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.10em", textAlign: "center" }}>BUILD TRADE</span>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim, textAlign: "center", lineHeight: 1.3 }}>Find your next move</span>
          </div>
          {/* FRANCHISE HEALTH */}
          <div
            onClick={() => router.push(`/l/${currentLeagueSlug}/intel`)}
            className="cursor-pointer transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: `linear-gradient(135deg, ${C.card} 0%, rgba(107,184,224,0.06) 100%)`,
              border: `1px solid rgba(107,184,224,0.20)`,
              borderTop: `2px solid ${C.blue}`,
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              boxShadow: `0 4px 24px rgba(107,184,224,0.06), inset 0 1px 0 rgba(107,184,224,0.08)`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.blue, letterSpacing: "0.10em", textAlign: "center" }}>FRANCHISE HEALTH</span>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim, textAlign: "center", lineHeight: 1.3 }}>Know where your franchise stands</span>
          </div>
          {/* SCOUTING REPORTS */}
          <div
            onClick={() => router.push(`/l/${currentLeagueSlug}/rankings`)}
            className="cursor-pointer transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: `linear-gradient(135deg, ${C.card} 0%, rgba(125,211,160,0.06) 100%)`,
              border: `1px solid rgba(125,211,160,0.20)`,
              borderTop: `2px solid ${C.green}`,
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              boxShadow: `0 4px 24px rgba(125,211,160,0.06), inset 0 1px 0 rgba(125,211,160,0.08)`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: "0.10em", textAlign: "center" }}>SCOUTING REPORTS</span>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim, textAlign: "center", lineHeight: 1.3 }}>Know your league before you trade</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TWO COLUMNS: LEFT 55% / RIGHT 45%
          ══════════════════════════════════════════════════════════ */}
      <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "55fr 45fr", gap: 10 }}>

        {/* ──────────────────────────────────────────────────────
            LEFT COLUMN — Roster
            ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                <div className="max-sm:!grid-cols-[1.8fr_0.6fr_0.55fr]" style={{
                  display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.55fr 0.45fr 0.45fr",
                  padding: "0 8px 5px", marginBottom: 2,
                }}>
                  {["PLAYER", "VALUE", "POS RK", "30D", "TRADE MKT"].map((h) => (
                    <span key={h} className={h === "30D" || h === "TRADE MKT" ? "hidden sm:block" : ""} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: C.dim, textAlign: h === "PLAYER" ? "left" : "center" }}>{h}</span>
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
                        const mkt = p.mkt_vs_pct;
                        const mktColor = mkt == null ? C.dim : mkt > 0 ? C.green : mkt < 0 ? C.red : C.dim;
                        const mktLabel = mkt == null ? "—" : `${mkt > 0 ? "+" : ""}${Math.round(mkt)}%`;
                        const isHovered = hoveredPlayer === `${pos}-${idx}`;
                        return (
                          <div key={p.name_clean} className="max-sm:!grid-cols-[1.8fr_0.6fr_0.55fr]" style={{
                            display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.55fr 0.45fr 0.45fr",
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
                            <span className="hidden sm:block" style={{ fontFamily: MONO, fontSize: 10, textAlign: "center", alignSelf: "center", color: trendColor, fontWeight: t30?.delta ? 700 : 400 }}>
                              {trendVal}
                            </span>
                            <span className="hidden sm:block" onClick={(e) => { e.stopPropagation(); if (mkt != null) openPlayerCard(p.name, "market"); }} style={{ fontFamily: MONO, fontSize: 10, textAlign: "center", alignSelf: "center", color: mktColor, fontWeight: mkt != null ? 700 : 400, cursor: mkt != null ? "pointer" : "default", borderRadius: 3, padding: "1px 3px", transition: "background 0.12s" }} onMouseEnter={(e) => { if (mkt != null) (e.currentTarget as HTMLElement).style.background = `${mktColor}15`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              {mktLabel}
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
                            {pk.slot_label ? `${year} ${pk.slot_label}` : `${year} R${pk.round}`}
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
        </div>

        {/* ──────────────────────────────────────────────────────
            RIGHT COLUMN — Actions, Your Move, Radar, Market, Trades
            ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ROW 1: YOUR MOVE + POSITIONAL RADAR */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* YOUR MOVE — vertical compact pills */}
            {(() => {
              const cc = coachesCorner as Record<string, unknown> | undefined;
              const setIntent = useTradeBuilderStore.getState().setIntent;

              const rows: Array<{ tag: "sell high" | "buy low" | "upgrade"; name: string; context: string; playerName?: string }> = [];

              const moveNow = ((cc?.move_now || []) as Array<Record<string, unknown>>);
              const sellHigh = ((cc?.sell_high || []) as Array<Record<string, unknown>>);
              const buyLow = ((cc?.buy_low || []) as Array<Record<string, unknown>>);

              const bp = (roster as any)?.by_position || {};
              const ownedSet = new Set<string>();
              for (const pos of ["QB", "RB", "WR", "TE"]) {
                for (const p of (bp[pos] || [])) ownedSet.add(String(p.name || "").toLowerCase().trim());
              }
              const safeBuyLow = buyLow.filter(t => !ownedSet.has(String(t.name || t.player || "").toLowerCase().trim()));

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

              const usedNames = new Set(rows.map(r => r.name.toLowerCase()));
              const myIntelData = leagueIntel?.owners?.find((o: any) =>
                o.owner.toLowerCase() === owner.toLowerCase() || o.owner.toLowerCase().replace(/\s*\(#\d+\)/, "") === owner.toLowerCase());
              const criticalNeeds = (myIntelData?.positional_needs || []) as string[];
              if (criticalNeeds.length > 0 && rows.length < 3) {
                const pos = criticalNeeds[0];
                const pg = myIntelData?.positional_grades?.[pos] || "WEAK";
                if (pg === "CRITICAL" || pg === "WEAK") {
                  const sellCandidate = sellHigh.find((s) =>
                    String(s.action) === "SELL"
                    && String(s.position) !== pos
                    && !usedNames.has(String(s.name || "").toLowerCase())
                  );
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

              if (rows.length < 3) {
                for (const target of safeBuyLow.slice(0, 1)) {
                  const name = String(target.name || target.player || "");
                  const pos = String(target.position || "");
                  const age = target.age ? String(target.age) : "";
                  const trend = String(target.trend || "");
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

              const glowMap = {
                "sell high": { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.20)", shadow: "0 0 20px rgba(239,68,68,0.08)", label: "#ef4444" },
                "buy low": { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.20)", shadow: "0 0 20px rgba(34,197,94,0.08)", label: "#22c55e" },
                "upgrade": { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.20)", shadow: "0 0 20px rgba(245,158,11,0.08)", label: "#f59e0b" },
              };

              const handleClick = (r: typeof rows[0]) => {
                if (r.playerName) {
                  if (r.tag === "sell high") setIntent({ type: "sell", value: r.playerName });
                  else if (r.tag === "buy low") setIntent({ type: "buy", value: r.playerName });
                  else { const pos = r.name.split(" ")[0]; setIntent({ type: "position", value: pos }); }
                } else if (r.tag === "upgrade") {
                  setIntent({ type: "position", value: r.name.split(" ")[0] });
                }
                router.push(`/l/${currentLeagueSlug}/trades`);
              };

              return (
                <DCard label="YOUR MOVE">
                  {rows.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {rows.slice(0, 4).map((r, i) => {
                        const g = glowMap[r.tag];
                        return (
                          <div
                            key={i}
                            onClick={() => handleClick(r)}
                            className="cursor-pointer transition-all duration-150 hover:scale-[1.01]"
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 10px", borderRadius: 6,
                              background: g.bg, border: `1px solid ${g.border}`,
                              borderLeft: `3px solid ${g.label}`,
                            }}
                          >
                            <span style={{
                              fontFamily: MONO, fontSize: 8, fontWeight: 900, letterSpacing: "0.10em",
                              color: g.label, padding: "2px 6px", borderRadius: 3,
                              background: `${g.label}15`, flexShrink: 0,
                            }}>
                              {r.tag.toUpperCase()}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.primary, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.name}
                              </div>
                              <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, lineHeight: 1.2, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.context}
                              </div>
                            </div>
                            <ChevronRight size={12} style={{ color: C.dim, flexShrink: 0, opacity: 0.5 }} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontFamily: MONO, fontSize: 11, color: C.dim, padding: 4 }}>No moves right now</p>
                  )}
                </DCard>
              );
            })()}

            {/* POSITIONAL RADAR */}
            <DCard label="POSITIONAL RADAR">
              {radarData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="position" tick={(props: any) => {
                        const d = radarData.find((r: any) => r.position === props.payload.value);
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
              ) : <Skel h={200} />}
            </DCard>
          </div>

          {/* ROW 3: REAL TRADES · YOUR PLAYERS — hero section, most vertical space */}
          <MarketIntelSection feed={marketFeed as any} loading={loadingMarket} />

          {/* ROW 4: RECENT TRADES */}
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
          FULL WIDTH BOTTOM: Two charts side by side 50/50
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
                    reversed={trajectoryData.some((d: any) => d.finish != null)}
                    domain={trajectoryData.some((d: any) => d.finish != null) ? [1, totalTeams] : ["auto", "auto"]}
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
                    type="monotone"
                    dataKey={trajectoryData.some((d: any) => d.finish != null) ? "finish" : "wins"}
                    stroke={C.gold} strokeWidth={2.5}
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
                  {trajectoryData.some((d: any) => d.finish != null) ? "Finish" : "Wins"}
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
              <ScatterChart margin={{ top: 16, right: 60, bottom: 16, left: 0 }}>
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

function DashboardViewRouter({ lid, owner, ownerId }: { lid: string; owner: string; ownerId?: string | null }) {
  const isMobile = useIsMobile();
  if (isMobile) return <DashboardMobile lid={lid} owner={owner} ownerId={ownerId} />;
  return <DashboardView lid={lid} owner={owner} ownerId={ownerId} />;
}

export default DashboardViewRouter;
