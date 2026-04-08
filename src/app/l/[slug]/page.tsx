"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useLeagueStore } from "@/lib/stores/league-store";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useQuery } from "@tanstack/react-query";
import {
  getRankings, getRecentTrades, getTrending, getOwnerProfiles,
  getOverview, getLeagueIntel, getReportCard, getMarketPulse,
} from "@/lib/api";
import { RecentTrades, PlayerName } from "@/components/league";
import PlayerHeadshot from "@/components/league/PlayerHeadshot";
import { C, SANS, MONO, DISPLAY, fmt, posColor, getVerdictStyle, leaguePrefix } from "@/components/league/tokens";
import type {
  LeagueReportCardResponse, TrendingPlayer, GradedTrade,
  RankingEntry, LeagueIntelOwner, OwnerProfile,
} from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════ */

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(end: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);
  return value;
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════════════ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ═══════════════════════════════════════════════════════════════
   PLATFORM STATS — real numbers from DB
   ═══════════════════════════════════════════════════════════════ */

const PLATFORM_STATS = [
  { label: "TRADES ANALYZED", value: 1500000, display: "1.5M+" },
  { label: "LEAGUES", value: 85000, display: "85K+" },
  { label: "DRAFT PICKS TRACKED", value: 3700000, display: "3.7M+" },
  { label: "DATA POINTS", value: 2700000, display: "2.7M+" },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function posBadgeClasses(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red bg-accent-red/10";
    case "RB": return "text-accent-blue bg-accent-blue/10";
    case "WR": return "text-accent-green bg-accent-green/10";
    case "TE": return "text-accent-orange bg-accent-orange/10";
    default: return "text-dim bg-dim/10";
  }
}

function posTextClass(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red";
    case "RB": return "text-accent-blue";
    case "WR": return "text-accent-green";
    case "TE": return "text-accent-orange";
    default: return "text-dim";
  }
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.1);
  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={fadeUp} className={className}>
      {children}
    </motion.section>
  );
}

function SectionLabel({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-[11px] font-black tracking-[0.16em] text-primary uppercase" style={{ fontFamily: SANS }}>
          {title}
        </h2>
        {badge && <span className="text-[8px] font-black tracking-[0.12em] px-2.5 py-0.5 rounded-full" style={{ fontFamily: MONO, color: C.gold, background: `${C.gold}12`, border: `1px solid ${C.gold}30`, boxShadow: `0 0 8px ${C.gold}15` }}>{badge}</span>}
      </div>
      <div className="h-px bg-gold/30" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TICKER — cycles categories, each fully styled
   ═══════════════════════════════════════════════════════════════ */

type TickerCat = { label: string; dotColor: string; items: React.ReactNode[] };

function MarketTicker({ risers, fallers, recentTrades, rankings, reportCard, leagueIntel }: {
  risers: TrendingPlayer[];
  fallers: TrendingPlayer[];
  recentTrades?: GradedTrade[];
  rankings?: RankingEntry[];
  reportCard?: LeagueReportCardResponse | null;
  leagueIntel?: LeagueIntelOwner[];
}) {
  const categories = useMemo(() => {
    const cats: TickerCat[] = [];
    const item = (key: string, children: React.ReactNode) => (
      <span key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ fontFamily: MONO }}>{children}</span>
    );
    const TB = ({ cls, children }: { cls: string; children: React.ReactNode }) => (
      <span className={`text-[8px] font-black tracking-[0.04em] px-1 rounded-sm ${cls}`}>{children}</span>
    );
    const TDot = () => <span className="text-border text-[10px] mx-0.5">·</span>;

    /* ── MARKET MOVERS ── */
    if (risers.length || fallers.length) {
      const nodes: React.ReactNode[] = [];
      const maxLen = Math.max(risers.length, fallers.length);
      for (let i = 0; i < maxLen && nodes.length < 14; i++) {
        if (i < risers.length) {
          const r = risers[i];
          nodes.push(item(`r${i}`, <>
            <TB cls={posBadgeClasses(r.position)}>{r.position}</TB>
            <PlayerName name={r.player} style={{ fontSize: 11, fontWeight: 700, color: C.primary }} />
            <span className="text-[10px] font-black text-accent-green">▲ +{fmt(r.sha_delta)}</span>
          </>));
        }
        if (i < fallers.length && nodes.length < 14) {
          const f = fallers[i];
          nodes.push(item(`f${i}`, <>
            <TB cls={posBadgeClasses(f.position)}>{f.position}</TB>
            <PlayerName name={f.player} style={{ fontSize: 11, fontWeight: 700, color: C.primary }} />
            <span className="text-[10px] font-black text-accent-red">▼ {fmt(f.sha_delta)}</span>
          </>));
        }
      }
      cats.push({ label: "MARKET MOVERS", dotColor: C.green, items: nodes });
    }

    /* ── TRADE MARKET ── */
    if (reportCard) {
      const nodes: React.ReactNode[] = [];
      if (reportCard.biggest_robbery) {
        const r = reportCard.biggest_robbery;
        nodes.push(item("rob", <>
          <span className="text-[11px] font-extrabold text-accent-green">{r.winner}</span>
          <span className="text-[10px] text-dim">fleeced</span>
          <span className="text-[11px] font-bold text-accent-red">{r.loser}</span>
          <TDot />
          <span className="text-[10px] text-secondary">got {r.winner_got.slice(0, 2).join(", ")}</span>
        </>));
      }
      if (reportCard.best_winwin) {
        const w = reportCard.best_winwin;
        nodes.push(item("ww", <>
          <TB cls="text-gold bg-gold/10">WIN-WIN</TB>
          <span className="text-[11px] font-bold text-primary">{w.side_a}</span>
          <span className="text-[10px] text-dim">&amp;</span>
          <span className="text-[11px] font-bold text-primary">{w.side_b}</span>
        </>));
      }
      reportCard.quality_leaderboard?.slice(0, 4).forEach((q, i) => {
        const pct = Math.round(q.win_pct);
        const cls = pct >= 65 ? "text-accent-green" : pct >= 50 ? "text-gold" : "text-accent-red";
        nodes.push(item(`ql${i}`, <>
          <span className="text-[11px] font-bold text-primary">{q.owner}</span>
          <span className={`text-[10px] font-black ${cls}`}>{pct}%</span>
          <span className="text-[10px] text-dim">win rate</span>
        </>));
      });
      if (reportCard.most_active_trader) nodes.push(item("active", <>
        <TB cls="text-gold bg-gold/10">MOST ACTIVE</TB>
        <span className="text-[11px] font-bold text-primary">{reportCard.most_active_trader.owner}</span>
        <span className="text-[10px] font-extrabold text-gold">{reportCard.most_active_trader.trades} trades</span>
      </>));
      if (nodes.length) cats.push({ label: "TRADE MARKET", dotColor: C.gold, items: nodes });
    }

    /* ── LEAGUE RANKINGS ── */
    if (rankings?.length) {
      const nodes = rankings.slice(0, 12).map((r, i) => {
        const cls = r.rank <= 3 ? "text-accent-green bg-accent-green/10" : r.rank <= 6 ? "text-gold bg-gold/10" : r.rank <= 9 ? "text-accent-orange bg-accent-orange/10" : "text-accent-red bg-accent-red/10";
        return item(`lr${i}`, <>
          <TB cls={cls}>#{r.rank}</TB>
          <span className="text-[11px] font-bold text-primary">{r.owner}</span>
          <span className="text-[10px] font-extrabold text-gold">{(r.total_sha / 1000).toFixed(1)}k</span>
        </>);
      });
      cats.push({ label: "LEAGUE RANKINGS", dotColor: C.gold, items: nodes });
    }

    /* ── DYNASTY RANKINGS ── */
    if (leagueIntel?.length && rankings?.length) {
      const shaMap = new Map(rankings.map((r) => [r.owner.toLowerCase(), r.total_sha]));
      const numTeams = rankings.length || 12;
      const sorted = [...leagueIntel].sort((a, b) => (a.dynasty_rank || 99) - (b.dynasty_rank || 99));
      const nodes = sorted.slice(0, 12).map((o, i) => {
        const rank = o.dynasty_rank || i + 1;
        const baseSha = shaMap.get(o.owner.toLowerCase()) || o.total_sha;
        const value = Math.round(baseSha * (1 + (numTeams - rank) * 0.05));
        const cls = i < 3 ? "text-accent-blue bg-accent-blue/10" : i < 6 ? "text-gold bg-gold/10" : "text-dim bg-dim/10";
        return item(`dr${i}`, <>
          <TB cls={cls}>#{rank}</TB>
          <span className="text-[11px] font-bold text-primary">{o.owner}</span>
          <span className="text-[10px] font-extrabold text-accent-blue">{(value / 1000).toFixed(1)}k</span>
        </>);
      });
      cats.push({ label: "DYNASTY RANKINGS", dotColor: C.blue, items: nodes });
    }

    /* ── WIN-NOW RANKINGS ── */
    if (leagueIntel?.length && rankings?.length) {
      const shaMap = new Map(rankings.map((r) => [r.owner.toLowerCase(), r.total_sha]));
      const numTeams = rankings.length || 12;
      const sorted = [...leagueIntel].sort((a, b) => (a.win_now_rank || 99) - (b.win_now_rank || 99));
      const nodes = sorted.slice(0, 12).map((o, i) => {
        const rank = o.win_now_rank || i + 1;
        const baseSha = shaMap.get(o.owner.toLowerCase()) || o.total_sha;
        const value = Math.round(baseSha * (1 + (numTeams - rank) * 0.05));
        const cls = i < 3 ? "text-accent-green bg-accent-green/10" : i < 6 ? "text-gold bg-gold/10" : "text-dim bg-dim/10";
        return item(`wnr${i}`, <>
          <TB cls={cls}>#{rank}</TB>
          <span className="text-[11px] font-bold text-primary">{o.owner}</span>
          <span className={`text-[10px] font-extrabold ${i < 3 ? "text-accent-green" : "text-dim"}`}>{(value / 1000).toFixed(1)}k</span>
        </>);
      });
      cats.push({ label: "WIN-NOW RANKINGS", dotColor: C.green, items: nodes });
    }

    /* ── RECENT TRADES ── */
    if (recentTrades?.length) {
      const nodes = recentTrades.slice(0, 8).map((t, i) => {
        const v = t.verdict;
        const cls = v?.includes("robbery") ? "text-accent-red-bright bg-accent-red/10" : v?.includes("win-win") ? "text-accent-green bg-accent-green/10" : "text-gold bg-gold/10";
        return item(`tr${i}`, <>
          <span className="text-[11px] font-bold text-primary">{t.owner}</span>
          <span className="text-[10px] text-gold">→</span>
          <span className="text-[11px] font-bold text-primary">{t.counter_party}</span>
          <TDot />
          <span className="text-[10px] text-secondary">{(t.players_sent || []).slice(0, 2).join(", ") || "picks"}</span>
          <span className="text-[10px] text-gold">↔</span>
          <span className="text-[10px] text-secondary">{(t.players_received || []).slice(0, 2).join(", ") || "picks"}</span>
          {v && <TB cls={cls}>{v.toUpperCase()}</TB>}
        </>);
      });
      cats.push({ label: "RECENT TRADES", dotColor: C.orange, items: nodes });
    }

    /* ── AI INSIGHT ── */
    if (reportCard) {
      const nodes: React.ReactNode[] = [];
      if (reportCard.league_personality) nodes.push(item("lp", <>
        <TB cls="text-gold bg-gold/10">{reportCard.league_personality.type.toUpperCase()}</TB>
        <span className="text-[11px] font-medium text-secondary italic">{reportCard.league_personality.description}</span>
      </>));
      if (reportCard.fun_stat) nodes.push(item("fun", <>
        <TB cls="text-gold bg-gold/10">FUN STAT</TB>
        <span className="text-[11px] font-medium text-secondary italic">{reportCard.fun_stat}</span>
      </>));
      if (nodes.length) cats.push({ label: "AI INSIGHT", dotColor: C.gold, items: nodes });
    }

    return cats;
  }, [risers, fallers, recentTrades, rankings, reportCard, leagueIntel]);

  const [catIdx, setCatIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onePassPx = el.scrollWidth / 3;
    const PX_PER_SEC = 55;
    const dur = Math.max(onePassPx / PX_PER_SEC, 12);
    // Imperative: duration computed from measured scrollWidth
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

  const renderSet = (prefix: string) => cat.items.map((node, i) => (
    <React.Fragment key={`${prefix}-${i}`}>
      {i > 0 && <span className="text-border text-[10px] mx-0.5">·</span>}
      {node}
    </React.Fragment>
  ));

  return (
    <div className="h-8 bg-card border-b border-border overflow-hidden flex items-center relative">
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1.5 px-3" style={{ background: `linear-gradient(90deg, ${C.card} 80%, transparent 100%)` }}>
        <div className="w-1.5 h-1.5 rounded-full animate-[pulse-gold_2s_ease-in-out_infinite]" style={{ background: cat.dotColor }} />
        <motion.span
          animate={{ opacity: fading ? 0 : 1 }}
          transition={{ duration: 0.6 }}
          className="text-[9px] font-black tracking-[0.14em] text-gold"
          style={{ fontFamily: SANS }}
        >{cat.label}</motion.span>
      </div>
      <motion.div
        ref={scrollRef}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-6 whitespace-nowrap w-max pl-[180px]"
      >
        {renderSet("a")}
        <span className="inline-block w-[60px]" />
        {renderSet("b")}
        <span className="inline-block w-[60px]" />
        {renderSet("c")}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO STAT CARD — count-up animation
   ═══════════════════════════════════════════════════════════════ */

function StatCard({ label, value, display, inView }: { label: string; value: number; display: string; inView: boolean }) {
  const count = useCountUp(value, 2000, inView);
  const formatted = value >= 1000000
    ? `${(count / 1000000).toFixed(1)}M+`
    : value >= 1000
    ? `${(count / 1000).toFixed(0)}K+`
    : count.toLocaleString();
  return (
    <div className="bg-elevated/80 border border-border rounded-md px-3 py-2.5 text-center">
      <div className="text-lg sm:text-xl font-black text-gold-bright leading-none" style={{ fontFamily: MONO }}>
        {inView ? formatted : display}
      </div>
      <div className="text-[8px] font-black tracking-[0.12em] text-dim mt-1" style={{ fontFamily: SANS }}>
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEWS CARD — reusable for League News & My News
   ═══════════════════════════════════════════════════════════════ */

function NewsCard({ tag, tagColor, headline, lede, isHero = false, topColor }: {
  tag: string; tagColor: string; headline: string; lede: string;
  isHero?: boolean; topColor?: string;
}) {
  return (
    <div
      className={`bg-card border border-border overflow-hidden group transition-all duration-300 ${isHero ? "rounded-xl" : "rounded-lg"}`}
    >
      {topColor && <div className={`h-[3px]`} style={{ background: topColor }} />}
      <div className={isHero ? "px-5 pt-4 pb-5" : "px-3.5 pt-3 pb-3.5"}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[9px] font-black tracking-[0.1em] px-2 py-0.5 rounded-sm ${tagColor}`} style={{ fontFamily: SANS }}>{tag}</span>
        </div>
        <h3 className={`font-bold text-primary leading-snug mb-2 ${isHero ? "text-lg sm:text-xl" : "text-sm"}`} style={{ fontFamily: isHero ? DISPLAY : SANS }}>
          {headline}
        </h3>
        <p className={`text-dim leading-relaxed ${isHero ? "text-sm line-clamp-3" : "text-xs line-clamp-2"}`} style={{ fontFamily: SANS }}>
          {lede}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETONS
   ═══════════════════════════════════════════════════════════════ */

function HeroSkeleton() {
  return (
    <div className="relative bg-card border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-5 sm:py-6 grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-3/4 bg-elevated rounded animate-pulse" />
          <div className="h-4 w-full bg-elevated rounded animate-pulse" />
          <div className="h-8 w-2/3 bg-elevated rounded-r-sm animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-14 bg-elevated rounded-md animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton({ isHero = false }: { isHero?: boolean }) {
  return (
    <div className={`bg-card border border-border overflow-hidden ${isHero ? "rounded-xl" : "rounded-lg"}`}>
      <div className="h-[3px] bg-elevated" />
      <div className={isHero ? "px-5 pt-4 pb-5" : "px-3.5 pt-3 pb-3.5"}>
        <div className="h-4 w-20 bg-elevated rounded animate-pulse mb-3" />
        <div className={`bg-elevated rounded animate-pulse mb-2 ${isHero ? "h-7 w-4/5" : "h-5 w-3/4"}`} />
        <div className="h-4 w-full bg-elevated rounded animate-pulse mb-1" />
        <div className="h-4 w-2/3 bg-elevated rounded animate-pulse" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE FAIRNESS INDEX
   ═══════════════════════════════════════════════════════════════ */

function TradeFairnessIndex({ leaderboard }: { leaderboard: { owner: string; trades: number; wins: number; losses?: number; even?: number; win_pct: number; avg_sha_net: number }[] }) {
  if (!leaderboard.length) return null;
  // Fairness = even trades / total trades. Even = trades that were fair (not a clear win or loss for either side)
  // If 'even' field is missing from API, calculate as: trades - wins - (losses ?? 0)
  const sorted = [...leaderboard]
    .map(e => {
      const even = e.even ?? (e.trades - e.wins - (e.losses ?? 0));
      const fairness = e.trades > 0 ? Math.round((Math.max(even, 0) / e.trades) * 100) : 0;
      return { ...e, even, fairness };
    })
    .sort((a, b) => b.fairness - a.fairness);

  return (
    <div className="mt-6">
      <div className="text-[11px] font-black tracking-[0.12em] text-dim mb-1" style={{ fontFamily: SANS }}>TRADE FAIRNESS INDEX</div>
      <div className="text-xs text-secondary/60 mb-3 leading-snug" style={{ fontFamily: SANS }}>Owners ranked by % of EVEN graded trades. Fair dealers.</div>
      <div className="flex flex-col gap-0.5">
        {sorted.map((entry, i) => {
          const isFirst = i === 0;
          const isLast = i === sorted.length - 1;
          const color = isFirst ? C.gold : i < 3 ? C.green : C.secondary;
          return (
            <div
              key={entry.owner}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors hover:bg-elevated ${isFirst ? "bg-gold-dim border border-gold-border" : ""}`}
            >
              <span className="w-4 text-xs font-black text-right shrink-0" style={{ fontFamily: MONO, color }}>{i + 1}</span>
              {isFirst && <span className="text-xs shrink-0">⚖️</span>}
              {isLast && <span className="text-xs shrink-0">🔥</span>}
              <span className={`text-sm truncate flex-1 min-w-0 ${i < 3 ? "font-bold text-primary" : "font-medium text-secondary"}`} style={{ fontFamily: SANS }}>
                {entry.owner}
              </span>
              <div className="w-14 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
                {/* Imperative: percentage width from data */}
                <div className="h-full rounded-full" style={{ width: `${entry.fairness}%`, background: color }} />
              </div>
              <span className="text-xs font-bold w-9 text-right shrink-0" style={{ fontFamily: MONO, color }}>{entry.fairness}%</span>
              <span className="text-[11px] font-semibold w-8 text-right shrink-0" style={{ fontFamily: MONO }}>{entry.trades}t</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE LEGENDS
   ═══════════════════════════════════════════════════════════════ */

function LeagueLegends({ reportCard }: { reportCard: LeagueReportCardResponse }) {
  const legends: { title: string; name: string; detail: string; accentBorder: string; accentBg: string; accentText: string; dotColor: string }[] = [];

  if (reportCard.most_active_trader) {
    legends.push({
      title: "MOST ACTIVE", name: reportCard.most_active_trader.owner,
      detail: `${reportCard.most_active_trader.trades} trades this season`,
      accentBorder: "border-gold/30", accentBg: "bg-gold/[0.04]", accentText: "text-gold", dotColor: "bg-gold",
    });
  }
  if (reportCard.biggest_robbery) {
    legends.push({
      title: "BIGGEST HEIST", name: reportCard.biggest_robbery.winner,
      detail: `Took ${reportCard.biggest_robbery.winner_got.slice(0, 2).join(", ")} from ${reportCard.biggest_robbery.loser} — +${fmt(reportCard.biggest_robbery.sha_gap)} gap`,
      accentBorder: "border-accent-red/30", accentBg: "bg-accent-red/[0.04]", accentText: "text-accent-red", dotColor: "bg-accent-red",
    });
  }
  if (reportCard.quality_leaderboard?.[0]) {
    const best = reportCard.quality_leaderboard[0];
    legends.push({
      title: "SHARPEST DEALER", name: best.owner,
      detail: `${best.win_pct}% win rate across ${best.trades} trades`,
      accentBorder: "border-accent-green/30", accentBg: "bg-accent-green/[0.04]", accentText: "text-accent-green", dotColor: "bg-accent-green",
    });
  }
  if (reportCard.best_winwin) {
    legends.push({
      title: "BEST WIN-WIN", name: `${reportCard.best_winwin.side_a} & ${reportCard.best_winwin.side_b}`,
      detail: `Both sides gained — closest fair deal in the league`,
      accentBorder: "border-accent-blue/30", accentBg: "bg-accent-blue/[0.04]", accentText: "text-accent-blue", dotColor: "bg-accent-blue",
    });
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-2">
      {legends.map((l, i) => (
        <motion.div key={i} variants={staggerItem} className={`flex items-start gap-3 px-3.5 py-2.5 rounded-lg border transition-colors hover:bg-elevated/50 ${l.accentBorder} ${l.accentBg}`}>
          <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${l.dotColor}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-[8px] font-black tracking-[0.12em] mb-0.5 ${l.accentText}`} style={{ fontFamily: SANS }}>{l.title}</div>
            <div className="text-[13px] font-bold text-primary truncate" style={{ fontFamily: SANS }}>{l.name}</div>
            <div className="text-[11px] text-secondary leading-snug" style={{ fontFamily: SANS }}>{l.detail}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE HOME PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LeagueHome() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentLeagueId: lid, currentOwner, currentOwnerId } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";
  const basePath = `/l/${slug}`;

  /* ── Data queries (unchanged) ── */
  /* Data queries — aggressive caching. Most data changes infrequently. */
  const HOUR = 60 * 60 * 1000;
  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid, staleTime: 4 * HOUR });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid!), enabled: !!lid, staleTime: 2 * HOUR });
  const { data: recentTrades } = useQuery({ queryKey: ["recent-trades", lid], queryFn: () => getRecentTrades(lid!, 10), enabled: !!lid, staleTime: 30 * 60 * 1000 });
  const { data: trending } = useQuery({ queryKey: ["trending", lid], queryFn: () => getTrending(lid!), enabled: !!lid, staleTime: HOUR });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid!), enabled: !!lid, staleTime: 2 * HOUR });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid!), enabled: !!lid, staleTime: 2 * HOUR });
  const { data: reportCard, isLoading: rcLoading } = useQuery({ queryKey: ["report-card", lid], queryFn: () => getReportCard(lid!), enabled: !!lid, staleTime: 4 * HOUR });
  const { data: marketPulse } = useQuery({ queryKey: ["market-pulse", lid], queryFn: () => getMarketPulse(lid!), enabled: !!lid, staleTime: HOUR });

  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: heroInViewRef, inView: heroInView } = useInView(0.2);

  if (!lid) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-dim" style={{ fontFamily: MONO }}>No league loaded</p>
    </div>
  );

  const leagueName = overview?.name || "DynastyGPT";
  const tradeCount = overview?.trade_volume?.total || 0;

  /* ── Derive owner-specific data ── */
  const myProfile = profiles?.profiles?.find((p: OwnerProfile) => p.owner === currentOwner);
  const myIntel = leagueIntel?.owners?.find((o: LeagueIntelOwner) => o.owner === currentOwner);
  const myQuality = reportCard?.quality_leaderboard?.find((q: { owner: string }) => q.owner === currentOwner);

  /* ── Dynamic headlines — written like news, not feature labels ── */
  const personality = reportCard?.league_personality;
  const leagueHeadline = (() => {
    if (!reportCard) return `Inside ${leagueName} — A Season in Review`;
    const rc = reportCard;
    if (rc.biggest_robbery) return `${rc.biggest_robbery.winner} Pulls Off the Heist of the Season in ${leagueName}`;
    if (rc.most_active_trader && rc.most_active_trader.trades >= 8) return `${rc.most_active_trader.owner} Won't Stop Dealing — ${rc.most_active_trader.trades} Trades and Counting`;
    if (personality) return `Inside ${leagueName}: How a ${personality.type} Market Shaped the Season`;
    return `${leagueName} — The Full Season Breakdown`;
  })();
  const leagueLede = (() => {
    if (!reportCard) return `${tradeCount} trades analyzed across all seasons.`;
    const rc = reportCard;
    const parts: string[] = [];
    if (rc.biggest_robbery) parts.push(`${rc.biggest_robbery.winner} walked away with ${rc.biggest_robbery.winner_got.slice(0, 2).join(" and ")}`);
    if (rc.most_active_trader) parts.push(`${rc.most_active_trader.owner} led the league with ${rc.most_active_trader.trades} trades`);
    if (rc.quality_leaderboard?.[0]) parts.push(`${rc.quality_leaderboard[0].owner} posted a ${rc.quality_leaderboard[0].win_pct}% win rate`);
    return parts.length ? parts.slice(0, 2).join(". ") + "." : rc.activity_summary || "";
  })();

  const tradeHeadline = (() => {
    if (!reportCard) return "Trade Verdicts Loading...";
    const best = reportCard.quality_leaderboard?.[0];
    const worst = reportCard.quality_leaderboard?.slice(-1)?.[0];
    if (best && worst && best.owner !== worst.owner) return `${best.owner} Is Winning Every Deal — ${worst.owner} Can't Stop Losing`;
    if (best) return `${best.owner} Leads the League in Trade Win Rate at ${best.win_pct}%`;
    return `${reportCard.total_trades} Trades Graded This Season`;
  })();

  const marketHeadline = (() => {
    if (!trending?.risers?.[0]) return "Market Movement — Tracking Value Shifts";
    const top = trending.risers[0];
    const faller = trending.fallers?.[0];
    if (faller) return `${top.player} Surging While ${faller.player} Falls — This Week's Biggest Movers`;
    return `${top.player} Is the Hottest Name in the League Right Now`;
  })();

  const myHeadline = myProfile
    ? myProfile.window === "WIN_NOW"
      ? `${currentOwner} Is All-In — The Window Won't Stay Open Forever`
      : myProfile.window === "CONTENDER"
      ? `${currentOwner}'s Championship Window Is Wide Open`
      : myProfile.window === "REBUILDER"
      ? `${currentOwner} Is Tearing It Down — Here's the Blueprint`
      : `${currentOwner} Is Quietly Building Something Dangerous`
    : "Your Franchise Report";
  const myLede = myIntel
    ? (() => {
        const rank = myIntel.sha_rank;
        const needs = myIntel.positional_needs?.slice(0, 3);
        const mismatch = myIntel.mismatch;
        let parts: string[] = [];
        if (rank) parts.push(rank <= 3 ? `A top-${rank} franchise in the league` : `Currently ranked #${rank} overall`);
        if (needs?.length) parts.push(`with ${needs.length === 1 ? `a glaring hole at ${needs[0]}` : `gaps at ${needs.join(" and ")}`}`);
        else parts.push("with no major roster holes");
        if (mismatch) parts.push(`— but a ${mismatch.replace(/_/g, " ")} could be a problem`);
        return parts.join(" ") + ". Get the full scouting report.";
      })()
    : "Sign in and sync your Sleeper account to see your personalized franchise report.";

  return (
    <>
      {/* ═══════════════ ① TICKER ═══════════════ */}
      <MarketTicker
        risers={trending?.risers || []}
        fallers={trending?.fallers || []}
        recentTrades={recentTrades?.trades}
        rankings={rankings?.rankings}
        reportCard={reportCard}
        leagueIntel={leagueIntel?.owners}
      />

      {/* ═══════════════ ② HERO ═══════════════ */}
      {rcLoading && !reportCard ? <HeroSkeleton /> : (
        <div ref={heroInViewRef} className="relative overflow-hidden border-b border-border" style={{ background: `linear-gradient(160deg, ${C.card} 0%, #0d1020 50%, ${C.card} 100%)` }}>
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${C.goldDark}, ${C.gold}, ${C.goldBright})` }} />

          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-5 sm:py-6 grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-6 items-center">
            {/* Left — League identity */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-xl sm:text-2xl text-primary tracking-tight leading-tight" style={{ fontFamily: DISPLAY }}>
                  {leagueName}
                </h1>
              </div>

              {/* League Identity with real narrative */}
              {personality && reportCard && (
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-[9px] font-black tracking-[0.08em] text-gold-bright px-2 py-0.5 rounded-sm bg-gold-dim border border-gold-border shrink-0 mt-0.5" style={{ fontFamily: SANS }}>
                    {personality.type.toUpperCase()}
                  </span>
                  <p className="text-[12px] text-secondary leading-relaxed" style={{ fontFamily: SANS }}>
                    {(() => {
                      const rc = reportCard;
                      const activityRatio = rc.db_avg_trades > 0 ? Math.round(((rc.total_trades - rc.db_avg_trades) / rc.db_avg_trades) * 100) : 0;
                      const robberyCount = rc.overpay_trades || (rc.biggest_robbery ? 1 : 0);
                      let narrative = `${rc.total_trades} trades across all seasons.`;
                      if (activityRatio > 50) narrative += " One of the most active leagues on the platform.";
                      else if (activityRatio > 20) narrative += " More active than most leagues.";
                      else if (activityRatio > 0) narrative += " Above-average trade volume.";
                      else if (activityRatio > -20) narrative += " Moderate trade activity.";
                      else narrative += " A quieter league on the trade front.";
                      if (robberyCount > 0) narrative += ` ${robberyCount} confirmed ${robberyCount > 1 ? "robberies" : "robbery"} detected.`;
                      if (rc.panic_trades > 0) narrative += ` ${rc.panic_trades} panic ${rc.panic_trades > 1 ? "trades" : "trade"} flagged.`;
                      if (rc.blockbusters > 0) narrative += ` ${rc.blockbusters} blockbuster ${rc.blockbusters > 1 ? "deals" : "deal"}.`;
                      if (!robberyCount && !rc.panic_trades && rc.best_winwin) narrative += " A league where deals tend to be fair.";
                      return narrative;
                    })()}
                  </p>
                </div>
              )}

              {/* Fun stat — picks the most specific, interesting data available */}
              {reportCard && (
                <div className="border-l-2 border-gold pl-3 py-1.5 bg-gold-glow rounded-r-sm">
                  <span className="text-[11px] text-secondary leading-snug" style={{ fontFamily: SANS }}>
                    {(() => {
                      const rc = reportCard;
                      // Priority 1: biggest robbery with real names and assets
                      if (rc.biggest_robbery && rc.biggest_robbery.sha_gap > 500) {
                        const got = rc.biggest_robbery.winner_got.slice(0, 2).join(" & ");
                        const gave = rc.biggest_robbery.loser_got.slice(0, 2).join(" & ");
                        return `Biggest heist: ${rc.biggest_robbery.winner} sent ${gave} and got back ${got}. Value gap: +${fmt(rc.biggest_robbery.sha_gap)}.`;
                      }
                      // Priority 2: most lopsided win rate with context
                      const best = rc.quality_leaderboard?.[0];
                      const worst = rc.quality_leaderboard?.slice(-1)[0];
                      if (best && worst && best.win_pct >= 60 && best.trades >= 3 && worst.win_pct <= 30) {
                        return `${best.owner} wins ${best.win_pct}% of their trades. ${worst.owner} wins just ${worst.win_pct}%. The gap between the league's best and worst dealer is ${best.win_pct - worst.win_pct} points.`;
                      }
                      if (best && best.win_pct >= 60 && best.trades >= 3) {
                        return `${best.owner} has won ${best.win_pct}% of their ${best.trades} trades — averaging +${fmt(best.avg_sha_net)} value per deal.`;
                      }
                      // Priority 3: panic trades or blockbusters
                      if (rc.panic_trades >= 2) {
                        return `${rc.panic_trades} panic trades detected this season — someone is making moves they'll regret.`;
                      }
                      if (rc.blockbusters >= 2) {
                        return `${rc.blockbusters} blockbuster deals this season. This league doesn't do small ball.`;
                      }
                      // Fallback: API fun_stat
                      return rc.fun_stat || "";
                    })()}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Right — Platform stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_STATS.map((s) => (
                  <StatCard key={s.label} label={s.label} value={s.value} display={s.display} inView={heroInView} />
                ))}
              </div>
              <div className="flex items-center justify-center mt-2">
                <span className="text-[8px] font-bold tracking-[0.08em] text-gold/40" style={{ fontFamily: SANS }}>
                  Powered by DynastyGPT.com
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ═══════════════ ③ MAIN CONTENT — 3 COLUMNS ═══════════════ */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-[38fr_38fr_24fr] gap-6 items-start">

        {/* ── MY NEWS (first on mobile) ── */}
        <AnimatedSection className="order-1 lg:order-2">
          <SectionLabel title="MY NEWS" badge="COMING SOON" />
          <div className="flex flex-col gap-3">
            {currentOwner ? (
              <>
                <NewsCard
                  tag="GM REPORT" tagColor="text-accent-orange bg-accent-orange/10"
                  headline={myHeadline} lede={myLede}
                  isHero topColor={C.orange}
                />
                <NewsCard
                  tag="PRIORITIES" tagColor="text-gold bg-gold/10"
                  headline={myIntel?.positional_needs?.length
                    ? myIntel.positional_needs.length >= 3
                      ? "Multiple Roster Holes Could Derail Your Season"
                      : myIntel.positional_needs.length === 2
                      ? `${myIntel.positional_needs[0]} and ${myIntel.positional_needs[1]} — Two Spots That Need Fixing Now`
                      : `Your ${myIntel.positional_needs[0]} Room Needs an Upgrade`
                    : "No Weak Spots — This Roster Is Built to Compete"}
                  lede={myIntel?.positional_needs?.length
                    ? `Positional gaps identified. Full breakdown and upgrade targets available soon.`
                    : "Every position group is holding strong. Full positional breakdown available soon."}
                  topColor={C.gold}
                />
                <NewsCard
                  tag="TRADE INTEL" tagColor="text-accent-green bg-accent-green/10"
                  headline={`${currentOwner}'s Trade History — Full Breakdown Coming Soon`}
                  lede="Every trade graded with AI-powered verdicts. Detailed win/loss records, trade tendencies, and partner history dropping soon."
                  topColor={C.green}
                />
              </>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="text-sm text-dim mb-2" style={{ fontFamily: SANS }}>Sign in to see your personalized franchise report</div>
                <div className="text-xs text-dim/60" style={{ fontFamily: SANS }}>Link your Sleeper account to unlock GM reports, trade records, and priorities</div>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ── LEAGUE NEWS ── */}
        <AnimatedSection className="order-2 lg:order-1">
          <SectionLabel title="LEAGUE NEWS" badge="COMING SOON" />
          <div className="flex flex-col gap-3">
            {rcLoading ? (
              <><CardSkeleton isHero /><CardSkeleton /><CardSkeleton /></>
            ) : (
              <>
                <NewsCard
                  tag="LEAGUE REPORT" tagColor="text-gold bg-gold/10"
                  headline={leagueHeadline}
                  lede={personality ? `A ${personality.type.toLowerCase()} league with its own trading identity. Full season report and league-wide analytics dropping soon.` : "Full season report and league-wide analytics dropping soon."}
                  isHero topColor={C.gold}
                />
                <NewsCard
                  tag="TRADES" tagColor="text-accent-green bg-accent-green/10"
                  headline="Trade Verdicts — Who's Winning and Who's Getting Fleeced"
                  lede="AI-graded trade verdicts for every deal in your league. Robbery alerts, win streaks, and the full leaderboard coming soon."
                  topColor={C.green}
                />
                <NewsCard
                  tag="MARKET" tagColor="text-accent-blue bg-accent-blue/10"
                  headline={marketHeadline}
                  lede="Weekly value movers, buy/sell windows, and market trends across your league. Full market intelligence dropping soon."
                  topColor={C.blue}
                />
              </>
            )}
          </div>
        </AnimatedSection>

        {/* ── MARKET PULSE ── */}
        <AnimatedSection className="order-3">
          <SectionLabel title="MARKET PULSE" />

          {/* Most Traded Assets */}
          <div className="text-[10px] font-black tracking-[0.12em] text-dim mb-0.5" style={{ fontFamily: SANS }}>MOST TRADED ASSETS — LAST 120 DAYS</div>
          <div className="text-[10px] text-secondary/60 mb-3" style={{ fontFamily: SANS }}>DynastyGPT wide — 1.5M+ trades</div>
          <div className="flex flex-col mb-5">
            {(marketPulse?.most_traded || []).slice(0, 6).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-elevated/50 transition-colors rounded-sm" onClick={() => usePlayerCardStore.getState().openPlayerCard(p.player)}>
                <span className="text-[10px] font-black text-dim w-4 text-right shrink-0" style={{ fontFamily: MONO }}>{i + 1}</span>
                <PlayerHeadshot name={p.player} position={p.position || ""} size={22} />
                <PlayerName name={p.player} style={{ fontSize: 12, fontWeight: 600, color: C.primary, fontFamily: SANS }} />
                <span className="text-[10px] font-bold text-gold ml-auto shrink-0" style={{ fontFamily: MONO }}>{p.trade_count}</span>
              </div>
            ))}
            {!marketPulse?.most_traded?.length && (
              <div className="text-xs text-dim/50 py-4 text-center" style={{ fontFamily: SANS }}>Loading market data...</div>
            )}
          </div>

          {/* Above/Below Consensus */}
          <div className="text-[10px] font-black tracking-[0.12em] text-dim mb-3" style={{ fontFamily: SANS }}>TRADE MARKET — ABOVE/BELOW CONSENSUS</div>
          <div className="flex flex-col gap-1">
            {(marketPulse?.above_market || []).slice(0, 3).map((p: any, i: number) => (
              <div key={`a${i}`} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-elevated/50 transition-colors rounded-sm" onClick={() => usePlayerCardStore.getState().openPlayerCard(p.player)}>
                <PlayerHeadshot name={p.player} position={p.position || ""} size={20} />
                <PlayerName name={p.player} style={{ fontSize: 11, fontWeight: 600, color: C.primary, fontFamily: SANS }} className="truncate flex-1" />
                <span className="text-[10px] font-black text-accent-green shrink-0" style={{ fontFamily: MONO }}>+{Math.round(p.pct_diff)}%</span>
              </div>
            ))}
            {(marketPulse?.above_market?.length ?? 0) > 0 && (marketPulse?.below_market?.length ?? 0) > 0 && (
              <div className="h-px bg-border my-1" />
            )}
            {(marketPulse?.below_market || []).slice(0, 3).map((p: any, i: number) => (
              <div key={`b${i}`} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-elevated/50 transition-colors rounded-sm" onClick={() => usePlayerCardStore.getState().openPlayerCard(p.player)}>
                <PlayerHeadshot name={p.player} position={p.position || ""} size={20} />
                <PlayerName name={p.player} style={{ fontSize: 11, fontWeight: 600, color: C.primary, fontFamily: SANS }} className="truncate flex-1" />
                <span className="text-[10px] font-black text-accent-red shrink-0" style={{ fontFamily: MONO }}>{Math.round(p.pct_diff)}%</span>
              </div>
            ))}
            {!marketPulse?.above_market?.length && !marketPulse?.below_market?.length && (
              <div className="text-xs text-dim/50 py-4 text-center" style={{ fontFamily: SANS }}>Loading consensus data...</div>
            )}
          </div>
        </AnimatedSection>
      </div>

      {/* ═══════════════ ④ BOTTOM SECTION ═══════════════ */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-12 grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 items-start">

        {/* ── LEAGUE ACTIVITY ── */}
        <AnimatedSection>
          <SectionLabel title="LEAGUE ACTIVITY" />
          <RecentTrades
            trades={recentTrades?.trades || []}
            basePath={basePath}
            leagueId={lid}
            limit={5}
          />
          {reportCard?.quality_leaderboard && (
            <TradeFairnessIndex leaderboard={reportCard.quality_leaderboard} />
          )}
        </AnimatedSection>

        {/* ── LEAGUE LEGENDS ── */}
        <AnimatedSection>
          <SectionLabel title="LEAGUE LEGENDS" />
          {reportCard ? <LeagueLegends reportCard={reportCard} /> : (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-16 bg-elevated rounded-lg animate-pulse" />)}
            </div>
          )}
        </AnimatedSection>
      </div>

      <style>{`
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}
