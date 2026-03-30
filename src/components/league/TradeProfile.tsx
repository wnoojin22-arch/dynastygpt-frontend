"use client";

import React, { useState, useMemo, ReactNode } from "react";
import PlayerName from "./PlayerName";
import {
  TrendingUp, TrendingDown, Minus, Trophy, Target, Shield,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Clock,
  Users, Zap, ChevronDown, ChevronUp, Filter,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   TRADE PROFILE — 10-section owner intelligence dashboard
   Ported from Shadynasty TradeProfileTab, matching or beating design.
   Data: getOwnerProfile() → behavioral_profile.py
   ═══════════════════════════════════════════════════════════════ */

// ── Color helpers ──

function gradeColor(g: string): string {
  if (!g) return "#9596a5";
  if (g.startsWith("A")) return "#7dd3a0";
  if (g.startsWith("B")) return "#6bb8e0";
  if (g.startsWith("C")) return "#d4a532";
  if (g.startsWith("D")) return "#e09c6b";
  return "#e47272";
}

function posColor(pos: string): string {
  if (pos === "QB") return "#e47272";
  if (pos === "RB") return "#6bb8e0";
  if (pos === "WR") return "#7dd3a0";
  if (pos === "TE") return "#e09c6b";
  if (pos === "PICK" || pos === "PICKS") return "#d4a532";
  return "#9596a5";
}

function trendColor(trend: string): string {
  if (trend === "IMPROVING") return "#7dd3a0";
  if (trend === "DECLINING") return "#e47272";
  return "#d4a532";
}

function deadlineColor(b: string): string {
  if (b === "BUYER") return "#7dd3a0";
  if (b === "SELLER") return "#e47272";
  return "#9596a5";
}

function sunkCostColor(label: string): string {
  if (label === "QUICK TRIGGER") return "#e09c6b";
  if (label === "RATIONAL") return "#7dd3a0";
  if (label === "DIAMOND HANDS") return "#6bb8e0";
  return "#9596a5";
}

function styleColor(style: string): string {
  if (style === "CONSOLIDATOR") return "#6bb8e0";
  if (style === "DISTRIBUTOR") return "#e09c6b";
  return "#d4a532";
}

function trustColor(label: string): string {
  if (label === "SHARK") return "#7dd3a0";
  if (label === "SHARP") return "#6bb8e0";
  if (label === "AVERAGE") return "#d4a532";
  if (label === "EASY TARGET") return "#e09c6b";
  if (label === "PUSHOVER") return "#e47272";
  return "#9596a5";
}

function verdictColor(v: string | null): { color: string; bg: string } {
  const s = (v || "").toLowerCase();
  if (s === "won" || s === "slight edge" || s === "robbery")
    return { color: "#7dd3a0", bg: "rgba(125,211,160,0.12)" };
  if (s === "lost" || s === "slight loss" || s === "got robbed")
    return { color: "#e47272", bg: "rgba(228,114,114,0.12)" };
  if (s === "push" || s === "win-win")
    return { color: "#6bb8e0", bg: "rgba(107,184,224,0.12)" };
  if (s === "too early" || s === "promising")
    return { color: "#d4a532", bg: "rgba(212,165,50,0.10)" };
  return { color: "#9596a5", bg: "rgba(149,150,165,0.10)" };
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${m[dt.getMonth()]} '${String(dt.getFullYear()).slice(2)}`;
}

type VerdictFilter = "ALL" | "WON" | "LOST" | "PUSH" | "DEVELOPING";
function mapVerdict(v: string | null): VerdictFilter {
  const s = (v || "").toLowerCase();
  if (s === "won" || s === "slight edge" || s === "robbery") return "WON";
  if (s === "lost" || s === "slight loss" || s === "got robbed") return "LOST";
  if (s === "push" || s === "win-win") return "PUSH";
  return "DEVELOPING";
}

// ── Section wrapper ──

function Section({ label, labelColor, labelBg, children, right }: {
  label: string; labelColor?: string; labelBg?: string;
  children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-2.5 border-b border-border flex items-center justify-between"
        style={{ background: labelBg || "rgba(212,165,50,0.05)" }}>
        <span className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ color: labelColor || "#d4a532" }}>{label}</span>
        {right}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Narrative generators (rules-based, no AI dependency) ──

function generateScoutingReport(owner: string, trading: any, meta: any): ReactNode {
  const record = trading.record || {};
  const momentum = trading.momentum || {};
  const archetype = trading.archetype || {};
  const badges = (trading.badges || []) as string[];
  const tendencies = trading.position_tendencies || {};
  const netFlow = tendencies.net_flow || {};
  const complexity = trading.complexity || {};
  const sunkCost = meta?.sunk_cost?.label || "";
  const trust = meta?.trade_trust?.label || "";
  const bestTrade = trading.best_trade;
  const worstTrade = trading.worst_trade;
  const totalTrades = trading.total_trades || 0;
  const shaperPct = trading.league_shaper_pct || 0;

  const decided = (record.wins || 0) + (record.losses || 0);
  const winRate = decided > 0 ? Math.round((record.wins || 0) / decided * 100) : 0;
  const robberies = record.robberies_committed || 0;
  const trend = momentum.trend || "STABLE";

  // Most acquired and most sold positions (excluding PICK/PICKS)
  const mostAcquired = Object.entries(netFlow as Record<string, number>)
    .filter(([p, f]) => p !== "PICK" && p !== "PICKS" && f > 0)
    .sort((a, b) => b[1] - a[1])[0];
  const mostSold = Object.entries(netFlow as Record<string, number>)
    .filter(([p, f]) => p !== "PICK" && p !== "PICKS" && f < 0)
    .sort((a, b) => a[1] - b[1])[0];

  const parts: ReactNode[] = [];

  // 1. Opening — archetype + defining stat (ALWAYS the lead)
  if (archetype.title) {
    if (winRate >= 55 && robberies >= 2)
      parts.push(<span key="open"><strong className="text-primary">{owner}</strong> is a {archetype.title.toLowerCase()} and a serial trade predator — {robberies} robberies and a {winRate}% win rate across {totalTrades} trades. </span>);
    else if (winRate <= 35 && totalTrades >= 10)
      parts.push(<span key="open"><strong className="text-primary">{owner}</strong> is a {archetype.title.toLowerCase()} who can&apos;t stop making moves — {totalTrades} trades with a brutal {winRate}% win rate that tells you everything about their decision-making. </span>);
    else if (winRate >= 50)
      parts.push(<span key="open"><strong className="text-primary">{owner}</strong> is a {archetype.title.toLowerCase()} running a net-positive trade desk at {winRate}% across {totalTrades} deals. </span>);
    else
      parts.push(<span key="open"><strong className="text-primary">{owner}</strong> is a {archetype.title.toLowerCase()} with a {record.wins || 0}-{record.losses || 0} trade record across {totalTrades} moves. </span>);
  } else {
    parts.push(<span key="open"><strong className="text-primary">{owner}</strong> has made {totalTrades} trades with a {winRate}% win rate ({record.wins || 0}-{record.losses || 0}). </span>);
  }

  // 2. Badge-driven personality line
  if (badges.includes("GETS FLEECED") && badges.includes("ACTIVE TRADER"))
    parts.push(<span key="badge">The most active trader in the league and consistently the most exploited — </span>);
  else if (badges.includes("GETS FLEECED"))
    parts.push(<span key="badge">A pattern of getting the short end of deals — </span>);
  else if (badges.includes("DEADLINE BUYER"))
    parts.push(<span key="badge">A reliable deadline buyer who opens the checkbook when the pressure&apos;s on — </span>);
  else if (shaperPct >= 30)
    parts.push(<span key="badge">Involved in {shaperPct}% of all league trades, a constant presence at the negotiating table — </span>);

  // 3. Position pattern (what they chase)
  if (mostAcquired) {
    const [pos, flow] = mostAcquired;
    if (mostSold) {
      parts.push(<span key="flow">they buy <strong className="text-primary">{pos}s</strong> (+{flow} net) and sell off {mostSold[0]}s ({mostSold[1]} net). </span>);
    } else {
      parts.push(<span key="flow">they&apos;re constantly chasing <strong className="text-primary">{pos}s</strong> (+{flow} net acquired). </span>);
    }
  }

  // 4. Best or worst trade callout (pick the more dramatic one)
  if (worstTrade?.letter === "F" && worstTrade?.gave && worstTrade?.got) {
    parts.push(<span key="worst">Their worst move — giving up {worstTrade.gave} for {worstTrade.got} — still haunts the franchise. </span>);
  } else if (bestTrade?.letter?.startsWith("A") && bestTrade?.gave && bestTrade?.got) {
    parts.push(<span key="best">Their best move was flipping {bestTrade.gave} into {bestTrade.got} ({bestTrade.letter}). </span>);
  }

  // 5. Sunk cost + trust verdict
  if (sunkCost === "DIAMOND HANDS" && trust === "EASY TARGET")
    parts.push(<span key="verdict">Diamond hands mentality with an easy-target classification — they hold too long and fold too easily in negotiations.</span>);
  else if (trust === "SHARK")
    parts.push(<span key="verdict">Classified as a <strong className="text-primary">SHARK</strong> — approach with a sharp offer or don&apos;t approach at all.</span>);
  else if (trust === "EASY TARGET" || trust === "PUSHOVER")
    parts.push(<span key="verdict">Classified as <strong className="text-primary">{trust}</strong> — exploitable in negotiations.</span>);
  else if (trend === "DECLINING")
    parts.push(<span key="verdict">Trade quality is <strong className="text-primary">declining</strong> — recent moves have been increasingly costly.</span>);
  else if (trend === "IMPROVING")
    parts.push(<span key="verdict">Trade grades are <strong className="text-primary">improving</strong> — a sharpening evaluator who&apos;s getting harder to beat.</span>);

  return <p className="font-sans text-sm text-secondary leading-relaxed">{parts}</p>;
}

function generateHowToBeat(trading: any, meta: any): { title: string; detail: string; color: string }[] {
  const tendencies = trading.position_tendencies || {};
  const netFlow = tendencies.net_flow || {};
  const sunkCost = meta?.sunk_cost?.label || "";
  const trust = meta?.trade_trust?.label || "";
  const complexity = trading.complexity || {};
  const lines: { title: string; detail: string; color: string }[] = [];

  // Blind spot: position they chase but lose on
  const chasePositions = Object.entries(netFlow as Record<string, number>)
    .filter(([p, f]) => p !== "PICK" && p !== "PICKS" && f > 0)
    .sort((a, b) => b[1] - a[1]);
  if (chasePositions.length > 0) {
    const [pos, flow] = chasePositions[0];
    lines.push({
      title: `Target their ${pos} desperation`,
      detail: `They've accumulated +${flow} net ${pos}s — offer a ${pos} package and extract premium value in return.`,
      color: "#e47272",
    });
  }

  // Sunk cost exploit
  if (sunkCost === "DIAMOND HANDS") {
    lines.push({
      title: "Exploit their holding pattern",
      detail: "They hold declining assets too long — offer to 'buy' their aging stars before the cliff, they'll feel like they're selling high.",
      color: "#e09c6b",
    });
  } else if (sunkCost === "QUICK TRIGGER") {
    lines.push({
      title: "Wait for the impulse",
      detail: "They sell fast and react to news — be ready with a lowball offer after a bad week or injury report.",
      color: "#e09c6b",
    });
  }

  // Trust level exploit
  if (trust === "EASY TARGET" || trust === "PUSHOVER") {
    lines.push({
      title: "They don't negotiate well",
      detail: `Classified as ${trust} — their first offer is usually close to their best offer. Start aggressive.`,
      color: "#d4a532",
    });
  }

  // Complexity exploit
  if ((complexity.multi_asset_pct || 0) >= 60) {
    lines.push({
      title: "Overwhelm with multi-piece packages",
      detail: `${complexity.multi_asset_pct}% of their trades are multi-asset — they respond to volume. Bundle depth pieces + picks.`,
      color: "#6bb8e0",
    });
  }

  return lines.slice(0, 3);
}

function generateExploits(trading: any): { title: string; body: string; color: string }[] {
  const seasonal = trading.seasonal_timing || {};
  const pressure = trading.pressure_trading || {};
  const deadline = trading.deadline_behavior || {};
  const badges = trading.badges || [];
  const exploits: { title: string; body: string; color: string }[] = [];

  // Seasonal pattern
  const offseason = seasonal.offseason || 0;
  const late = seasonal.late || 0;
  const total = (seasonal.offseason || 0) + (seasonal.early || 0) + (seasonal.mid || 0) + (seasonal.late || 0);
  if (total > 0 && late / total > 0.3) {
    exploits.push({
      title: "LATE-SEASON URGENCY",
      body: `${Math.round(late / total * 100)}% of trades happen late in the season — they panic-trade under standings pressure. Target them in weeks 10-14.`,
      color: "#e47272",
    });
  } else if (total > 0 && offseason / total > 0.4) {
    exploits.push({
      title: "OFFSEASON MOVER",
      body: `${Math.round(offseason / total * 100)}% of trades happen in the offseason — they plan ahead. Pitch them post-draft before values settle.`,
      color: "#6bb8e0",
    });
  }

  // Badge-based
  if (badges.includes("GIVES UP PICKS")) {
    exploits.push({
      title: "PICK SPENDER",
      body: "They freely give up draft capital — package trade offers with pick requests, they'll say yes more often than they should.",
      color: "#d4a532",
    });
  }
  if (badges.includes("GETS FLEECED")) {
    exploits.push({
      title: "VALUE BLEEDER",
      body: "Historical pattern of losing trades — present 'fair' offers that slightly favor you. They'll accept what feels close.",
      color: "#e09c6b",
    });
  }
  if (badges.includes("RB HOARDER") || badges.includes("WR HOARDER")) {
    const pos = badges.includes("RB HOARDER") ? "RB" : "WR";
    exploits.push({
      title: `${pos} ADDICTION`,
      body: `They can't stop acquiring ${pos}s — dangle a ${pos} in any trade and watch their eyes light up, even if the value doesn't match.`,
      color: posColor(pos),
    });
  }

  return exploits.slice(0, 3);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function TradeProfile({ ownerName, profile }: {
  ownerName: string;
  profile: Record<string, unknown>;
}) {
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [showAllTrades, setShowAllTrades] = useState(false);

  const trading = (profile.trading || {}) as Record<string, any>;
  const meta = (profile.meta || {}) as Record<string, any>;
  const record = trading.record || {};
  const archetype = trading.archetype || {};
  const momentum = trading.momentum || {};
  const avgByYear = momentum.avg_by_year || {};
  const complexity = trading.complexity || {};
  const valueTendencies = trading.value_tendencies || {};
  const sunkCost = meta.sunk_cost || {};
  const tradeTrust = meta.trade_trust || {};
  const tendencies = trading.position_tendencies || {};
  const acquired = tendencies.acquired || {};
  const given = tendencies.given || {};
  const netFlow = tendencies.net_flow || {};
  const deadline = trading.deadline_behavior || {};
  const timing = trading.timing || {};
  const byMonth = timing.by_month || {};
  const seasonal = trading.seasonal_timing || {};
  const trades = (trading.trades_timeline || []) as any[];
  const bestTrade = trading.best_trade;
  const worstTrade = trading.worst_trade;
  const partners = (trading.partners || []) as any[];

  // Derived
  const winsOnly = record.wins || 0;
  const lossesOnly = record.losses || 0;
  const decidedWL = winsOnly + lossesOnly;
  const winRate = decidedWL > 0 ? Math.round((winsOnly / decidedWL) * 100) : 0;
  const winRateColor = winRate >= 55 ? "#7dd3a0" : winRate <= 40 ? "#e47272" : "#d4a532";

  // SVG ring
  const circumference = 2 * Math.PI * 52;
  const arcLength = (winRate / 100) * circumference;

  // Trade years
  const tradeYears = useMemo(() => {
    const years = new Set<string>();
    trades.forEach((t: any) => { if (t.date) years.add(String(new Date(t.date).getFullYear())); });
    return Array.from(years).sort().reverse();
  }, [trades]);

  // Year outcomes for stacked chart
  const yearOutcomes = useMemo(() => {
    const byYear: Record<string, { won: number; winWin: number; lost: number; push: number; developing: number; total: number }> = {};
    for (const t of trades) {
      if (!t.date) continue;
      const year = String(new Date(t.date).getFullYear());
      if (!byYear[year]) byYear[year] = { won: 0, winWin: 0, lost: 0, push: 0, developing: 0, total: 0 };
      const v = (t.verdict || "").toLowerCase();
      if (v === "won" || v === "slight edge" || v === "robbery") byYear[year].won++;
      else if (v === "win-win") byYear[year].winWin++;
      else if (v === "lost" || v === "slight loss" || v === "got robbed") byYear[year].lost++;
      else if (v === "push") byYear[year].push++;
      else byYear[year].developing++;
      byYear[year].total++;
    }
    return Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b));
  }, [trades]);
  const maxYearTrades = Math.max(...yearOutcomes.map(([, d]) => d.total), 1);

  // Partner breakdown
  const partnerBreakdown = useMemo(() => {
    const map: Record<string, { name: string; won: number; lost: number; push: number; total: number }> = {};
    for (const t of trades) {
      if (!t.partner) continue;
      if (!map[t.partner]) map[t.partner] = { name: t.partner, won: 0, lost: 0, push: 0, total: 0 };
      const v = (t.verdict || "").toLowerCase();
      if (v === "won" || v === "slight edge" || v === "robbery" || v === "win-win") map[t.partner].won++;
      else if (v === "lost" || v === "slight loss" || v === "got robbed") map[t.partner].lost++;
      else map[t.partner].push++;
      map[t.partner].total++;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    let result = trades;
    if (verdictFilter !== "ALL") result = result.filter((t: any) => mapVerdict(t.verdict) === verdictFilter);
    if (yearFilter !== "ALL") result = result.filter((t: any) => t.date && String(new Date(t.date).getFullYear()) === yearFilter);
    return result;
  }, [trades, verdictFilter, yearFilter]);

  // Position flow
  const flowPositions = ["QB", "RB", "WR", "TE", "PICKS"];
  const maxFlow = Math.max(...flowPositions.map(p => Math.abs(netFlow[p] || 0)), 1);

  // Monthly
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const monthCounts = monthLabels.map((_, i) => byMonth[String(i + 1)] || 0);
  const maxMonth = Math.max(...monthCounts, 1);

  // Narratives
  const scoutingReport = useMemo(() => generateScoutingReport(ownerName, trading, meta), [ownerName, trading, meta]);
  const howToBeat = useMemo(() => generateHowToBeat(trading, meta), [trading, meta]);
  const exploits = useMemo(() => generateExploits(trading), [trading]);

  // Deadline
  const deadlineYears = Object.keys(deadline).sort();

  return (
    <div className="flex flex-col gap-5">

      {/* ═══ SECTION 1: SCOUTING REPORT ═══ */}
      <Section label="Scouting Report">
        {scoutingReport}
      </Section>

      {/* ═══ SECTION 2: HOW TO BEAT THEM ═══ */}
      {howToBeat.length > 0 && (
        <Section label="How to Beat Them" labelColor="#e47272" labelBg="rgba(228,114,114,0.06)">
          <div className="flex flex-col gap-2.5">
            {howToBeat.map((item, i) => (
              <div key={i} className="pl-4 py-2.5 rounded-r-lg" style={{ borderLeft: `3px solid ${item.color}`, background: `${item.color}08` }}>
                <p className="font-sans text-sm font-semibold text-primary mb-0.5">{item.title}</p>
                <p className="font-sans text-sm text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ SECTION 3: TRADE IDENTITY ═══ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Archetype banner */}
        <div className="px-5 py-3.5 border-b border-border" style={{ background: "rgba(212,165,50,0.06)" }}>
          <div className="font-sans text-lg font-black text-gold tracking-tight">{archetype.title || "UNKNOWN"}</div>
          {archetype.description && <p className="font-sans text-sm text-secondary mt-0.5">{archetype.description}</p>}
        </div>

        {/* 4-column stat grid */}
        <div className="grid grid-cols-4 divide-x divide-border">
          {/* Win Rate Ring */}
          <div className="flex flex-col items-center justify-center py-5 px-3">
            <svg width="120" height="120" viewBox="0 0 120 120" className="mb-2">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1a1e30" strokeWidth="6" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={winRateColor} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${arcLength} ${circumference}`} transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" fill={winRateColor} fontSize="28" fontWeight="900"
                fontFamily="-apple-system, 'SF Pro Display', sans-serif">{winRate}%</text>
              <text x="60" y="72" textAnchor="middle" fill="#9596a5" fontSize="9" fontWeight="700"
                letterSpacing="2" fontFamily="-apple-system, sans-serif">WIN RATE</text>
            </svg>
            <span className="font-sans text-[10px] text-dim text-center">
              {winRate >= 55 ? "Wins more than they lose" : winRate <= 40 ? "Loses more than they win" : "Balanced win rate"}
            </span>
          </div>

          {/* Trade Record */}
          <div className="flex flex-col items-center justify-center py-5 px-3">
            <span className="font-sans text-[10px] font-bold tracking-widest text-dim mb-3">TRADE RECORD</span>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 w-full">
              {[
                { label: "WINS", value: record.wins || 0, color: "#7dd3a0" },
                { label: "WIN-WIN", value: record.win_wins || 0, color: "#5eead4" },
                { label: "LOSSES", value: record.losses || 0, color: "#e47272" },
                ...(record.robberies_committed > 0 ? [{ label: "ROB'D", value: record.robberies_committed, color: "#f87171" }] : []),
                ...(record.robberies_suffered > 0 ? [{ label: "VICTIM", value: record.robberies_suffered, color: "#e09c6b" }] : []),
                { label: "PUSH", value: record.pushes || 0, color: "#6bb8e0" },
              ].map((r) => (
                <React.Fragment key={r.label}>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: r.color }} />
                    <span className="font-sans text-[10px] text-dim">{r.label}</span>
                  </div>
                  <span className="font-sans text-sm font-bold text-right" style={{ color: r.color }}>{r.value}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Profile Badges */}
          <div className="flex flex-col items-center justify-center py-5 px-3 gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest text-dim mb-1">PROFILE</span>
            {sunkCost.label && (
              <span className="font-sans text-[10px] font-bold tracking-wider px-3 py-1 rounded"
                style={{ color: sunkCostColor(sunkCost.label), background: `${sunkCostColor(sunkCost.label)}15`, border: `1px solid ${sunkCostColor(sunkCost.label)}30` }}>
                {sunkCost.label}
              </span>
            )}
            {valueTendencies.style && (
              <span className="font-sans text-[10px] font-bold tracking-wider px-3 py-1 rounded"
                style={{ color: styleColor(valueTendencies.style), background: `${styleColor(valueTendencies.style)}15`, border: `1px solid ${styleColor(valueTendencies.style)}30` }}>
                {valueTendencies.style}
              </span>
            )}
            {tradeTrust.label && (
              <span className="font-sans text-[10px] font-bold tracking-wider px-3 py-1 rounded"
                style={{ color: trustColor(tradeTrust.label), background: `${trustColor(tradeTrust.label)}15`, border: `1px solid ${trustColor(tradeTrust.label)}30` }}>
                {tradeTrust.label}
              </span>
            )}
            <span className="font-sans text-[10px] text-dim text-center mt-1">
              {sunkCost.label === "DIAMOND HANDS" ? "Holds assets too long" : sunkCost.label === "QUICK TRIGGER" ? "Sells fast, acts on impulse" : "Rational asset management"}
            </span>
          </div>

          {/* League Shaper */}
          <div className="flex flex-col items-center justify-center py-5 px-3">
            <span className="font-sans text-[10px] font-bold tracking-widest text-dim mb-3">LEAGUE SHAPER</span>
            <span className="font-sans text-4xl font-black text-gold leading-none mb-2">
              {trading.league_shaper_pct != null ? `${trading.league_shaper_pct}%` : "—"}
            </span>
            <span className="font-sans text-[11px] text-dim mb-1">
              {trading.total_trades || 0} of {trading.league_total_trades || 0} trades
            </span>
            <span className="font-sans text-[10px] text-dim text-center">
              Involved in {trading.league_shaper_pct ?? 0}% of all league trades
            </span>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: TRADE MOMENTUM ═══ */}
      <div>
        <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim mb-3 uppercase">Trade Momentum</div>

        {/* Yearly outcomes stacked chart */}
        <Section label="Yearly Outcomes" labelColor={trendColor(momentum.trend || "STABLE")} labelBg={`${trendColor(momentum.trend || "STABLE")}08`}
          right={
            <div className="flex items-center gap-3">
              {[
                { label: "WON", color: "#7dd3a0" },
                { label: "WIN-WIN", color: "#5eead4" },
                { label: "PUSH", color: "#6bb8e0" },
                { label: "LOST", color: "#e47272" },
                { label: "TBD", color: "#d4a532" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ background: color }} />
                  <span className="font-sans text-[8px] text-dim">{label}</span>
                </div>
              ))}
              {momentum.trend && (
                <span className="font-sans text-[9px] font-bold px-2 py-0.5 rounded ml-1"
                  style={{ color: trendColor(momentum.trend), background: `${trendColor(momentum.trend)}15`, border: `1px solid ${trendColor(momentum.trend)}30` }}>
                  {momentum.trend}
                </span>
              )}
            </div>
          }>
          {yearOutcomes.length > 0 ? (
            <>
              <div className="flex items-end gap-2 h-[120px] mb-2">
                {yearOutcomes.map(([year, d]) => {
                  const barHeight = Math.max(12, (d.total / maxYearTrades) * 110);
                  const segments = [
                    { count: d.won, color: "#7dd3a0" },
                    { count: d.winWin, color: "#5eead4" },
                    { count: d.push, color: "#6bb8e0" },
                    { count: d.lost, color: "#e47272" },
                    { count: d.developing, color: "#d4a532" },
                  ].filter(s => s.count > 0);
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center justify-end h-full">
                      <span className="font-sans text-[9px] font-bold text-secondary mb-1">{d.won + d.winWin}-{d.lost}</span>
                      <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{ height: `${barHeight}px` }}>
                        {segments.map((seg, si) => (
                          <div key={si} style={{ height: `${(seg.count / d.total) * 100}%`, background: seg.color, opacity: 0.8, minHeight: "2px" }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {yearOutcomes.map(([year]) => (
                  <div key={year} className="flex-1 text-center font-sans text-[9px] text-dim">{String(year).slice(2)}</div>
                ))}
              </div>
            </>
          ) : (
            <div className="font-sans text-sm text-dim text-center py-4">No trade history</div>
          )}
        </Section>

        {/* Best / Worst trade */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {bestTrade && (
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderLeft: "4px solid #7dd3a0" }}>
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between" style={{ background: "rgba(125,211,160,0.06)" }}>
                <span className="font-sans text-[10px] font-bold tracking-widest" style={{ color: "#7dd3a0" }}>BEST TRADE</span>
                {bestTrade.letter && (
                  <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ color: gradeColor(bestTrade.letter), background: `${gradeColor(bestTrade.letter)}15`, border: `1px solid ${gradeColor(bestTrade.letter)}30` }}>
                    {bestTrade.letter}
                  </span>
                )}
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans text-[11px] text-dim">{formatDate(bestTrade.date)}</span>
                  {bestTrade.partner && <span className="font-sans text-sm font-semibold text-secondary">vs {bestTrade.partner}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <div><span className="font-sans text-[10px] text-dim">Gave: </span><span className="font-sans text-xs text-secondary">{bestTrade.gave || "—"}</span></div>
                  <div><span className="font-sans text-[10px] text-dim">Got: </span><span className="font-sans text-xs text-primary">{bestTrade.got || "—"}</span></div>
                </div>
              </div>
            </div>
          )}
          {worstTrade && (
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderLeft: "4px solid #e47272" }}>
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between" style={{ background: "rgba(228,114,114,0.06)" }}>
                <span className="font-sans text-[10px] font-bold tracking-widest" style={{ color: "#e47272" }}>WORST TRADE</span>
                {worstTrade.letter && (
                  <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ color: gradeColor(worstTrade.letter), background: `${gradeColor(worstTrade.letter)}15`, border: `1px solid ${gradeColor(worstTrade.letter)}30` }}>
                    {worstTrade.letter}
                  </span>
                )}
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans text-[11px] text-dim">{formatDate(worstTrade.date)}</span>
                  {worstTrade.partner && <span className="font-sans text-sm font-semibold text-secondary">vs {worstTrade.partner}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <div><span className="font-sans text-[10px] text-dim">Gave: </span><span className="font-sans text-xs text-secondary">{worstTrade.gave || "—"}</span></div>
                  <div><span className="font-sans text-[10px] text-dim">Got: </span><span className="font-sans text-xs text-primary">{worstTrade.got || "—"}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 5: WHAT THEY TRADE FOR ═══ */}
      <div>
        <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim mb-3 uppercase">What They Trade For</div>
        <div className="grid grid-cols-3 gap-4">
          {/* Position Flow */}
          <Section label="Position Flow">
            <div className="flex flex-col gap-2.5">
              {flowPositions.map(pos => {
                const acq = acquired[pos] || 0;
                const gvn = given[pos] || 0;
                const flow = netFlow[pos] || 0;
                const pc = posColor(pos);
                const barPct = Math.abs(flow) / maxFlow * 50;
                return (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="font-sans text-[10px] w-5 text-right shrink-0" style={{ color: "#7dd3a0" }}>{acq}</span>
                    <span className="font-sans text-[10px] font-bold w-11 text-center py-0.5 rounded shrink-0" style={{ color: pc, background: `${pc}15` }}>{pos}</span>
                    <div className="flex-1 h-5 relative">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                      {flow !== 0 && (
                        <div className="absolute top-0.5 bottom-0.5 rounded-sm"
                          style={{
                            background: flow > 0 ? "#7dd3a0" : "#e47272", opacity: 0.7,
                            ...(flow > 0 ? { left: "50%", width: `${barPct}%` } : { right: "50%", width: `${barPct}%` }),
                          }} />
                      )}
                    </div>
                    <span className="font-sans text-[10px] w-5 text-left shrink-0" style={{ color: "#e47272" }}>{gvn}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Complexity */}
          <Section label="Complexity" labelColor="#6bb8e0" labelBg="rgba(107,184,224,0.05)">
            <div className="flex flex-col gap-3">
              {[
                { label: "Avg assets/trade", value: complexity.avg_assets_per_trade?.toFixed(1) || "—", pct: ((complexity.avg_assets_per_trade || 0) / 5) * 100 },
                { label: "Multi-asset %", value: complexity.multi_asset_pct != null ? `${complexity.multi_asset_pct}%` : "—", pct: complexity.multi_asset_pct || 0 },
                { label: "3+ asset %", value: complexity.three_plus_pct != null ? `${complexity.three_plus_pct}%` : "—", pct: complexity.three_plus_pct || 0 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans text-[10px] text-dim">{item.label}</span>
                    <span className="font-sans text-xs font-bold text-secondary">{item.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, item.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Deadline Behavior */}
          <Section label="Deadline Behavior" labelColor="#e09c6b" labelBg="rgba(224,156,107,0.05)">
            {deadlineYears.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {deadlineYears.map(year => {
                    const b = deadline[year];
                    const dc = deadlineColor(b);
                    return (
                      <div key={year} className="flex flex-col items-center gap-1">
                        <span className="font-sans text-[9px] font-bold tracking-wider px-2 py-1 rounded"
                          style={{ color: dc, background: `${dc}15`, border: `1px solid ${dc}30`, opacity: b === "INACTIVE" ? 0.4 : 1 }}>
                          {b === "BUYER" ? "BUY" : b === "SELLER" ? "SELL" : "—"}
                        </span>
                        <span className="font-sans text-[9px] text-dim">{String(year).slice(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="font-sans text-[10px] text-dim">
                  Net buyer in {deadlineYears.filter(y => deadline[y] === "BUYER").length} of {deadlineYears.length} seasons
                </p>
              </>
            ) : <div className="font-sans text-sm text-dim">No deadline data</div>}
          </Section>
        </div>
      </div>

      {/* ═══ SECTION 6: EXPLOIT THEIR TENDENCIES ═══ */}
      {exploits.length > 0 && (
        <div>
          <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim mb-3 uppercase">Exploit Their Tendencies</div>
          <div className="flex flex-col gap-3">
            {exploits.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderLeft: `4px solid ${item.color}` }}>
                <div className="px-5 py-3.5">
                  <div className="font-sans text-[10px] font-bold tracking-widest mb-1" style={{ color: item.color }}>{item.title}</div>
                  <p className="font-sans text-sm text-secondary">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 7: PARTNER BREAKDOWN ═══ */}
      {partnerBreakdown.length > 0 && (
        <div>
          <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim mb-3 uppercase">Partner Breakdown</div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {partnerBreakdown.map((p) => {
              const isDominated = p.won > 0 && p.lost === 0 && p.total >= 2;
              const isDominating = p.lost > 0 && p.won === 0 && p.total >= 2;
              const borderColor = isDominated ? "#7dd3a0" : isDominating ? "#e47272" : "#1a1e30";
              return (
                <div key={p.name} className="bg-card border rounded-lg px-3 py-2.5" style={{ borderColor }}>
                  <div className="font-sans text-sm font-semibold text-primary truncate mb-1">{p.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-xs font-bold" style={{ color: "#7dd3a0" }}>{p.won}W</span>
                    <span className="font-sans text-[10px] text-dim">-</span>
                    <span className="font-sans text-xs font-bold" style={{ color: "#e47272" }}>{p.lost}L</span>
                    {p.push > 0 && <>
                      <span className="font-sans text-[10px] text-dim">-</span>
                      <span className="font-sans text-xs font-bold" style={{ color: "#6bb8e0" }}>{p.push}P</span>
                    </>}
                  </div>
                  {isDominated && <span className="font-sans text-[9px] font-bold text-accent-green mt-1 block">DOMINATES</span>}
                  {isDominating && <span className="font-sans text-[9px] font-bold text-accent-red mt-1 block">DOMINATED BY</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION 8: THE TAPE (Trade Log) ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim uppercase">The Tape</div>
          <span className="font-sans text-[10px] text-dim">{filteredTrades.length} trades</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(["ALL", "WON", "LOST", "PUSH", "DEVELOPING"] as VerdictFilter[]).map((f) => {
            const active = verdictFilter === f;
            const c = f === "WON" ? "#7dd3a0" : f === "LOST" ? "#e47272" : f === "PUSH" ? "#6bb8e0" : f === "DEVELOPING" ? "#d4a532" : "#9596a5";
            return (
              <button key={f} onClick={() => setVerdictFilter(f)}
                className={`font-sans text-[10px] font-bold tracking-wider px-2.5 py-1 rounded transition-colors cursor-pointer
                  ${active ? "text-primary" : "text-dim hover:text-secondary"}`}
                style={active ? { color: c, background: `${c}15`, border: `1px solid ${c}30` } : { border: "1px solid transparent" }}>
                {f}
              </button>
            );
          })}
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            className="font-sans text-[10px] text-dim bg-elevated border border-border rounded px-2 py-1 ml-auto cursor-pointer">
            <option value="ALL">All years</option>
            {tradeYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {filteredTrades.slice(0, showAllTrades ? undefined : 10).map((t: any, i: number) => {
              const vc = verdictColor(t.verdict);
              return (
                <div key={`${t.trade_id}-${i}`} className="px-4 py-3 border-b border-white/[0.04] hover:bg-elevated/40 transition-colors"
                  style={{ borderLeft: `3px solid ${vc.color}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[10px] text-dim">{formatDate(t.date)}</span>
                      {t.verdict && (
                        <span className="font-sans text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: vc.color, background: vc.bg }}>{t.verdict}</span>
                      )}
                      {t.letter && (
                        <span className="font-sans text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: gradeColor(t.letter), background: `${gradeColor(t.letter)}15` }}>{t.letter}</span>
                      )}
                    </div>
                    <span className="font-sans text-[11px] text-secondary">vs {t.partner}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-sans text-[9px] text-dim block mb-0.5">Gave</span>
                      <span className="font-sans text-xs text-secondary">{t.gave || "—"}</span>
                    </div>
                    <div>
                      <span className="font-sans text-[9px] text-dim block mb-0.5">Got</span>
                      <span className="font-sans text-xs text-primary">{t.got || "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTrades.length === 0 && (
              <div className="px-4 py-8 font-sans text-sm text-dim text-center">No trades match filters</div>
            )}
          </div>
          {filteredTrades.length > 10 && !showAllTrades && (
            <div className="px-4 py-2.5 border-t border-border text-center">
              <button onClick={() => setShowAllTrades(true)} className="font-sans text-xs text-gold hover:text-gold-bright transition-colors cursor-pointer">
                Show all {filteredTrades.length} trades
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 9: TIMING PATTERNS ═══ */}
      <div>
        <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-dim mb-3 uppercase">Timing Patterns</div>
        <div className="grid grid-cols-2 gap-4">
          {/* Monthly Distribution */}
          <Section label="Monthly Distribution">
            <div className="flex items-end gap-1 h-[80px] mb-2">
              {monthCounts.map((count, i) => {
                const barH = Math.max(4, (count / maxMonth) * 72);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    {count > 0 && <span className="font-sans text-[8px] text-secondary mb-0.5">{count}</span>}
                    <div className="w-full rounded-t-sm" style={{ height: `${barH}px`, background: count > 0 ? "#d4a532" : "#171b28", opacity: count > 0 ? 0.8 : 0.3 }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1">
              {monthLabels.map((l, i) => (
                <div key={i} className="flex-1 text-center font-sans text-[8px] text-dim">{l}</div>
              ))}
            </div>
          </Section>

          {/* Timing Stats */}
          <Section label="Timing Stats">
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Offseason", value: seasonal.offseason || 0, total: (seasonal.offseason || 0) + (seasonal.early || 0) + (seasonal.mid || 0) + (seasonal.late || 0) },
                { label: "Early season", value: seasonal.early || 0, total: (seasonal.offseason || 0) + (seasonal.early || 0) + (seasonal.mid || 0) + (seasonal.late || 0) },
                { label: "Mid season", value: seasonal.mid || 0, total: (seasonal.offseason || 0) + (seasonal.early || 0) + (seasonal.mid || 0) + (seasonal.late || 0) },
                { label: "Late season", value: seasonal.late || 0, total: (seasonal.offseason || 0) + (seasonal.early || 0) + (seasonal.mid || 0) + (seasonal.late || 0) },
              ].map((s) => {
                const pct = s.total > 0 ? Math.round((s.value / s.total) * 100) : 0;
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="font-sans text-[11px] text-dim w-24 shrink-0">{s.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-sans text-[11px] font-bold text-secondary w-8 text-right">{s.value}</span>
                    <span className="font-sans text-[10px] text-dim w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
              <div className="font-sans text-[10px] text-dim mt-1">
                {trading.trades_per_year ? `${trading.trades_per_year.toFixed(1)} trades/year average` : ""}
              </div>
            </div>
          </Section>
        </div>
      </div>

    </div>
  );
}
