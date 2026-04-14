"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGradedTrades, getOwners } from "@/lib/api";
import TradeReportModal from "./TradeReportModal";
import { C, SANS, MONO, SERIF, DISPLAY, fmt, gradeColor, getVerdictStyle } from "./tokens";
import PlayerName from "./PlayerName";
import { useOwnerClick } from "@/hooks/useOwnerClick";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTrack } from "@/hooks/useTrack";

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
  side_a_score?: number | null; side_b_score?: number | null;
  side_a_letter?: string | null; side_b_letter?: string | null;
  hindsight_verdict?: string | null; hindsight_score?: number | null;
  hindsight_confidence?: string | null; is_championship_trade?: boolean;
}

function isHindsightDisplayable(dateStr: string | null | undefined, isChamp: boolean): boolean {
  if (isChamp) return true;
  if (!dateStr) return false;
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 548;
}

function hindsightLabel(dateStr: string | null | undefined, isChamp: boolean, verdict: string | null | undefined): { label: string; color: string } {
  if (isHindsightDisplayable(dateStr, isChamp)) {
    const v = verdict || "—";
    const vs = getVerdictStyle(v);
    return { label: vs?.label || v, color: vs?.color || C.dim };
  }
  if (!dateStr) return { label: "Pending", color: C.dim };
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days >= 365) return { label: "Too Soon", color: C.dim };
  return { label: "Pending", color: C.dim };
}

function mapVerdict(v: string | null | undefined): string {
  if (!v) return "";
  const lo = v.toLowerCase();
  if (lo === "robbery" || lo === "victim") return "ROBBERY";
  if (lo === "won" || lo === "slight edge") return "WON";
  if (lo === "lost" || lo === "slight loss") return "LOST";
  if (lo === "win-win" || lo === "push" || lo === "both lost") return "EVEN";
  return "";
}
function verdictColor(label: string): string {
  if (label === "WON") return "#7dd3a0";
  if (label === "LOST") return "#e47272";
  if (label === "ROBBERY") return "#ff4444";
  if (label === "EVEN") return "#b0b2c8";
  return "#9596a5";
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
  const p = (players || []).filter(Boolean);
  const pk = (picks || []).map((s) => s.replace(/\s*\([^)]*\)/g, "")).filter(Boolean);
  const all = [...p, ...pk];
  if (!all.length) return "";
  if (all.length <= 2) return all.join(", ");
  return `${all.slice(0, 2).join(", ")} +${all.length - 2}`;
}
function isEmptyTrade(players?: string[] | null, picks?: string[] | null): boolean {
  return !(players || []).filter(Boolean).length && !(picks || []).filter(Boolean).length;
}

function InlineAssets({ players, picks }: { players?: string[] | null; picks?: string[] | null }) {
  const p = (players || []).filter(Boolean);
  const pk = (picks || []).map(s => s.replace(/\s*\([^)]*\)/g, "")).filter(Boolean);
  const all = [...p.map(n => ({ name: n, isPick: false })), ...pk.map(n => ({ name: n, isPick: true }))];
  if (!all.length) return <span>—</span>;
  const shown = all.slice(0, 2);
  const extra = all.length - 2;
  return (
    <span>
      {shown.map((a, i) => (
        <React.Fragment key={i}>
          {i > 0 && ", "}
          {a.isPick ? a.name : <PlayerName name={a.name} style={{ color: "inherit" }} />}
        </React.Fragment>
      ))}
      {extra > 0 && <span style={{ color: C.dim }}> +{extra}</span>}
    </span>
  );
}

export default function LeagueTradesView({ leagueId }: { leagueId: string }) {
  const mobile = useIsMobile();
  const track = useTrack();
  const onOwnerClick = useOwnerClick();
  useEffect(() => { if (leagueId) track("league_trades_viewed", { league_id: leagueId }); }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps
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
    let even = 0; let won = 0; let lost = 0;
    const winMap: Record<string, number> = {};
    const lossMap: Record<string, number> = {};

    trades.forEach((t) => {
      tradeCount[t.owner] = (tradeCount[t.owner] || 0) + 1;
      tradeCount[t.counter_party] = (tradeCount[t.counter_party] || 0) + 1;
      const v = t.verdict?.toLowerCase() || "";
      if (v.includes("win-win") || v === "push") { even++; }
      else if (v.includes("won") || v.includes("edge") || v.includes("robbery")) {
        won++;
        const winner = (t.side_a_verdict?.toLowerCase().includes("won") || t.side_a_verdict?.toLowerCase().includes("edge") || t.side_a_verdict?.toLowerCase().includes("robbery")) ? t.side_a_owner : t.side_b_owner;
        const loser = (t.side_a_verdict?.toLowerCase().includes("lost") || t.side_a_verdict?.toLowerCase() === "victim" || t.side_a_verdict?.toLowerCase().includes("loss")) ? t.side_a_owner : t.side_b_owner;
        if (winner) winMap[winner] = (winMap[winner] || 0) + 1;
        if (loser) lossMap[loser] = (lossMap[loser] || 0) + 1;
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
    const topWinner = Object.entries(winMap).sort((a, b) => b[1] - a[1])[0];
    const topLoser = Object.entries(lossMap).sort((a, b) => b[1] - a[1])[0];
    const evenPct = total > 0 ? Math.round((even / total) * 100) : 0;
    return { total, won, lost: Object.values(lossMap).reduce((s, v) => s + v, 0), even, mostActive, bestTrader, topWinner: topWinner ? { name: topWinner[0], count: topWinner[1] } : null, topLoser: topLoser ? { name: topLoser[0], count: topLoser[1] } : null, evenPct };
  }, [trades]);

  // Filter
  const years = useMemo(() => [...new Set(trades.map((t) => t.date?.slice(0, 4)).filter(Boolean))].sort().reverse(), [trades]);
  const filtered = useMemo(() => trades.filter((t) => {
    if (ownerFilter !== "all" && t.owner.toLowerCase() !== ownerFilter.toLowerCase() && t.counter_party.toLowerCase() !== ownerFilter.toLowerCase()) return false;
    if (yearFilter !== "all" && !t.date?.startsWith(yearFilter)) return false;
    if (verdictFilter !== "all") {
      const v = t.verdict?.toLowerCase() || "";
      if (verdictFilter === "Even" && !v.includes("win-win") && !v.includes("push")) return false;
      if (verdictFilter === "ROBBERY" && !v.includes("robbery")) return false;
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
      <div style={{ marginBottom: mobile ? 10 : 14 }}>
        <div style={{ fontFamily: SERIF, fontSize: mobile ? 18 : 22, fontWeight: 900, fontStyle: "italic", color: C.goldBright, marginBottom: 6 }}>League Trade History</div>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 8 : 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: mobile ? 10 : 12, color: C.secondary }}><span style={{ fontWeight: 800, color: C.primary, fontSize: mobile ? 12 : 14 }}>{stats.total}</span> graded</span>
          <span style={{ fontFamily: MONO, fontSize: mobile ? 10 : 12, color: C.secondary }}><span style={{ fontWeight: 800, color: C.green, fontSize: mobile ? 12 : 14 }}>{stats.won}</span> won</span>
          <span style={{ fontFamily: MONO, fontSize: mobile ? 10 : 12, color: C.secondary }}><span style={{ fontWeight: 800, color: C.red, fontSize: mobile ? 12 : 14 }}>{stats.lost}</span> lost</span>
          <span style={{ fontFamily: MONO, fontSize: mobile ? 10 : 12, color: C.secondary }}><span style={{ fontWeight: 800, color: C.gold, fontSize: mobile ? 12 : 14 }}>{stats.even}</span> even</span>
        </div>
      </div>

      {/* STAT BOXES — 2x2 on mobile, 4 across on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <StatBox label="TOTAL TRADES" color={C.gold}><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: C.primary }}>{stats.total}</div></StatBox>
        <StatBox label="MOST ACTIVE" color={C.gold}><div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.gold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stats.mostActive?.[0] || "—"}</div><div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>{stats.mostActive?.[1] || 0} trades</div></StatBox>
        <StatBox label="BEST TRADER" color={C.green}><div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.green, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stats.topWinner?.name || stats.bestTrader?.name || "—"}</div><div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>{stats.topWinner ? `${stats.topWinner.count} wins` : stats.bestTrader ? `${Math.round(stats.bestTrader.avg)} avg` : "—"}</div></StatBox>
        <StatBox label="EVEN RATE" color={C.gold}><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: C.green }}>{stats.evenPct}%</div><div style={{ height: 4, borderRadius: 2, background: C.elevated, overflow: "hidden", marginTop: 3 }}><div style={{ height: "100%", borderRadius: 2, background: C.green, width: `${stats.evenPct}%` }} /></div></StatBox>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", alignItems: "center", gap: mobile ? 4 : 8, marginBottom: 10, padding: mobile ? "6px 8px" : "8px 12px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>FILTER</span>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ ...selStyle(ownerFilter !== "all"), maxWidth: mobile ? 100 : undefined }}>
          <option value="all" style={{ background: C.card }}>All Owners</option>
          {owners.map((o: string) => <option key={o} value={o} style={{ background: C.card }}>{o}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={selStyle(yearFilter !== "all")}>
          <option value="all" style={{ background: C.card }}>All Years</option>
          {years.map((y) => <option key={y} value={y} style={{ background: C.card }}>{y}</option>)}
        </select>
        {!mobile && <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} style={selStyle(verdictFilter !== "all")}>
          <option value="all" style={{ background: C.card }}>All Verdicts</option>
          {["Even", "ROBBERY", "One Winner"].map((v) => <option key={v} value={v} style={{ background: C.card }}>{v}</option>)}
        </select>}
        {hasFilter && <span onClick={() => { setOwnerFilter("all"); setYearFilter("all"); setVerdictFilter("all"); }} style={{ fontFamily: MONO, fontSize: 9, color: C.red, cursor: "pointer", padding: "3px 8px", borderRadius: 3, background: C.redDim }}>✕</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: mobile ? 9 : 10, color: C.secondary }}>{filtered.length}{hasFilter ? `/${stats.total}` : ""}</span>
      </div>

      {/* TRADE ROWS */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ maxHeight: 640, overflowY: "auto" }}>
          {filtered.map((t) => {
            const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
            const aLetter = t.side_a_letter || letterFromVerdict(t.side_a_verdict);
            const bLetter = t.side_b_letter || letterFromVerdict(t.side_b_verdict);
            const aColor = gradeColor(aLetter);
            const bColor = gradeColor(bLetter);
            const aAssets = assetStr(t.players_sent, t.picks_sent);
            const bAssets = assetStr(t.players_received, t.picks_received);

            // Skip waiver/FAAB transactions (no assets on either side)
            if (isEmptyTrade(t.players_sent, t.picks_sent) && isEmptyTrade(t.players_received, t.picks_received)) return null;

            const hasGrade = !!(aLetter || bLetter);

            return (
              <div key={t.trade_id}
                onClick={() => { track("trade_modal_opened", { league_id: leagueId, trade_id: t.trade_id }); setReportTradeId(t.trade_id); }}
                style={{
                  padding: mobile ? "10px 10px" : "12px 16px", borderBottom: `1px solid ${C.white08}`,
                  borderLeft: `3px solid ${vs?.color || "transparent"}`,
                  cursor: "pointer",
                }}>
                {/* Row 1: Date · Owners · Grades */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: mobile ? 6 : 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 8, minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: mobile ? 9 : 10, fontWeight: 700, color: C.dim, flexShrink: 0 }}>{t.date?.slice(0, 10)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <span onClick={(e) => { e.stopPropagation(); onOwnerClick(t.owner); }} style={{ fontFamily: SANS, fontSize: mobile ? 11 : 13, fontWeight: 700, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", borderBottom: `1px dotted ${C.border}` }}>{t.owner}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>⇄</span>
                      <span onClick={(e) => { e.stopPropagation(); onOwnerClick(t.counter_party); }} style={{ fontFamily: SANS, fontSize: mobile ? 11 : 13, fontWeight: 700, color: C.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", borderBottom: `1px dotted ${C.border}` }}>{t.counter_party}</span>
                    </div>
                  </div>
                  {/* Grade badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {(() => {
                      const h = hindsightLabel(t.date, t.is_championship_trade || false, t.hindsight_verdict);
                      const isPending = h.color === C.dim;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.06em", color: isPending ? C.dim : h.color }}>HINDSIGHT</span>
                          <span style={{ fontFamily: MONO, fontSize: mobile ? 9 : 10, fontWeight: 800, color: h.color, padding: "2px 8px", borderRadius: 3, background: isPending ? C.elevated : `${h.color}15`, border: `1px solid ${isPending ? C.border : `${h.color}30`}`, lineHeight: 1 }}>{h.label}</span>
                        </div>
                      );
                    })()}

                  </div>
                </div>
                {/* Row 2: Assets exchanged */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: mobile ? 6 : 10, alignItems: "start" }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>{t.owner.split(" ")[0].toUpperCase()} GAVE</div>
                    <div style={{ fontFamily: SANS, fontSize: mobile ? 10 : 11, color: C.secondary, lineHeight: 1.5 }}><InlineAssets players={t.players_sent} picks={t.picks_sent} /></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", paddingTop: 12 }}><span style={{ fontFamily: MONO, fontSize: 12, color: `${C.gold}40` }}>⇄</span></div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>{t.counter_party.split(" ")[0].toUpperCase()} GAVE</div>
                    <div style={{ fontFamily: SANS, fontSize: mobile ? 10 : 11, color: C.secondary, lineHeight: 1.5 }}><InlineAssets players={t.players_received} picks={t.picks_received} /></div>
                  </div>
                </div>
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
