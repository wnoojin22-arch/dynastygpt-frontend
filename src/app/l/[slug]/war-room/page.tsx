"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import { useWarRoomStore } from "@/lib/stores/war-room-store";
import { useQuery } from "@tanstack/react-query";
import {
  getRoster, getPicks, getOwnerTrending, getOwnerNeeds,
  getGradedTradesByOwner, getTradePartners, getRankings,
  getOwnerRecord, getChampionships, getOwnerProfiles,
  getRivalries, getFranchiseIntel, getActions,
} from "@/lib/api";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { RosterPlayer, GradedTrade } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  goldGlow: "rgba(212,165,50,0.06)",
  green: "#7dd3a0", greenDim: "rgba(125,211,160,0.12)",
  red: "#e47272", redDim: "rgba(228,114,114,0.12)",
  blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
};
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B", PICK: "#8B5CF6" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Playfair Display', Georgia, serif";

function fmt(n: number | null | undefined, d = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
function safe(v: unknown): string {
  if (v == null || v === "nan" || v === "null" || v === "") return "—";
  return String(v);
}
function posRankColor(rank: string | null | undefined): string {
  if (!rank || rank === "nan" || rank === "—") return C.dim;
  const num = parseInt(rank.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return C.dim;
  if (num <= 10) return C.gold;
  if (num <= 24) return C.primary;
  return C.red;
}
function gradeColor(g: string): string {
  if (!g) return C.dim;
  if (g.startsWith("A") || g === "ELITE") return C.green;
  if (g.startsWith("B") || g === "STRONG") return C.blue;
  if (g.startsWith("C") || g === "AVERAGE") return C.gold;
  if (g.startsWith("D") || g === "WEAK") return C.orange;
  return C.red;
}
function rankToGrade(rank: number): { grade: string; color: string } {
  if (rank <= 1) return { grade: "A+", color: C.green };
  if (rank === 2) return { grade: "A", color: C.green };
  if (rank === 3) return { grade: "A-", color: C.green };
  if (rank <= 5) return { grade: "B+", color: C.blue };
  if (rank <= 7) return { grade: "B", color: C.blue };
  if (rank <= 9) return { grade: "C", color: C.gold };
  if (rank <= 11) return { grade: "D", color: C.red };
  return { grade: "F", color: C.red };
}
function getVerdictStyle(v: string) {
  if (v === "Win-Win") return { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" };
  if (v === "ROBBERY") return { color: "#ff4444", bg: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.30)" };
  if (v === "Push") return { color: C.secondary, bg: "rgba(176,178,200,0.10)", border: "rgba(176,178,200,0.20)" };
  if (v.includes("Won")) return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v.includes("Lost")) return { color: C.red, bg: "rgba(255,68,68,0.10)", border: "rgba(255,68,68,0.25)" };
  return { color: C.dim, bg: "transparent", border: C.border };
}

/* ─── Card component ────────────────────────────────────────── */
function DCard({ label, right, children, className = "" }: { label?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      {label && (
        <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
          {right}
        </div>
      )}
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

/* ─── Loading skeleton ──────────────────────────────────────── */
function Skel({ h = 20, w = "100%" }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, background: C.elevated, borderRadius: 4, animation: "pulse 1.5s ease infinite" }} />;
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ lid, owner }: { lid: string; owner: string }) {
  const { data: roster, isLoading: loadingRoster } = useQuery({ queryKey: ["roster", lid, owner], queryFn: () => getRoster(lid, owner), enabled: !!lid && !!owner });
  const { data: picks } = useQuery({ queryKey: ["picks", lid, owner], queryFn: () => getPicks(lid, owner), enabled: !!lid && !!owner });
  const { data: trending } = useQuery({ queryKey: ["trending-owner", lid, owner], queryFn: () => getOwnerTrending(lid, owner), enabled: !!lid && !!owner });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, owner], queryFn: () => getOwnerNeeds(lid, owner), enabled: !!lid && !!owner });
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, owner], queryFn: () => getGradedTradesByOwner(lid, owner), enabled: !!lid && !!owner });
  const { data: partners } = useQuery({ queryKey: ["partners", lid, owner], queryFn: () => getTradePartners(lid, owner), enabled: !!lid && !!owner });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid), enabled: !!lid });
  const { data: record } = useQuery({ queryKey: ["record", lid, owner], queryFn: () => getOwnerRecord(lid, owner), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, owner], queryFn: () => getChampionships(lid, owner), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid), enabled: !!lid });

  const myRank = rankings?.rankings?.find((r) => r.owner.toLowerCase() === owner.toLowerCase());
  const myProfile = profiles?.profiles?.find((p) => p.owner.toLowerCase() === owner.toLowerCase());
  const grades = roster?.positional_grades || {};
  const radarData = (needs?.needs || []).map((n) => ({ position: n.position, you: n.total_sha, league: n.league_avg }));
  const wins = graded?.wins || 0, losses = graded?.losses || 0, pushes = graded?.pushes || 0;
  const donut = [
    { name: "W", value: wins, color: C.green },
    { name: "L", value: losses, color: C.red },
    { name: "P", value: pushes, color: "#4a4d5e" },
  ].filter((d) => d.value > 0);

  function tierBadge(rank: number | undefined) {
    if (!rank) return { label: "—", bg: C.elevated, color: C.dim };
    if (rank <= 3) return { label: "TOP DOG", bg: "rgba(125,211,160,0.15)", color: C.green };
    if (rank <= 6) return { label: "CONTENDER", bg: C.goldDim, color: C.gold };
    if (rank <= 9) return { label: "FEISTY", bg: "rgba(224,156,107,0.12)", color: C.orange };
    return { label: "BASEMENT", bg: "rgba(228,114,114,0.12)", color: C.red };
  }
  const tier = tierBadge(myRank?.rank);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── Command Strip ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "8px 12px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "2px 10px", borderRadius: 4, background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33` }}>{tier.label}</span>
        <div style={{ width: 1, height: 16, background: C.border }} />
        {[
          { label: "RECORD", value: record ? `${record.all_time_wins}W-${record.all_time_losses}L` : "—" },
          { label: "TITLES", value: champs ? String(champs.championships) : "0" },
          { label: "PLAYOFFS", value: champs ? String(champs.playoff_appearances) : "0" },
          { label: "SHA TOTAL", value: roster ? fmt(roster.total_sha) : "—", accent: true },
        ].map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <div style={{ width: 1, height: 16, background: C.border }} />}
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", color: C.dim }}>{s.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: s.accent ? C.gold : C.primary }}>{s.value}</span>
          </div>
        ))}
        {trending && (
          <>
            <div style={{ width: 1, height: 16, background: C.border }} />
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: trending.total_roster_delta >= 0 ? C.green : C.red }}>
              {trending.total_roster_delta >= 0 ? "+" : ""}{fmt(trending.total_roster_delta)} 7D
            </span>
          </>
        )}
      </div>

      {/* ── Alerts ── */}
      {trending && (trending.risers.length > 0 || trending.fallers.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {trending.risers.slice(0, 3).map((r, i) => (
            <span key={`r-${i}`} style={{ fontFamily: MONO, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(125,211,160,0.08)", color: C.green, border: "1px solid rgba(125,211,160,0.20)" }}>
              {r.player} +{fmt(r.sha_delta)}
            </span>
          ))}
          {trending.fallers.slice(0, 3).map((f, i) => (
            <span key={`f-${i}`} style={{ fontFamily: MONO, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(228,114,114,0.08)", color: C.red, border: "1px solid rgba(228,114,114,0.20)" }}>
              {f.player} {fmt(f.sha_delta)}
            </span>
          ))}
        </div>
      )}

      {/* ── Rank Cards + Positional Grades ── */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "DYNASTY", rank: myRank?.rank, sub: fmt(roster?.total_sha), accent: "#8B5CF6" },
          { label: "SHA RANK", rank: myProfile?.sha_rank, sub: myProfile?.window || "—", accent: C.gold },
        ].map((c) => (
          <div key={c.label} style={{ flex: 1, borderRadius: 6, padding: "10px 12px", textAlign: "center", background: C.elevated, border: `1px solid ${C.border}`, borderTop: `2px solid ${c.accent}` }}>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", color: C.dim, marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontSize: 28, fontWeight: 900, fontFamily: MONO, color: c.accent }}>{typeof c.rank === "number" ? `#${c.rank}` : safe(c.rank)}</p>
            <p style={{ fontFamily: MONO, fontSize: 10, color: C.secondary, marginTop: 2 }}>{c.sub}</p>
          </div>
        ))}

        {/* Positional Grades — with rank numbers like Shadynasty */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
            const g = grades[pos] || "?";
            const clr = gradeColor(g);
            const n = needs?.needs?.find((x) => x.position === pos);
            const rk = n ? `#${n.league_rank}` : "";
            const gradeLabel = rankToGrade(n?.league_rank || 7);
            return (
              <div key={pos} style={{ width: 64, borderRadius: 6, padding: "10px 4px", textAlign: "center", background: C.elevated, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: POS[pos] }}>{pos}</p>
                <p style={{ fontSize: 20, fontWeight: 900, fontFamily: MONO, marginTop: 2, color: gradeLabel.color, textShadow: `0 0 12px ${gradeLabel.color}44` }}>{gradeLabel.grade}</p>
                <p style={{ fontSize: 9, fontFamily: MONO, color: C.dim, marginTop: 2 }}>{rk}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two Column: Roster + Sidebar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 10 }}>
        {/* LEFT: Roster */}
        <DCard label="ROSTER" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roster?.roster_size || 0} players</span>}>
          {loadingRoster ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{Array.from({ length: 12 }).map((_, i) => <Skel key={i} h={24} />)}</div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.6fr 0.5fr 0.5fr", padding: "0 8px 4px", color: C.dim }}>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>PLAYER</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, textAlign: "center" }}>SHA VAL</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, textAlign: "center" }}>POS RK</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, textAlign: "center" }}>7D</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, textAlign: "center" }}>AGE</span>
              </div>
              {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                const players = roster?.by_position?.[pos] || [];
                if (!players.length) return null;
                const n = needs?.needs?.find((x) => x.position === pos);
                const gradeLabel = n ? rankToGrade(n.league_rank) : null;
                return (
                  <div key={pos}>
                    {/* Position header with grade badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: C.elevated, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: POS[pos] }}>{pos}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{players.length}</span>
                      {gradeLabel && (
                        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: gradeLabel.color, background: `${gradeLabel.color}15`, border: `1px solid ${gradeLabel.color}25` }}>
                          {gradeLabel.grade} #{n!.league_rank}
                        </span>
                      )}
                    </div>
                    {/* Rows */}
                    {players.map((p: RosterPlayer, idx: number) => {
                      const mover = trending?.risers.find(r => r.player === p.name) || trending?.fallers.find(f => f.player === p.name);
                      return (
                        <div key={p.name_clean} style={{
                          display: "grid", gridTemplateColumns: "1.8fr 0.6fr 0.6fr 0.5fr 0.5fr",
                          padding: "3px 8px", borderLeft: `3px solid ${POS[pos]}${idx < 2 ? "" : "30"}`,
                          borderBottom: `1px solid ${C.white08}`, cursor: "default",
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, textAlign: "center", color: C.gold }}>{fmt(p.sha_value)}</span>
                          <span style={{ fontFamily: MONO, fontSize: 11, textAlign: "center", padding: "1px 4px", borderRadius: 3, color: posRankColor(p.sha_pos_rank), background: `${posRankColor(p.sha_pos_rank)}15` }}>
                            {safe(p.sha_pos_rank)}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 10, textAlign: "center", color: mover ? (trending?.risers.some(r => r.player === p.name) ? C.green : C.red) : C.dim }}>
                            {mover ? `${trending?.risers.some(r => r.player === p.name) ? "+" : ""}${fmt(mover.sha_delta)}` : "—"}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 11, textAlign: "center", color: C.dim }}>{p.age ?? "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </DCard>

        {/* RIGHT: Sidebar cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Radar */}
          <DCard label="POSITIONAL STRENGTH">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="position" tick={{ fill: C.dim, fontSize: 10, fontFamily: "monospace" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="You" dataKey="you" stroke={C.gold} fill={C.gold} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="League" dataKey="league" stroke="#4a4d5e" fill="#4a4d5e" fillOpacity={0.08} strokeWidth={1} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <Skel h={200} />}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: C.gold }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} /> You
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, color: C.dim }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a4d5e" }} /> League Avg
              </span>
            </div>
          </DCard>

          {/* Trade Record */}
          <DCard label="TRADE RECORD">
            {donut.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ResponsiveContainer width={90} height={90}>
                  <PieChart><Pie data={donut} dataKey="value" innerRadius={26} outerRadius={40} paddingAngle={3} strokeWidth={0}>{donut.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: MONO, fontSize: 12 }}>
                  <p style={{ color: C.green }}>W: <span style={{ fontWeight: 700 }}>{wins}</span></p>
                  <p style={{ color: C.red }}>L: <span style={{ fontWeight: 700 }}>{losses}</span></p>
                  <p style={{ color: C.dim }}>P: <span style={{ fontWeight: 700 }}>{pushes}</span></p>
                  <p style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Rate: <span style={{ color: C.gold }}>{graded?.win_rate ? `${(graded.win_rate * 100).toFixed(0)}%` : "—"}</span></p>
                </div>
              </div>
            ) : <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>No graded trades</p>}
          </DCard>

          {/* Draft Capital */}
          <DCard label="DRAFT CAPITAL">
            {picks ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(picks.by_year).map(([year, yp]) => (
                  <div key={year}>
                    <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, marginBottom: 4 }}>{year}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {yp.map((p, i) => (
                        <span key={`${year}-${i}`} style={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: p.is_own_pick ? C.goldDim : "rgba(139,92,246,0.10)",
                          color: p.is_own_pick ? C.gold : "#8B5CF6",
                          border: `1px solid ${p.is_own_pick ? C.goldBorder : "rgba(139,92,246,0.25)"}`,
                        }}>R{p.round}{!p.is_own_pick && <span style={{ opacity: 0.6, marginLeft: 2 }}>({p.original_owner.slice(0, 5)})</span>}</span>
                      ))}
                    </div>
                  </div>
                ))}
                <p style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{picks.total_picks} picks · <span style={{ color: C.gold }}>{fmt(picks.total_sha_value)} SHA</span></p>
              </div>
            ) : <Skel h={60} />}
          </DCard>

          {/* Trade Intel */}
          <DCard label="TRADE INTEL">
            {partners ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {partners.partners.slice(0, 6).map((p) => (
                  <div key={p.owner} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.primary, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {p.badges.slice(0, 2).map((b) => {
                        const isBest = b === "BEST FIT";
                        const isSurplus = b.includes("SURPLUS");
                        return (
                          <span key={b} style={{
                            fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                            background: isBest ? C.greenDim : isSurplus ? "rgba(107,184,224,0.10)" : "rgba(149,150,165,0.10)",
                            color: isBest ? C.green : isSurplus ? C.blue : C.dim,
                            border: `1px solid ${isBest ? "rgba(125,211,160,0.25)" : isSurplus ? "rgba(107,184,224,0.25)" : "rgba(149,150,165,0.15)"}`,
                          }}>{b}</span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : <Skel h={96} />}
          </DCard>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FRANCHISE INTEL VIEW
   ═══════════════════════════════════════════════════════════════ */
function FranchiseIntelView({ lid, owner }: { lid: string; owner: string }) {
  const { data: intel } = useQuery({ queryKey: ["franchise-intel", lid, owner], queryFn: () => getFranchiseIntel(lid, owner), enabled: !!lid && !!owner });
  const { data: actions } = useQuery({ queryKey: ["actions", lid, owner], queryFn: () => getActions(lid, owner), enabled: !!lid && !!owner });
  const { data: needs } = useQuery({ queryKey: ["needs", lid, owner], queryFn: () => getOwnerNeeds(lid, owner), enabled: !!lid && !!owner });

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Franchise Intel — {owner}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Actions */}
        <DCard label="STOP / START / KEEP">
          {actions ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "STOP", items: actions.stop, color: C.red },
                { label: "START", items: actions.start, color: C.green },
                { label: "KEEP", items: actions.keep, color: C.gold },
              ].map((group) => (
                <div key={group.label}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: group.color, letterSpacing: "0.1em" }}>{group.label}</span>
                  <div style={{ marginTop: 4 }}>
                    {group.items.map((item, i) => (
                      <p key={i} style={{ fontFamily: MONO, fontSize: 12, color: C.secondary, padding: "2px 0", borderBottom: `1px solid ${C.white08}` }}>{item}</p>
                    ))}
                    {group.items.length === 0 && <p style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <Skel h={120} />}
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
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: needClr, background: `${needClr}15` }}>{n.need_level}</span>
                  </div>
                );
              })}
            </div>
          ) : <Skel h={120} />}
        </DCard>
      </div>

      {/* Intel Report */}
      {intel && intel.ai_report && (
        <DCard label="AI FRANCHISE REPORT">
          <pre style={{ fontFamily: MONO, fontSize: 12, color: C.secondary, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {typeof intel.ai_report === "string" ? intel.ai_report : JSON.stringify(intel.ai_report, null, 2)}
          </pre>
        </DCard>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MY TRADES VIEW (History)
   ═══════════════════════════════════════════════════════════════ */
function MyTradesView({ lid, owner }: { lid: string; owner: string }) {
  const { data: graded } = useQuery({ queryKey: ["graded-owner", lid, owner], queryFn: () => getGradedTradesByOwner(lid, owner), enabled: !!lid && !!owner });

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Record strip */}
      {graded && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>TRADE RECORD — {owner.toUpperCase()}</span>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.green }}>W: <b>{graded.wins}</b></span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.red }}>L: <b>{graded.losses}</b></span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>P: <b>{graded.pushes}</b></span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>Rate: {graded.win_rate ? `${(graded.win_rate * 100).toFixed(0)}%` : "—"}</span>
        </div>
      )}

      <DCard label="TRADE HISTORY" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{graded?.trades?.length || 0} trades</span>}>
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {graded?.trades?.map((t: GradedTrade, i: number) => {
            const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
            return (
              <div key={`${t.trade_id}-${i}`} style={{
                padding: "8px", borderRadius: 4, borderBottom: `1px solid ${C.white08}`,
                borderLeft: vs ? `3px solid ${vs.color}` : "3px solid transparent",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.owner}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>↔</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.counter_party}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {vs && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}` }}>{t.verdict}</span>}
                    {t.sha_balance != null && !isNaN(t.sha_balance) && (
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: t.sha_balance > 0 ? C.green : t.sha_balance < 0 ? C.red : C.dim }}>{t.sha_balance > 0 ? "+" : ""}{fmt(t.sha_balance)}</span>
                    )}
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{t.date?.slice(0, 10)}</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontFamily: MONO, fontSize: 11 }}>
                  <div><span style={{ color: C.dim }}>Sent: </span><span style={{ color: C.secondary }}>{Array.isArray(t.players_sent) ? t.players_sent.join(", ") : "—"}</span></div>
                  <div><span style={{ color: C.dim }}>Got: </span><span style={{ color: C.secondary }}>{Array.isArray(t.players_received) ? t.players_received.join(", ") : "—"}</span></div>
                </div>
              </div>
            );
          })}
          {(!graded?.trades || graded.trades.length === 0) && (
            <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 16, textAlign: "center" }}>No trades on record</p>
          )}
        </div>
      </DCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RIVALS VIEW
   ═══════════════════════════════════════════════════════════════ */
function RivalsView({ lid, owner }: { lid: string; owner: string }) {
  const { data: rivals } = useQuery({ queryKey: ["rivals", lid, owner], queryFn: () => getRivalries(lid, owner), enabled: !!lid && !!owner });

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <DCard label="TRADE RIVALRIES" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{rivals?.rivals?.length || 0} partners</span>}>
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE BUILDER VIEW (placeholder — complex component)
   ═══════════════════════════════════════════════════════════════ */
function TradeBuilderView({ lid, owner }: { lid: string; owner: string }) {
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Trade Builder</div>
      <DCard label="COMING SOON">
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Interactive trade builder with AI coaching is in development.</p>
      </DCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NO OWNER VIEW
   ═══════════════════════════════════════════════════════════════ */
function NoOwnerView() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 40 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 900, fontStyle: "italic", color: C.goldBright, marginBottom: 8 }}>Select Your Team</div>
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Choose an owner from the sidebar dropdown to access the War Room.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WAR ROOM PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function WarRoomPage() {
  const { currentLeagueId: lid, currentOwner: owner } = useLeagueStore();
  const { activeView } = useWarRoomStore();

  if (!lid) return <NoOwnerView />;
  if (!owner) return <NoOwnerView />;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView lid={lid} owner={owner} />,
    "franchise-intel": <FranchiseIntelView lid={lid} owner={owner} />,
    history: <MyTradesView lid={lid} owner={owner} />,
    builder: <TradeBuilderView lid={lid} owner={owner} />,
    rivals: <RivalsView lid={lid} owner={owner} />,
  };

  return <>{views[activeView] || views.dashboard}</>;
}
