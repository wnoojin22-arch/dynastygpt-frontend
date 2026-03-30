// @ts-nocheck — hindsight data uses Record<string, unknown> extensively; fix types later
"use client";

import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, gradeColor, posColor } from "./tokens";
import PlayerName from "./PlayerName";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function letterGrade(score: number): string {
  if (!score) return "—";
  if (score >= 97) return "A+"; if (score >= 93) return "A"; if (score >= 90) return "A-";
  if (score >= 87) return "B+"; if (score >= 83) return "B"; if (score >= 80) return "B-";
  if (score >= 77) return "C+"; if (score >= 73) return "C"; if (score >= 70) return "C-";
  if (score >= 67) return "D+"; if (score >= 63) return "D"; if (score >= 60) return "D-";
  return "F";
}

function verdictColor(v: string): string {
  const lo = v?.toLowerCase() || "";
  if (lo.includes("robbery")) return "#ff4444";
  if (lo.includes("won") || lo.includes("edge")) return C.green;
  if (lo.includes("win-win")) return C.green;
  if (lo.includes("push")) return C.secondary;
  if (lo.includes("lost") || lo.includes("victim")) return C.red;
  return C.dim;
}

// posColor imported from ./tokens

/* ═══════════════════════════════════════════════════════════════
   GRADE CIRCLE — SVG ring with letter grade
   ═══════════════════════════════════════════════════════════════ */
function GradeCircle({ score, size = 68, label, accentOverride }: { score: number; size?: number; label?: string; accentOverride?: string }) {
  const letter = letterGrade(score);
  const color = accentOverride || gradeColor(letter);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={`${pct * circ} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: size * 0.3, fontWeight: 900, color, lineHeight: 1 }}>{letter}</span>
        <span style={{ fontFamily: MONO, fontSize: size * 0.15, fontWeight: 700, color: C.dim, lineHeight: 1, marginTop: 2 }}>{score}</span>
        {label && <span style={{ fontFamily: MONO, fontSize: size * 0.11, fontWeight: 700, color: C.dim, lineHeight: 1, marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSET ROW — player or pick with position + SHA
   ═══════════════════════════════════════════════════════════════ */
function AssetRow({ name, value, isPick, position }: { name: string; value?: number; isPick?: boolean; position?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.white08}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {isPick ? (
          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.dim, background: C.white08, padding: "1px 4px", borderRadius: 2, flexShrink: 0 }}>PICK</span>
        ) : position ? (
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: posColor(position), background: `${posColor(position)}15`, padding: "1px 4px", borderRadius: 2, flexShrink: 0 }}>{position}</span>
        ) : null}
        {isPick ? (
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name.replace(/\s*\([^)]*\)/g, "")}
          </span>
        ) : (
          <PlayerName name={name.replace(/\s*\([^)]*\)/g, "")} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
        )}
      </div>
      {value != null && value > 0 && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, flexShrink: 0, marginLeft: 8 }}>{fmt(value)}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHA BALANCE BAR — visual bar showing value gap
   ═══════════════════════════════════════════════════════════════ */
function BalanceBar({ sent, received }: { sent: number; received: number }) {
  const total = sent + received || 1;
  const recvPct = Math.round((received / total) * 100);
  const balance = received - sent;
  const balColor = balance > 500 ? C.green : balance < -500 ? C.red : C.secondary;

  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: C.border }}>
        <div style={{ width: `${100 - recvPct}%`, background: C.red, transition: "width 0.3s" }} />
        <div style={{ width: `${recvPct}%`, background: C.green, transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.red }}>Gave {fmt(sent)}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: balColor }}>{balance >= 0 ? "+" : ""}{fmt(balance)}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>Got {fmt(received)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE REPORT MODAL — 3-tab: Grade / Deep Dive / Share
   ═══════════════════════════════════════════════════════════════ */
export default function TradeReportModal({ leagueId, tradeId, onClose }: {
  leagueId: string; tradeId: string; onClose: () => void;
}) {
  const [tab, setTab] = useState<"grade" | "deep" | "share">("grade");
  const shareRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["trade-report", leagueId, tradeId],
    queryFn: () => getTradeReport(leagueId, tradeId),
    enabled: !!tradeId,
  });
  const { data: hindsight } = useQuery({
    queryKey: ["trade-hindsight", leagueId, tradeId],
    queryFn: () => getTradeHindsight(leagueId, tradeId),
    enabled: !!tradeId,
  });

  // Parse response — handle both shapes:
  //   Old: {sides: [...], verdict: {...}}
  //   New: {side_a: {...}, side_b: {...}, trade_day: {...}, hindsight: {...}}
  const r = report as Record<string, unknown> | undefined;

  // Detect shape
  const isNewShape = r?.side_a != null;
  const oldSides = (r?.sides || []) as Array<Record<string, unknown>>;
  const oldVerdict = (r?.verdict || {}) as Record<string, unknown>;

  const sideA = isNewShape ? (r?.side_a || {}) as Record<string, unknown> : oldSides[0] || {};
  const sideB = isNewShape ? (r?.side_b || {}) as Record<string, unknown> : oldSides[1] || {};

  // Extract assets from API response
  // New shape: side.assets = what this side RECEIVED (array of {name, type, position, value_at_trade: {value}})
  function parseAssets(side: Record<string, unknown>): { items: {name: string; isPick: boolean; position: string; value: number}[]; total: number } {
    const assets = (side.assets || []) as Array<Record<string, unknown>>;
    if (assets.length > 0) {
      const items = assets.map(a => {
        const vat = a.value_at_trade as Record<string, unknown> | undefined;
        const val = Number(vat?.value || a.sha_value || a.value || 0);
        return {
          name: String(a.name || ""),
          isPick: a.type === "pick",
          position: String(a.position || ""),
          value: val,
        };
      });
      const total = items.reduce((s, a) => s + a.value, 0);
      return { items, total: Math.round(total) };
    }
    // Old shape fallback
    const players = ((side.players_received || side.players_sent || []) as string[]).map(n => ({ name: n, isPick: false, position: "", value: 0 }));
    const picks = ((side.picks_received || side.picks_sent || []) as string[]).map(n => ({ name: n, isPick: true, position: "PICK", value: 0 }));
    return { items: [...players, ...picks], total: Number(side.total_sha_received || side.total_sha_sent || 0) };
  }

  // In the new API shape: side_a.assets = what A RECEIVED, side_b.assets = what B RECEIVED
  // So: A gave = B received, A received = A assets
  const aReceived = parseAssets(sideA);
  const bReceived = parseAssets(sideB);

  // Cross-reference: what A GAVE = what B RECEIVED, and vice versa
  const assetsA = {
    sent: bReceived.items,        // A gave away what B received
    received: aReceived.items,    // A received what A's assets show
    totalSent: bReceived.total,
    totalRecv: aReceived.total,
  };
  const assetsB = {
    sent: aReceived.items,
    received: bReceived.items,
    totalSent: aReceived.total,
    totalRecv: bReceived.total,
  };

  const tradeDate = String(r?.trade_date || sideA.trade_date || "");
  const tradeDay = (r?.trade_day || {}) as Record<string, unknown>;
  const tdA = (tradeDay.side_a || {}) as Record<string, unknown>;
  const tdB = (tradeDay.side_b || {}) as Record<string, unknown>;

  const overall = String(oldVerdict.overall || tradeDay.overall || "");
  const aScore = (oldVerdict.side_a_score as number) || (tdA.score as number) || 0;
  const bScore = (oldVerdict.side_b_score as number) || (tdB.score as number) || 0;
  const aVerdict = String(oldVerdict.side_a_verdict || tdA.verdict || "");
  const bVerdict = String(oldVerdict.side_b_verdict || tdB.verdict || "");
  const aOwner = String(sideA.owner || oldVerdict.side_a_owner || "");
  const bOwner = String(sideB.owner || oldVerdict.side_b_owner || "");
  const seasonPhase = String(sideA.season_phase || "").replace(/_/g, " ");

  // Hindsight
  const h = (r?.hindsight || hindsight) as Record<string, unknown> | undefined;
  const hA = (h?.side_a || {}) as Record<string, unknown>;
  const hB = (h?.side_b || {}) as Record<string, unknown>;
  const hasHindsight = hA.owner != null || hB.owner != null;

  const scoringType = String(sideA.scoring_type || "");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(94vw, 680px)", maxHeight: "92vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
        animation: "modalSlideIn 0.2s ease",
      }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.14em" }}>LOADING TRADE REPORT...</span>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {aOwner} <span style={{ color: C.dim, fontWeight: 500, fontSize: 13 }}>↔</span> {bOwner}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>
                  {tradeDate}{seasonPhase ? ` · ${seasonPhase}` : ""}
                </div>
              </div>
              {overall && (
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", color: verdictColor(overall), background: `${verdictColor(overall)}15`, padding: "4px 12px", borderRadius: 4, border: `1px solid ${verdictColor(overall)}30`, flexShrink: 0 }}>
                  {overall.includes(":") ? overall.split(": ")[0].toUpperCase() : overall.toUpperCase()}
                </span>
              )}
              <div onClick={onClose} style={{ cursor: "pointer", fontFamily: MONO, fontSize: 14, color: C.dim, padding: "4px 8px", borderRadius: 4, background: C.elevated, flexShrink: 0 }}>✕</div>
            </div>

            {/* ── HERO: Grade circles — trade day + hindsight if available ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.border}` }}>
              {[{ owner: aOwner, score: aScore, verdict: aVerdict, hScore: (hA.score as number) || 0 },
                { owner: bOwner, score: bScore, verdict: bVerdict, hScore: (hB.score as number) || 0 }].map((s, i) => (
                <div key={i} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderRight: i === 0 ? `1px solid ${C.border}` : "none", background: `${verdictColor(s.verdict)}06` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <GradeCircle score={s.score} size={64} label="DAY" />
                    {hasHindsight && s.hScore > 0 && (
                      <GradeCircle score={s.hScore} size={52} label="NOW" accentOverride={C.gold} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.owner}</div>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: verdictColor(s.verdict), background: `${verdictColor(s.verdict)}15`, padding: "2px 8px", borderRadius: 3, border: `1px solid ${verdictColor(s.verdict)}25`, display: "inline-block", marginTop: 3 }}>{s.verdict}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── SWIPEABLE TAB BAR ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {([["grade", "TRADE GRADE", "#5eead4"], ["deep", "DEEP DIVE", C.gold], ["share", "SHARE", C.blue]] as const).map(([id, label, accent]) => (
                <div key={id} onClick={() => setTab(id as typeof tab)} style={{
                  flex: 1, minWidth: 100, padding: "11px 0", textAlign: "center", cursor: "pointer",
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em",
                  color: tab === id ? accent : C.dim,
                  borderBottom: tab === id ? `3px solid ${accent}` : "3px solid transparent",
                  transition: "all 0.15s", userSelect: "none",
                }}>{label}</div>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div style={{ padding: "16px 20px" }}>

              {/* ════════════════ TAB 1: TRADE GRADE ════════════════ */}
              {tab === "grade" && (
                <div>
                  {/* Side-by-side asset breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[{ side: sideA, assets: assetsA }, { side: sideB, assets: assetsB }].map(({ side, assets }, idx) => {
                      const owner = String(side.owner || "");
                      const sent = assets.sent;
                      const received = assets.received;
                      const totalSent = assets.totalSent;
                      const totalRecv = assets.totalRecv;
                      const posSold = String(side.position_sold || "");
                      const posTargeted = String(side.position_targeted || "");

                      return (
                        <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{owner.toUpperCase()}</span>
                            {posTargeted && <span style={{ fontFamily: MONO, fontSize: 8, color: posColor(posTargeted) }}>wants {posTargeted}</span>}
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.red, marginBottom: 4 }}>GAVE{posSold ? ` · ${posSold}` : ""}</div>
                            {sent.length > 0 ? sent.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} position={a.position} value={a.value} />) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
                            {totalSent > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: C.red, textAlign: "right", marginTop: 4 }}>Total: {fmt(totalSent)}</div>}

                            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />

                            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.green, marginBottom: 4 }}>GOT{posTargeted ? ` · ${posTargeted}` : ""}</div>
                            {received.length > 0 ? received.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} position={a.position} value={a.value} />) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
                            <div style={{ fontFamily: MONO, fontSize: 10, color: C.green, textAlign: "right", marginTop: 4 }}>Total: {fmt(totalRecv)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* SHA Balance Bar */}
                  <div style={{ marginTop: 14, padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.dim, marginBottom: 8 }}>VALUE BALANCE · {aOwner.split(" ")[0].toUpperCase()}</div>
                    <BalanceBar sent={assetsA.totalSent || (sideA.total_sha_sent as number) || 0} received={assetsA.totalRecv || (sideA.total_sha_received as number) || 0} />
                    {scoringType && (
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: C.gold }}>◆</span> Format-adjusted: {scoringType.toUpperCase().replace(/_/g, " ")}
                      </div>
                    )}
                  </div>

                  {/* Key factors */}
                  {((oldVerdict.side_a_key_factors as string) || (oldVerdict.side_b_key_factors as string)) && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 6 }}>KEY FACTORS</div>
                      {[oldVerdict.side_a_key_factors as string, oldVerdict.side_b_key_factors as string].filter(Boolean).map((f, i) => (
                        <div key={i} style={{ fontFamily: "-apple-system, 'Inter', system-ui, sans-serif", fontSize: 11, color: C.secondary, padding: "2px 0", display: "flex", gap: 6 }}>
                          <span style={{ color: C.gold, fontSize: 8, marginTop: 3 }}>◆</span> <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════ TAB 2: DEEP DIVE ════════════════ */}
              {tab === "deep" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Hindsight breakdown (if available) */}
                  {hasHindsight ? (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>HINDSIGHT ANALYSIS</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{(h?.days_ago as number) || 0}d ago</span>
                          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, color: String(h?.confidence || "") === "High" ? C.green : C.gold, background: String(h?.confidence || "") === "High" ? `${C.green}15` : `${C.gold}15` }}>{String(h?.confidence || "")}</span>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                        {[hA, hB].map((s, i) => {
                          const bd = (s.breakdown || {}) as Record<string, number>;
                          const kf = (s.key_factors || []) as string[];
                          return (
                            <div key={i} style={{ padding: "12px 14px", borderRight: i === 0 ? `1px solid ${C.border}` : "none" }}>
                              <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 8 }}>{String(s.owner || "")}</div>
                              {[
                                { label: "Production", val: bd.production, sub: `${fmt(s.total_production as number)} pts · ${fmt(s.ppg as number)} PPG` },
                                { label: "QB Premium", val: s.qb_bonus as number, sub: null },
                                { label: "Remaining Value", val: bd.remaining_value, sub: `${s.assets_rostered} rost · ${s.assets_cut} cut · ${s.assets_flipped} flip` },
                                { label: "Chain Return", val: bd.chain_return, sub: `${fmt(s.chain_pts as number)} chain pts` },
                                { label: "Flip Profit", val: bd.flip_profit, sub: null },
                                { label: "Champ Mult", val: null, sub: `${bd.champ_multiplier || 1}x (${s.champ_count || 0} titles)` },
                              ].map((row) => (
                                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${C.white08}` }}>
                                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{row.label}</span>
                                  <div style={{ textAlign: "right" }}>
                                    {row.val != null && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: (row.val as number) > 0 ? C.green : (row.val as number) < 0 ? C.red : C.dim }}>{(row.val as number) > 0 ? "+" : ""}{fmt(row.val as number)}</span>}
                                    {row.sub && <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{row.sub}</div>}
                                  </div>
                                </div>
                              ))}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", marginTop: 4, borderTop: `1px solid ${C.border}` }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold }}>RETURN</span>
                                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: C.gold }}>{fmt(s.return_score as number)}</span>
                              </div>
                              {kf.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  {kf.slice(0, 3).map((f, j) => (
                                    <div key={j} style={{ fontFamily: SANS, fontSize: 10, color: C.secondary, padding: "1px 0", display: "flex", gap: 4 }}>
                                      <span style={{ color: C.gold, fontSize: 7 }}>◆</span> {f}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>Hindsight analysis not yet available for this trade</span>
                    </div>
                  )}

                  {/* Positional Impact */}
                  {(sideA.positional_depth_before || sideA.position_sold) && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 8 }}>POSITIONAL IMPACT</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[sideA, sideB].map((side, i) => (
                          <div key={i}>
                            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 4 }}>{String(side.owner || "")}</div>
                            {side.position_targeted && (
                              <div style={{ fontFamily: MONO, fontSize: 10, color: posColor(String(side.position_targeted)), marginBottom: 2 }}>
                                Targeted: {String(side.position_targeted)}
                              </div>
                            )}
                            {side.position_sold && (
                              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                                Sold: {String(side.position_sold)}
                              </div>
                            )}
                            {side.roster_need_filled && <div style={{ fontFamily: MONO, fontSize: 9, color: C.green, marginTop: 2 }}>Filled a roster need</div>}
                            {side.sold_from_strength && <div style={{ fontFamily: MONO, fontSize: 9, color: C.blue, marginTop: 2 }}>Sold from strength</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trade context: blockbuster, starters traded, age direction */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 8 }}>TRADE CONTEXT</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(sideA.is_blockbuster as boolean) && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>BLOCKBUSTER</span>}
                      {(sideA.age_direction as string) && <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 8px", borderRadius: 4, color: C.blue, background: `${C.blue}15` }}>{String(sideA.age_direction).replace(/_/g, " ")}</span>}
                      {(sideA.starters_traded as number) > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 8px", borderRadius: 4, color: C.orange, background: `${C.orange}15` }}>{sideA.starters_traded} starters moved</span>}
                      {(sideA.trade_direction as string) && <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 8px", borderRadius: 4, color: C.secondary, background: C.white08 }}>{String(sideA.trade_direction).replace(/_/g, " ")}</span>}
                      {(sideA.includes_star_player as boolean) && <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 8px", borderRadius: 4, color: "#f5e6a3", background: "rgba(245,230,163,0.10)" }}>STAR PLAYER</span>}
                      {seasonPhase && <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 8px", borderRadius: 4, color: C.dim, background: C.white08 }}>{seasonPhase}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════ TAB 3: SHARE CARD ════════════════ */}
              {tab === "share" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  {/* Screenshot-ready card — optimized for mobile (9:16 aspect) */}
                  <div ref={shareRef} style={{
                    width: "min(400px, 88vw)", padding: "24px", borderRadius: 14,
                    background: `linear-gradient(160deg, #0c0f1a, ${C.card}, #0c0f1a)`,
                    border: `1px solid ${C.goldBorder}`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 ${C.goldBorder}`,
                  }}>
                    {/* Brand header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold, letterSpacing: "0.06em" }}>DYNASTYGPT</div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>TRADE REPORT · {tradeDate}</div>
                      </div>
                      {overall && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: verdictColor(overall), background: `${verdictColor(overall)}18`, padding: "4px 14px", borderRadius: 6, border: `1px solid ${verdictColor(overall)}35` }}>{overall.includes(":") ? overall.split(": ")[0].toUpperCase() : overall.toUpperCase()}</span>}
                    </div>

                    {/* Grade circles + owner + assets */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                      {[{ owner: aOwner, score: aScore, verdict: aVerdict, side: sideA, hScore: (hA.score as number) || 0 },
                        { owner: bOwner, score: bScore, verdict: bVerdict, side: sideB, hScore: (hB.score as number) || 0 }].map((s, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                            <GradeCircle score={s.score} size={60} />
                            {hasHindsight && s.hScore > 0 && <GradeCircle score={s.hScore} size={44} accentOverride={C.gold} />}
                          </div>
                          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.primary, marginBottom: 2 }}>{s.owner}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: verdictColor(s.verdict), marginBottom: 6 }}>{s.verdict}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: C.secondary, lineHeight: 1.5 }}>
                            {[...((s.side.players_sent || []) as string[]).map(n => n.replace(/\s*\([^)]*\)/g, "")),
                              ...((s.side.picks_sent || []) as string[]).map(p => p.replace(/\s*\([^)]*\)/g, ""))].slice(0, 3).join("\n") || "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Balance bar */}
                    <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                      <BalanceBar sent={assetsA.totalSent || (sideA.total_sha_sent as number) || 0} received={assetsA.totalRecv || (sideA.total_sha_received as number) || 0} />
                    </div>

                    {/* Key factors */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginBottom: 6 }}>KEY FACTORS</div>
                      {[
                        seasonPhase ? `Traded during ${seasonPhase}` : null,
                        (sideA.position_targeted as string) ? `${aOwner} targeted ${sideA.position_targeted}` : null,
                        Math.abs(aScore - bScore) > 30 ? `${Math.abs(aScore - bScore)} point grade gap` : null,
                        (sideA.is_blockbuster as boolean) ? "Blockbuster trade (4+ assets)" : null,
                        hasHindsight ? `Hindsight: ${String(h?.overall || "")}` : null,
                      ].filter(Boolean).slice(0, 4).map((f, i) => (
                        <div key={i} style={{ fontFamily: SANS, fontSize: 10, color: C.secondary, padding: "2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: C.gold, fontSize: 8 }}>◆</span> {f}
                        </div>
                      ))}
                    </div>

                    {/* Watermark */}
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>powered by</span>
                      <span style={{ fontFamily: DISPLAY, fontSize: 10, color: C.gold, letterSpacing: "0.04em" }}>dynastygpt.com</span>
                    </div>
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textAlign: "center", lineHeight: 1.6 }}>
                    Screenshot this card to share<br />
                    <span style={{ color: C.secondary }}>Optimized for mobile — just screenshot and send</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
