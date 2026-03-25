"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getRankings, getRecentTrades, getTrending, getOwnerProfiles, getOverview } from "@/lib/api";

const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
};
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
function getVerdictStyle(v: string) {
  if (v === "Win-Win") return { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" };
  if (v === "ROBBERY") return { color: "#ff4444", bg: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.30)" };
  if (v?.includes("Won")) return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v?.includes("Lost")) return { color: C.red, bg: "rgba(255,68,68,0.10)", border: "rgba(255,68,68,0.25)" };
  return { color: C.dim, bg: "transparent", border: C.border };
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

export default function LeagueHome() {
  const { currentLeagueId: lid } = useLeagueStore();

  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid!), enabled: !!lid });
  const { data: recentTrades } = useQuery({ queryKey: ["recent-trades", lid], queryFn: () => getRecentTrades(lid!, 10), enabled: !!lid });
  const { data: trending } = useQuery({ queryKey: ["trending", lid], queryFn: () => getTrending(lid!), enabled: !!lid });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid!), enabled: !!lid });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── League Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>{overview?.name || "DynastyGPT"}</div>
        {overview && (
          <div style={{ display: "flex", gap: 12, marginLeft: "auto", fontFamily: MONO, fontSize: 11 }}>
            <span style={{ color: C.dim }}>{overview.format.num_teams}T</span>
            <span style={{ color: C.dim }}>{overview.format.is_superflex ? "SF" : "1QB"}</span>
            <span style={{ color: C.dim }}>{overview.scoring.type.toUpperCase()}</span>
            <span style={{ color: C.gold }}>{overview.trade_volume.total} trades</span>
          </div>
        )}
      </div>

      {/* ── Market Movers Ticker ── */}
      {trending && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, overflow: "hidden", background: C.panel, border: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.gold, flexShrink: 0 }}>MARKET</span>
          <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
            {trending.risers.slice(0, 5).map((r, i) => (
              <span key={`r-${i}`} style={{ fontFamily: MONO, fontSize: 11, whiteSpace: "nowrap" }}>
                <span style={{ color: C.primary }}>{r.player}</span>{" "}
                <span style={{ color: C.green }}>▲ +{fmt(r.sha_delta)}</span>
              </span>
            ))}
            {trending.fallers.slice(0, 5).map((f, i) => (
              <span key={`f-${i}`} style={{ fontFamily: MONO, fontSize: 11, whiteSpace: "nowrap" }}>
                <span style={{ color: C.primary }}>{f.player}</span>{" "}
                <span style={{ color: C.red }}>▼ {fmt(f.sha_delta)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* ── Power Rankings ── */}
        <DCard label="POWER RANKINGS" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{rankings?.rankings?.length || 0} teams</span>}>
          <div>
            {rankings?.rankings?.map((r) => {
              const pct = r.total_sha / (rankings.rankings[0]?.total_sha || 1) * 100;
              const g = rankToGrade(r.rank);
              return (
                <div key={r.owner} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, width: 24, color: g.color }}>#{r.rank}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.owner}</span>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: C.elevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: g.color }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, width: 56, textAlign: "right", color: C.gold }}>{fmt(r.total_sha)}</span>
                </div>
              );
            })}
          </div>
        </DCard>

        {/* ── Recent Trades ── */}
        <DCard label="RECENT TRADES" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{recentTrades?.trades?.length || 0} trades</span>}>
          <div>
            {recentTrades?.trades?.map((t, i) => {
              const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
              const sent = Array.isArray(t.players_sent) ? t.players_sent.join(", ") : "";
              const got = Array.isArray(t.players_received) ? t.players_received.join(", ") : "";
              return (
                <div key={`${t.trade_id}-${i}`} style={{ padding: "6px 4px", borderBottom: `1px solid ${C.white08}`, borderRadius: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.owner} ↔ {t.counter_party}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {vs && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}` }}>{t.verdict}</span>}
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{t.date?.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Sent: {sent || "—"} → Got: {got || "—"}
                  </div>
                </div>
              );
            })}
            {(!recentTrades?.trades || recentTrades.trades.length === 0) && (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 16, textAlign: "center" }}>No trades synced yet</p>
            )}
          </div>
        </DCard>
      </div>

      {/* ── League Snapshot ── */}
      <DCard label="LEAGUE SNAPSHOT" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>All owners</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {profiles?.profiles?.map((p) => {
            const tier = p.sha_rank <= 3 ? C.green : p.sha_rank <= 6 ? C.gold : p.sha_rank <= 9 ? C.orange : C.red;
            return (
              <div key={p.owner} style={{ padding: "8px 12px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}`, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLt; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: tier }}>#{p.sha_rank}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.window} · {p.record ? `${p.record.wins}W-${p.record.losses}L` : "—"}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, marginTop: 2 }}>{fmt(p.total_sha)} SHA</div>
              </div>
            );
          })}
        </div>
      </DCard>
    </div>
  );
}
