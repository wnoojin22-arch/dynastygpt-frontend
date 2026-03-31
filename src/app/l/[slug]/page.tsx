"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getRankings, getRecentTrades, getTrending, getOwnerProfiles, getOverview, getLeagueIntel, getReportCard } from "@/lib/api";
import { PowerRankings, RecentTrades } from "@/components/league";
import { leaguePrefix } from "@/components/league/tokens";
import PlayerName from "@/components/league/PlayerName";
import type { LeagueReportCardResponse, TrendingPlayer, GradedTrade, RankingEntry } from "@/lib/types";

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
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function posColor(pos: string) {
  return pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : pos === "TE" ? "#e09c6b" : C.dim;
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEAD
   ═══════════════════════════════════════════════════════════════ */
function SectionHead({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: C.primary, fontFamily: SANS }}>{title}</span>
      {badge && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{badge}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI INSIGHT STRIP — rotating one-liner, crossfade
   ═══════════════════════════════════════════════════════════════ */
const INSIGHTS = [
  "WacoRides2Glory is riding a 5-game win streak — longest active in the league",
  "Kris Pringle won the 2024 title — back-to-back incoming?",
  "MonkeyEpoxy has the youngest roster in the league — avg age 23.8",
  "#1 and #2 in power rankings separated by less than 3K in value",
  "jpinola just hit 10 wins for the first time since 2022",
  "medianrare hasn't made a trade in 14 months — the quietest GM in the league",
  "85 trades across 7 seasons — DLP Dynasty League is one of the most active in the platform",
  "Silentclock has traded with every owner in the league at least once",
];

function InsightStrip() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % INSIGHTS.length);
        setVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: 36, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 24px", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        opacity: visible ? 1 : 0, transition: "opacity 0.4s ease",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: C.gold, fontFamily: MONO, flexShrink: 0 }}>AI INSIGHT</span>
        <div style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: C.secondary, fontFamily: SANS, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {INSIGHTS[idx]}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROTATING TICKER — cycles categories every 9s with crossfade
   ═══════════════════════════════════════════════════════════════ */
type TickerItem = { badge?: string; badgeColor?: string; text: string; annotation: string; annotationColor: string };
type TickerCat = { label: string; dotColor: string; items: TickerItem[] };

function MarketTicker({ risers, fallers, recentTrades, rankings, reportCard }: {
  risers: TrendingPlayer[];
  fallers: TrendingPlayer[];
  recentTrades?: GradedTrade[];
  rankings?: RankingEntry[];
  reportCard?: LeagueReportCardResponse | null;
}) {
  const categories = useMemo(() => {
    const cats: TickerCat[] = [];

    // MARKET MOVERS — interleaved risers & fallers
    if (risers.length || fallers.length) {
      const items: TickerItem[] = [];
      const maxLen = Math.max(risers.length, fallers.length);
      for (let i = 0; i < maxLen && items.length < 14; i++) {
        if (i < risers.length) items.push({ badge: risers[i].position, badgeColor: posColor(risers[i].position), text: risers[i].player, annotation: `▲ +${fmt(risers[i].sha_delta)}`, annotationColor: C.green });
        if (i < fallers.length && items.length < 14) items.push({ badge: fallers[i].position, badgeColor: posColor(fallers[i].position), text: fallers[i].player, annotation: `▼ ${fmt(fallers[i].sha_delta)}`, annotationColor: C.red });
      }
      cats.push({ label: "MARKET MOVERS", dotColor: C.green, items });
    }

    // TRADE MARKET — who's winning trades, notable activity
    if (reportCard) {
      const items: TickerItem[] = [];
      if (reportCard.biggest_robbery) { const r = reportCard.biggest_robbery; items.push({ text: `${r.winner} fleeced ${r.loser}`, annotation: `got ${r.winner_got.slice(0, 2).join(", ")}`, annotationColor: C.green }); }
      if (reportCard.best_winwin) { const w = reportCard.best_winwin; items.push({ text: `${w.side_a} & ${w.side_b}`, annotation: "best win-win deal", annotationColor: C.gold }); }
      reportCard.quality_leaderboard?.slice(0, 4).forEach(q => items.push({ text: q.owner, annotation: `${Math.round(q.win_pct)}% trade win rate`, annotationColor: q.win_pct >= 60 ? C.green : C.secondary }));
      if (reportCard.most_active_trader) items.push({ text: reportCard.most_active_trader.owner, annotation: `most active — ${reportCard.most_active_trader.trades} trades`, annotationColor: C.gold });
      if (reportCard.blockbusters) items.push({ text: `${reportCard.blockbusters} blockbuster deals`, annotation: "this season", annotationColor: C.gold });
      if (reportCard.panic_trades) items.push({ text: `${reportCard.panic_trades} panic trades`, annotation: "detected", annotationColor: C.red });
      if (items.length) cats.push({ label: "TRADE MARKET", dotColor: C.gold, items });
    }

    // MANAGER RATINGS — power rankings
    if (rankings?.length) {
      const items: TickerItem[] = rankings.slice(0, 12).map(r => ({
        badge: `#${r.rank}`, badgeColor: r.rank <= 3 ? C.green : r.rank <= 6 ? C.gold : r.rank <= 9 ? C.orange : C.red,
        text: r.owner, annotation: fmt(r.total_sha), annotationColor: r.rank <= 3 ? C.green : C.gold,
      }));
      cats.push({ label: "MANAGER RATINGS", dotColor: C.blue, items });
    }

    // RECENT TRADES — deal summaries
    if (recentTrades?.length) {
      const items: TickerItem[] = recentTrades.slice(0, 8).map(t => ({
        text: `${t.owner} → ${t.counter_party}`,
        annotation: `${(t.players_sent || []).slice(0, 2).join(", ") || "picks"} ↔ ${(t.players_received || []).slice(0, 2).join(", ") || "picks"}`,
        annotationColor: C.secondary,
      }));
      cats.push({ label: "RECENT TRADES", dotColor: C.orange, items });
    }

    // DRAFT BOARD — who's stockpiling vs selling picks
    if (reportCard?.pick_movement && reportCard.pick_movement.total_picks_traded > 0) {
      const pm = reportCard.pick_movement;
      const items: TickerItem[] = [{ text: `${pm.total_picks_traded} picks changed hands`, annotation: "this season", annotationColor: C.gold }];
      const buyers = pm.flow_by_owner?.filter(f => f.net_picks > 0).slice(0, 4) || [];
      const sellers = pm.flow_by_owner?.filter(f => f.net_picks < 0).slice(0, 4) || [];
      buyers.forEach(f => items.push({ text: f.owner, annotation: `stockpiling picks (+${f.net_picks} net)`, annotationColor: C.green }));
      sellers.forEach(f => items.push({ text: f.owner, annotation: `selling picks (${f.net_picks} net)`, annotationColor: C.red }));
      if (items.length > 1) cats.push({ label: "DRAFT BOARD", dotColor: "#a78bfa", items });
    }

    // AI INSIGHT — league personality + fun stats
    if (reportCard) {
      const items: TickerItem[] = [];
      if (reportCard.league_personality) items.push({ text: reportCard.league_personality.type, annotation: reportCard.league_personality.description, annotationColor: C.secondary });
      if (reportCard.fun_stat) items.push({ text: "Fun stat", annotation: reportCard.fun_stat, annotationColor: C.gold });
      if (reportCard.activity_summary) items.push({ text: "Season recap", annotation: reportCard.activity_summary, annotationColor: C.secondary });
      if (items.length) cats.push({ label: "AI INSIGHT", dotColor: C.gold, items });
    }

    return cats;
  }, [risers, fallers, recentTrades, rankings, reportCard]);

  const [catIdx, setCatIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Measure width → constant px/s speed → transition exactly when scroll finishes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onePassPx = el.scrollWidth / 3;
    const PX_PER_SEC = 55;
    const dur = Math.max(onePassPx / PX_PER_SEC, 12);
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = `tickerScroll ${dur}s linear 1 forwards`;

    if (categories.length <= 1) return;
    const handleEnd = () => {
      setFading(true);
      setTimeout(() => {
        setCatIdx(prev => (prev + 1) % categories.length);
        setTimeout(() => setFading(false), 50);
      }, 700);
    };
    el.addEventListener("animationend", handleEnd);
    return () => el.removeEventListener("animationend", handleEnd);
  }, [catIdx, categories.length]);

  if (!categories.length) return null;
  const cat = categories[catIdx % categories.length];

  const renderSet = (prefix: string) => cat.items.map((item, i) => (
    <span key={`${prefix}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, whiteSpace: "nowrap" }}>
      {item.badge && <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.04em", color: item.badgeColor || C.dim, fontFamily: SANS, background: (item.badgeColor || C.dim) + "18", padding: "1px 4px", borderRadius: 2 }}>{item.badge}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>{item.text}</span>
      <span style={{ fontSize: 10, fontWeight: 900, color: item.annotationColor }}>{item.annotation}</span>
    </span>
  ));

  return (
    <div style={{ height: 32, background: C.card, borderBottom: `1px solid ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: `linear-gradient(90deg, ${C.card} 80%, transparent 100%)` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.dotColor, animation: "pulse-gold 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, fontFamily: SANS, transition: "opacity 0.6s ease-in-out", opacity: fading ? 0 : 1 }}>{cat.label}</span>
      </div>
      <div ref={scrollRef} style={{ display: "flex", alignItems: "center", gap: 24, whiteSpace: "nowrap", width: "max-content", paddingLeft: 180, opacity: fading ? 0 : 1, transition: "opacity 0.6s ease-in-out" }}>
        {renderSet("a")}
        <span style={{ display: "inline-block", width: 40 }} />
        {renderSet("b")}
        <span style={{ display: "inline-block", width: 40 }} />
        {renderSet("c")}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG PLACEHOLDER IMAGES — designed, content-typed, dark + gold
   ═══════════════════════════════════════════════════════════════ */
function DraftBoardSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="180" fill={C.elevated} />
      {/* Grid lines */}
      {[0,1,2,3,4,5,6,7].map(i => <line key={`v${i}`} x1={50*i+50} y1="20" x2={50*i+50} y2="160" stroke={C.border} strokeWidth="1" />)}
      {[0,1,2,3].map(i => <line key={`h${i}`} x1="30" y1={35*i+40} x2="370" y2={35*i+40} stroke={C.border} strokeWidth="1" />)}
      {/* Round labels */}
      {["R1","R2","R3","R4"].map((r,i) => <text key={r} x="20" y={35*i+47} fill={C.gold} fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="end" opacity="0.6">{r}</text>)}
      {/* Pick cells — scattered filled ones */}
      {[[60,28],[110,28],[160,28],[210,28],[260,28],[310,28],[350,28],
        [60,63],[110,63],[210,63],[310,63],
        [60,98],[160,98],[260,98],
        [110,133],[210,133]
      ].map(([x,y],i) => <rect key={i} x={x} y={y} width="38" height="24" rx="3" fill={i < 7 ? `${C.gold}18` : `${C.border}`} stroke={i < 3 ? C.gold : C.border} strokeWidth="0.5" opacity={0.4 + (i < 7 ? 0.3 : 0)} />)}
      {/* Title hint */}
      <text x="200" y="14" fill={C.gold} fontSize="8" fontFamily="monospace" fontWeight="800" textAnchor="middle" letterSpacing="3" opacity="0.4">MOCK DRAFT BOARD</text>
    </svg>
  );
}

function BarChartSVG() {
  const bars = [95,78,72,65,58,52,48,42,38,30,25,18];
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill={C.elevated} />
      {bars.map((h,i) => {
        const color = i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? C.blue : C.red;
        return <rect key={i} x={14 + i*22} y={90 - h} width="16" rx="2" height={h} fill={color} opacity={0.25 + (i === 0 ? 0.25 : 0)} />;
      })}
      <line x1="10" y1="90" x2="270" y2="90" stroke={C.border} strokeWidth="1" />
    </svg>
  );
}

function TradeArrowsSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill={C.elevated} />
      {/* Two sides */}
      <rect x="20" y="20" width="100" height="60" rx="6" fill={C.panel} stroke={C.border} strokeWidth="1" />
      <rect x="160" y="20" width="100" height="60" rx="6" fill={C.panel} stroke={C.border} strokeWidth="1" />
      {/* Arrows */}
      <path d="M125 40 L155 40" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowG)" />
      <path d="M155 60 L125 60" stroke={C.red} strokeWidth="2" markerEnd="url(#arrowR)" />
      <defs>
        <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill={C.green} /></marker>
        <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill={C.red} /></marker>
      </defs>
      {/* Player lines */}
      {[0,1,2].map(i => <rect key={`a${i}`} x="30" y={28+i*16} width={60-i*10} height="8" rx="2" fill={C.border} opacity={0.5-i*0.1} />)}
      {[0,1,2].map(i => <rect key={`b${i}`} x="170" y={28+i*16} width={60-i*10} height="8" rx="2" fill={C.border} opacity={0.5-i*0.1} />)}
      {/* Verdict badge */}
      <rect x="115" y="72" width="50" height="16" rx="3" fill={C.goldDim} stroke={C.goldBorder} strokeWidth="0.5" />
      <text x="140" y="83" fill={C.gold} fontSize="7" fontFamily="monospace" fontWeight="800" textAnchor="middle">VERDICT</text>
    </svg>
  );
}

function RadarChartSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill={C.elevated} />
      {/* Radar rings */}
      <circle cx="140" cy="50" r="35" fill="none" stroke={C.border} strokeWidth="0.5" />
      <circle cx="140" cy="50" r="25" fill="none" stroke={C.border} strokeWidth="0.5" />
      <circle cx="140" cy="50" r="15" fill="none" stroke={C.border} strokeWidth="0.5" />
      {/* Axes */}
      {[0,72,144,216,288].map(a => {
        const rad = a * Math.PI / 180;
        return <line key={a} x1="140" y1="50" x2={140+Math.cos(rad)*35} y2={50-Math.sin(rad)*35} stroke={C.border} strokeWidth="0.5" />;
      })}
      {/* Data polygon */}
      <polygon points="140,20 170,38 165,68 115,68 110,38" fill={C.gold} fillOpacity="0.12" stroke={C.gold} strokeWidth="1.5" opacity="0.6" />
      {/* Labels */}
      {[["QB",140,10],["RB",178,42],["WR",168,78],["TE",112,78],["PICK",102,42]].map(([l,x,y]) =>
        <text key={l as string} x={x as number} y={y as number} fill={C.dim} fontSize="7" fontFamily="monospace" fontWeight="700" textAnchor="middle" opacity="0.6">{l as string}</text>
      )}
      {/* Owner card hint */}
      <rect x="20" y="15" width="50" height="10" rx="2" fill={C.border} opacity="0.4" />
      <rect x="20" y="30" width="35" height="8" rx="2" fill={C.border} opacity="0.3" />
      <rect x="210" y="15" width="50" height="10" rx="2" fill={C.border} opacity="0.4" />
      <rect x="210" y="30" width="35" height="8" rx="2" fill={C.border} opacity="0.3" />
    </svg>
  );
}

function ScoutingReportSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill={C.elevated} />
      {/* Report layout */}
      <rect x="15" y="10" width="120" height="80" rx="4" fill={C.panel} stroke={C.border} strokeWidth="0.5" />
      {/* Text lines */}
      {[0,1,2,3,4,5].map(i => <rect key={i} x="25" y={20+i*11} width={80-i*8} height="5" rx="1" fill={C.border} opacity={0.4-i*0.04} />)}
      {/* Grade badge */}
      <rect x="145" y="10" width="40" height="40" rx="6" fill={C.goldDim} stroke={C.goldBorder} strokeWidth="1" />
      <text x="165" y="36" fill={C.gold} fontSize="18" fontFamily="monospace" fontWeight="900" textAnchor="middle">A-</text>
      {/* Stat bars */}
      {[["BUY",70,C.green],["SELL",50,C.red],["HOLD",35,C.secondary]].map(([l,w,c],i) => (
        <React.Fragment key={i}>
          <text x="148" y={66+i*13} fill={C.dim} fontSize="7" fontFamily="monospace" fontWeight="700" opacity="0.5">{l as string}</text>
          <rect x="175" y={60+i*13} width={w as number} height="6" rx="1" fill={c as string} opacity="0.3" />
        </React.Fragment>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED ARTICLE (hero card with Draft Board SVG)
   ═══════════════════════════════════════════════════════════════ */
function FeaturedArticle({ leagueName }: { leagueName: string }) {
  return (
    <div style={{
      borderRadius: 10, cursor: "pointer",
      background: `linear-gradient(160deg, ${C.card} 0%, #0d1020 50%, ${C.card} 100%)`,
      border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.005)"; e.currentTarget.style.borderColor = C.gold + "40"; e.currentTarget.style.boxShadow = `0 8px 40px rgba(212,165,50,0.06)`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}20, transparent)` }} />
      <div style={{ height: 180, overflow: "hidden" }}><DraftBoardSVG /></div>
      <div style={{ padding: "16px 24px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>FEATURED</span>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.dim, fontFamily: SANS }}>MOCK DRAFT</span>
        </div>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 22, color: C.primary, margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          {leagueName} — First Mock Draft
        </h3>
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
          AI-generated mock draft based on team needs, draft capital, and historical tendencies. See who your league-mates are likely to target.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, fontWeight: 500 }}>DynastyGPT</span>
          <span style={{ color: C.dim, fontSize: 11 }}>·</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, fontWeight: 500 }}>5 min read</span>
          <span style={{ fontFamily: SANS, fontSize: 13, color: C.dim, marginLeft: 4 }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE INTEL ARTICLE CARDS (with SVG images)
   ═══════════════════════════════════════════════════════════════ */
function LeagueArticle({ cat, catColor, title, desc, date, image }: { cat: string; catColor: string; title: string; desc: string; date: string; image: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLt; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      {/* SVG Image */}
      <div style={{ height: 100, overflow: "hidden" }}>{image}</div>
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColor }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.dim, fontFamily: SANS }}>{cat}</span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: `${C.dim}80`, fontFamily: MONO }}>{date}</span>
      </div>
      <div style={{ padding: 14, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, fontFamily: SANS, lineHeight: 1.35, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: SANS, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POWER RANKINGS WIDGET — fixed name overflow
   ═══════════════════════════════════════════════════════════════ */
function PowerRankingsWidget({ rankings }: { rankings: { owner: string; rank: number; total_sha: number }[] }) {
  if (!rankings.length) return null;
  const topScore = rankings[0]?.total_sha || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {rankings.map((r, i) => {
        const pct = (r.total_sha / topScore) * 100;
        const color = i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? C.secondary : C.red;
        return (
          <div key={`${r.owner}-${i}`} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 4,
            background: i === 0 ? C.goldDim : "transparent",
            border: i === 0 ? `1px solid ${C.goldBorder}` : "1px solid transparent",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { if (i > 0) e.currentTarget.style.background = C.elevated; }}
          onMouseLeave={(e) => { if (i > 0) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ width: 18, fontSize: 11, fontWeight: 900, color, fontFamily: MONO, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
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
            <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, fontFamily: MONO, width: 42, textAlign: "right", flexShrink: 0 }}>{(r.total_sha / 1000).toFixed(1)}k</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT TRADES (compact, verdict badges)
   ═══════════════════════════════════════════════════════════════ */
function getVerdictStyle(v: string) {
  if (!v) return null;
  const o = v.toLowerCase();
  if (o.includes("win-win")) return { label: "WIN-WIN", color: "#7dd3a0", bg: "rgba(125,211,160,0.12)" };
  if (o.includes("robbery")) return { label: "ROBBERY", color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
  if (o.includes("push")) return { label: "PUSH", color: "#b0b2c8", bg: "rgba(176,178,200,0.10)" };
  if (o.includes("won")) return { label: "ONE WINNER", color: C.gold, bg: C.goldDim };
  if (o.includes("lost")) return { label: "LOST", color: C.red, bg: "rgba(255,68,68,0.10)" };
  return null;
}

function RecentTradesWidget({ trades, basePath }: { trades: { owner: string; counter_party: string; verdict?: string | null; date?: string | null; players_sent?: string[] | null; players_received?: string[] | null; trade_id?: string | null }[]; basePath: string }) {
  const router = useRouter();
  if (!trades.length) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: C.primary, fontFamily: SANS }}>RECENT TRADES</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{trades.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {trades.slice(0, 7).map((t, i) => {
          const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
          const sent = Array.isArray(t.players_sent) ? t.players_sent.slice(0, 2).join(", ") : "";
          const got = Array.isArray(t.players_received) ? t.players_received.slice(0, 2).join(", ") : "";
          return (
            <div key={t.trade_id || i}
              style={{ padding: "8px 14px", cursor: "pointer", transition: "background 0.12s", borderBottom: i < 6 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO, width: 38, flexShrink: 0 }}>{formatDate(t.date)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: SANS, marginBottom: 1 }}>
                  <span style={{ fontWeight: 700, color: C.primary }}>{t.owner}</span>
                  <span style={{ color: C.dim, fontWeight: 500, margin: "0 5px" }}>↔</span>
                  <span style={{ fontWeight: 700, color: C.primary }}>{t.counter_party}</span>
                </div>
                {(sent || got) && (
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sent} ← → {got}
                  </div>
                )}
              </div>
              {vs && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "2px 7px", borderRadius: 3, fontFamily: SANS, flexShrink: 0 }}>{vs.label}</span>}
            </div>
          );
        })}
      </div>
      <div onClick={() => router.push(`${basePath}/trades`)}
        style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, cursor: "pointer", textAlign: "center", transition: "background 0.12s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: SANS }}>View All Trades →</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE REPORT CARD
   ═══════════════════════════════════════════════════════════════ */
function ReportCardSkeleton() {
  return (
    <div>
      <SectionHead title="LEAGUE REPORT CARD" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Personality skeleton */}
        <div style={{ height: 80, borderRadius: 8, background: C.elevated, border: `1px solid ${C.border}`, animation: "pulse-gold 2s ease-in-out infinite" }} />
        {/* Activity line skeleton */}
        <div style={{ height: 20, borderRadius: 4, background: C.elevated, width: "75%" }} />
        {/* Three cards skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 100, borderRadius: 8, background: C.elevated, border: `1px solid ${C.border}` }} />
          ))}
        </div>
        {/* Leaderboard skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 28, borderRadius: 4, background: C.elevated, opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeagueReportCard({ data }: { data: LeagueReportCardResponse }) {
  const rc = data;

  return (
    <div>
      <SectionHead title="LEAGUE REPORT CARD" badge={`${rc.season}`} />

      {/* ── League Personality Badge ────────────────────────── */}
      <div style={{
        borderRadius: 8, padding: "18px 20px", marginBottom: 14,
        background: `linear-gradient(135deg, ${C.goldDim} 0%, ${C.card} 40%, ${C.elevated} 100%)`,
        border: `1px solid ${C.goldBorder}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}30, transparent)` }} />
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, fontFamily: SANS, marginBottom: 6 }}>LEAGUE PERSONALITY</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, color: C.goldBright, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 6 }}>
          {rc.league_personality.type.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: SANS, lineHeight: 1.5 }}>
          {rc.league_personality.description}
        </div>
      </div>

      {/* ── Activity Summary ────────────────────────────────── */}
      <div style={{ fontSize: 13, color: C.secondary, fontFamily: SANS, lineHeight: 1.6, marginBottom: 14, padding: "0 2px" }}>
        {rc.activity_summary.split(/(\d+[\d,%.]*)/).map((part, i) =>
          /\d/.test(part)
            ? <span key={i} style={{ fontWeight: 800, color: C.goldBright }}>{part}</span>
            : <span key={i}>{part}</span>
        )}
      </div>

      {/* ── Fun Stat Callout ────────────────────────────────── */}
      <div style={{
        borderLeft: `3px solid ${C.gold}`, padding: "10px 14px", marginBottom: 14,
        background: C.goldGlow, borderRadius: "0 6px 6px 0",
      }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: C.gold, fontFamily: SANS, marginBottom: 4 }}>* FUN STAT</div>
        <div style={{ fontSize: 12, color: C.secondary, fontFamily: SANS, fontStyle: "italic", lineHeight: 1.5 }}>
          {rc.fun_stat}
        </div>
      </div>

      {/* ── Three Spotlight Cards ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {/* Biggest Robbery */}
        <div style={{
          background: C.card, borderRadius: 8, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 3, background: C.red }} />
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: C.red, fontFamily: SANS, marginBottom: 6 }}>BIGGEST ROBBERY</div>
            {rc.biggest_robbery ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: SANS, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {rc.biggest_robbery.winner}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  got {rc.biggest_robbery.winner_got.slice(0, 2).join(", ")}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  robbed <span style={{ fontWeight: 600, color: C.secondary }}>{rc.biggest_robbery.loser}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.red, fontFamily: MONO }}>
                  {rc.biggest_robbery.sha_gap > 0 ? "+" : ""}{fmt(rc.biggest_robbery.sha_gap)} value gap
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: SANS }}>No robberies detected</div>
            )}
          </div>
        </div>

        {/* Best Win-Win */}
        <div style={{
          background: C.card, borderRadius: 8, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 3, background: C.green }} />
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: C.green, fontFamily: SANS, marginBottom: 6 }}>BEST WIN-WIN</div>
            {rc.best_winwin ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: SANS, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {rc.best_winwin.side_a}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS, marginBottom: 3 }}>
                  <span style={{ color: C.secondary }}>+</span> {rc.best_winwin.side_a_got.slice(0, 2).join(", ")}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: SANS, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {rc.best_winwin.side_b}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS }}>
                  <span style={{ color: C.secondary }}>+</span> {rc.best_winwin.side_b_got.slice(0, 2).join(", ")}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: SANS }}>No win-win trades found</div>
            )}
          </div>
        </div>

        {/* Most Active Trader */}
        <div style={{
          background: C.card, borderRadius: 8, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ height: 3, background: C.gold }} />
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: C.gold, fontFamily: SANS, marginBottom: 6 }}>MOST ACTIVE</div>
            {rc.most_active_trader ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, fontFamily: SANS, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {rc.most_active_trader.owner}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.goldBright, fontFamily: MONO, marginBottom: 2 }}>
                  {rc.most_active_trader.trades}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS }}>trades this season</div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: SANS }}>No trade data</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trade Quality Leaderboard ──────────────────────── */}
      {rc.quality_leaderboard.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: C.dim, fontFamily: SANS, marginBottom: 8 }}>TRADE QUALITY LEADERBOARD</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {rc.quality_leaderboard.map((entry, i) => {
              const color = i === 0 ? C.gold : i < 3 ? C.green : C.secondary;
              const barWidth = Math.max(entry.win_pct, 5);
              return (
                <div key={`${entry.owner}-${i}`} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 4,
                  background: i === 0 ? C.goldDim : "transparent",
                  border: i === 0 ? `1px solid ${C.goldBorder}` : "1px solid transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (i > 0) e.currentTarget.style.background = C.elevated; }}
                onMouseLeave={(e) => { if (i > 0) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ width: 16, fontSize: 10, fontWeight: 900, color, fontFamily: MONO, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{
                    fontSize: 12, fontWeight: i < 3 ? 700 : 500,
                    color: i < 3 ? C.primary : C.secondary, fontFamily: SANS,
                    minWidth: 0, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{entry.owner}</span>
                  <div style={{ width: 50, height: 4, background: C.border, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${barWidth}%`, background: i === 0 ? C.gold : i < 3 ? C.green : C.secondary, transition: "width 0.8s ease" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: MONO, width: 34, textAlign: "right", flexShrink: 0 }}>{entry.win_pct}%</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: entry.avg_sha_net >= 0 ? C.green : C.red, fontFamily: MONO, width: 44, textAlign: "right", flexShrink: 0 }}>
                    {entry.avg_sha_net >= 0 ? "+" : ""}{fmt(entry.avg_sha_net)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Position Market ─────────────────────────────────── */}
      {rc.position_market.hot_position && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: SANS }}>Hot market:</span>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.04em",
            color: posColor(rc.position_market.hot_position),
            fontFamily: SANS, padding: "2px 6px", borderRadius: 3,
            background: posColor(rc.position_market.hot_position) + "18",
          }}>{rc.position_market.hot_position}</span>
          <span style={{ fontSize: 11, color: C.secondary, fontFamily: SANS }}>
            ({rc.position_market.hot_count} of {rc.total_trades} trades)
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE HOME PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LeagueHome() {
  const pathname = usePathname();
  const { currentLeagueId: lid } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";
  const basePath = `/l/${slug}`;

  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid, staleTime: 60 * 60 * 1000 });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: recentTrades } = useQuery({ queryKey: ["recent-trades", lid], queryFn: () => getRecentTrades(lid!, 10), enabled: !!lid });
  const { data: trending } = useQuery({ queryKey: ["trending", lid], queryFn: () => getTrending(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: reportCard, isLoading: reportCardLoading } = useQuery({ queryKey: ["report-card", lid], queryFn: () => getReportCard(lid!), enabled: !!lid, staleTime: 30 * 60 * 1000 });

  if (!lid) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p>
    </div>
  );

  const leagueName = overview?.name || "DynastyGPT";
  const numTeams = overview?.format?.num_teams || 0;
  const tradeCount = overview?.trade_volume?.total || 0;

  const leagueArticles = [
    { cat: "POWER RANKINGS", catColor: C.gold, title: `${leagueName} Power Rankings Update`, desc: `Fresh power rankings across all ${numTeams} teams. See who's rising, who's falling, and where the value gaps are.`, date: "Today", image: <BarChartSVG /> },
    { cat: "TRADE REPORT", catColor: C.green, title: `${tradeCount} Trades Analyzed — Who's Winning?`, desc: "AI-graded trade verdicts for every deal in league history. Win rates, robbery alerts, and owner tendencies.", date: "Today", image: <TradeArrowsSVG /> },
    { cat: "OWNER SPOTLIGHT", catColor: C.blue, title: "Owner Behavioral Profiles Now Available", desc: "Full trade tendency analysis, position biases, seasonal timing patterns, and rival matchup histories.", date: "Mar 24", image: <RadarChartSVG /> },
    { cat: "FRANCHISE INTEL", catColor: "#a78bfa", title: "AI Scouting Reports Are Live", desc: "Personalized buy-low targets, sell-high candidates, trade partner fits, and positional gap analysis.", date: "Mar 23", image: <ScoutingReportSVG /> },
  ];

  return (
    <>
      {/* AI Insight Strip */}
      <InsightStrip />

      {/* Rotating Ticker */}
      <MarketTicker
        risers={trending?.risers || []}
        fallers={trending?.fallers || []}
        recentTrades={recentTrades?.trades}
        rankings={rankings?.rankings}
        reportCard={reportCard}
      />

      {/* MAIN GRID — Content Left, Widgets Right */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px 48px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* LEFT COLUMN — continuous content feed, no section breaks between hero + articles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.5s ease 0.1s both" }}>
          {/* Hero Article */}
          <FeaturedArticle leagueName={leagueName} />

          {/* Sub-articles — flows directly under hero, no section header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {leagueArticles.map((a, i) => <LeagueArticle key={i} {...a} />)}
          </div>

          {/* League Report Card */}
          {reportCardLoading ? <ReportCardSkeleton /> : reportCard ? <LeagueReportCard data={reportCard} /> : null}

          {/* League Snapshot */}
          <div>
            <SectionHead title="LEAGUE SNAPSHOT" badge={`${profiles?.profiles?.length || 0} TEAMS`} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {profiles?.profiles?.map((p, i) => {
                const tier = p.sha_rank <= 3 ? C.green : p.sha_rank <= 6 ? C.gold : p.sha_rank <= 9 ? C.orange : C.red;
                return (
                  <div key={`${p.owner}-${i}`} style={{ padding: "8px 12px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLt; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{p.owner}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: tier }}>#{p.sha_rank}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.window} · {p.record ? `${p.record.wins}W-${p.record.losses}L` : "—"}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, marginTop: 2 }}>{fmt(p.total_sha)} {leaguePrefix(leagueName)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp 0.5s ease 0.2s both" }}>
          <div>
            <SectionHead title="POWER RANKINGS" />
            <PowerRankings
              rankings={rankings?.rankings || []}
              leagueIntel={leagueIntel?.owners}
              leagueName={leagueName}
            />
          </div>
          <RecentTrades
            trades={recentTrades?.trades || []}
            basePath={basePath}
            leagueId={lid}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}
