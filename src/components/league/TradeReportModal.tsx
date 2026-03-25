"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, gradeColor, getVerdictStyle } from "./tokens";
import { TradeAssetList } from "./TradeAssets";

/* ═══════════════════════════════════════════════════════════════
   GRADE CIRCLE — SVG ring with letter grade (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
function GradeCircle({ letter, score, size = 64 }: { letter?: string; score?: number; size?: number }) {
  const color = gradeColor(letter || null);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max((score || 50) / 100, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.border} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: DISPLAY, fontSize: size * 0.32, fontWeight: 900, color, lineHeight: 1 }}>{letter || "—"}</span>
        {score != null && <span style={{ fontFamily: MONO, fontSize: size * 0.14, color: C.dim }}>{score}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION DIVIDER
   ═══════════════════════════════════════════════════════════════ */
function SectionDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${accent}30)` }} />
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: accent }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${accent}30, transparent)` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE REPORT MODAL — 2-tab (Trade Day / Hindsight) + Share Card
   ═══════════════════════════════════════════════════════════════ */
export default function TradeReportModal({ leagueId, tradeId, onClose }: {
  leagueId: string; tradeId: string; onClose: () => void;
}) {
  const [tab, setTab] = useState<"day" | "hindsight">("day");

  const { data: report, isLoading } = useQuery({
    queryKey: ["trade-report", leagueId, tradeId],
    queryFn: () => getTradeReport(leagueId, tradeId),
    enabled: !!tradeId,
  });

  const { data: hindsight } = useQuery({
    queryKey: ["trade-hindsight", leagueId, tradeId],
    queryFn: () => getTradeHindsight(leagueId, tradeId),
    enabled: !!tradeId && tab === "hindsight",
  });

  const r = report as Record<string, unknown> | undefined;
  const h = hindsight as Record<string, unknown> | undefined;

  const sideA = (r?.side_a || {}) as Record<string, unknown>;
  const sideB = (r?.side_b || {}) as Record<string, unknown>;
  const overall = r?.overall as string | undefined;
  const tradeDate = r?.date as string | undefined;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "94vw", maxWidth: 720, maxHeight: "92vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
        animation: "modalSlideIn 0.25s ease",
      }}>
        {/* ── HEADER ── */}
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 2 }}>
              {String(sideA.owner || "Side A")} <span style={{ color: C.dim, fontWeight: 500 }}>↔</span> {String(sideB.owner || "Side B")}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{tradeDate || "—"}</div>
          </div>
          {overall && (() => {
            const vs = getVerdictStyle(overall);
            return vs ? <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "3px 10px", borderRadius: 4 }}>{vs.label}</span> : null;
          })()}
          <div onClick={onClose} style={{ cursor: "pointer", fontFamily: MONO, fontSize: 14, color: C.dim, padding: "4px 8px", borderRadius: 4, background: C.elevated }}>✕</div>
        </div>

        {/* ── TAB BAR ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {(["day", "hindsight"] as const).map((t) => (
            <div key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0", textAlign: "center", cursor: "pointer",
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
              color: tab === t ? (t === "day" ? "#5eead4" : C.gold) : C.dim,
              borderBottom: tab === t ? `3px solid ${t === "day" ? "#5eead4" : C.gold}` : "3px solid transparent",
              boxShadow: tab === t ? `0 3px 12px ${t === "day" ? "rgba(94,234,212,0.25)" : `${C.gold}40`}` : "none",
              transition: "all 0.2s",
            }}>
              {t === "day" ? "TRADE DAY" : "HINDSIGHT"}
            </div>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING TRADE REPORT...</span>
          </div>
        ) : (
          <div style={{ padding: "0 24px 24px" }}>
            {tab === "day" ? (
              <>
                <SectionDivider label="TRADE DAY VALUES" accent="#5eead4" />
                {/* 2-COLUMN: Side A vs Side B */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[sideA, sideB].map((side, idx) => {
                    const letter = side.letter as string | undefined;
                    const score = side.score as number | undefined;
                    const verdict = side.verdict as string | undefined;
                    const owner = side.owner as string | undefined;
                    return (
                      <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                          <GradeCircle letter={letter} score={score} size={56} />
                          <div>
                            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>{String(owner || "—")}</div>
                            {verdict && (() => {
                              const vs = getVerdictStyle(verdict);
                              return vs ? <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: vs.color, background: vs.bg, padding: "1px 6px", borderRadius: 3, marginTop: 2, display: "inline-block" }}>{vs.label}</span> : null;
                            })()}
                          </div>
                        </div>
                        <div style={{ padding: "12px 16px" }}>
                          <TradeAssetList
                            players={side.players_sent as string[] | undefined}
                            picks={side.picks_sent as string[] | undefined}
                            direction="sent"
                          />
                          <div style={{ height: 8 }} />
                          <TradeAssetList
                            players={side.players_received as string[] | undefined}
                            picks={side.picks_received as string[] | undefined}
                            direction="received"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <SectionDivider label="HINDSIGHT ANALYSIS" accent={C.gold} />
                {h ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {["side_a", "side_b"].map((key) => {
                      const side = (h as Record<string, Record<string, unknown>>)?.[key] || {};
                      return (
                        <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <GradeCircle letter={side.hindsight_letter as string} score={side.hindsight_score as number} size={56} />
                            <div>
                              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>{String(side.owner || "—")}</div>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Hindsight Grade</div>
                            </div>
                          </div>
                          {side.production_30d != null && (
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>30D Production</span>
                              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary }}>{fmt(side.production_30d as number)}</span>
                            </div>
                          )}
                          {side.sha_value_change_30d != null && (
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Value Change (30D)</span>
                              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: (side.sha_value_change_30d as number) >= 0 ? C.green : C.red }}>
                                {(side.sha_value_change_30d as number) >= 0 ? "+" : ""}{fmt(side.sha_value_change_30d as number)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.dim }}>
                    Hindsight data not yet available for this trade.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
