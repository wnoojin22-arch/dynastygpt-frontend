"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, gradeColor } from "./tokens";

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

/* ═══════════════════════════════════════════════════════════════
   GRADE CIRCLE — SVG ring with letter grade
   ═══════════════════════════════════════════════════════════════ */
function GradeCircle({ score, size = 68 }: { score: number; size?: number }) {
  const letter = letterGrade(score);
  const color = gradeColor(letter);
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
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSET ROW — player or pick, inline
   ═══════════════════════════════════════════════════════════════ */
function AssetRow({ name, value, isPick }: { name: string; value?: number; isPick?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isPick && <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.dim, background: C.white08, padding: "0 3px", borderRadius: 2 }}>PICK</span>}
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary }}>{name.replace(/\s*\([^)]*\)/g, "")}</span>
      </div>
      {value != null && value > 0 && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{fmt(value)}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE REPORT MODAL — clean, screenshotable, 2 tabs + share card
   ═══════════════════════════════════════════════════════════════ */
export default function TradeReportModal({ leagueId, tradeId, onClose }: {
  leagueId: string; tradeId: string; onClose: () => void;
}) {
  const [tab, setTab] = useState<"day" | "hindsight" | "share">("day");

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

  // Parse response — API returns {sides: [...], verdict: {...}}
  const r = report as Record<string, unknown> | undefined;
  const sides = (r?.sides || []) as Array<Record<string, unknown>>;
  const verdict = (r?.verdict || {}) as Record<string, unknown>;
  const sideA = sides[0] || {};
  const sideB = sides[1] || {};
  const tradeDate = String(sideA.trade_date || "");
  const overall = String(verdict.overall || "");
  const aScore = (verdict.side_a_score as number) || 0;
  const bScore = (verdict.side_b_score as number) || 0;
  const aVerdict = String(verdict.side_a_verdict || "");
  const bVerdict = String(verdict.side_b_verdict || "");
  const aOwner = String(sideA.owner || verdict.side_a_owner || "");
  const bOwner = String(sideB.owner || verdict.side_b_owner || "");
  const seasonPhase = String(sideA.season_phase || "").replace(/_/g, " ");

  // Hindsight data
  const h = hindsight as Record<string, unknown> | undefined;
  const hSides = (h?.sides || []) as Array<Record<string, unknown>>;
  const hVerdict = (h?.verdict || {}) as Record<string, unknown>;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "94vw", maxWidth: 640, maxHeight: "92vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
        animation: "modalSlideIn 0.2s ease",
      }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.14em" }}>LOADING TRADE REPORT...</span>
          </div>
        ) : (
          <>
            {/* ── HEADER: owners + date + overall verdict ── */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: C.primary }}>
                  {aOwner} <span style={{ color: C.dim, fontWeight: 500 }}>↔</span> {bOwner}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>{tradeDate}{seasonPhase ? ` · ${seasonPhase}` : ""}</div>
              </div>
              {overall && (
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", color: verdictColor(overall), background: `${verdictColor(overall)}15`, padding: "4px 12px", borderRadius: 4, border: `1px solid ${verdictColor(overall)}30` }}>
                  {overall.includes(":") ? overall.split(": ")[0].toUpperCase() : overall.toUpperCase()}
                </span>
              )}
              <div onClick={onClose} style={{ cursor: "pointer", fontFamily: MONO, fontSize: 14, color: C.dim, padding: "4px 8px", borderRadius: 4, background: C.elevated }}>✕</div>
            </div>

            {/* ── HERO: Both grades side by side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.border}` }}>
              {[{ owner: aOwner, score: aScore, verdict: aVerdict }, { owner: bOwner, score: bScore, verdict: bVerdict }].map((s, i) => (
                <div key={i} style={{ padding: "20px", display: "flex", alignItems: "center", gap: 14, borderRight: i === 0 ? `1px solid ${C.border}` : "none", background: `${verdictColor(s.verdict)}06` }}>
                  <GradeCircle score={s.score} size={72} />
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>{s.owner}</div>
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: verdictColor(s.verdict), background: `${verdictColor(s.verdict)}15`, padding: "2px 8px", borderRadius: 3, border: `1px solid ${verdictColor(s.verdict)}25`, display: "inline-block", marginTop: 4 }}>{s.verdict}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── TAB BAR ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
              {([["day", "TRADE DAY", "#5eead4"], ["hindsight", "HINDSIGHT", C.gold], ["share", "SHARE CARD", C.blue]] as const).map(([id, label, accent]) => (
                <div key={id} onClick={() => setTab(id as typeof tab)} style={{
                  flex: 1, padding: "10px 0", textAlign: "center", cursor: "pointer",
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em",
                  color: tab === id ? accent : C.dim,
                  borderBottom: tab === id ? `3px solid ${accent}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}>{label}</div>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div style={{ padding: "16px 20px" }}>

              {/* TRADE DAY TAB */}
              {tab === "day" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[sideA, sideB].map((side, idx) => {
                    const owner = String(side.owner || "");
                    const sent = [...((side.players_sent || []) as string[]).map(n => ({ name: n, isPick: false })), ...((side.picks_sent || []) as string[]).map(n => ({ name: n, isPick: true }))];
                    const received = [...((side.players_received || []) as string[]).map(n => ({ name: n, isPick: false })), ...((side.picks_received || []) as string[]).map(n => ({ name: n, isPick: true }))];
                    const totalSent = (side.total_sha_sent as number) || 0;
                    const totalRecv = (side.total_sha_received as number) || 0;

                    return (
                      <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{owner.toUpperCase()}</span>
                        </div>
                        <div style={{ padding: "12px" }}>
                          {/* GAVE */}
                          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.red, marginBottom: 4 }}>GAVE</div>
                          {sent.length > 0 ? sent.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} />) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
                          <div style={{ fontFamily: MONO, fontSize: 10, color: C.red, textAlign: "right", marginTop: 4 }}>Total: {fmt(totalSent)}</div>

                          <div style={{ height: 1, background: C.border, margin: "10px 0" }} />

                          {/* GOT */}
                          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.green, marginBottom: 4 }}>GOT</div>
                          {received.length > 0 ? received.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} />) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
                          <div style={{ fontFamily: MONO, fontSize: 10, color: C.green, textAlign: "right", marginTop: 4 }}>Total: {fmt(totalRecv)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HINDSIGHT TAB */}
              {tab === "hindsight" && (
                <div>
                  {hSides.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {hSides.map((hs, idx) => {
                        const hOwner = String(hs.owner || "");
                        const hBal = (hs.sha_balance as number) || 0;
                        const hVerdictKey = idx === 0 ? "side_a_verdict" : "side_b_verdict";
                        const hV = String(hVerdict[hVerdictKey] || "");
                        const hProd = idx === 0 ? hVerdict.side_a_production : hVerdict.side_b_production;
                        return (
                          <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                            <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 8 }}>{hOwner}</div>
                            {hV && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: verdictColor(hV), background: `${verdictColor(hV)}15`, padding: "2px 8px", borderRadius: 3, display: "inline-block", marginBottom: 10 }}>{hV}</span>}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.white08}` }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Value Balance</span>
                              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: hBal >= 0 ? C.green : C.red }}>{hBal >= 0 ? "+" : ""}{fmt(hBal)}</span>
                            </div>
                            {hProd != null && (
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.white08}` }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Production</span>
                                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>{fmt(hProd as number)}</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Assets Received</span>
                              <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>{((hs.players_received || []) as string[]).join(", ") || "Picks only"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.dim }}>Hindsight data not yet available.</div>
                  )}
                </div>
              )}

              {/* SHARE CARD TAB */}
              {tab === "share" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  {/* The shareable card */}
                  <div style={{
                    width: 400, padding: "20px 24px", borderRadius: 10,
                    background: `linear-gradient(135deg, ${C.panel}, ${C.card})`,
                    border: `1px solid ${C.goldBorder}`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${C.gold}15`,
                  }}>
                    {/* Card header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: DISPLAY, fontSize: 11, color: C.gold, letterSpacing: "0.08em" }}>DYNASTYGPT</div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 1 }}>TRADE REPORT · {tradeDate}</div>
                      </div>
                      {overall && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: verdictColor(overall), background: `${verdictColor(overall)}15`, padding: "3px 10px", borderRadius: 4 }}>{overall.includes(":") ? overall.split(": ")[0].toUpperCase() : overall.toUpperCase()}</span>}
                    </div>

                    {/* Two sides */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      {[{ owner: aOwner, score: aScore, verdict: aVerdict, side: sideA }, { owner: bOwner, score: bScore, verdict: bVerdict, side: sideB }].map((s, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <GradeCircle score={s.score} size={56} />
                          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: C.primary, marginTop: 6 }}>{s.owner}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: verdictColor(s.verdict), marginTop: 2 }}>{s.verdict}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4 }}>
                            {[...((s.side.players_sent || []) as string[]), ...((s.side.picks_sent || []) as string[]).map(p => p.replace(/\s*\([^)]*\)/g, ""))].slice(0, 2).join(", ") || "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Key factors */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginBottom: 6 }}>KEY FACTORS</div>
                      {[
                        seasonPhase ? `Traded during ${seasonPhase}` : null,
                        (sideA.position_targeted as string) ? `${aOwner} targeted ${sideA.position_targeted}` : null,
                        Math.abs(aScore - bScore) > 30 ? `${Math.abs(aScore - bScore)} point grade gap` : null,
                        (sideA.is_blockbuster as boolean) ? "Blockbuster trade" : null,
                      ].filter(Boolean).slice(0, 3).map((f, i) => (
                        <div key={i} style={{ fontFamily: SANS, fontSize: 10, color: C.secondary, padding: "2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: C.gold, fontSize: 8 }}>◆</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>Screenshot this card to share in your league chat</div>
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
