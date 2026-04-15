"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPickAcquisition } from "@/lib/api";
import { C, SANS, MONO, fmt, posColor } from "./tokens";

interface Pick {
  player: string;
  position: string;
  season: number;
  round: number;
  slot: number;
  sha_value: number;
  pos_rank: string;
  original_owner: string;
  hit: boolean;
  bust: boolean;
  label: string;
}

interface PickAcquisitionData {
  acquired_count: number;
  own_count: number;
  acquired_pct: number;
  acquired_hit_rate: number;
  own_hit_rate: number;
  acquired_avg_sha: number;
  own_avg_sha: number;
  acquired_hits: number;
  own_hits: number;
  best_acquired_pick: Pick | null;
  worst_acquired_pick: Pick | null;
  round_breakdown: Record<string, number>;
  acquired_picks: Pick[];
  own_picks: Pick[];
}

export default function PickAcquisition({ leagueId, owner, ownerId }: {
  leagueId: string; owner: string; ownerId?: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["pick-acquisition", leagueId, owner],
    queryFn: () => getPickAcquisition(leagueId, owner, ownerId),
    enabled: !!leagueId && !!owner,
    staleTime: 600_000,
  });
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const d = data as PickAcquisitionData | undefined;

  if (isLoading) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "5px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>PICK ACQUISITION</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ height: 14, width: 140, background: C.elevated, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ height: 40, background: C.elevated, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  if (!d || (d.acquired_count === 0 && d.own_count === 0)) return null;

  const acqWins = d.acquired_hit_rate > d.own_hit_rate;
  const diff = Math.abs(d.acquired_hit_rate - d.own_hit_rate);
  const rdBreakdown = d.round_breakdown || {};
  const allPicks = [...(d.acquired_picks || []), ...(d.own_picks || [])];

  // Headline
  let headline = "";
  if (d.acquired_count === 0) {
    headline = "No picks acquired via trade.";
  } else if (acqWins && diff >= 15) {
    headline = `Acquired picks convert at ${d.acquired_hit_rate}% — outperforming own picks at ${d.own_hit_rate}%.`;
  } else if (acqWins) {
    headline = `Acquired picks edge own: ${d.acquired_hit_rate}% vs ${d.own_hit_rate}%.`;
  } else if (diff >= 15) {
    headline = `Own picks convert at ${d.own_hit_rate}% — outperforming acquired at ${d.acquired_hit_rate}%.`;
  } else {
    headline = `Comparable hit rates: ${d.acquired_hit_rate}% acquired, ${d.own_hit_rate}% own.`;
  }

  const hrColor = (rate: number) => rate >= 55 ? C.green : rate >= 35 ? C.gold : C.red;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {/* Header — matches Moveable Assets / StopStartKeep pattern */}
      <div style={{ padding: "5px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>PICK ACQUISITION</span>
      </div>

      <div style={{ padding: "10px 12px" }}>
        {/* Headline */}
        <p style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.5, margin: "0 0 10px 0" }}>{headline}</p>

        {d.acquired_count > 0 && (
          <>
            {/* Hit rate comparison — two tight cells */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <div style={{
                flex: 1, textAlign: "center", padding: "8px 6px", borderRadius: 6,
                border: `1px solid ${acqWins ? "rgba(125,211,160,0.25)" : C.border}`,
                background: acqWins ? "rgba(125,211,160,0.04)" : C.elevated,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.12em", color: C.dim, marginBottom: 2 }}>ACQUIRED</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: acqWins ? C.green : C.primary }}>{d.acquired_hit_rate}%</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 1 }}>{d.acquired_hits}/{d.acquired_count} hits</div>
              </div>
              <div style={{
                flex: 1, textAlign: "center", padding: "8px 6px", borderRadius: 6,
                border: `1px solid ${!acqWins ? "rgba(125,211,160,0.25)" : C.border}`,
                background: !acqWins ? "rgba(125,211,160,0.04)" : C.elevated,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.12em", color: C.dim, marginBottom: 2 }}>OWN</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: !acqWins ? C.green : C.primary }}>{d.own_hit_rate}%</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 1 }}>{d.own_hits}/{d.own_count} hits</div>
              </div>
            </div>

            {/* Round breakdown — clickable */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.12em", color: C.dim, marginBottom: 6 }}>ACQUIRED BY ROUND</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4].map((rd) => {
                  const count = rdBreakdown[String(rd)] || 0;
                  const active = count > 0;
                  const isOpen = expandedRound === rd;
                  return (
                    <div
                      key={rd}
                      onClick={() => active && setExpandedRound(isOpen ? null : rd)}
                      style={{
                        flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: 4, cursor: active ? "pointer" : "default",
                        border: `1px solid ${isOpen ? C.gold : active ? "rgba(212,165,50,0.2)" : C.border}`,
                        background: isOpen ? C.goldDim : active ? "rgba(212,165,50,0.04)" : C.elevated,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: active ? C.gold : C.dim }}>{count}</div>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: C.dim }}>R{rd}</div>
                      {active && <div style={{ fontFamily: MONO, fontSize: 6, color: C.dim, marginTop: 1, opacity: 0.6 }}>tap</div>}
                    </div>
                  );
                })}
              </div>

              {/* Expanded round — player list */}
              {expandedRound !== null && (() => {
                const roundPicks = allPicks
                  .filter(p => p.round === expandedRound)
                  .sort((a, b) => b.sha_value - a.sha_value);
                if (!roundPicks.length) return null;
                return (
                  <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: C.dim, marginBottom: 4, letterSpacing: "0.06em" }}>
                      ROUND {expandedRound} ({roundPicks.length} picks)
                    </div>
                    {roundPicks.map((p, j) => {
                      const isAcquired = (d.acquired_picks || []).some(
                        ap => ap.player === p.player && ap.season === p.season && ap.round === p.round
                      );
                      return (
                        <div key={j} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
                          borderBottom: j < roundPicks.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                        }}>
                          <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim, width: 18, flexShrink: 0 }}>
                            {String(p.season).slice(2)}&apos;
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.dim, width: 22, flexShrink: 0 }}>
                            {p.round}.{String(p.slot).padStart(2, "0")}
                          </span>
                          <span style={{
                            fontFamily: SANS, fontSize: 9, fontWeight: 700,
                            color: posColor(p.position), background: posColor(p.position) + "18",
                            padding: "1px 4px", borderRadius: 3, width: 22, textAlign: "center", flexShrink: 0,
                          }}>{p.position}</span>
                          <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.player}</span>
                          <span style={{
                            fontFamily: MONO, fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                            color: isAcquired ? "#6bb8e0" : C.gold,
                            background: isAcquired ? "rgba(107,184,224,0.1)" : C.goldDim,
                            border: `1px solid ${isAcquired ? "rgba(107,184,224,0.2)" : "rgba(212,165,50,0.2)"}`,
                          }}>{isAcquired ? "ACQUIRED" : "OWN"}</span>
                          {(() => {
                            const lbl = (p as unknown as Record<string, unknown>).label as string | undefined;
                            if (!lbl || lbl === "Too Early") return null;
                            const LC: Record<string, string> = { Star: C.gold, Hit: C.green, Miss: C.orange || "#e09c6b", Bust: C.red, Concerning: C.orange || "#e09c6b" };
                            const LBG: Record<string, string> = { Star: "#d4a53218", Hit: "#7dd3a018", Miss: "#e09c6b18", Bust: "#e4727218", Concerning: "#e09c6b18" };
                            return (
                              <span style={{
                                fontFamily: MONO, fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                                color: LC[lbl] || C.dim, background: LBG[lbl] || C.elevated,
                              }}>{lbl.toUpperCase()}</span>
                            );
                          })()}
                          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: p.hit ? C.green : p.bust ? C.red : C.dim, minWidth: 36, textAlign: "right" }}>
                            {fmt(p.sha_value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Best / Worst — compact */}
            {d.best_acquired_pick && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", marginBottom: 4,
                borderRadius: 4, borderLeft: `2px solid ${C.green}`, background: "rgba(125,211,160,0.03)",
              }}>
                <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.green, letterSpacing: "0.08em", width: 30 }}>BEST</span>
                <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: C.primary, flex: 1 }}>{d.best_acquired_pick.player}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>R{d.best_acquired_pick.round}.{String(d.best_acquired_pick.slot).padStart(2, "0")}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold }}>{fmt(d.best_acquired_pick.sha_value)}</span>
              </div>
            )}
            {d.worst_acquired_pick && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", marginBottom: 6,
                borderRadius: 4, borderLeft: `2px solid ${C.red}`, background: "rgba(228,114,114,0.03)",
              }}>
                <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.red, letterSpacing: "0.08em", width: 30 }}>WORST</span>
                <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: C.primary, flex: 1 }}>{d.worst_acquired_pick.player}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>R{d.worst_acquired_pick.round}.{String(d.worst_acquired_pick.slot).padStart(2, "0")}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim }}>{fmt(d.worst_acquired_pick.sha_value)}</span>
              </div>
            )}

            {/* Acquisition rate */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: C.elevated, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 1, background: `${C.gold}80`, width: `${d.acquired_pct}%` }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{d.acquired_pct}% via trade</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
