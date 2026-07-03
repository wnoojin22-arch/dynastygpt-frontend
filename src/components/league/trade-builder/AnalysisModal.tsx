"use client";

import React, { useState } from "react";
import { C, SANS, MONO, DISPLAY, fmt, posColor, gradeColor } from "../tokens";
import AcceptanceGauge from "./AcceptanceGauge";
import type {
  TradeEvaluation,
  PositionalImpact,
  StarterImpactResponse,
  StarterImpactSide,
  DataFreshness,
} from "./types";
import FeedbackThumbs from "@/components/feedback/FeedbackThumbs";

const M = { card: "#0e1119" };

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold,
      letterSpacing: "0.10em", marginBottom: 8, paddingLeft: 10,
      borderLeft: `2px solid ${C.gold}40`,
    }}>
      {text}
    </div>
  );
}

function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  if (freshness === "live") return null;
  const label = freshness === "snapshot" ? "LAST SYNC" : "ROSTER UNAVAILABLE";
  const color = freshness === "snapshot" ? C.dim : C.red;
  return (
    <span style={{
      display: "inline-block", marginLeft: 8, padding: "2px 6px",
      fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
      color, border: `1px solid ${color}40`, borderRadius: 3,
    }}>
      {label}
    </span>
  );
}

function StarterImpactSideCard({ side, label }: { side: StarterImpactSide; label: string }) {
  const before: Record<string, number> = (side.before || {}) as Record<string, number>;
  const after: Record<string, number> = (side.after || {}) as Record<string, number>;
  const delta: Record<string, number> = (side.delta || { total: 0 }) as Record<string, number>;

  const positions = Array.from(new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])).filter((p) => p !== "total_starter_pts" && p !== "total").sort();

  const totalBefore = before.total_starter_pts ?? 0;
  const totalAfter = after.total_starter_pts ?? 0;
  const totalDelta = delta.total ?? 0;

  const fmtNum = (n: number | undefined): string =>
    n === undefined || n === null ? "—" : n.toFixed(1);
  const fmtDelta = (n: number): string => {
    if (Math.abs(n) < 0.05) return "0.0";
    return (n > 0 ? "+" : "") + n.toFixed(1);
  };
  const deltaColor = (n: number): string => {
    if (Math.abs(n) < 0.05) return C.dim;
    return n > 0 ? C.green : C.red;
  };

  return (
    <div style={{
      background: M.card, border: `1px solid ${C.border}`, borderRadius: 6,
      padding: "10px 12px", flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.secondary,
        letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center",
        flexWrap: "wrap",
      }}>
        {label}
        <FreshnessBadge freshness={side.data_freshness} />
      </div>
      {side.error || !side.before ? (
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, fontStyle: "normal" }}>
          {side.error || "Roster data unavailable for this side."}
        </div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr 1fr 1fr",
            gap: "4px 10px",
            alignItems: "center",
          }}>
            <span />
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, textAlign: "right", letterSpacing: "0.06em" }}>BEFORE</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, textAlign: "right", letterSpacing: "0.06em" }}>AFTER</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, textAlign: "right", letterSpacing: "0.06em" }}>Δ</span>
            {positions.map((pos) => {
              const b = (before as Record<string, number>)[pos];
              const a = (after as Record<string, number>)[pos];
              const d = (delta as Record<string, number>)[pos] ?? 0;
              return (
                <React.Fragment key={pos}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: posColor(pos) }}>{pos}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary, textAlign: "right" }}>{fmtNum(b)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary, textAlign: "right" }}>{fmtNum(a)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: deltaColor(d), textAlign: "right" }}>{fmtDelta(d)}</span>
                </React.Fragment>
              );
            })}
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.primary, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>TOTAL</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary, textAlign: "right", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>{fmtNum(totalBefore)}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary, textAlign: "right", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>{fmtNum(totalAfter)}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: deltaColor(totalDelta), textAlign: "right", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>{fmtDelta(totalDelta)}</span>
          </div>
          {side.picks?.picks_in?.length ? (
            <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 8 }}>
              + {side.picks.picks_in.join(", ")} <span style={{ fontStyle: "normal", opacity: 0.7 }}>(future)</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function StarterImpactSection({
  data, ownerName, partnerName,
}: { data: StarterImpactResponse | null | undefined; ownerName: string; partnerName: string }) {
  if (!data) return null;
  const { side_a, side_b, insight } = data;
  if (
    !side_a?.before && !side_b?.before
    && !side_a?.error && !side_b?.error
    && !insight?.side_a && !insight?.side_b
  ) {
    return null;
  }

  const aInsight = insight?.side_a;
  const bInsight = insight?.side_b;

  return (
    <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
      <SectionLabel text="STARTER IMPACT — 2026" />
      <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 8 }}>
        Projected starting-lineup points per side, before and after the deal.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <StarterImpactSideCard side={side_a} label={`YOU — ${ownerName.toUpperCase()}`} />
          <StarterImpactSideCard side={side_b} label={`PARTNER — ${partnerName.toUpperCase()}`} />
        </div>
        {(aInsight || bInsight) && (
          <div style={{
            background: M.card, border: `1px solid ${C.gold}30`, borderRadius: 6,
            padding: "10px 12px",
          }}>
            {aInsight && (
              <div style={{ marginBottom: bInsight ? 10 : 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.06em", marginBottom: 4 }}>YOU</div>
                <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.5, color: C.primary }}>{aInsight}</div>
              </div>
            )}
            {bInsight && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.06em", marginBottom: 4 }}>PARTNER</div>
                <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.5, color: C.primary }}>{bInsight}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function _scrubLanguage(s: string): string {
  let out = s;
  // Neutralize "Overpaying by X% SHA — sending Y to get back Z"
  out = out.replace(
    /Overpaying by\s+(\d+\.?\d*)%\s*SHA\s*[—\-]\s*sending\s+[\d,\.]+\s+to\s+get\s+back\s+[\d,\.]+\.?/gi,
    (_m, pct) => `Sending ${pct}% more than you're receiving.`
  );
  // Neutralize bare "Overpaying" / "Underpaying" verbs
  out = out.replace(/\bOverpaying\b/g, "Sending more");
  out = out.replace(/\bUnderpaying\b/g, "Receiving more");
  // Strip any remaining "X% SHA" → "X%"
  out = out.replace(/(\d+\.?\d*)\s*%\s*SHA\b/gi, "$1%");
  // Strip standalone SHA → "value"
  out = out.replace(/\bSHA\b/g, "value");
  return out;
}

// Split an AI insight string into YOUR SITUATION / THEIR SITUATION sections
function parseInsight(text: string | null | undefined): { you: string; them: string } {
  if (!text) return { you: "", them: "" };
  const clean = _scrubLanguage(text.replace(/\*+/g, "").trim());
  const yMatch = clean.match(/YOUR SITUATION\s*:?\s*([\s\S]*?)(?=THEIR SITUATION\s*:|$)/i);
  const tMatch = clean.match(/THEIR SITUATION\s*:?\s*([\s\S]*)$/i);
  const you = (yMatch?.[1] || "").trim();
  const them = (tMatch?.[1] || "").trim();
  // Fallback: if no labels found, dump everything into "you"
  if (!you && !them) return { you: clean, them: "" };
  return { you, them };
}

function AIInsightCard({ text, suggestionId }: { text: string | null | undefined; suggestionId?: string | null }) {
  if (!text) return null;
  const cleaned = _scrubLanguage(text.replace(/\*+/g, "").trim());
  if (!cleaned) return null;

  // Detect bullet format (new Haiku v2 output): lines starting with • or -
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletCount = lines.filter((l) => /^[•\-]\s/.test(l)).length;
  const isBulletFormat = bulletCount >= 2 && bulletCount >= lines.length * 0.6;

  if (isBulletFormat) {
    return (
      <div style={{
        margin: "16px 20px 0 20px",
        border: "2px solid rgba(245,162,35,0.6)",
        background: "rgba(245,162,35,0.06)",
        borderRadius: 8,
        padding: 16,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900,
          letterSpacing: "0.12em", color: "#f5a223", marginBottom: 2 }}>
          AI INSIGHT
        </div>
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400,
            color: "#ffffff", lineHeight: 1.5 }}>{line}</div>
        ))}
        {suggestionId && (
          <FeedbackThumbs surface="v1_evaluate" suggestionId={suggestionId} />
        )}
      </div>
    );
  }

  // Legacy labeled-section fallback (serves old cached insights until v1 expires)
  const { you, them } = parseInsight(cleaned);
  if (!you && !them) return null;
  return (
    <div style={{
      margin: "16px 20px 0 20px",
      border: "2px solid rgba(245,162,35,0.6)",
      background: "rgba(245,162,35,0.06)",
      borderRadius: 8,
      padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {you && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900,
            letterSpacing: "0.12em", color: "#f5a223", marginBottom: 6 }}>
            YOUR SITUATION
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400,
            color: "#ffffff", lineHeight: 1.7 }}>{you}</div>
        </div>
      )}
      {them && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900,
            letterSpacing: "0.12em", color: "#f5a223", marginBottom: 6 }}>
            THEIR SITUATION
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 400,
            color: "#ffffff", lineHeight: 1.7 }}>{them}</div>
        </div>
      )}
      {suggestionId && (
        <FeedbackThumbs surface="v1_evaluate" suggestionId={suggestionId} />
      )}
    </div>
  );
}

// Max score per grade dimension (see compute_owner_trade_grade in backend)
const GRADE_DIM_MAX: Record<string, number> = {
  value_return: 30,
  asset_quality: 25,
  roster_impact: 20,
  positional_need: 15,
  strategic_fit: 10,
};

// Max score per acceptance factor (see compute_acceptance_likelihood)
const PERCEPTION_MAX: Record<string, number> = {
  sha_fairness: 35,
  roster_fit: 25,
  positional_overpay: 15,
  partner_perceived_value: 10,
  pick_preference: 5,
  panic_boost: 5,
  window_compatibility: 3,
  timing: 2,
};

function barColor(pct: number): string {
  if (pct >= 0.70) return C.green;
  if (pct >= 0.40) return C.gold; // "yellow"
  return C.red;
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const color = barColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 6, background: C.white08, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color, minWidth: 38, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

// Row-level helper text shown under each factor label so the user knows
// what they're looking at without hover.
const GRADE_DIM_SUBTITLES: Record<string, string> = {
  value_return: "How much value you're getting relative to what you're sending",
  asset_quality: "Quality and age profile of assets involved",
  roster_impact: "How this trade changes your starting lineup",
  positional_need: "Whether you're acquiring positions you actually need",
  strategic_fit: "Whether this trade matches your competitive window",
};

const PERCEPTION_SUBTITLES: Record<string, string> = {
  sha_fairness: "Does the partner see this as a fair deal",
  roster_fit: "Does what you're sending fill their roster needs",
  positional_overpay: "Are they being asked to overpay at a scarce position",
  partner_perceived_value: "How they value the assets relative to their system",
  pick_preference: "Their historical preference for picks vs players",
  panic_boost: "Are they likely to be in a desperate trading position",
  window_compatibility: "Does this trade match their competitive timeline",
  timing: "Is this a good time in the season to approach them",
};

export default function AnalysisModal({ evaluation, starterImpact, owner, partner, onClose }: {
  evaluation: TradeEvaluation;
  starterImpact?: StarterImpactResponse | null;
  owner: string;
  partner: string;
  onClose: () => void;
}) {
  const grade = evaluation.owner_grade;
  const acc = evaluation.acceptance;
  const bal = evaluation.sha_balance;
  const insights = evaluation.negotiation_insights;
  const askMore = evaluation.ask_for_more;
  const posImpact = evaluation.positional_impact;
  const archetype = evaluation.partner_archetype;
  const h2h = evaluation.h2h_history;
  const [gradeOpen, setGradeOpen] = useState(false);
  const [perceptionOpen, setPerceptionOpen] = useState(false);

  const verdictColor = grade.verdict === "SMASH" || grade.verdict === "WIN" ? C.green
    : grade.verdict === "FAIR" ? C.gold
    : grade.verdict === "LEANS AGAINST" ? C.orange : C.red;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "94vw", maxWidth: 800, maxHeight: "92vh", overflowY: "auto",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
        overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
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

        {/* Partner archetype banner — pulled from behavioral_intel */}
        {archetype?.line && (
          <div style={{
            padding: "8px 20px", background: C.elevated,
            borderBottom: `1px solid ${C.border}`,
            fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold,
            letterSpacing: "0.06em", textAlign: "center",
          }}>
            {partner.toUpperCase()} · {archetype.line}
          </div>
        )}

        {/* AI INSIGHT — GM verdict card, top of modal (handles bullets + legacy sections) */}
        <AIInsightCard text={evaluation.ai_insight} suggestionId={evaluation.suggestion_id} />

        {/* MARKET REALITY — deterministic prose summary of value parity */}
        {evaluation?.market_reality?.summary_line && (
          <div style={{
            margin: "12px 20px 0 20px",
            padding: "12px 14px",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 800,
              letterSpacing: "0.12em", color: C.gold, marginBottom: 8,
            }}>
              MARKET REALITY
            </div>
            <div style={{
              fontFamily: SANS, fontSize: 14, fontWeight: 400,
              color: "#ffffff", lineHeight: 1.55,
            }}>
              {evaluation.market_reality.summary_line}
            </div>
          </div>
        )}

        {/* Recommendation banner — verdict left, acceptance circle + text right, one row */}
        <div style={{
          padding: "14px 20px",
          background: `${verdictColor}08`,
          borderBottom: `1px solid ${verdictColor}25`,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}>
          {/* Verdict word — the primary signal */}
          <div style={{ display: "flex", flexDirection: "column", alignSelf: "center", margin: 0, padding: 0 }}>
            <div style={{
              fontFamily: DISPLAY, fontSize: 32, fontWeight: 900,
              color: verdictColor, letterSpacing: "0.04em",
              lineHeight: 1, margin: 0, padding: 0,
            }}>
              {grade.verdict}
            </div>
            {evaluation?.annotation && (
              <div style={{
                marginTop: 4,
                fontFamily: MONO, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "rgba(212,165,50,0.7)",
              }}>
                {grade.verdict} · {String(evaluation.annotation).replace(/_/g, " ")}
              </div>
            )}
          </div>

          {/* Acceptance circle + context text — horizontal beside verdict */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <AcceptanceGauge score={acc?.acceptance_likelihood || 0} size={120} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 180 }}>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, lineHeight: 1.35 }}>
                Based on roster fit, trade history, and behavioral patterns.
              </div>
              {h2h && h2h.total_trades > 0 && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>
                  {h2h.total_trades} trade{h2h.total_trades === 1 ? "" : "s"} with {partner} · won {h2h.wins}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* YOUR GRADE — collapsed by default on desktop */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div
              onClick={() => setGradeOpen((o) => !o)}
              style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: gradeOpen ? 8 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>YOUR GRADE</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!gradeOpen && grade.score != null && (
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.primary }}>{grade.score}/100</span>
                )}
                <span style={{ fontSize: 10, color: C.dim }}>{gradeOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {gradeOpen && grade.dimension_scores && Object.entries(grade.dimension_scores).map(([key, val]) => {
              const label = key.replace(/_/g, " ").replace(/sha/gi, "value").replace(/\b\w/g, c => c.toUpperCase());
              const subtitle = GRADE_DIM_SUBTITLES[key];
              const max = GRADE_DIM_MAX[key] ?? 100;
              return (
                <div key={key} style={{ padding: "8px 0", borderBottom: `1px solid ${C.white08}` }}>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{label}</span>
                  {subtitle && (
                    <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2, lineHeight: 1.3 }}>
                      {subtitle}
                    </div>
                  )}
                  <ScoreBar value={val as number} max={max} />
                </div>
              );
            })}
          </div>

          {/* ACCEPTANCE — collapsed by default on desktop */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div
              onClick={() => setPerceptionOpen((o) => !o)}
              style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: perceptionOpen ? 8 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>PARTNER PERCEPTION</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!perceptionOpen && acc?.acceptance_likelihood != null && (
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.primary }}>{acc.acceptance_likelihood}%</span>
                )}
                <span style={{ fontSize: 10, color: C.dim }}>{perceptionOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {(() => {
              if (!perceptionOpen) return null;
              const LABELS: Record<string, string> = {
                sha_fairness: "Value Fairness",
                roster_fit: "Roster Fit",
                positional_overpay: "Positional Overpay",
                partner_perceived_value: "Perceived Value",
                pick_preference: "Pick Preference",
                panic_boost: "Panic Signal",
                window_compatibility: "Window Compatibility",
                timing: "Timing",
              };
              const entries = acc?.breakdown ? Object.entries(acc.breakdown) : [];
              if (entries.length === 0 && !acc?.modifiers?.length) {
                return (
                  <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "8px 0", fontStyle: "normal" }}>
                    {(acc as { error?: string })?.error
                      ? "Could not compute partner perception for this trade."
                      : "No partner perception data available."}
                  </div>
                );
              }
              return (
                <>
                  {entries.map(([key, val]) => {
                    const label = LABELS[key] || key.replace(/_/g, " ").replace(/sha/gi, "value").replace(/\b\w/g, c => c.toUpperCase());
                    const subtitle = PERCEPTION_SUBTITLES[key];
                    const max = PERCEPTION_MAX[key] ?? 100;
                    return (
                      <div key={key} style={{ padding: "8px 0", borderBottom: `1px solid ${C.white08}` }}>
                        <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>{label}</span>
                        {subtitle && (
                          <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2, lineHeight: 1.3 }}>
                            {subtitle}
                          </div>
                        )}
                        <ScoreBar value={val as number} max={max} />
                      </div>
                    );
                  })}
                  {acc?.modifiers?.map((m, i) => (
                    <div key={i} style={{ fontFamily: SANS, fontSize: 10, color: (m.adjustment as number) > 0 ? C.green : C.red, padding: "3px 0" }}>
                      {(m.adjustment as number) > 0 ? "+" : ""}{m.adjustment} — {m.reason}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>

          {/* INSIGHTS — owner's personal trade data, scoped to this deal */}
          {(evaluation.personal_insights?.length ?? 0) > 0 && (
            <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 8 }}>INSIGHTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(evaluation.personal_insights || []).map((pi, i) => {
                  const tc = pi.tone === "positive" ? C.green : pi.tone === "warning" ? C.red : C.dim;
                  return (
                    <div key={i} style={{
                      padding: "6px 10px", borderRadius: 5,
                      background: `${tc}0a`, borderLeft: `3px solid ${tc}`,
                      fontFamily: SANS, fontSize: 13, color: C.primary, lineHeight: 1.45,
                    }}>
                      {pi.text}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI INSIGHT moved to top of modal (see AIInsightCard above) */}

          {/* TRADE BALANCE — RAW totals only, no consolidation premium */}
          {(() => {
            const giveRaw = bal?.i_give?.sha_total_raw ?? 0;
            const recvRaw = bal?.i_receive?.sha_total_raw ?? 0;
            const valueGap = recvRaw - giveRaw;
            const valuePct = giveRaw > 0 ? (valueGap / giveRaw) * 100 : 0;
            const giveDynRaw = bal?.i_give?.dynasty_total_raw ?? 0;
            const recvDynRaw = bal?.i_receive?.dynasty_total_raw ?? 0;
            const dynGap = recvDynRaw - giveDynRaw;
            const dynPct = giveDynRaw > 0 ? (dynGap / giveDynRaw) * 100 : 0;
            const giveWinRaw = bal?.i_give?.winnow_total_raw ?? 0;
            const recvWinRaw = bal?.i_receive?.winnow_total_raw ?? 0;
            const winGap = recvWinRaw - giveWinRaw;
            const winPct = giveWinRaw > 0 ? (winGap / giveWinRaw) * 100 : 0;
            return (
              <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 4 }}>YOUR VALUE BALANCE</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 10 }}>
                  Difference between what you get and what you send. Positive = favorable for you.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "VALUE", gap: valueGap, pct: valuePct },
                    { label: "DYNASTY", gap: dynGap, pct: dynPct },
                    { label: "WIN-NOW", gap: winGap, pct: winPct },
                  ].map(({ label, gap, pct }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
                      <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: gap >= 0 ? C.green : C.red }}>
                        {gap >= 0 ? "+" : ""}{fmt(gap)}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{(pct >= 0 ? "+" : "")}{pct.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
                {/* Consolidation context — only shown when asset counts differ */}
                {(() => {
                  const nGive = bal?.i_give?.assets?.length ?? 0;
                  const nRecv = bal?.i_receive?.assets?.length ?? 0;
                  if (nGive === nRecv) return null;
                  const diff = Math.abs(nGive - nRecv);
                  const premiumPct = [0, 25, 65, 85, 95][Math.min(diff, 4)];
                  const concentratedSide = nGive < nRecv ? "you're sending" : "you're receiving";
                  const benefited = nGive < nRecv ? giveRaw : recvRaw;
                  const absorbed = nGive < nRecv ? recvRaw : giveRaw;
                  const meets = benefited * (1 + premiumPct / 100) <= absorbed;
                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.white08}`,
                                  fontFamily: SANS, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>
                      Trading {Math.max(nGive, nRecv)} assets for {Math.min(nGive, nRecv)} typically
                      commands a ~{premiumPct}% premium on the side {concentratedSide}.{" "}
                      <span style={{ color: meets ? C.green : C.orange, fontWeight: 700 }}>
                        This trade {meets ? "accounts for that." : "does not account for that."}
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* POSITIONAL IMPACT — only positions in the trade, both sides */}
          {(() => {
            if (!posImpact) return null;
            const tradedPositions = new Set<string>();
            [...(bal?.i_give?.assets || []), ...(bal?.i_receive?.assets || [])].forEach((a: any) => {
              if (a?.position && ["QB", "RB", "WR", "TE"].includes(a.position)) {
                tradedPositions.add(a.position);
              }
            });
            if (tradedPositions.size === 0) return null;

            const positions = Array.from(tradedPositions).filter(
              p => posImpact.owner?.[p] || posImpact.partner?.[p]
            );
            if (positions.length === 0) return null;

            const colorForGrade = (g: string) =>
              g === "ELITE" || g === "STRONG" ? C.green :
              g === "WEAK" || g === "CRITICAL" ? C.red : C.gold;

            const renderRow = (d: { before: string; after: string; direction: string } | undefined) => {
              if (!d) return <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>;
              const dirColor = d.direction === "up" ? C.green : d.direction === "down" ? C.red : C.dim;
              const arrow = d.direction === "up" ? "▲" : d.direction === "down" ? "▼" : "—";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: colorForGrade(d.before) }}>{d.before}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: dirColor }}>{arrow}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: colorForGrade(d.after) }}>{d.after}</span>
                </div>
              );
            };

            return (
              <div style={{ gridColumn: "1 / -1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold, marginBottom: 4 }}>POSITIONAL IMPACT</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 10 }}>
                  How each side&apos;s depth at the traded position changes after the deal.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {positions.map((pos) => (
                    <div key={pos} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: posColor(pos), marginBottom: 8 }}>
                        {pos}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", alignItems: "center" }}>
                        <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>You</span>
                        {renderRow(posImpact.owner?.[pos])}
                        <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>Partner</span>
                        {renderRow(posImpact.partner?.[pos])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* STARTER IMPACT — Phase 4 (2026 projected starting-lineup pts) */}
          <StarterImpactSection data={starterImpact} ownerName={owner} partnerName={partner} />

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
