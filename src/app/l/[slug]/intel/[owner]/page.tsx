"use client";

import { use } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getOwnerProfile, getRivalries, getOwnerRecord, getChampionships, getOwnerNeeds, getRoster } from "@/lib/api";
import type { RosterPlayer } from "@/lib/types";

const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", white08: "rgba(255,255,255,0.06)",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Playfair Display', Georgia, serif";

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
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

export default function OwnerDetailPage({ params }: { params: Promise<{ owner: string }> }) {
  const { owner: ownerParam } = use(params);
  const ownerName = decodeURIComponent(ownerParam);
  const { currentLeagueId: lid } = useLeagueStore();

  const { data: profile } = useQuery({ queryKey: ["owner-profile", lid, ownerName], queryFn: () => getOwnerProfile(lid!, ownerName), enabled: !!lid });
  const { data: rivals } = useQuery({ queryKey: ["rivals", lid, ownerName], queryFn: () => getRivalries(lid!, ownerName), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, ownerName], queryFn: () => getOwnerRecord(lid!, ownerName), enabled: !!lid });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, ownerName], queryFn: () => getChampionships(lid!, ownerName), enabled: !!lid });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, ownerName], queryFn: () => getOwnerNeeds(lid!, ownerName), enabled: !!lid });
  const { data: roster } = useQuery({ queryKey: ["roster", lid, ownerName], queryFn: () => getRoster(lid!, ownerName), enabled: !!lid });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const t = profile?.tendencies;
  const badges = t?.badges || [];

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>{ownerName}</span>
        {badges.map((b) => (
          <span key={b} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}` }}>{b}</span>
        ))}
        {record && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.secondary, marginLeft: "auto" }}>
            All-Time: <span style={{ fontWeight: 700, color: C.primary }}>{record.all_time_wins}W-{record.all_time_losses}L</span>
            {" "}({(record.win_pct * 100).toFixed(0)}%)
          </span>
        )}
        {champs && champs.championships > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>🏆 {champs.championships}</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Tendencies */}
        <DCard label="TRADE TENDENCIES">
          {t ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>TRADES/YR</span><p style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.primary }}>{t.trades_per_year}</p></div>
                <div><span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>WIN RATE</span><p style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: t.trade_win_rate >= 0.5 ? C.green : C.red }}>{(t.trade_win_rate * 100).toFixed(0)}%</p></div>
                <div><span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>TOTAL</span><p style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.primary }}>{profile?.trade_count || 0}</p></div>
              </div>
              <div>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, letterSpacing: "0.08em" }}>POSITION BIAS</span>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {Object.entries(t.positional_bias || {}).filter(([k]) => k !== "UNKNOWN").map(([pos, count]) => (
                    <span key={pos} style={{ fontFamily: MONO, fontSize: 11, padding: "2px 6px", borderRadius: 3, background: (POS[pos] || C.dim) + "15", color: POS[pos] || C.dim }}>{pos}: {count as number}</span>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, letterSpacing: "0.08em" }}>TIMING</span>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {Object.entries(t.seasonal_timing || {}).map(([period, count]) => (
                    <span key={period} style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{period}: {count as number}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
        </DCard>

        {/* Positional Needs */}
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
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>avg: {fmt(n.league_avg)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: needClr, background: `${needClr}15` }}>{n.need_level}</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
        </DCard>

        {/* Rivalries */}
        <DCard label="TRADE RIVALRIES">
          {rivals?.rivals && rivals.rivals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {rivals.rivals.map((r) => (
                <div key={r.partner} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.primary, flex: 1 }}>{r.partner}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{r.trade_count} trades</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.green }}>{r.wins}W</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.red }}>{r.losses}L</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: r.net_sha_balance >= 0 ? C.green : C.red }}>
                    {r.net_sha_balance >= 0 ? "+" : ""}{fmt(r.net_sha_balance)}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                    color: r.verdict === "Dominating" ? C.green : r.verdict === "Getting fleeced" ? C.red : C.dim,
                    background: `${r.verdict === "Dominating" ? C.green : r.verdict === "Getting fleeced" ? C.red : C.dim}15`,
                  }}>{r.verdict}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>No trade rivalries yet</p>}
        </DCard>

        {/* Roster Preview */}
        <DCard label="ROSTER" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roster?.roster_size || 0} players</span>}>
          {roster ? (
            <div>
              {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                const players = roster.by_position?.[pos] || [];
                if (!players.length) return null;
                return (
                  <div key={pos}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px", background: C.elevated, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: POS[pos] }}>{pos}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{players.length}</span>
                    </div>
                    {players.slice(0, 4).map((p: RosterPlayer) => (
                      <div key={p.name_clean} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 4px", borderBottom: `1px solid ${C.white08}`, borderLeft: `3px solid ${POS[pos]}` }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{fmt(p.sha_value)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{p.sha_pos_rank}</span>
                      </div>
                    ))}
                    {players.length > 4 && <p style={{ fontFamily: MONO, fontSize: 10, color: C.dim, padding: "2px 4px" }}>+{players.length - 4} more</p>}
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading...</p>}
        </DCard>

        {/* Trade History */}
        <DCard label="TRADE HISTORY" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{profile?.recent_trades?.length || 0} trades</span>}>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {(profile?.recent_trades || []).slice(0, 10).map((t: any, i: number) => (
              <div key={`${t.trade_id}-${i}`} style={{ padding: "6px 4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.counter_party}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{t.date?.slice(0, 10)}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>Sent: {t.sent || "—"} · Got: {t.received || "—"}</div>
              </div>
            ))}
            {(!profile?.recent_trades || profile.recent_trades.length === 0) && (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 8, textAlign: "center" }}>No trades on record</p>
            )}
          </div>
        </DCard>
      </div>
    </div>
  );
}
