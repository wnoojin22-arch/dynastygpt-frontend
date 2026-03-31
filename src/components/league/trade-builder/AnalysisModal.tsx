"use client";

import React from "react";
import { C, SANS, MONO, DISPLAY, fmt, posColor, gradeColor } from "../tokens";
import GradeBadge from "./GradeBadge";
import AcceptanceGauge from "./AcceptanceGauge";
import type { TradeEvaluation, PositionalImpact } from "./types";

export default function AnalysisModal({ evaluation, owner, partner, onClose }: {
  evaluation: TradeEvaluation; owner: string; partner: string; onClose: () => void;
}) {
  const grade = evaluation.owner_grade;
  const acc = evaluation.acceptance;
  const bal = evaluation.sha_balance;
  const insights = evaluation.negotiation_insights;
  const askMore = evaluation.ask_for_more;
  const posImpact = evaluation.positional_impact;

  const verdictColor = grade.verdict.includes("SMASH") || grade.verdict.includes("GOOD") ? C.green
    : grade.verdict.includes("BREAK") ? C.gold
    : grade.verdict.includes("BELOW") ? C.orange : C.red;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "94vw", maxWidth: 800, maxHeight: "92vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>{owner} ↔ {partner}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Trade Analysis</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(212,165,50,0.22)", background: "rgba(212,165,50,0.06)" }}>
              <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: "#d4a532", fontStyle: "italic" }}>powered by</span>
              <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 900, color: "#eeeef2" }}>DynastyGPT<span style={{ color: "#d4a532" }}>.com</span></span>
            </div>
            <div onClick={onClose} style={{ cursor: "pointer", fontFamily: MONO, fontSize: 14, color: C.dim, padding: "4px 8px", borderRadius: 4, background: C.elevated }}>✕</div>
          </div>
        </div>

        {/* Recommendation banner */}
        <div style={{ padding: "12px 20px", background: `${verdictColor}08`, borderBottom: `1px solid ${verdictColor}25`, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <GradeBadge grade={grade.grade} score={grade.score} verdict={grade.verdict} large />
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 18, color: verdictColor }}>{grade.verdict}</div>
            {grade.reasons?.[0] && <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, marginTop: 2 }}>{grade.reasons[0]}</div>}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <AcceptanceGauge score={acc?.acceptance_likelihood || 0} size={60} />
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* YOUR GRADE */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>YOUR GRADE</div>
            {grade.dimension_scores && Object.entries(grade.dimension_scores).map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.white08}` }}>
                <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{key.replace(/_/g, " ")}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary }}>{val as number}</span>
              </div>
            ))}
            {grade.reasons?.slice(1).map((r, i) => (
              <div key={i} style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>→ {r}</div>
            ))}
          </div>

          {/* ACCEPTANCE */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>PARTNER PERCEPTION</div>
            {acc?.breakdown && Object.entries(acc.breakdown).map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.white08}` }}>
                <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{key.replace(/_/g, " ")}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary }}>{val as number}</span>
              </div>
            ))}
            {acc?.modifiers?.map((m, i) => (
              <div key={i} style={{ fontFamily: SANS, fontSize: 10, color: (m.adjustment as number) > 0 ? C.green : C.red, padding: "3px 0" }}>
                {(m.adjustment as number) > 0 ? "+" : ""}{m.adjustment} — {m.reason}
              </div>
            ))}
          </div>

          {/* NEGOTIATION INTEL */}
          {insights.length > 0 && (
            <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>NEGOTIATION INTEL</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {insights.map((ins, i) => {
                  const tc = ins.type === "leverage" ? C.green : ins.type === "warning" ? C.red : ins.type === "tactic" ? C.blue : C.gold;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 5, background: `${tc}08`, borderLeft: `3px solid ${tc}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: tc, letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>{ins.type.toUpperCase()}</span>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.4 }}>{ins.insight}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRADE BALANCE */}
          <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>TRADE BALANCE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "VALUE", gap: bal?.sha_gap, pct: bal?.sha_gap_percentage },
                { label: "DYNASTY", gap: bal?.dynasty_gap, pct: bal?.dynasty_gap_percentage },
                { label: "WIN-NOW", gap: bal?.winnow_gap, pct: bal?.winnow_gap_percentage },
              ].map(({ label, gap, pct }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: (gap || 0) >= 0 ? C.green : C.red }}>
                    {(gap || 0) >= 0 ? "+" : ""}{fmt(gap || 0)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{((pct || 0) >= 0 ? "+" : "")}{(pct || 0).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* POSITIONAL IMPACT */}
          {posImpact?.owner && (
            <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>POSITIONAL IMPACT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                  const d = posImpact.owner?.[pos];
                  if (!d) return null;
                  const dirColor = d.direction === "up" ? C.green : d.direction === "down" ? C.red : C.dim;
                  const arrow = d.direction === "up" ? "▲" : d.direction === "down" ? "▼" : "—";
                  const beforeColor = d.before === "ELITE" || d.before === "STRONG" ? C.green : d.before === "WEAK" || d.before === "CRITICAL" ? C.red : C.gold;
                  const afterColor = d.after === "ELITE" || d.after === "STRONG" ? C.green : d.after === "WEAK" || d.after === "CRITICAL" ? C.red : C.gold;
                  return (
                    <div key={pos} style={{ textAlign: "center", padding: "6px 4px", borderRadius: 6, background: d.direction !== "same" ? `${dirColor}06` : "transparent", border: `1px solid ${d.direction !== "same" ? `${dirColor}20` : C.border}` }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: posColor(pos), marginBottom: 4 }}>{pos}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: beforeColor }}>{d.before}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: dirColor }}>{arrow}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: afterColor }}>{d.after}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASK FOR MORE */}
          {askMore && askMore.length > 0 && (
            <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>ASK THEM TO INCLUDE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {askMore.map((a, i) => (
                  <div key={i} style={{ padding: "4px 10px", borderRadius: 4, background: C.elevated, border: `1px solid ${C.border}`, cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold + "50"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}>
                    <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary }}>{a.asset}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, marginLeft: 6 }}>{fmt(a.sha_value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
