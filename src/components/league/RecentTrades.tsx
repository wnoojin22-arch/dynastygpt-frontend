"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { C, SANS, MONO, getVerdictStyle, gradeColor } from "./tokens";
import { TradeAssetList } from "./TradeAssets";
import TradeReportModal from "./TradeReportModal";
import { useOwnerQuickViewStore } from "@/lib/stores/owner-quickview-store";

/* ═══════════════════════════════════════════════════════════════
   RECENT TRADES — compact sidebar widget with picks + side verdicts
   ═══════════════════════════════════════════════════════════════ */
interface TradeRow {
  trade_id?: string | null;
  owner: string;
  counter_party: string;
  verdict?: string | null;
  side_a_verdict?: string | null;
  side_b_verdict?: string | null;
  side_a_owner?: string | null;
  side_b_owner?: string | null;
  date?: string | null;
  players_sent?: string[] | null;
  players_received?: string[] | null;
  picks_sent?: string[] | null;
  picks_received?: string[] | null;
  sha_balance?: number | null;
}

export default function RecentTrades({ trades, basePath, leagueId, limit = 7 }: {
  trades: TradeRow[];
  basePath: string;
  leagueId: string;
  limit?: number;
}) {
  const router = useRouter();
  const [reportTradeId, setReportTradeId] = useState<string | null>(null);
  const openOwner = useOwnerQuickViewStore((s) => s.open);

  if (!trades.length) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; }
  };

  return (
    <>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: C.primary, fontFamily: SANS }}>RECENT TRADES</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{trades.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {trades.slice(0, limit).map((t, i) => {
            // Verdict: WON, LOST, EVEN, or ROBBERY only
            const vs = t.verdict ? getVerdictStyle(t.verdict) : null;

            // Hindsight: confirmed (548+ days) or Pending
            const tradeDate = t.date ? new Date(t.date) : null;
            const daysAgo = tradeDate ? Math.floor((Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const hindsightConfirmed = daysAgo >= 548;
            const hsVerdict = hindsightConfirmed ? ((t as any).hindsight_verdict || null) : null;
            const hsStyle = hsVerdict ? getVerdictStyle(hsVerdict) : null;

            return (
              <div key={t.trade_id || i}
                onClick={() => t.trade_id && setReportTradeId(t.trade_id)}
                style={{
                  padding: "8px 14px", cursor: "pointer", transition: "background 0.12s",
                  borderBottom: i < limit - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO, width: 36, flexShrink: 0 }}>{formatDate(t.date)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: SANS, marginBottom: 2 }}>
                    <span
                      onClick={(e) => { e.stopPropagation(); openOwner(t.owner, (t as any).owner_user_id); }}
                      style={{ fontWeight: 700, color: C.primary, cursor: "pointer", borderBottom: `1px dotted ${C.border}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = C.primary; }}
                    >{t.owner}</span>
                    <span style={{ color: C.dim, fontWeight: 500, margin: "0 5px" }}>↔</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); openOwner(t.counter_party, (t as any).counter_party_user_id); }}
                      style={{ fontWeight: 700, color: C.primary, cursor: "pointer", borderBottom: `1px dotted ${C.border}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = C.primary; }}
                    >{t.counter_party}</span>
                  </div>
                  <TradeAssetList
                    players={[...(t.players_sent || []), ...(t.players_received || [])]}
                    picks={[...(t.picks_sent || []), ...(t.picks_received || [])]}
                    compact
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", flexShrink: 0 }}>
                  {vs && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "2px 6px", borderRadius: 3, fontFamily: SANS }}>{vs.label}</span>}
                  {hindsightConfirmed && hsStyle
                    ? <span style={{ fontSize: 7, fontWeight: 700, color: hsStyle.color, fontFamily: MONO }}>HINDSIGHT: {hsStyle.label}</span>
                    : <span style={{ fontSize: 7, fontWeight: 700, color: C.dim, fontFamily: MONO, opacity: 0.5 }}>HINDSIGHT: PENDING</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div onClick={() => router.push(`${basePath}/trades?tab=league`)}
          style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, cursor: "pointer", textAlign: "center", transition: "background 0.12s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: SANS }}>View All Trades →</span>
        </div>
      </div>

      {/* Trade Report Modal */}
      {reportTradeId && (
        <TradeReportModal leagueId={leagueId} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />
      )}
    </>
  );
}
