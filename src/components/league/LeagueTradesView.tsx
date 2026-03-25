"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGradedTrades, getOwners } from "@/lib/api";
import TradeReportModal from "./TradeReportModal";
import { C, SANS, MONO, SERIF, DISPLAY, fmt, gradeColor, getVerdictStyle } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   LEAGUE TRADES VIEW — Shadynasty "League Trade History" pattern
   Stat boxes, filters, compact trade rows with grade badges
   ═══════════════════════════════════════════════════════════════ */
interface Trade {
  trade_id: string; date: string; owner: string; counter_party: string;
  players_sent?: string[] | null; players_received?: string[] | null;
  picks_sent?: string[] | null; picks_received?: string[] | null;
  sha_balance?: number | null; verdict?: string | null;
  side_a_verdict?: string | null; side_b_verdict?: string | null;
  side_a_owner?: string | null; side_b_owner?: string | null;
}

function letterFromVerdict(v: string | null | undefined): string {
  if (!v) return "";
  const lo = v.toLowerCase();
  if (lo.includes("robbery")) return "A+";
  if (lo === "won") return "A";
  if (lo === "slight edge") return "B+";
  if (lo === "push") return "C";
  if (lo === "slight loss") return "C-";
  if (lo === "lost") return "D";
  if (lo === "victim") return "F";
  if (lo === "win-win") return "B+";
  return "";
}

function assetStr(players?: string[] | null, picks?: string[] | null): string {
  const all = [...(players || []), ...(picks || []).map((p) => p.replace(/\s*\([^)]*\)/g, ""))];
  if (!all.length) return "—";
  if (all.length <= 2) return all.join(", ");
  return `${all.slice(0, 2).join(", ")} +${all.length - 2}`;
}

export default function LeagueTradesView({ leagueId }: { leagueId: string }) {
  const [reportTradeId, setReportTradeId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [verdictFilter, setVerdictFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["graded-trades", leagueId],
    queryFn: () => getGradedTrades(leagueId),
    enabled: !!leagueId,
  });
  const { data: ownersData } = useQuery({
    queryKey: ["owners", leagueId],
    queryFn: () => getOwners(leagueId),
    enabled: !!leagueId,
  });

  const trades: Trade[] = data?.trades || [];
  const owners = ownersData?.owners?.map((o: { name: string }) => o.name) || [];

  // Stats
  const stats = useMemo(() => {
    const total = trades.length;
    const tradeCount: Record<string, number> = {};
    const scores: Record<string, number[]> = {};
    let winWins = 0; let robberies = 0;
    let robberName = ""; let robberCount = 0;
    let victimName = ""; let victimCount = 0;
    const robberMap: Record<string, number> = {};
    const victimMap: Record<string, number> = {};

    trades.forEach((t) => {
      tradeCount[t.owner] = (tradeCount[t.owner] || 0) + 1;
      tradeCount[t.counter_party] = (tradeCount[t.counter_party] || 0) + 1;
      const v = t.verdict?.toLowerCase() || "";
      if (v.includes("win-win")) winWins++;
      if (v.includes("robbery")) {
        robberies++;
        const winner = t.side_a_verdict?.toLowerCase().includes("robbery") ? t.side_a_owner : t.side_b_owner;
        const loser = t.side_a_verdict?.toLowerCase() === "victim" ? t.side_a_owner : t.side_b_owner;
        if (winner) robberMap[winner] = (robberMap[winner] || 0) + 1;
        if (loser) victimMap[loser] = (victimMap[loser] || 0) + 1;
      }
      // Score tracking
      const aLetter = letterFromVerdict(t.side_a_verdict);
      const bLetter = letterFromVerdict(t.side_b_verdict);
      if (aLetter && t.side_a_owner) { if (!scores[t.side_a_owner]) scores[t.side_a_owner] = []; scores[t.side_a_owner].push(aLetter.startsWith("A") ? 90 : aLetter.startsWith("B") ? 80 : aLetter.startsWith("C") ? 70 : 60); }
      if (bLetter && t.side_b_owner) { if (!scores[t.side_b_owner]) scores[t.side_b_owner] = []; scores[t.side_b_owner].push(bLetter.startsWith("A") ? 90 : bLetter.startsWith("B") ? 80 : bLetter.startsWith("C") ? 70 : 60); }
    });

    const mostActive = Object.entries(tradeCount).sort((a, b) => b[1] - a[1])[0];
    const avgScores = Object.entries(scores).map(([n, arr]) => ({ name: n, avg: arr.reduce((s, v) => s + v, 0) / arr.length })).filter((x) => x.avg > 0).sort((a, b) => b.avg - a.avg);
    const bestTrader = avgScores[0];
    const topRobber = Object.entries(robberMap).sort((a, b) => b[1] - a[1])[0];
    const topVictim = Object.entries(victimMap).sort((a, b) => b[1] - a[1])[0];
    if (topRobber) { robberName = topRobber[0]; robberCount = topRobber[1]; }
    if (topVictim) { victimName = topVictim[0]; victimCount = topVictim[1]; }
    const winWinPct = total > 0 ? Math.round((winWins / total) * 100) : 0;
    return { total, winWins, robberies, mostActive, bestTrader, robberName, robberCount, victimName, victimCount, winWinPct };
  }, [trades]);

  // Filter
  const years = useMemo(() => [...new Set(trades.map((t) => t.date?.slice(0, 4)).filter(Boolean))].sort().reverse(), [trades]);
  const filtered = useMemo(() => trades.filter((t) => {
    if (ownerFilter !== "all" && t.owner.toLowerCase() !== ownerFilter.toLowerCase() && t.counter_party.toLowerCase() !== ownerFilter.toLowerCase()) return false;
    if (yearFilter !== "all" && !t.date?.startsWith(yearFilter)) return false;
    if (verdictFilter !== "all") {
      const v = t.verdict?.toLowerCase() || "";
      if (verdictFilter === "Win-Win" && !v.includes("win-win")) return false;
      if (verdictFilter === "ROBBERY" && !v.includes("robbery")) return false;
      if (verdictFilter === "Push" && !v.includes("push")) return false;
      if (verdictFilter === "One Winner" && !v.includes("won") && !v.includes("edge")) return false;
    }
    return true;
  }), [trades, ownerFilter, yearFilter, verdictFilter]);

  const hasFilter = ownerFilter !== "all" || yearFilter !== "all" || verdictFilter !== "all";
  const selStyle = (a: boolean): React.CSSProperties => ({ padding: "5px 10px", borderRadius: 4, border: `1px solid ${a ? C.goldBorder : C.border}`, background: a ? C.goldDim : C.elevated, color: C.primary, fontSize: 11, fontFamily: SANS, fontWeight: 600, outline: "none", cursor: "pointer" });

  if (isLoading) return <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING TRADE HISTORY...</span></div>;

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>League Trade History</span>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.secondary }}><span style={{ fontWeight: 800, color: C.primary, fontSize: 15 }}>{stats.total}</span> graded</span>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.secondary }}><span style={{ fontWeight: 800, color: C.green, fontSize: 15 }}>{stats.winWins}</span> win-wins</span>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.secondary }}><span style={{ fontWeight: 800, color: "#ff4444", fontSize: 15 }}>{stats.robberies}</span> robberies</span>
      </div>

      {/* STAT BOXES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 12 }}>
        <StatBox label="TOTAL TRADES" color={C.gold}><div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: C.primary }}>{stats.total}</div></StatBox>
        <StatBox label="MOST ACTIVE" color={C.gold}><div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: C.gold }}>{stats.mostActive?.[0] || "—"}</div><div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{stats.mostActive?.[1] || 0} trades</div></StatBox>
        <StatBox label="BEST TRADER" color={C.green}><div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: C.green }}>{stats.bestTrader?.name || "—"}</div><div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{stats.bestTrader ? `${Math.round(stats.bestTrader.avg)} avg` : "—"}</div></StatBox>
        <StatBox label="ROBBERIES" color="#ff4444">
          {stats.robberName && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.green }}>{stats.robberName}</span><span style={{ fontFamily: MONO, fontSize: 9, color: C.green, padding: "1px 6px", borderRadius: 3, background: C.greenDim }}>{stats.robberCount} robbed</span></div>}
          {stats.victimName && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.red }}>{stats.victimName}</span><span style={{ fontFamily: MONO, fontSize: 9, color: C.red, padding: "1px 6px", borderRadius: 3, background: C.redDim }}>{stats.victimCount} victim</span></div>}
        </StatBox>
        <StatBox label="WIN-WIN RATE" color={C.gold}><div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: C.green }}>{stats.winWinPct}%</div><div style={{ height: 5, borderRadius: 3, background: C.elevated, overflow: "hidden", marginTop: 4 }}><div style={{ height: "100%", borderRadius: 3, background: C.green, width: `${stats.winWinPct}%` }} /></div></StatBox>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>FILTER</span>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={selStyle(ownerFilter !== "all")}>
          <option value="all" style={{ background: C.card }}>All Owners</option>
          {owners.map((o: string) => <option key={o} value={o} style={{ background: C.card }}>{o}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={selStyle(yearFilter !== "all")}>
          <option value="all" style={{ background: C.card }}>All Years</option>
          {years.map((y) => <option key={y} value={y} style={{ background: C.card }}>{y}</option>)}
        </select>
        <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} style={selStyle(verdictFilter !== "all")}>
          <option value="all" style={{ background: C.card }}>All Verdicts</option>
          {["Win-Win", "ROBBERY", "Push", "One Winner"].map((v) => <option key={v} value={v} style={{ background: C.card }}>{v}</option>)}
        </select>
        {hasFilter && <span onClick={() => { setOwnerFilter("all"); setYearFilter("all"); setVerdictFilter("all"); }} style={{ fontFamily: MONO, fontSize: 9, color: C.red, cursor: "pointer", padding: "3px 8px", borderRadius: 3, background: C.redDim }}>✕ CLEAR</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{filtered.length}{hasFilter ? ` of ${stats.total}` : ""} trades</span>
      </div>

      {/* TRADE ROWS */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ maxHeight: 640, overflowY: "auto" }}>
          {filtered.map((t) => {
            const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
            const aLetter = letterFromVerdict(t.side_a_verdict);
            const bLetter = letterFromVerdict(t.side_b_verdict);
            const aColor = gradeColor(aLetter);
            const bColor = gradeColor(bLetter);
            const aAssets = assetStr(t.players_sent, t.picks_sent);
            const bAssets = assetStr(t.players_received, t.picks_received);

            return (
              <div key={t.trade_id}
                onClick={() => setReportTradeId(t.trade_id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px", borderBottom: `1px solid ${C.white08}`,
                  borderLeft: `4px solid ${vs?.color || "transparent"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; e.currentTarget.style.transform = "translateX(2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}>
                {/* Date */}
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, width: 68, flexShrink: 0 }}>{t.date?.slice(0, 10)}</span>

                {/* Side A: initial + name + grade */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${aColor}15`, border: `1.5px solid ${aColor}35`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9, fontWeight: 900, color: aColor, flexShrink: 0 }}>{t.owner[0]}</div>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, flexShrink: 0 }}>{t.owner}</span>
                  {aLetter && <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 900, color: aColor, padding: "1px 6px", borderRadius: 3, background: `${aColor}15`, border: `1px solid ${aColor}30`, flexShrink: 0 }}>{aLetter}</span>}
                  <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aAssets}</span>
                </div>

                {/* Arrow */}
                <span style={{ fontFamily: SANS, fontSize: 14, color: C.gold, flexShrink: 0 }}>⇄</span>

                {/* Side B: initial + name + grade */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${bColor}15`, border: `1.5px solid ${bColor}35`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9, fontWeight: 900, color: bColor, flexShrink: 0 }}>{t.counter_party[0]}</div>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, flexShrink: 0 }}>{t.counter_party}</span>
                  {bLetter && <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 900, color: bColor, padding: "1px 6px", borderRadius: 3, background: `${bColor}15`, border: `1px solid ${bColor}30`, flexShrink: 0 }}>{bLetter}</span>}
                  <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bAssets}</span>
                </div>

                {/* Verdict pill */}
                {vs && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", color: vs.color, background: vs.bg, padding: "3px 8px", borderRadius: 3, flexShrink: 0, boxShadow: t.verdict?.includes("ROBBERY") ? `0 0 12px rgba(255,68,68,0.20)` : "none" }}>{vs.label}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {reportTradeId && <TradeReportModal leagueId={leagueId} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />}
    </div>
  );
}

function StatBox({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${color}20`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "4px 8px", background: `${color}10`, borderBottom: `1px solid ${color}15` }}>
        <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color }}>{label}</span>
      </div>
      <div style={{ padding: "10px 12px", textAlign: "center" }}>{children}</div>
    </div>
  );
}
