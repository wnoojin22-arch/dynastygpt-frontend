"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { C, SANS, MONO, getVerdictStyle, gradeColor } from "./tokens";
import { TradeAssetList } from "./TradeAssets";
import TradeReportModal from "./TradeReportModal";

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
            const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
            // Determine per-side verdict for the first owner listed
            const isA = t.side_a_owner?.toLowerCase() === t.owner.toLowerCase();
            const myVerdict = isA ? t.side_a_verdict : t.side_b_verdict;
            const myVs = myVerdict ? getVerdictStyle(myVerdict) : null;

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
                    <span style={{ fontWeight: 700, color: C.primary }}>{t.owner}</span>
                    <span style={{ color: C.dim, fontWeight: 500, margin: "0 5px" }}>↔</span>
                    <span style={{ fontWeight: 700, color: C.primary }}>{t.counter_party}</span>
                  </div>
                  <TradeAssetList
                    players={t.players_sent} picks={t.picks_sent} compact
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", flexShrink: 0 }}>
                  {vs && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "2px 6px", borderRadius: 3, fontFamily: SANS }}>{vs.label}</span>}
                  {myVs && myVs.label !== vs?.label && <span style={{ fontSize: 7, fontWeight: 700, color: myVs.color, fontFamily: MONO }}>{myVs.label}</span>}
                </div>
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

      {/* Trade Report Modal */}
      {reportTradeId && (
        <TradeReportModal leagueId={leagueId} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />
      )}
    </>
  );
}
