"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGradedTradesByOwner, getTradeChains, getGradedTrades, getOverview, getOwnerProfile, getOwners } from "@/lib/api";
import { useLeagueStore } from "@/lib/stores/league-store";
import LeagueTradesView from "./LeagueTradesView";
import TradeReportModal from "./TradeReportModal";
import type { GradedTrade, TradeChain } from "@/lib/types";
import PlayerName from "./PlayerName";

/* ═══════════════════════════════════════════════════════════════
   TOKENS — matched to Shadynasty
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: '#06080d', panel: '#0a0d15', card: '#10131d', elevated: '#171b28',
  border: '#1a1e30', borderLt: '#252a3e',
  primary: '#eeeef2', secondary: '#b0b2c8', dim: '#9596a5',
  gold: '#d4a532', goldBright: '#f5e6a3', goldDark: '#8b6914',
  goldDim: 'rgba(212,165,50,0.10)', goldBorder: 'rgba(212,165,50,0.22)',
  goldGlow: 'rgba(212,165,50,0.06)',
  green: '#7dd3a0', greenDim: 'rgba(125,211,160,0.12)',
  red: '#e47272', redDim: 'rgba(228,114,114,0.12)',
  blue: '#6bb8e0', orange: '#e09c6b',
  white08: 'rgba(255,255,255,0.06)',
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

/* ═══════════════════════════════════════════════════════════════
   HELPERS — exact Shadynasty logic
   ═══════════════════════════════════════════════════════════════ */

function gradeColor(letter: string): string {
  if (!letter) return C.dim;
  if (letter.startsWith('A') || letter.startsWith('B')) return C.green;
  if (letter.startsWith('C')) return C.gold;
  if (letter.startsWith('D')) return C.orange;
  return C.red;
}

function toLetter(s: number): string {
  if (s >= 97) return 'A+'; if (s >= 93) return 'A'; if (s >= 90) return 'A-';
  if (s >= 87) return 'B+'; if (s >= 83) return 'B'; if (s >= 80) return 'B-';
  if (s >= 77) return 'C+'; if (s >= 73) return 'C'; if (s >= 70) return 'C-';
  if (s >= 67) return 'D+'; if (s >= 63) return 'D'; if (s >= 60) return 'D-';
  return 'F';
}

function getVerdictStyle(v: string) {
  if (v === "Win-Win") return { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" };
  if (v === "ROBBERY") return { color: "#ff4444", bg: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.30)" };
  if (v === "Push") return { color: C.secondary, bg: "rgba(176,178,200,0.10)", border: "rgba(176,178,200,0.20)" };
  if (v === "Both Lost") return { color: "#e47272", bg: "rgba(228,114,114,0.12)", border: "rgba(228,114,114,0.25)" };
  if (v.includes("Won")) return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v.includes("Slight Edge")) return { color: "#7dd3a0", bg: "rgba(125,211,160,0.12)", border: "rgba(125,211,160,0.25)" };
  if (v === "Slight Loss") return { color: C.orange, bg: "rgba(224,156,107,0.12)", border: "rgba(224,156,107,0.25)" };
  if (v === "Lost") return { color: C.red, bg: "rgba(255,68,68,0.10)", border: "rgba(255,68,68,0.25)" };
  if (v === "Promising") return { color: C.blue, bg: "rgba(107,184,224,0.12)", border: "rgba(107,184,224,0.25)" };
  if (v === "Too Early") return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v === "Concerning") return { color: C.orange, bg: "rgba(224,156,107,0.12)", border: "rgba(224,156,107,0.25)" };
  return { color: C.dim, bg: "transparent", border: C.border };
}

function fmtAssets(players?: string[] | null, picks?: string[] | null): string {
  const p = (players || []).filter(Boolean);
  const pk = (picks || []).map(s => s.replace(/\s*\([^)]*\)/g, '')).filter(Boolean);
  if (p.length && pk.length) return [...p, ...pk].join(', ');
  if (p.length) return p.join(', ');
  if (pk.length) return pk.join(', ');
  return '';
}

function AssetList({ players, picks, style = {} }: { players?: string[] | null; picks?: string[] | null; style?: React.CSSProperties }) {
  const p = (players || []).filter(Boolean);
  const pk = (picks || []).map(s => s.replace(/\s*\([^)]*\)/g, '')).filter(Boolean);
  if (!p.length && !pk.length) return <span style={style}>—</span>;
  return (
    <span style={style}>
      {p.map((name, i) => (
        <React.Fragment key={`p${i}`}>
          {i > 0 && ', '}
          <PlayerName name={name} style={{ color: 'inherit', fontWeight: 'inherit' }} />
        </React.Fragment>
      ))}
      {p.length > 0 && pk.length > 0 && ', '}
      {pk.join(', ')}
    </span>
  );
}

function isEmptyTrade(players?: string[] | null, picks?: string[] | null): boolean {
  return !(players || []).filter(Boolean).length && !(picks || []).filter(Boolean).length;
}

function fmtDate(d: string | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════
   CSS ANIMATIONS — injected once, Shadynasty hover effects
   ═══════════════════════════════════════════════════════════════ */
const TRADE_CSS = `
@keyframes tlScanLine { from { left: -40%; } to { left: 140%; } }
.tl2-card {
  position: relative; cursor: pointer; overflow: hidden;
  border-left: 4px solid transparent;
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
}
.tl2-card:hover {
  border-left-width: 5px;
  transform: translateX(2px);
  z-index: 2;
}
.tl2-card:hover .tl2-glow { opacity: 1; }
.tl2-card:hover .tl2-scan { display: block; }
.tl2-card:hover .tl2-cta { max-height: 40px; opacity: 1; padding-top: 10px; margin-top: 10px; }
.tl2-card:hover .tl2-date { color: var(--vc) !important; }
.tl2-card:hover .tl2-partner { color: var(--vc) !important; }
.tl2-glow {
  position: absolute; inset: 0; opacity: 0;
  transition: opacity 0.3s ease; pointer-events: none; z-index: 0;
}
.tl2-scan {
  display: none; position: absolute; top: 0; height: 100%; width: 40%; opacity: 0.08;
  animation: tlScanLine 2s linear infinite; pointer-events: none; z-index: 1;
}
.tl2-cta {
  max-height: 0; opacity: 0; padding-top: 0; margin-top: 0;
  overflow: hidden; transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
}
`;

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function MyTradesView({ leagueId, owner: ownerProp, ownerId }: { leagueId: string; owner: string | null; ownerId?: string | null }) {
  const [mainTab, setMainTab] = useState<'log' | 'league'>('log');
  const [historyTab, setHistoryTab] = useState<'log' | 'profile'>('log');
  const [reportTradeId, setReportTradeId] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const { setOwner } = useLeagueStore();

  // Get owner list for the picker
  const { data: overviewData } = useQuery({
    queryKey: ["overview", leagueId],
    queryFn: () => getOverview(leagueId),
    enabled: !!leagueId,
  });
  const { data: ownersFullData } = useQuery({
    queryKey: ["owners", leagueId],
    queryFn: () => getOwners(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });
  const ownerList: string[] = overviewData?.owners || [];
  const owner = ownerProp;

  const { data, isLoading } = useQuery({
    queryKey: ["my-trades", leagueId, owner],
    queryFn: () => getGradedTradesByOwner(leagueId, owner!, ownerId),
    enabled: !!owner,
  });
  const { data: chainData } = useQuery({
    queryKey: ["trade-chains", leagueId],
    queryFn: () => getTradeChains(leagueId),
    enabled: !!leagueId,
  });
  const { data: profileData } = useQuery({
    queryKey: ["owner-profile", leagueId, owner],
    queryFn: () => getOwnerProfile(leagueId, owner!, ownerId),
    enabled: !!owner && historyTab === 'profile',
  });

  // ── OUTER TAB BAR: MY TRADES | LEAGUE LOG ──
  // Always render this so user can switch views
  const outerTabs = (
    <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.borderLt}`, marginBottom: 0 }}>
      {([
        { id: 'log' as const, label: 'MY TRADES' },
        { id: 'league' as const, label: 'LEAGUE LOG' },
      ]).map(tab => {
        const active = mainTab === tab.id;
        return (
          <div key={tab.id} onClick={() => setMainTab(tab.id)} style={{
            padding: '10px 28px', fontFamily: SANS, fontSize: 15, fontWeight: 800,
            letterSpacing: '0.12em', color: active ? C.gold : '#9CA3AF', cursor: 'pointer',
            borderBottom: active ? `3px solid ${C.gold}` : '3px solid transparent',
            boxShadow: active ? `0 3px 12px ${C.gold}40, 0 1px 4px ${C.gold}25` : 'none',
            transition: 'all 0.2s ease',
          }}>
            {tab.label}
          </div>
        );
      })}
      {/* Owner picker — always visible */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 14 }}>
        <select
          value={owner || ''}
          onChange={(e) => {
            const name = e.target.value;
            const match = ownersFullData?.owners?.find((o: { name: string; platform_user_id?: string }) => o.name === name);
            setOwner(name, match?.platform_user_id ?? null);
          }}
          style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '6px 12px',
            borderRadius: 4, background: C.elevated, color: owner ? C.gold : C.dim,
            border: `1px solid ${owner ? C.goldBorder : C.border}`, cursor: 'pointer',
          }}
        >
          <option value="" style={{ background: C.card }}>Select Owner</option>
          {ownerList.map(o => <option key={o} value={o} style={{ background: C.card }}>{o}</option>)}
        </select>
      </div>
    </div>
  );

  // ── ALL DERIVED DATA — must be computed before any conditional returns ──
  const rawTrades: GradedTrade[] = data?.trades || [];

  const allPartners = useMemo(() => {
    const set = new Set<string>();
    rawTrades.forEach(t => { if (t.counter_party) set.add(t.counter_party); });
    return Array.from(set).sort();
  }, [rawTrades]);

  const allYears = useMemo(() => {
    const set = new Set<string>();
    rawTrades.forEach(t => { const y = t.date?.substring(0, 4); if (y) set.add(y); });
    return Array.from(set).sort().reverse();
  }, [rawTrades]);

  const filtered = useMemo(() => rawTrades.filter(t => {
    if (partnerFilter !== 'all' && t.counter_party !== partnerFilter) return false;
    if (yearFilter !== 'all' && !t.date?.startsWith(yearFilter)) return false;
    return true;
  }), [rawTrades, partnerFilter, yearFilter]);

  const hasFilter = partnerFilter !== 'all' || yearFilter !== 'all';
  const clearFilters = () => { setPartnerFilter('all'); setYearFilter('all'); };

  type TradeHighlight = { trade_id: string; date: string; partner: string; letter: string; score: number; gave: string; got: string; verdict: string };
  const tradeStats = useMemo((): {
    wins: number; losses: number; even: number;
    bestTrade: TradeHighlight | null; worstTrade: TradeHighlight | null;
    avgScore: number; avgLetter: string; graded: number; decided: number; winPct: number;
    myVerdicts: Record<string, string>; myLetters: Record<string, string>;
  } => {
    // Use canonical record from API (compute_trade_record on backend)
    const wins = data?.wins ?? 0;
    const losses = data?.losses ?? 0;
    const even = data?.even ?? 0;
    const winRate = data?.win_rate ?? 0;
    const decided = wins + losses;
    const winPct = Math.round(winRate * 100);
    const graded = wins + losses + even;

    let bestTrade: TradeHighlight | null = null;
    let worstTrade: TradeHighlight | null = null;
    let bestScore = -1, worstScore = 999;
    const myScores: number[] = [];
    const myVerdicts: Record<string, string> = {};
    const myLetters: Record<string, string> = {};

    rawTrades.forEach(t => {
      const isA = (t.side_a_owner || '').toLowerCase() === (owner || '').toLowerCase();
      const myVerdict = isA ? t.side_a_verdict : t.side_b_verdict;
      const myScore = isA ? (t.side_a_score ?? 0) : (t.side_b_score ?? 0);
      const myLetter = isA ? (t.side_a_letter || '') : (t.side_b_letter || '');
      const partner = t.counter_party || '';

      if (myLetter) myLetters[t.trade_id] = myLetter;
      if (myVerdict) myVerdicts[t.trade_id] = myVerdict;
      if (myScore) myScores.push(Number(myScore));

      // API returns trades from this owner's perspective — sent = what they gave, received = what they got
      const gave = fmtAssets(t.players_sent, t.picks_sent);
      const got = fmtAssets(t.players_received, t.picks_received);

      if (myScore > 0 && myScore > bestScore) {
        bestScore = myScore;
        bestTrade = { trade_id: t.trade_id, date: t.date || '', partner, letter: myLetter || toLetter(myScore), score: myScore, gave, got, verdict: myVerdict || '' };
      }
      if (myScore > 0 && myScore < worstScore) {
        worstScore = myScore;
        worstTrade = { trade_id: t.trade_id, date: t.date || '', partner, letter: myLetter || toLetter(myScore), score: myScore, gave, got, verdict: myVerdict || '' };
      }
    });

    const avgScore = myScores.length > 0 ? Math.round(myScores.reduce((a, b) => a + b, 0) / myScores.length) : 0;
    const avgLetter = toLetter(avgScore);

    return { wins, losses, even, bestTrade, worstTrade, avgScore, avgLetter, graded, decided, winPct, myVerdicts, myLetters };
  }, [rawTrades, owner, data]);

  const chains = useMemo(() => (chainData?.chains || []).filter((ch: TradeChain) =>
    ch.owner?.toLowerCase() === (owner || '').toLowerCase() && ch.flipped_to
  ), [chainData, owner]);

  // ── CONDITIONAL RETURNS — after all hooks ──

  if (mainTab === 'league') return (
    <div>
      {outerTabs}
      <LeagueTradesView leagueId={leagueId} />
    </div>
  );

  if (!owner) return (
    <div>
      {outerTabs}
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.gold, marginBottom: 8 }}>SELECT YOUR TEAM</div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim }}>Choose an owner from the dropdown above to view their trade intelligence.</div>
      </div>
    </div>
  );

  if (isLoading) return (
    <div>
      {outerTabs}
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: '0.1em' }}>LOADING TRADE HISTORY...</span>
      </div>
    </div>
  );

  // Destructure stats for use in render
  const { wins, losses, even, bestTrade, worstTrade, avgScore, avgLetter, graded, decided, winPct, myVerdicts, myLetters } = tradeStats;

  // Trader identity
  const posAcquired: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, PICKS: 0 };
  const posGiven: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, PICKS: 0 };
  rawTrades.forEach(t => {
    // API returns from owner's perspective — no flip needed
    const gotPlayers = t.players_received || [];
    const gavePlayers = t.players_sent || [];
    const gotPicks = t.picks_received || [];
    const gavePicks = t.picks_sent || [];
    posAcquired.PICKS += gotPicks.length;
    posGiven.PICKS += gavePicks.length;
    gotPlayers.forEach(() => posAcquired.RB++); // simplified — no position detection in graded trades
    gavePlayers.forEach(() => posGiven.RB++);
  });

  const byYear: Record<string, number> = {};
  rawTrades.forEach(t => { const y = t.date?.substring(0, 4); if (y) byYear[y] = (byYear[y] || 0) + 1; });
  const years = Object.keys(byYear).sort();
  const maxPerYear = Math.max(...Object.values(byYear), 1);
  const tradesPerYear = years.length > 0 ? (rawTrades.length / years.length).toFixed(1) : '0';
  const peakYear = years.length > 0 ? years.reduce((a, b) => (byYear[a] || 0) > (byYear[b] || 0) ? a : b) : '—';

  // Partner counts for trader profile
  const partnerCounts: Record<string, number> = {};
  rawTrades.forEach(t => { if (t.counter_party) partnerCounts[t.counter_party] = (partnerCounts[t.counter_party] || 0) + 1; });
  const topPartners = Object.entries(partnerCounts).sort((a, b) => b[1] - a[1]);
  const maxPartnerCount = topPartners.length > 0 ? topPartners[0][1] : 1;

  return (
    <div>
      {outerTabs}
      <div style={{ padding: '12px 14px' }}>
      <style>{TRADE_CSS}</style>

      {/* ═══════════════════════════════════════════════════════════
           TRADE REPORT CARD — 3 columns: Hindsight | Record | Best/Worst
           Exact Shadynasty layout (page.tsx lines 1302-1432)
           ═══════════════════════════════════════════════════════════ */}
      {graded > 0 && (
        <div style={{ marginBottom: 10, display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8 }}>

          {/* HINDSIGHT CARD */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '4px 8px', background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>HINDSIGHT</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 8px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `radial-gradient(circle, ${avgScore >= 80 ? C.green : C.red}18, transparent)`,
                border: `3px solid ${avgScore >= 80 ? C.green : C.red}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 24px ${avgScore >= 80 ? C.green : C.red}20`,
              }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: avgScore >= 80 ? C.green : C.red }}>{avgLetter}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary, marginTop: 6, letterSpacing: '0.04em' }}>AVG GRADE</div>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.dim, marginTop: 2 }}>{avgScore} / 100</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary, marginTop: 2 }}>{graded} graded</div>
            </div>
          </div>

          {/* TRADE RECORD CARD */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>TRADE RECORD</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                {[
                  { n: wins, label: 'WON', color: C.green },
                  { n: losses, label: 'LOST', color: C.red },
                  { n: even, label: 'EVEN', color: C.secondary },
                ].map(({ n, label, color }) => (
                  <div key={label} style={{ textAlign: 'center', minWidth: 40 }}>
                    <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color }}>{n}</div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: C.secondary, letterSpacing: '0.1em' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>WIN RATE</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: winPct >= 50 ? C.green : C.red }}>{winPct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: C.elevated, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.green}, ${C.green}aa)`, width: `${winPct}%`, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            </div>
          </div>

          {/* BEST & WORST TRADE CARDS (stacked) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bestTrade && (
              <div style={{ background: C.card, border: `1px solid ${C.green}20`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '4px 8px', background: `${C.green}10`, borderBottom: `1px solid ${C.green}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.green, letterSpacing: '0.1em' }}>🏆 BEST TRADE</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>vs {bestTrade.partner}</span>
                    {bestTrade.date && <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>· {fmtDate(bestTrade.date)}</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.green, fontWeight: 700 }}>{bestTrade.letter} ({bestTrade.score})</span>
                </div>
                <div style={{ padding: '6px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', alignItems: 'center', gap: 6 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.red, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 2 }}>GAVE</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, lineHeight: 1.4 }}>{bestTrade.gave}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><span style={{ fontFamily: MONO, fontSize: 14, color: C.gold }}>→</span></div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.green, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 2 }}>GOT</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: C.primary, fontWeight: 600, lineHeight: 1.4 }}>{bestTrade.got}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {worstTrade && (
              <div style={{ background: C.card, border: `1px solid ${C.red}20`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '4px 8px', background: `${C.red}10`, borderBottom: `1px solid ${C.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.red, letterSpacing: '0.1em' }}>💀 WORST TRADE</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>vs {worstTrade.partner}</span>
                    {worstTrade.date && <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>· {fmtDate(worstTrade.date)}</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, fontWeight: 700 }}>{worstTrade.letter} ({worstTrade.score})</span>
                </div>
                <div style={{ padding: '6px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', alignItems: 'center', gap: 6 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.red, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 2 }}>GAVE</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, lineHeight: 1.4 }}>{worstTrade.gave}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><span style={{ fontFamily: MONO, fontSize: 14, color: C.gold }}>→</span></div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.green, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 2 }}>GOT</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: C.primary, fontWeight: 600, lineHeight: 1.4 }}>{worstTrade.got}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
           TAB BAR — TRADE LOG | TRADER PROFILE
           Exact Shadynasty (page.tsx lines 1436-1463)
           ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.borderLt}`, marginBottom: 14 }}>
        {([
          { id: 'log' as const, label: 'TRADE LOG' },
          { id: 'profile' as const, label: 'TRADER PROFILE' },
        ]).map(tab => {
          const active = historyTab === tab.id;
          return (
            <div key={tab.id}
              onClick={() => setHistoryTab(tab.id)}
              style={{
                padding: '10px 28px',
                fontFamily: SANS, fontSize: 15, fontWeight: 800, letterSpacing: '0.12em',
                color: active ? C.gold : '#9CA3AF',
                cursor: 'pointer',
                borderBottom: active ? `3px solid ${C.gold}` : '3px solid transparent',
                boxShadow: active ? `0 3px 12px ${C.gold}40, 0 1px 4px ${C.gold}25` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
           TRADE LOG TAB — glow/scan cards, filters, chains
           Exact Shadynasty (page.tsx lines 1651-1847)
           ═══════════════════════════════════════════════════════════ */}
      {historyTab === 'log' && (
        <>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            {/* HEADER with filters */}
            <div style={{ padding: '4px 8px', background: C.goldDim, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>TRADE LOG</span>
                {hasFilter && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {partnerFilter !== 'all' && <span style={{ fontFamily: MONO, fontSize: 9, color: C.blue, padding: '2px 8px', borderRadius: 3, background: `${C.blue}15` }}>{partnerFilter}</span>}
                    {yearFilter !== 'all' && <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, padding: '2px 8px', borderRadius: 3, background: `${C.gold}15` }}>{yearFilter}</span>}
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, cursor: 'pointer', padding: '2px 6px' }} onClick={clearFilters}>✕ clear</span>
                  </div>
                )}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{filtered.length}{hasFilter ? ` of ${rawTrades.length}` : ''} trades</span>
            </div>

            {/* TRADE CARDS with glow/scan effects */}
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {filtered.map((t, i) => {
                // API returns from owner's perspective — no flip needed
                const gave = fmtAssets(t.players_sent, t.picks_sent);
                const got = fmtAssets(t.players_received, t.picks_received);

                // Skip waiver/FAAB transactions (no assets on either side)
                if (isEmptyTrade(t.players_sent, t.picks_sent) && isEmptyTrade(t.players_received, t.picks_received)) return null;

                const partner = t.counter_party || '—';
                const dateStr = (t.date || '').substring(0, 10);
                const _verdict = t.verdict || '';
                const _myVerdict = myVerdicts[t.trade_id] || '';
                const _myLetter = myLetters[t.trade_id] || '';
                const _vs = _verdict ? getVerdictStyle(_verdict) : { color: C.dim, bg: 'transparent', border: C.border };
                const gc = _myLetter ? gradeColor(_myLetter) : C.dim;
                const vc = _myLetter ? gc : (_vs.color || C.gold);

                return (
                  <div key={t.trade_id || i}
                    className="tl2-card"
                    onClick={() => setReportTradeId(t.trade_id)}
                    style={{
                      padding: '12px 16px 12px 20px',
                      borderBottom: `1px solid ${C.white08}`,
                      borderLeftColor: _verdict ? vc : 'transparent',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ['--vc' as any]: vc,
                    }}
                  >
                    {/* Glow */}
                    <div className="tl2-glow" style={{ background: `linear-gradient(135deg, ${vc}22 0%, ${vc}0c 30%, transparent 65%)`, boxShadow: `inset 0 0 80px ${vc}18, 0 4px 40px ${vc}12, -5px 0 30px ${vc}15` }} />
                    {/* Scan */}
                    <div className="tl2-scan" style={{ background: `linear-gradient(90deg, transparent, ${vc}40, transparent)` }} />
                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="tl2-date" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, transition: 'color 0.2s' }}>{dateStr}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${vc}15`, border: `1.5px solid ${vc}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9, fontWeight: 900, color: vc, flexShrink: 0 }}>{(partner || '?')[0]}</div>
                          <span className="tl2-partner" style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, cursor: 'pointer', transition: 'color 0.2s' }}
                            onClick={(e) => { e.stopPropagation(); setPartnerFilter(partnerFilter === partner ? 'all' : partner); }}>
                            w/ {partner}
                          </span>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, margin: '0 2px' }}>·</span>
                        <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: `${C.red}cc` }}>Gave</span>{' '}<AssetList players={t.players_sent} picks={t.picks_sent} /> <span style={{ color: C.dim, margin: '0 4px' }}>→</span> <span style={{ color: `${C.green}cc` }}>Got</span>{' '}<AssetList players={t.players_received} picks={t.picks_received} />
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {_myLetter ? (
                            <>
                              {_myVerdict && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: _vs.color, letterSpacing: '0.04em', lineHeight: 1 }}>{_myVerdict}</span>}
                              <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 900, color: gc, padding: '4px 12px', borderRadius: 6, background: `${gc}15`, border: `1px solid ${gc}30`, flexShrink: 0, boxShadow: `0 0 12px ${gc}20`, lineHeight: 1, letterSpacing: '0.02em' }}>{_myLetter}</span>
                            </>
                          ) : (
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.dim, padding: '4px 8px', borderRadius: 4, background: C.elevated, border: `1px solid ${C.border}`, letterSpacing: '0.06em' }}>NO GRADE</span>
                          )}
                        </div>
                      </div>
                      {/* Hover CTA */}
                      <div className="tl2-cta" style={{ borderTop: `1px solid ${vc}20`, textAlign: 'center' }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: vc, textShadow: `0 0 20px ${vc}60` }}>VIEW TRADE REPORT</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontFamily: MONO, fontSize: 12, color: C.secondary }}>No trades match current filters</div>}
            </div>
          </div>

          {/* TRADE CHAINS — exact Shadynasty (page.tsx lines 1801-1847) */}
          {chains.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
              <div style={{ padding: '4px 8px', background: C.goldDim, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>🔗 TRADE CHAINS</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>Acquired → Flipped</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{chains.length} chains</span>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {chains.slice(0, 20).map((ch: TradeChain, i: number) => {
                  const holdDays = ch.days_held ?? (ch.acquired_date && ch.flipped_date
                    ? Math.round((new Date(ch.flipped_date).getTime() - new Date(ch.acquired_date).getTime()) / 86400000)
                    : null);
                  return (
                    <div key={i} style={{
                      padding: '8px 14px', borderBottom: `1px solid ${C.white08}`,
                      display: 'grid', gridTemplateColumns: '140px 1fr 30px 1fr 80px', alignItems: 'center', gap: 8,
                    }}>
                      <div>
                        <PlayerName name={ch.player} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }} />
                        {holdDays !== null && <div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>Held {holdDays} days</div>}
                      </div>
                      <div>
                        <div style={{ fontFamily: MONO, fontSize: 8, color: C.green, fontWeight: 800, marginBottom: 1 }}>ACQUIRED</div>
                        <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{(ch.acquired_date || '').substring(0, 10)} from <strong style={{ color: C.primary }}>{ch.acquired_from}</strong></div>
                      </div>
                      <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 14, color: C.gold }}>→</div>
                      <div>
                        <div style={{ fontFamily: MONO, fontSize: 8, color: C.red, fontWeight: 800, marginBottom: 1 }}>SOLD</div>
                        <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{(ch.flipped_date || '').substring(0, 10)} to <strong style={{ color: C.primary }}>{ch.flipped_to}</strong></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 3, background: C.goldGlow, border: `1px solid ${C.gold}20`, color: C.gold }}>⚡ GRADE TBD</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
           TRADER PROFILE TAB — powered by behavioral_profile service
           ═══════════════════════════════════════════════════════════ */}
      {historyTab === 'profile' && (() => {
        const p = profileData as Record<string, unknown> | undefined;
        const trading = (p?.trading || {}) as Record<string, unknown>;
        const meta = (p?.meta || {}) as Record<string, unknown>;
        const arch = (trading.archetype || {}) as Record<string, unknown>;
        const posTend = (trading.position_tendencies || {}) as Record<string, unknown>;
        const acquired = (posTend.acquired || {}) as Record<string, number>;
        const given = (posTend.given || {}) as Record<string, number>;
        const netFlow = (posTend.net_flow || {}) as Record<string, number>;
        const mom = (trading.momentum || {}) as Record<string, unknown>;
        const avgByYr = (mom.avg_by_year || {}) as Record<string, number>;
        const cmplx = (trading.complexity || {}) as Record<string, number>;
        const sunkCost = ((meta.sunk_cost || {}) as Record<string, string>).label || '';
        const tradeTrust = ((meta.trade_trust || {}) as Record<string, string>).label || '';
        const valStyle = ((trading.value_tendencies || {}) as Record<string, string>).style || '';
        const badges = (trading.badges || []) as string[];
        const partners = (trading.partners || []) as Array<{ partner: string; count: number }>;
        const deadline = (trading.deadline_behavior || {}) as Record<string, string>;
        const deadlineYears = Object.keys(deadline).sort();
        const timing = (trading.seasonal_timing || {}) as Record<string, number>;
        const totalTrades = (trading.total_trades || 0) as number;
        const tpy = (trading.trades_per_year || 0) as number;
        const shaperPct = (trading.league_shaper_pct || 0) as number;
        const leagueTotal = (trading.league_total_trades || 0) as number;
        const trend = (mom.trend || 'STABLE') as string;
        const trendColor = trend === 'IMPROVING' ? C.green : trend === 'DECLINING' ? C.red : C.gold;

        // Win rate ring
        const wr = Math.round(((trading.trade_win_rate || 0) as number) * 100);
        const wrColor = wr >= 55 ? C.green : wr <= 40 ? C.red : C.gold;
        const circ = 2 * Math.PI * 52;
        const arc = (wr / 100) * circ;

        // Position flow
        const flowPos = ['QB', 'RB', 'WR', 'TE', 'PICK'];
        const maxFlow = Math.max(...flowPos.map(p => Math.abs(netFlow[p] || 0)), 1);

        // Sunk cost / trust colors
        const scColor = sunkCost === 'QUICK TRIGGER' ? C.orange : sunkCost === 'RATIONAL' ? C.green : sunkCost === 'DIAMOND HANDS' ? C.blue : C.dim;
        const ttColor = tradeTrust === 'SHARK' ? C.green : tradeTrust === 'SHARP' ? C.blue : tradeTrust === 'AVERAGE' ? C.gold : tradeTrust === 'EASY TARGET' ? C.orange : tradeTrust === 'PUSHOVER' ? C.red : C.dim;
        const stColor = valStyle === 'CONSOLIDATOR' ? C.blue : valStyle === 'DISTRIBUTOR' ? C.orange : C.gold;

        // By year from momentum
        const momYears = Object.keys(avgByYr).sort();
        const yByYear: Record<string, number> = {};
        rawTrades.forEach(t => { const y = t.date?.substring(0, 4); if (y) yByYear[y] = (yByYear[y] || 0) + 1; });
        const actYears = Object.keys(yByYear).sort();
        const maxYr = Math.max(...Object.values(yByYear), 1);
        const maxPartner = partners.length > 0 ? partners[0].count : 1;
        const peakYr = actYears.length > 0 ? actYears.reduce((a, b) => (yByYear[a] || 0) > (yByYear[b] || 0) ? a : b) : '—';

        const posColor = (pos: string) => pos === 'QB' ? C.red : pos === 'RB' ? C.blue : pos === 'WR' ? C.green : pos === 'TE' ? C.orange : pos === 'PICK' ? C.gold : C.dim;

        if (!p) return (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.gold}12`, border: `2px solid ${C.gold}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, animation: 'pulse 2s ease infinite' }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: '0.08em' }}>BUILDING BEHAVIORAL PROFILE...</span>
          </div>
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: C.primary }}>Trade History</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>|</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{totalTrades} trades</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>|</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{tpy}/year</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>|</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>Peak: {peakYr} ({yByYear[peakYr] || 0})</span>
            </div>

            {/* ═══ TRADE IDENTITY — 4-column: Win Rate Ring | Record | Badges | League Shaper ═══ */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: `${C.gold}08` }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.gold }}>{String(arch.emoji || '📦')} {String(arch.title || 'UNKNOWN')}</div>
                {arch.description ? <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, marginTop: 4 }}>{String(arch.description)}</p> : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
                {/* Win Rate Ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', borderRight: `1px solid ${C.border}` }}>
                  <svg width="100" height="100" viewBox="0 0 120 120" style={{ marginBottom: 6 }}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke={C.border} strokeWidth="6" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={wrColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${arc} ${circ}`} transform="rotate(-90 60 60)" />
                    <text x="60" y="55" textAnchor="middle" fill={wrColor} fontSize="28" fontWeight="900" fontFamily={DISPLAY}>{wr}%</text>
                    <text x="60" y="72" textAnchor="middle" fill={C.dim} fontSize="9" fontWeight="700" letterSpacing="2" fontFamily={MONO}>WIN RATE</text>
                  </svg>
                </div>

                {/* Record */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', borderRight: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: C.dim, marginBottom: 8 }}>TRADE RECORD</span>
                  {[
                    { label: 'WON', n: (trading.record as Record<string,number>)?.wins || 0, color: C.green },
                    { label: 'LOST', n: (trading.record as Record<string,number>)?.losses || 0, color: C.red },
                    { label: 'EVEN', n: (trading.record as Record<string,number>)?.even || 0, color: C.secondary },
                  ].map(({ label, n, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '2px 0' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flex: 1 }}>{label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color }}>{n}</span>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', gap: 8, borderRight: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: C.dim, marginBottom: 4 }}>PROFILE</span>
                  {sunkCost && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4, color: scColor, background: `${scColor}15`, border: `1px solid ${scColor}30` }}>{sunkCost}</span>}
                  {valStyle && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4, color: stColor, background: `${stColor}15`, border: `1px solid ${stColor}30` }}>{valStyle}</span>}
                  {tradeTrust && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4, color: ttColor, background: `${ttColor}15`, border: `1px solid ${ttColor}30` }}>{tradeTrust}</span>}
                </div>

                {/* League Shaper */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: C.dim, marginBottom: 8 }}>LEAGUE SHAPER</span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 36, color: C.gold, lineHeight: 1 }}>{shaperPct}%</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 4 }}>{totalTrades} of {leagueTotal} trades</span>
                </div>
              </div>
            </div>

            {/* ═══ 3-column: Position Flow | Activity | Partners ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

              {/* POSITION FLOW */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>POSITION FLOW</span>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {flowPos.map(pos => {
                    const acq = acquired[pos] || 0;
                    const gvn = given[pos] || 0;
                    const flow = netFlow[pos] || 0;
                    const pc = posColor(pos);
                    const barPct = Math.abs(flow) / maxFlow * 50;
                    const isPos = flow > 0;
                    return (
                      <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, width: 20, textAlign: 'right', flexShrink: 0, color: C.green }}>{acq}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, width: 40, textAlign: 'center', padding: '2px 0', borderRadius: 3, color: pc, background: `${pc}15`, flexShrink: 0 }}>{pos}</span>
                        <div style={{ flex: 1, height: 16, position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.border }} />
                          {flow !== 0 && (
                            <div style={{
                              position: 'absolute', top: 2, bottom: 2, borderRadius: 2,
                              background: isPos ? C.green : C.red, opacity: 0.7,
                              ...(isPos ? { left: '50%', width: `${barPct}%` } : { right: '50%', width: `${barPct}%` }),
                            }} />
                          )}
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 10, width: 20, textAlign: 'left', flexShrink: 0, color: C.red }}>{gvn}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TRADE ACTIVITY */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>TRADE ACTIVITY</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 6 }}>
                    {actYears.map(y => {
                      const count = yByYear[y] || 0;
                      const h = Math.max(8, (count / maxYr) * 90);
                      return (
                        <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.secondary, marginBottom: 3 }}>{count}</span>
                          <div style={{ width: '100%', maxWidth: 28, height: h, borderRadius: '3px 3px 0 0', background: `linear-gradient(180deg, ${C.gold}, ${C.goldDark})` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {actYears.map(y => (
                      <div key={y} style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 9, color: C.dim }}>&apos;{y.slice(2)}</div>
                    ))}
                  </div>
                  {/* Momentum trend badge */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 3, color: trendColor, background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}>{trend}</span>
                    {momYears.length >= 2 && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
                      {avgByYr[momYears[momYears.length - 1]]} avg vs {avgByYr[momYears[momYears.length - 2]]} prior
                    </span>}
                  </div>
                </div>
              </div>

              {/* TRADE PARTNERS */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.gold }}>TRADE PARTNERS</span>
                </div>
                <div style={{ padding: 10, maxHeight: 180, overflowY: 'auto' }}>
                  {partners.slice(0, 10).map((p, i) => (
                    <div key={p.partner} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.white08}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold, width: 16, textAlign: 'right' }}>{i + 1}.</span>
                      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.secondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partner}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>({p.count})</span>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: C.elevated, overflow: 'hidden' }}>
                        <div style={{ width: `${(p.count / maxPartner) * 100}%`, height: '100%', borderRadius: 2, background: C.gold }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ COMPLEXITY + DEADLINE ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Complexity */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: `${C.blue}08`, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.blue }}>COMPLEXITY</span>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Avg assets/trade', value: cmplx.avg_assets_per_trade, max: 5 },
                    { label: 'Multi-asset %', value: cmplx.multi_asset_pct, max: 100, suffix: '%' },
                    { label: '3+ asset %', value: cmplx.three_plus_pct, max: 100, suffix: '%' },
                  ].map(({ label, value, max, suffix }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.secondary }}>{value != null ? `${value}${suffix || ''}` : '—'}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: C.elevated, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: C.gold, width: `${Math.min(100, ((value || 0) / max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deadline Behavior */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: `${C.orange}08`, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: C.orange }}>DEADLINE BEHAVIOR</span>
                </div>
                <div style={{ padding: 14 }}>
                  {deadlineYears.length > 0 ? (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {deadlineYears.map(year => {
                          const beh = deadline[year];
                          const dc = beh === 'BUYER' ? C.green : beh === 'SELLER' ? C.red : C.dim;
                          return (
                            <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 3, color: dc, background: `${dc}15`, border: `1px solid ${dc}30`, opacity: beh === 'INACTIVE' ? 0.4 : 1 }}>
                                {beh === 'BUYER' ? 'BUY' : beh === 'SELLER' ? 'SELL' : '—'}
                              </span>
                              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>&apos;{year.slice(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                        Net buyer in {deadlineYears.filter(y => deadline[y] === 'BUYER').length} of {deadlineYears.length} seasons
                      </span>
                    </>
                  ) : (
                    <span style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>No deadline trades on record</span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ BADGES ═══ */}
            {badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {badges.map(b => (
                  <span key={b} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '5px 12px', borderRadius: 4, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{b}</span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {reportTradeId && <TradeReportModal leagueId={leagueId} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />}
    </div>
    </div>
  );
}
