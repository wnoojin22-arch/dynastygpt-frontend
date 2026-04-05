"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoachesCorner } from "@/lib/api";
import { posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  ArrowUpRight, Shield, Target,
  TrendingUp, TrendingDown,
  Sparkles, Award, Handshake, Gauge, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   COACHES CORNER — ESPN meets Bloomberg
   ═══════════════════════════════════════════════════════════════ */

const C = {
  card: "#10131d", border: "#1a1e30", elevated: "#171b28",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.08)", white04: "rgba(255,255,255,0.04)",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

function posTagClasses(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red bg-accent-red/10";
    case "RB": return "text-accent-blue bg-accent-blue/10";
    case "WR": return "text-accent-green bg-accent-green/10";
    case "TE": return "text-accent-orange bg-accent-orange/10";
    default: return "text-dim bg-elevated";
  }
}

/* ── Section Header ── */
function SH({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderBottom: `1px solid ${C.border}`, background: C.elevated,
    }}>
      {icon}
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.dim }}>{label}</span>
      {count != null && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginLeft: "auto" }}>{count}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET INTEL — Above / Below market
   ═══════════════════════════════════════════════════════════════ */

function MarketIntel({ cc }: { cc: Record<string, unknown> }) {
  const above = (cc.market_above || []) as Array<Record<string, unknown>>;
  const below = (cc.market_below || []) as Array<Record<string, unknown>>;

  const Row = ({ p, isAbove }: { p: Record<string, unknown>; isAbove: boolean }) => {
    const pct = Number(p.pct_diff || 0);
    const color = isAbove ? C.green : C.red;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
        borderBottom: `1px solid ${C.white04}`,
      }}>
        <span className={`font-sans text-[10px] font-bold rounded px-1 py-0.5 shrink-0 ${posTagClasses(String(p.position || ""))}`}>{String(p.position || "")}</span>
        <PlayerName name={String(p.name || "")} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{pct > 0 ? "+" : ""}{pct}%</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginBottom: 6 }}>MARKET INTEL</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <SH icon={<TrendingUp size={10} style={{ color: C.green }} />} label="ABOVE MARKET" count={above.length} />
          {above.length > 0 ? above.slice(0, 4).map((p, i) => <Row key={i} p={p} isAbove />) : (
            <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>No players above market</div>
          )}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <SH icon={<TrendingDown size={10} style={{ color: C.red }} />} label="BELOW MARKET" count={below.length} />
          {below.length > 0 ? below.slice(0, 4).map((p, i) => <Row key={i} p={p} isAbove={false} />) : (
            <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>No players below market</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SELL / HOLD / BUY LOW — 3 columns
   ═══════════════════════════════════════════════════════════════ */

function TriColumn({ sell, hold, buy }: {
  sell: Array<Record<string, unknown>>; hold: Array<Record<string, unknown>>; buy: Array<Record<string, unknown>>;
}) {
  const PlayerRow = ({ p, dot }: { p: Record<string, unknown>; dot: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderBottom: `1px solid ${C.white04}` }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span className={`font-sans text-[10px] font-bold rounded px-1 py-0.5 shrink-0 ${posTagClasses(String(p.position || ""))}`}>{String(p.position || "")}</span>
      <PlayerName name={String(p.name || p.player || "")} style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
      {p.age != null && <span style={{ fontFamily: SANS, fontSize: 10, color: C.dim, flexShrink: 0 }}>{String(p.age)}</span>}
    </div>
  );

  const Col = ({ label, items, color, icon }: { label: string; items: Array<Record<string, unknown>>; color: string; icon: React.ReactNode }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={icon} label={`${label} · ${items.length}`} />
      {items.length > 0 ? items.map((p, j) => <PlayerRow key={j} p={p} dot={color} />) : (
        <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>—</div>
      )}
    </div>
  );

  return (
    <>
      <style>{`.tri-grid { display: flex; flex-direction: column; gap: 6px; } @media (min-width: 768px) { .tri-grid { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 6px !important; } }`}</style>
      <div className="tri-grid">
        <Col label="SELL" items={sell} color={C.red} icon={<ArrowUpRight size={10} style={{ color: C.red }} />} />
        <Col label="HOLD" items={hold} color={C.blue} icon={<Shield size={10} style={{ color: C.blue }} />} />
        <Col label="BUY LOW" items={buy} color={C.green} icon={<Target size={10} style={{ color: C.green }} />} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PICK INTEL
   ═══════════════════════════════════════════════════════════════ */

function PickIntel({ cc }: { cc: Record<string, unknown> }) {
  const draftIntel = cc.draft_intel as Record<string, unknown> | null;
  const window = String(cc.owner_window || cc.window || "BALANCED");
  const picks = (draftIntel?.current_picks || []) as Array<Record<string, unknown>>;
  const roundEff = (draftIntel?.round_efficiency || []) as Array<Record<string, unknown>>;
  const hitRate = draftIntel?.hit_rate as number | null;
  const leagueAvg = draftIntel?.league_avg_hit_rate as number | null;

  const roundHR: Record<number, { rate: number; hits: number; total: number }> = {};
  for (const r of roundEff) {
    roundHR[Number(r.round)] = { rate: Number(r.hit_rate || 0), hits: Number(r.hits || 0), total: Number(r.picks || 0) };
  }

  const getPill = (round: number, value: number) => {
    const rh = roundHR[round];
    const rate = rh?.rate ?? 50;
    if (window === "CONTENDER" && round >= 3) return { pill: "PACKAGE IT", color: C.orange };
    if (window === "CONTENDER" && round <= 1 && value >= 4000) return { pill: "USE IT", color: C.green };
    if (window === "REBUILDER" && round <= 1) return { pill: "USE IT", color: C.green };
    if (rate < 30) return { pill: "PACKAGE IT", color: C.orange };
    if (rate >= 50) return { pill: "USE IT", color: C.green };
    if (window === "CONTENDER") return { pill: "TRADE UP", color: C.blue };
    return { pill: "", color: "" };
  };

  let summary = "";
  if (!picks.length) summary = "No picks on roster.";
  else if (hitRate != null && hitRate > 55) summary = `Strong drafter (${hitRate}%). Trust your picks.`;
  else if (hitRate != null && hitRate < 35) summary = `${hitRate}% hit rate — trade picks for proven talent.`;
  else summary = `${picks.length} pick${picks.length > 1 ? "s" : ""}${hitRate != null ? ` · ${hitRate}% hit rate` : ""}`;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Sparkles size={10} style={{ color: C.gold }} />} label="PICK INTEL" />
      <div style={{ padding: "4px 10px", borderBottom: `1px solid ${C.white04}` }}>
        <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{summary}</span>
      </div>
      {/* Desktop only: hit rate by round bars */}
      {Object.keys(roundHR).length > 0 && (
        <div className="hidden md:block" style={{ padding: "6px 10px", borderBottom: `1px solid ${C.white04}` }}>
          <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: C.dim, letterSpacing: "0.1em", marginBottom: 4 }}>HIT RATE BY ROUND</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4].map((rd) => {
              const rh = roundHR[rd];
              if (!rh) return null;
              const rate = rh.rate;
              const rc = rate >= 50 ? C.green : rate >= 30 ? C.gold : C.red;
              const avgRate = leagueAvg || 40;
              return (
                <div key={rd} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: rc }}>{rate}%</div>
                  <div style={{ height: 3, borderRadius: 2, background: C.elevated, overflow: "hidden", margin: "3px 0" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: rc, width: `${Math.min(rate, 100)}%` }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>R{rd} · {rh.hits}/{rh.total}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: rate >= avgRate ? C.green : C.red }}>
                    {rate >= avgRate ? "+" : ""}{rate - avgRate}% vs avg
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {picks.length > 0 ? picks.map((p, j) => {
        const round = p.round as number;
        const value = (p.value as number) || 0;
        const rh = roundHR[round];
        const { pill, color } = getPill(round, value);
        const hitStr = rh ? `${rh.rate}% (${rh.hits}/${rh.total})` : "—";
        const avgStr = leagueAvg != null ? `${leagueAvg}%` : "—";
        const isOwn = p.is_own as boolean;
        const rateColor = rh ? (rh.rate >= (leagueAvg || 40) ? C.green : C.red) : C.dim;

        return (
          <div key={j} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
            borderBottom: j < picks.length - 1 ? `1px solid ${C.white04}` : "none",
          }}>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4, flexShrink: 0,
              color: isOwn ? C.gold : "#b39ddb", background: isOwn ? `${C.gold}12` : "rgba(179,157,219,0.1)",
              border: `1px solid ${isOwn ? `${C.gold}30` : "rgba(179,157,219,0.25)"}`,
            }}>{String(p.season).slice(2)} {p.slot ? `${round}.${String(p.slot).padStart(2, "0")}` : `R${round}`}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, flexShrink: 0, width: 36 }}>{Math.round(value).toLocaleString()}</span>
            <span style={{ fontFamily: SANS, fontSize: 10, color: rateColor, flex: 1 }}>
              Your R{round}: <strong>{hitStr}</strong> vs avg {avgStr}
            </span>
            {pill && <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10, flexShrink: 0,
              color, background: `${color}12`, border: `1px solid ${color}25`,
            }}>{pill}</span>}
          </div>
        );
      }) : (
        <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>No picks on roster</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LINEUP EFFICIENCY
   ═══════════════════════════════════════════════════════════════ */

function LineupEfficiency({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Gauge size={10} style={{ color: C.gold }} />} label="LINEUP EFFICIENCY" />
      <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>No lineup data</div>
    </div>
  );

  const eff = Number(data.efficiency_pct || 0);
  const ppg = Number(data.ppg_left_on_bench || 0);
  const weeks = Number(data.weeks_analyzed || 0);
  const gamesCost = Number(data.games_cost || 0);
  const costlyWeeks = (data.costly_weeks || []) as Array<Record<string, unknown>>;
  const misbenched = (data.misbenched || []) as Array<Record<string, unknown>>;
  const message = data.message ? String(data.message) : null;
  if (weeks === 0 && message) return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Gauge size={10} style={{ color: C.gold }} />} label="LINEUP EFFICIENCY" />
      <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>{message}</div>
    </div>
  );

  const effColor = eff >= 95 ? C.green : eff >= 88 ? C.gold : C.red;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Gauge size={10} style={{ color: C.gold }} />} label="LINEUP EFFICIENCY" />
      <div style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: effColor, lineHeight: 1 }}>{eff}%</span>
          <div>
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: effColor }}>{eff >= 95 ? "Elite" : eff >= 90 ? "Good" : eff >= 85 ? "Average" : "Poor"}</span>
            <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, display: "block" }}>{ppg} pts/wk on bench · {weeks}wk</span>
          </div>
        </div>
        <div style={{ height: 4, background: C.elevated, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", borderRadius: 2, background: effColor, width: `${Math.min(eff, 100)}%` }} />
        </div>
        {/* Costly weeks detail */}
        {gamesCost > 0 ? (
          <div style={{ marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.white04}` }}>
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.gold, marginBottom: 4 }}>
              Lineup decisions cost you {gamesCost} win{gamesCost > 1 ? "s" : ""}
            </div>
            {costlyWeeks.slice(0, 3).map((w, i) => (
              <div key={i} style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, lineHeight: 1.4, padding: "2px 0" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Wk {String(w.week)}</span>
                {" · Lost by "}
                <span style={{ color: C.red, fontWeight: 600 }}>{String(w.margin)}</span>
                {String(w.benched || "") && String(w.started || "") && (
                  <span>{" · Starting "}<span style={{ color: C.red }}>{String(w.started)}</span>{" over "}<span style={{ color: C.green }}>{String(w.benched)}</span></span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.green, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.white04}` }}>
            Your lineup decisions didn&apos;t cost you any wins
          </div>
        )}
        {misbenched.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
            {misbenched.slice(0, 4).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}>
                <span className={`font-sans text-[9px] font-bold rounded px-0.5 ${posTagClasses(String(m.position || ""))}`}>{String(m.position || "")}</span>
                <span style={{ fontFamily: SANS, fontSize: 10, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(m.player || "")}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, flexShrink: 0 }}>{String(m.times)}x</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE PARTNERS
   ═══════════════════════════════════════════════════════════════ */

function TradePartners({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Handshake size={10} style={{ color: C.gold }} />} label="TRADE PARTNERS" />
      <div style={{ padding: "8px 10px", fontFamily: SANS, fontSize: 11, color: C.dim, textAlign: "center" }}>No data</div>
    </div>
  );

  const top = (data.top || []) as Array<Record<string, unknown>>;
  const myStats = data.my_stats as Record<string, unknown> | null;

  const badgeColor = (b: string) => b === "top match" ? C.green : b === "panic trader" ? C.red : b === "frequent partner" ? C.blue : C.gold;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={<Handshake size={10} style={{ color: C.gold }} />} label="TRADE PARTNERS" />
      <div style={{ padding: "4px 10px" }}>
        {myStats && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white04}`, flexWrap: "wrap" }}>
            <Award size={10} style={{ color: C.gold }} />
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>{String(myStats.record || "0-0-0")}</span>
            {myStats.win_rate != null && (
              <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: Number(myStats.win_rate) > 55 ? C.green : C.secondary }}>{String(myStats.win_rate)}% WR</span>
            )}
            {((myStats.badges || []) as string[]).slice(0, 2).map((b, i) => (
              <span key={i} style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: C.gold, background: C.goldDim, padding: "2px 6px", borderRadius: 10, border: `1px solid ${C.goldBorder}` }}>{b}</span>
            ))}
          </div>
        )}
        {top.map((p, i) => {
          const badge = String(p.badge || "");
          const bc = badgeColor(badge);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 0",
              borderBottom: i < top.length - 1 ? `1px solid ${C.white04}` : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: `${C.dim}40`, width: 14, textAlign: "center" }}>{i + 1}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>{String(p.owner)}</span>
              {badge && (
                <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, color: bc, background: `${bc}12`, padding: "2px 6px", borderRadius: 10, border: `1px solid ${bc}25` }}>{badge}</span>
              )}
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.secondary }}>{String(p.h2h_record)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BUILD TRADE CTA
   ═══════════════════════════════════════════════════════════════ */

function BuildTradeCTA() {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px",
    }}>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary }}>Ready to make moves?</div>
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim }}>Trade builder matches you with the right partners.</div>
      </div>
      <button onClick={() => router.push(`/l/${currentLeagueSlug}/trades`)} style={{
        display: "flex", alignItems: "center", gap: 4, fontFamily: SANS, fontSize: 12, fontWeight: 700,
        color: "#0a0a0f", background: C.gold, border: "none", borderRadius: 20, padding: "6px 16px", cursor: "pointer",
      }}>
        Build trade <ChevronRight size={12} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */

export default function CoachesCorner({ leagueId, owner, ownerId }: { leagueId: string; owner: string; ownerId?: string | null }) {
  const { data: cc, isLoading } = useQuery({
    queryKey: ["coaches-corner-v2", leagueId, owner],
    queryFn: () => getCoachesCorner(leagueId, owner, ownerId),
    enabled: !!owner,
  });

  if (!owner) return <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>Select an owner.</div>;
  if (isLoading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: 12 }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.goldDim}` }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: C.gold, animation: "spin 1s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: C.gold }}>ANALYZING</div>
    </div>
  );

  const data = cc as Record<string, unknown> | undefined;
  if (!data) return <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>Data unavailable.</div>;

  const moveNow = (data.move_now || []) as Array<Record<string, unknown>>;
  const holdPlayers = (data.hold || []) as Array<Record<string, unknown>>;
  const listenPlayers = (data.listen || []) as Array<Record<string, unknown>>;
  const sellAll = [...moveNow, ...listenPlayers];
  const buyLow = (data.buy_low || []) as Array<Record<string, unknown>>;

  /* shared player row — desktop gets bigger text */
  const PRow = ({ p, dot }: { p: Record<string, unknown>; dot: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderBottom: `1px solid ${C.white04}` }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span className={`font-sans text-[11px] md:text-[12px] font-bold rounded px-1 py-0.5 shrink-0 ${posTagClasses(String(p.position || ""))}`}>{String(p.position || "")}</span>
      <PlayerName name={String(p.name || p.player || "")} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
      {p.age != null && <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, flexShrink: 0 }}>{String(p.age)}</span>}
    </div>
  );

  const ActionCol = ({ label, items, color, icon }: { label: string; items: Array<Record<string, unknown>>; color: string; icon: React.ReactNode }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <SH icon={icon} label={`${label} · ${items.length}`} />
      {items.length > 0 ? items.map((p, j) => <PRow key={j} p={p} dot={color} />) : (
        <div style={{ padding: "10px", fontFamily: SANS, fontSize: 12, color: C.dim, textAlign: "center" }}>—</div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{`
        .cc-top3 { display: flex; flex-direction: column; gap: 6px; }
        @media (min-width: 768px) { .cc-top3 { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; } }
        .cc-mid { display: flex; flex-direction: column; gap: 6px; }
        @media (min-width: 768px) { .cc-mid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; } }
      `}</style>

      {/* ROW 1: SELL | HOLD | BUY LOW — 3 columns desktop */}
      <div className="cc-top3">
        <ActionCol label="SELL" items={sellAll} color={C.red} icon={<ArrowUpRight size={11} style={{ color: C.red }} />} />
        <ActionCol label="HOLD" items={holdPlayers} color={C.blue} icon={<Shield size={11} style={{ color: C.blue }} />} />
        <ActionCol label="BUY LOW" items={buyLow} color={C.green} icon={<Target size={11} style={{ color: C.gold }} />} />
      </div>

      {/* ROW 2: Market Intel (left) | Pick Intel + Lineup (right stacked) */}
      <div className="cc-mid">
        {/* Left: Market Intel stacked vertically */}
        <MarketIntel cc={data} />

        {/* Right: Pick Intel + Lineup Efficiency stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <PickIntel cc={data} />
          <LineupEfficiency data={data.lineup_efficiency as Record<string, unknown> | null} />
        </div>
      </div>

      {/* ROW 3: Trade Partners */}
      <TradePartners data={data.trade_partners as Record<string, unknown> | null} />

      {/* CTA */}
      <BuildTradeCTA />
    </div>
  );
}
