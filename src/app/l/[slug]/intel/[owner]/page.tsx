"use client";

import React, { use, useState } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getOwnerProfile, getRivalries, getOwnerRecord, getChampionships,
  getOwnerNeeds, getRoster, getGradedTradesByOwner, getDraftHistory, getDraftAnalysis,
} from "@/lib/api";
import { ScoutingReport, RivalsView, TradeReportModal } from "@/components/league";
import { TradeAssetList } from "@/components/league/TradeAssets";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor, getVerdictStyle, gradeColor } from "@/components/league/tokens";
import type { RosterPlayer } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
function rankToGrade(rank: number) {
  if (rank <= 2) return { grade: "A", color: C.green };
  if (rank <= 4) return { grade: "B+", color: C.blue };
  if (rank <= 7) return { grade: "B", color: C.blue };
  if (rank <= 9) return { grade: "C", color: C.gold };
  return { grade: "D", color: C.red };
}

function DCard({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
        {right}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "overview", label: "OVERVIEW" },
  { id: "trades", label: "TRADE PROFILE" },
  { id: "draft", label: "DRAFT ROOM" },
  { id: "roster", label: "ROSTER" },
  { id: "rivals", label: "RIVALS" },
] as const;
type TabId = typeof TABS[number]["id"];

/* ═══════════════════════════════════════════════════════════════
   OWNER DETAIL PAGE — 5-tab Scouting Report (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
export default function OwnerDetailPage({ params }: { params: Promise<{ owner: string }> }) {
  const { owner: ownerParam } = use(params);
  const ownerName = decodeURIComponent(ownerParam);
  const { currentLeagueId: lid } = useLeagueStore();
  const [tab, setTab] = useState<TabId>("overview");
  const [reportTradeId, setReportTradeId] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["owner-profile", lid, ownerName], queryFn: () => getOwnerProfile(lid!, ownerName), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, ownerName], queryFn: () => getOwnerRecord(lid!, ownerName), enabled: !!lid });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, ownerName], queryFn: () => getChampionships(lid!, ownerName), enabled: !!lid });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, ownerName], queryFn: () => getOwnerNeeds(lid!, ownerName), enabled: !!lid });
  const { data: roster } = useQuery({ queryKey: ["roster", lid, ownerName], queryFn: () => getRoster(lid!, ownerName), enabled: !!lid });
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, ownerName], queryFn: () => getGradedTradesByOwner(lid!, ownerName), enabled: !!lid && (tab === "trades" || tab === "overview") });
  const { data: draft } = useQuery({ queryKey: ["draft-history", lid], queryFn: () => getDraftHistory(lid!), enabled: !!lid && tab === "draft" });
  const { data: draftAnalysis } = useQuery({ queryKey: ["draft-analysis", lid, ownerName], queryFn: () => getDraftAnalysis(lid!, ownerName), enabled: !!lid && tab === "draft" });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const t = profile?.tendencies;
  const badges = t?.badges || [];

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 22, color: C.primary, letterSpacing: "-0.01em" }}>{ownerName}</span>
        {badges.map((b) => (
          <span key={b} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}` }}>{b}</span>
        ))}
        {record && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.secondary, marginLeft: "auto" }}>
            <span style={{ fontWeight: 700, color: C.primary }}>{record.all_time_wins}W-{record.all_time_losses}L</span>
            {" "}({(record.win_pct * 100).toFixed(0)}%)
          </span>
        )}
        {champs && champs.championships > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>🏆 {champs.championships}</span>
        )}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}` }}>
        {TABS.map((tb) => (
          <div key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "8px 16px", fontFamily: MONO, fontSize: 10, fontWeight: 800,
            letterSpacing: "0.10em", color: tab === tb.id ? C.gold : C.dim, cursor: "pointer",
            borderBottom: tab === tb.id ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: tab === tb.id ? `0 3px 12px ${C.gold}40` : "none",
            transition: "all 0.2s",
          }}>{tb.label}</div>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lid && <ScoutingReport leagueId={lid} owner={ownerName} />}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[
              { label: "TRADES/YR", value: t?.trades_per_year ? String(t.trades_per_year) : "—", color: C.primary },
              { label: "WIN RATE", value: t?.trade_win_rate ? `${(t.trade_win_rate * 100).toFixed(0)}%` : "—", color: (t?.trade_win_rate || 0) >= 0.5 ? C.green : C.red },
              { label: "TOTAL TRADES", value: String(profile?.trade_count || 0), color: C.primary },
              { label: "RECORD", value: record ? `${record.all_time_wins}W-${record.all_time_losses}L` : "—", color: C.primary },
              { label: "TITLES", value: champs ? String(champs.championships) : "0", color: C.gold },
            ].map((s) => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.10em", color: C.dim, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tendencies + Needs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <DCard label="TRADE TENDENCIES">
              {t ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.dim, letterSpacing: "0.08em" }}>POSITION BIAS</span>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {Object.entries(t.positional_bias || {}).filter(([k]) => k !== "UNKNOWN").map(([pos, count]) => (
                        <span key={pos} style={{ fontFamily: MONO, fontSize: 11, padding: "2px 6px", borderRadius: 3, background: (POS[pos] || C.dim) + "15", color: POS[pos] || C.dim }}>{pos}: {count as number}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.dim, letterSpacing: "0.08em" }}>TIMING</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {Object.entries(t.seasonal_timing || {}).map(([period, count]) => (
                        <span key={period} style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{period}: {count as number}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
            </DCard>

            <DCard label="POSITIONAL NEEDS">
              {needs?.needs ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {needs.needs.map((n) => {
                    const g = rankToGrade(n.league_rank);
                    const needClr = n.need_level === "CRITICAL" ? C.red : n.need_level === "HIGH" ? C.orange : n.need_level === "MODERATE" ? C.gold : C.green;
                    return (
                      <div key={n.position} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, width: 24, color: POS[n.position] || C.dim }}>{n.position}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, padding: "1px 6px", borderRadius: 3, background: `${g.color}15`, color: g.color }}>{g.grade}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>#{n.league_rank}</span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{fmt(n.total_sha)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: needClr, background: `${needClr}15` }}>{n.need_level}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
            </DCard>
          </div>
        </div>
      )}

      {/* TRADE PROFILE */}
      {tab === "trades" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Record strip */}
          {graded && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>TRADE RECORD</span>
              <div style={{ width: 1, height: 16, background: C.border }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.green }}>W: <b>{graded.wins}</b></span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.red }}>L: <b>{graded.losses}</b></span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>P: <b>{graded.pushes}</b></span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>Rate: {graded.win_rate ? `${(graded.win_rate * 100).toFixed(0)}%` : "—"}</span>
            </div>
          )}
          {/* Trade log with picks + verdicts */}
          <DCard label="TRADE HISTORY" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{graded?.trades?.length || 0} trades</span>}>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {(graded?.trades || []).map((trade, i) => {
                const vs = trade.verdict ? getVerdictStyle(trade.verdict) : null;
                return (
                  <div key={`${trade.trade_id}-${i}`}
                    onClick={() => trade.trade_id && setReportTradeId(trade.trade_id)}
                    style={{
                    padding: "8px 4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4,
                    borderLeft: vs ? `3px solid ${vs.color}` : "3px solid transparent",
                    transition: "background 0.1s", cursor: "pointer",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{trade.date?.slice(0, 10)}</span>
                        {vs && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: vs.color, background: vs.bg, padding: "1px 6px", borderRadius: 3, letterSpacing: "0.04em" }}>{vs.label}</span>}
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>w/ {trade.counter_party}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <TradeAssetList players={trade.players_sent} picks={trade.picks_sent} direction="sent" />
                      </div>
                      <div style={{ width: 1, background: C.border, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <TradeAssetList players={trade.players_received} picks={trade.picks_received} direction="received" />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!graded?.trades || graded.trades.length === 0) && (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 8, textAlign: "center" }}>No graded trades on record</p>
              )}
            </div>
          </DCard>
        </div>
      )}

      {/* DRAFT ROOM */}
      {tab === "draft" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Draft Analysis Summary */}
          {draftAnalysis != null && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "TOTAL PICKS", value: String((draftAnalysis as Record<string, unknown>).total_picks || 0), color: C.primary },
                { label: "HIT RATE", value: `${(draftAnalysis as Record<string, unknown>).hit_rate || 0}%`, color: C.green },
                { label: "BUST RATE", value: `${(draftAnalysis as Record<string, unknown>).bust_rate || 0}%`, color: C.red },
                { label: "HITS", value: String((draftAnalysis as Record<string, unknown>).hits || 0), color: C.blue },
              ].map((s) => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.10em", color: C.dim, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 20, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
          <DCard label="DRAFT HISTORY" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{(draft?.picks as unknown[])?.length || 0} picks</span>}>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {((draft?.picks || []) as Array<Record<string, unknown>>)
                .filter((p) => String(p.owner || "").toLowerCase() === ownerName.toLowerCase())
                .map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 30 }}>R{String(p.round)}.{String(p.pick)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(String(p.position || "")), background: posColor(String(p.position || "")) + "18", padding: "1px 4px", borderRadius: 2 }}>{String(p.position || "")}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>{String(p.player || "—")}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{String(p.season || "")}</span>
                  </div>
                ))}
            </div>
          </DCard>
        </div>
      )}

      {/* ROSTER */}
      {tab === "roster" && (
        <DCard label="ROSTER" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roster?.roster_size || 0} players</span>}>
          {roster ? (
            <div>
              {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                const players = roster.by_position?.[pos] || [];
                if (!players.length) return null;
                return (
                  <div key={pos}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", background: C.elevated, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: POS[pos] }}>{pos}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{players.length} players</span>
                    </div>
                    {players.map((p: RosterPlayer) => (
                      <div key={p.name_clean} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.5fr 0.5fr 0.5fr", alignItems: "center", gap: 8, padding: "4px 6px", borderBottom: `1px solid ${C.white08}`, borderLeft: `3px solid ${POS[pos]}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          {p.age && <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flexShrink: 0 }}>{p.age}y</span>}
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, textAlign: "right" }}>{fmt(p.sha_value)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textAlign: "center" }}>{p.sha_pos_rank || "—"}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textAlign: "center" }}>{p.ktc_value ? fmt(p.ktc_value) : "—"}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
        </DCard>
      )}

      {/* RIVALS */}
      {tab === "rivals" && lid && (
        <RivalsView leagueId={lid} owner={ownerName} />
      )}

      {/* Trade Report Modal */}
      {reportTradeId && lid && (
        <TradeReportModal leagueId={lid} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />
      )}
    </div>
  );
}
