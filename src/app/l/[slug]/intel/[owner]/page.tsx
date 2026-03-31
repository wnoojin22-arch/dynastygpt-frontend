"use client";

import React, { use, useState } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getOwnerProfile, getRivalries, getOwnerRecord, getChampionships,
  getOwnerNeeds, getRoster, getGradedTradesByOwner, getDraftHistory, getDraftAnalysis,
  getOwners,
} from "@/lib/api";
import { ScoutingReport, RivalsView, TradeReportModal } from "@/components/league";
import { TradeAssetList } from "@/components/league/TradeAssets";
import DraftRoom from "@/components/league/DraftRoom";
import TradeProfile from "@/components/league/TradeProfile";
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
  { id: "seasons", label: "SEASONS" },
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

  // Look up userId for this owner from the owners list
  const { data: ownersData } = useQuery({ queryKey: ["owners", lid], queryFn: () => getOwners(lid!), enabled: !!lid, staleTime: 600000 });
  const ownerUserId = ownersData?.owners?.find((o: { name: string; platform_user_id?: string }) => o.name === ownerName)?.platform_user_id ?? null;

  const { data: profile } = useQuery({ queryKey: ["owner-profile", lid, ownerName], queryFn: () => getOwnerProfile(lid!, ownerName, ownerUserId), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, ownerName], queryFn: () => getOwnerRecord(lid!, ownerName, ownerUserId), enabled: !!lid });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, ownerName], queryFn: () => getChampionships(lid!, ownerName, ownerUserId), enabled: !!lid });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, ownerName], queryFn: () => getOwnerNeeds(lid!, ownerName, ownerUserId), enabled: !!lid });
  const { data: roster } = useQuery({ queryKey: ["roster", lid, ownerName], queryFn: () => getRoster(lid!, ownerName, ownerUserId), enabled: !!lid });
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, ownerName], queryFn: () => getGradedTradesByOwner(lid!, ownerName, ownerUserId), enabled: !!lid && (tab === "trades" || tab === "overview") });
  const { data: draft } = useQuery({ queryKey: ["draft-history", lid], queryFn: () => getDraftHistory(lid!), enabled: !!lid && tab === "draft" });
  const { data: draftAnalysis } = useQuery({ queryKey: ["draft-analysis", lid, ownerName], queryFn: () => getDraftAnalysis(lid!, ownerName, ownerUserId), enabled: !!lid && tab === "draft" });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const t = (profile?.tendencies || (profile as Record<string, unknown>)?.trading || {}) as Record<string, unknown>;
  const badges = (t.badges || []) as string[];

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
          {lid && <ScoutingReport leagueId={lid} owner={ownerName} ownerId={ownerUserId} />}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[
              { label: "TRADES/YR", value: t?.trades_per_year ? String(t.trades_per_year) : "—", color: C.primary },
              { label: "WIN RATE", value: t?.trade_win_rate ? `${(Number(t.trade_win_rate) * 100).toFixed(0)}%` : "—", color: Number(t?.trade_win_rate || 0) >= 0.5 ? C.green : C.red },
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
      {tab === "trades" && profile && (
        <TradeProfile ownerName={ownerName} profile={profile as Record<string, unknown>} />
      )}

      {/* DRAFT ROOM */}
      {tab === "draft" && lid && (
        <DraftRoom />
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
        <RivalsView leagueId={lid} owner={ownerName} ownerId={ownerUserId} />
      )}

      {/* SEASONS */}
      {tab === "seasons" && (() => {
        const seasons: Array<Record<string, unknown>> = (record as any)?.seasons || [];
        const finishes: Array<{ season: string; finish: number }> = champs?.season_finishes || [];
        const champYears = new Set(champs?.championship_years || []);
        const playoffYears = new Set(champs?.playoff_years || []);
        const totalSeasons = seasons.length;

        // Merge season records with finish positions
        const merged = seasons.map((s: any) => {
          const sf = finishes.find((f) => String(f.season) === String(s.season));
          return {
            season: String(s.season),
            wins: s.wins as number,
            losses: s.losses as number,
            pf: s.points_for as number,
            pa: s.points_against as number,
            finish: sf?.finish ?? null as number | null,
            isChamp: champYears.has(String(s.season)),
            isPlayoff: playoffYears.has(String(s.season)),
            displayName: s.display_name as string || ownerName,
          };
        }).sort((a, b) => Number(a.season) - Number(b.season));

        // Trajectory
        const recentFinishes = merged.filter((m) => m.finish != null).slice(-3);
        let trajectory = "STABLE";
        if (recentFinishes.length >= 2) {
          const first = recentFinishes[0].finish!;
          const last = recentFinishes[recentFinishes.length - 1].finish!;
          if (last < first - 2) trajectory = "RISING";
          else if (last > first + 2) trajectory = "DECLINING";
        }
        const trajColor = trajectory === "RISING" ? C.green : trajectory === "DECLINING" ? C.red : C.gold;

        // Best season
        const best = merged.reduce((a, b) =>
          (a.isChamp && !b.isChamp) ? a :
          (!a.isChamp && b.isChamp) ? b :
          (a.finish ?? 99) < (b.finish ?? 99) ? a : b,
          merged[0] || {} as typeof merged[0]
        );

        // Avg finish
        const validFinishes = merged.filter((m) => m.finish != null);
        const avgFinish = validFinishes.length > 0
          ? (validFinishes.reduce((s, m) => s + m.finish!, 0) / validFinishes.length)
          : null;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* ── Summary strip ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              padding: "12px 16px", borderRadius: 8,
              background: C.panel, border: `1px solid ${C.border}`,
            }}>
              {champs && champs.championships > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {Array.from({ length: champs.championships }).map((_, i) => (
                    <span key={i} style={{ fontSize: 20 }}>🏆</span>
                  ))}
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.gold, marginLeft: 4 }}>
                    {champs.championships}x CHAMPION
                  </span>
                </div>
              )}
              <div style={{ width: 1, height: 20, background: C.borderLt }} />
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>
                <span style={{ fontWeight: 700, color: C.primary }}>{champs?.playoff_appearances || 0}</span> playoff{(champs?.playoff_appearances || 0) !== 1 ? "s" : ""} / {totalSeasons} seasons
              </div>
              <div style={{ width: 1, height: 20, background: C.borderLt }} />
              <span style={{
                fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 10px", borderRadius: 4,
                color: trajColor, background: `${trajColor}15`, border: `1px solid ${trajColor}30`,
              }}>
                {trajectory}
              </span>
              {avgFinish != null && (
                <>
                  <div style={{ width: 1, height: 20, background: C.borderLt }} />
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>
                    Avg finish: <span style={{ fontWeight: 700, color: C.primary }}>{avgFinish.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>

            {/* ── Championship Timeline (horizontal scroll) ── */}
            {merged.length > 0 && (
              <DCard label="TIMELINE">
                <div style={{
                  display: "flex", gap: 0, overflowX: "auto", paddingBottom: 4,
                  WebkitOverflowScrolling: "touch" as any,
                }}>
                  {merged.map((m, i) => {
                    const finishColor = m.isChamp ? C.gold : m.finish != null && m.finish <= 3 ? C.green
                      : m.finish != null && m.finish <= 6 ? C.blue
                      : m.finish != null && m.finish <= 9 ? C.gold : C.red;
                    const barHeight = m.finish != null ? Math.max(20, 100 - (m.finish - 1) * 7) : 30;

                    return (
                      <div key={m.season} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        minWidth: 56, flex: "1 0 56px", gap: 4,
                        padding: "4px 2px",
                        borderRight: i < merged.length - 1 ? `1px solid ${C.white08}` : "none",
                      }}>
                        {/* Trophy or finish */}
                        <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {m.isChamp ? (
                            <span style={{ fontSize: 18 }}>🏆</span>
                          ) : m.isPlayoff ? (
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.green, background: `${C.green}15`, padding: "1px 4px", borderRadius: 3 }}>PO</span>
                          ) : (
                            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>—</span>
                          )}
                        </div>

                        {/* Bar */}
                        <div style={{
                          width: 20, height: barHeight, borderRadius: 3,
                          background: `${finishColor}30`, border: `1px solid ${finishColor}50`,
                          display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 3,
                          transition: "height 0.3s ease",
                        }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: finishColor }}>
                            {m.finish ?? "?"}
                          </span>
                        </div>

                        {/* Record */}
                        <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary, whiteSpace: "nowrap" }}>
                          {m.wins}-{m.losses}
                        </span>

                        {/* Year */}
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: m.isChamp ? C.gold : C.dim }}>
                          {m.season.slice(-2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </DCard>
            )}

            {/* ── Best Season Highlight ── */}
            {best && best.season && (
              <div style={{
                padding: "14px 18px", borderRadius: 8,
                background: best.isChamp
                  ? `linear-gradient(135deg, rgba(212,165,50,0.08), rgba(212,165,50,0.02))`
                  : C.card,
                border: `1px solid ${best.isChamp ? C.goldBorder : C.border}`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginBottom: 6 }}>
                  BEST SEASON
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900, color: C.gold }}>{best.season}</span>
                  {best.isChamp && <span style={{ fontSize: 22 }}>🏆</span>}
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.primary }}>
                    {best.wins}W-{best.losses}L
                  </span>
                  {best.finish != null && (
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.secondary }}>
                      Finished {best.finish === 1 ? "1st" : best.finish === 2 ? "2nd" : best.finish === 3 ? "3rd" : `${best.finish}th`}
                    </span>
                  )}
                  {best.pf > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{fmt(best.pf)} PF</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Season-by-Season Cards ── */}
            <DCard label="ALL SEASONS">
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 60px 40px",
                  padding: "4px 8px 6px", gap: 8,
                }}>
                  {["YEAR", "RECORD", "PF", "PA", "FINISH", ""].map((h) => (
                    <span key={h} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.dim }}>{h}</span>
                  ))}
                </div>

                {[...merged].reverse().map((m) => {
                  const winPct = (m.wins + m.losses) > 0 ? m.wins / (m.wins + m.losses) : 0;
                  const wrColor = winPct >= 0.6 ? C.green : winPct >= 0.45 ? C.gold : C.red;
                  const finColor = m.isChamp ? C.gold : m.finish != null && m.finish <= 3 ? C.green : m.finish != null && m.finish <= 6 ? C.blue : m.finish != null && m.finish <= 9 ? C.gold : C.red;

                  return (
                    <div key={m.season} style={{
                      display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 60px 40px",
                      padding: "6px 8px", gap: 8, alignItems: "center",
                      borderBottom: `1px solid ${C.white08}`,
                      background: m.isChamp ? `${C.gold}06` : "transparent",
                    }}>
                      {/* Year */}
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: m.isChamp ? C.gold : C.primary }}>
                        {m.season}
                      </span>

                      {/* Record with bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: wrColor }}>
                          {m.wins}W-{m.losses}L
                        </span>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border, overflow: "hidden", maxWidth: 80 }}>
                          <div style={{ width: `${winPct * 100}%`, height: "100%", background: wrColor, borderRadius: 2 }} />
                        </div>
                      </div>

                      {/* PF */}
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>
                        {m.pf > 0 ? fmt(m.pf) : "—"}
                      </span>

                      {/* PA */}
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>
                        {m.pa > 0 ? fmt(m.pa) : "—"}
                      </span>

                      {/* Finish */}
                      <span style={{
                        fontFamily: MONO, fontSize: 12, fontWeight: 800,
                        color: finColor,
                      }}>
                        {m.finish != null ? (m.finish === 1 ? "1st" : m.finish === 2 ? "2nd" : m.finish === 3 ? "3rd" : `${m.finish}th`) : "—"}
                      </span>

                      {/* Icons */}
                      <div style={{ display: "flex", gap: 2 }}>
                        {m.isChamp && <span style={{ fontSize: 14 }}>🏆</span>}
                        {m.isPlayoff && !m.isChamp && <span style={{ fontFamily: MONO, fontSize: 8, color: C.green }}>PO</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DCard>
          </div>
        );
      })()}

      {/* Trade Report Modal */}
      {reportTradeId && lid && (
        <TradeReportModal leagueId={lid} tradeId={reportTradeId} onClose={() => setReportTradeId(null)} />
      )}
    </div>
  );
}
