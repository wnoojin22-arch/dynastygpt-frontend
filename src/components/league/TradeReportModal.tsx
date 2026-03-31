// @ts-nocheck — hindsight data uses Record<string, unknown> extensively; fix types later
"use client";

import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, gradeColor, posColor } from "./tokens";
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

function confidenceColor(c: string): string {
  if (c === "High") return C.green;
  if (c === "Medium") return C.gold;
  return C.dim;
}

function sentimentColor(s: string): string {
  if (s === "elite") return C.gold;
  if (s === "positive") return C.green;
  if (s === "negative") return C.red;
  return C.dim;
}

function fmtDec(n: number | null | undefined, d = 1): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

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
  // For picks: keep the owner name in parens — it's the differentiator in pick swaps
  // For players: strip parens (usually redundant position/team info)
  const displayName = isPick ? name : name.replace(/\s*\([^)]*\)/g, "");
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.white08}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
        {isPick ? (
          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.dim, background: C.white08, padding: "1px 4px", borderRadius: 2, flexShrink: 0 }}>PICK</span>
        ) : position ? (
          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: posColor(position), background: `${posColor(position)}15`, padding: "1px 4px", borderRadius: 2, flexShrink: 0 }}>{position}</span>
        ) : null}
        {isPick ? (
          <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
        ) : (
          <PlayerName name={displayName} style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
        )}
      </div>
      {value != null && value > 0 && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0, marginLeft: 6 }}>{fmt(value)}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHA BALANCE BAR
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
   SECTION DIVIDER — labeled line
   ═══════════════════════════════════════════════════════════════ */
function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 8px" }}>
      <div style={{ flex: 1, height: 1, background: `${color}30` }} />
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${color}30` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONFIDENCE BADGE — color-coded center piece
   ═══════════════════════════════════════════════════════════════ */
function ConfidenceBadge({ confidence, daysAgo, overall }: { confidence: string; daysAgo: number; overall?: string }) {
  const color = confidenceColor(confidence);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 80 }}>
      {overall && (
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", color: verdictColor(overall), background: `${verdictColor(overall)}15`, padding: "3px 10px", borderRadius: 4, border: `1px solid ${verdictColor(overall)}25`, whiteSpace: "nowrap" }}>
          {overall.includes(":") ? overall.split(": ")[0].toUpperCase() : overall.toUpperCase()}
        </span>
      )}
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${color}40`, background: `${color}10`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color, lineHeight: 1 }}>{confidence[0]}</span>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color, letterSpacing: "0.06em" }}>{confidence.toUpperCase()}</span>
      {daysAgo > 0 && <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{daysAgo}d ago</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KEY FACTOR BULLET — narrative bullet for hindsight story
   ═══════════════════════════════════════════════════════════════ */
function FactorBullet({ text, sentiment }: { text: string; sentiment?: string }) {
  const dotColor = sentiment === "elite" ? C.gold : sentiment === "positive" ? C.green : sentiment === "negative" ? C.red : C.dim;
  return (
    <div style={{ display: "flex", gap: 6, padding: "3px 0", alignItems: "flex-start" }}>
      <span style={{ color: dotColor, fontSize: 7, marginTop: 4, flexShrink: 0 }}>◆</span>
      <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.45 }}>{text}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PER-ASSET CARD — for Details tab
   ═══════════════════════════════════════════════════════════════ */
function AssetDetailCard({ asset }: { asset: Record<string, unknown> }) {
  const name = String(asset.name || "");
  const type = String(asset.type || "player");
  const position = String(asset.position || "");
  const age = asset.age as number | null;
  const prod = (asset.production || {}) as Record<string, unknown>;
  const chain = (asset.chain || []) as Array<Record<string, unknown>>;
  const impact = asset.replacement_impact as Record<string, unknown> | null;
  const vat = (asset.value_at_trade || {}) as Record<string, unknown>;
  const vc = (asset.value_current || {}) as Record<string, unknown>;
  const vDelta = asset.value_delta as number | null;
  const status = ((asset.roster_status || {}) as Record<string, unknown>).status as string || "";

  const totalPts = Number(prod.total_points || 0);
  const games = Number(prod.games_on_roster || 0);
  const started = Number(prod.games_started || 0);
  const ppgActive = started > 0 ? totalPts / started : 0;
  const ppgRostered = games > 0 ? totalPts / games : 0;
  const seasons = (prod.seasons || {}) as Record<string, Record<string, number>>;

  const statusLabel = status === "rostered" ? "ROSTERED" : chain.length > 0 ? "FLIPPED" : status === "not_rostered" ? "CUT" : type === "pick" ? "PICK" : "";
  const statusColor = status === "rostered" ? C.green : chain.length > 0 ? C.blue : C.red;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
        {position && position !== "PICK" && (
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: posColor(position), background: `${posColor(position)}15`, padding: "1px 5px", borderRadius: 2 }}>{position}</span>
        )}
        {type === "pick" ? (
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>{name}</span>
        ) : (
          <PlayerName name={name} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }} />
        )}
        {age && <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginLeft: "auto" }}>{age} yrs</span>}
        {statusLabel && (
          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.08em", color: statusColor, background: `${statusColor}15`, padding: "2px 6px", borderRadius: 3, border: `1px solid ${statusColor}25`, marginLeft: age ? 6 : "auto" }}>{statusLabel}</span>
        )}
      </div>

      <div style={{ padding: "8px 12px" }}>
        {/* Value trajectory */}
        {(Number(vat.value) > 0 || Number(vc.value) > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Trade day:</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.secondary }}>{fmt(Number(vat.value))}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>→</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.secondary }}>{fmt(Number(vc.value))}</span>
            {vDelta != null && Math.abs(vDelta) > 50 && (
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: vDelta > 0 ? C.green : C.red }}>{vDelta > 0 ? "+" : ""}{fmt(vDelta)}</span>
            )}
          </div>
        )}

        {/* Production (non-picks only) */}
        {type !== "pick" && totalPts > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
              <div><span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>TOTAL</span><div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.primary }}>{fmtDec(totalPts, 0)} pts</div></div>
              <div><span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>PPG ACT</span><div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: ppgActive >= 15 ? C.green : ppgActive >= 8 ? C.secondary : C.red }}>{fmtDec(ppgActive)}</div></div>
              <div><span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>PPG ROST</span><div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.dim }}>{fmtDec(ppgRostered)}</div></div>
              <div><span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>GAMES</span><div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.dim }}>{started}/{games}</div></div>
            </div>
            {/* Seasonal breakdown */}
            {Object.keys(seasons).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(seasons).sort(([a], [b]) => Number(a) - Number(b)).map(([yr, s]) => (
                  <span key={yr} style={{ fontFamily: MONO, fontSize: 9, color: C.dim, background: C.white08, padding: "2px 6px", borderRadius: 3 }}>
                    {yr}: {fmtDec(s.points, 0)} pts ({s.games}g, {fmtDec(s.ppg)} PPG)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flip chain */}
        {chain.length > 0 && chain.map((flip, i) => (
          <div key={i} style={{ padding: "6px 8px", background: `${C.blue}08`, borderRadius: 4, border: `1px solid ${C.blue}20`, marginBottom: 4 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.blue, letterSpacing: "0.06em", marginBottom: 4 }}>FLIPPED → {String(flip.flipped_to || "")}</div>
            <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: SANS }}>
              <div style={{ flex: 1 }}><span style={{ fontFamily: MONO, fontSize: 8, color: C.red }}>GAVE</span>
                {((flip.gave || []) as string[]).map((n, j) => <div key={j} style={{ color: C.secondary, fontSize: 11 }}>{n}</div>)}
              </div>
              <div style={{ color: C.dim, alignSelf: "center" }}>→</div>
              <div style={{ flex: 1 }}><span style={{ fontFamily: MONO, fontSize: 8, color: C.green }}>GOT</span>
                {((flip.got_back || []) as string[]).map((n, j) => <div key={j} style={{ color: C.secondary, fontSize: 11 }}>{n}</div>)}
              </div>
            </div>
            {(flip.flip_profit as number) != null && (
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: (flip.flip_profit as number) >= 0 ? C.green : C.red, marginTop: 4 }}>
                Flip profit: {(flip.flip_profit as number) >= 0 ? "+" : ""}{fmt(flip.flip_profit as number)} SHA
              </div>
            )}
          </div>
        ))}

        {/* Replacement impact */}
        {impact && (impact as Record<string, unknown>).career && (() => {
          const career = (impact as Record<string, unknown>).career as Record<string, unknown>;
          const impactVal = Number(career.impact || 0);
          if (Math.abs(impactVal) < 2) return null;
          return (
            <div style={{ padding: "6px 8px", background: `${C.gold}08`, borderRadius: 4, border: `1px solid ${C.gold}20` }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 4 }}>REPLACEMENT IMPACT</div>
              <div style={{ display: "flex", gap: 16, fontFamily: MONO, fontSize: 11 }}>
                <div><span style={{ fontSize: 9, color: C.dim }}>WITH</span><div style={{ fontWeight: 700, color: C.green }}>{fmtDec(Number(career.avg_with))} PPG</div></div>
                <div><span style={{ fontSize: 9, color: C.dim }}>WITHOUT</span><div style={{ fontWeight: 700, color: C.red }}>{fmtDec(Number(career.avg_without))} PPG</div></div>
                <div><span style={{ fontSize: 9, color: C.dim }}>IMPACT</span><div style={{ fontWeight: 700, color: impactVal > 0 ? C.green : C.red }}>{impactVal > 0 ? "+" : ""}{fmtDec(impactVal)}</div></div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE REPORT MODAL — Redesigned: 3-tab
   Tab 1: TRADE GRADE (Trade Day top + Hindsight bottom)
   Tab 2: DETAILS (5-component + per-asset + team context)
   Tab 3: SHARE
   ═══════════════════════════════════════════════════════════════ */
export default function TradeReportModal({ leagueId, tradeId, onClose }: {
  leagueId: string; tradeId: string; onClose: () => void;
}) {
  const [tab, setTab] = useState<"grade" | "details" | "share">("grade");
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

  // Parse response — handle both shapes
  const r = report as Record<string, unknown> | undefined;
  const isNewShape = r?.side_a != null;
  const oldSides = (r?.sides || []) as Array<Record<string, unknown>>;
  const oldVerdict = (r?.verdict || {}) as Record<string, unknown>;

  const sideA = isNewShape ? (r?.side_a || {}) as Record<string, unknown> : oldSides[0] || {};
  const sideB = isNewShape ? (r?.side_b || {}) as Record<string, unknown> : oldSides[1] || {};

  // Extract assets — distributes total SHA evenly when per-asset values unavailable
  function parseAssets(side: Record<string, unknown>): { items: {name: string; isPick: boolean; position: string; value: number}[]; total: number } {
    const assets = (side.assets || []) as Array<Record<string, unknown>>;
    if (assets.length > 0) {
      const items = assets.map(a => {
        const vat = a.value_at_trade as Record<string, unknown> | undefined;
        const val = Number(vat?.value || a.sha_value || a.value || 0);
        return { name: String(a.name || ""), isPick: a.type === "pick", position: String(a.position || ""), value: val };
      });
      const total = Math.round(items.reduce((s, a) => s + a.value, 0));
      return { items, total };
    }
    // Old shape fallback — distribute total_sha evenly across all assets
    const playerNames = (side.players_received || side.players_sent || []) as string[];
    const pickNames = (side.picks_received || side.picks_sent || []) as string[];
    const totalSha = Number(side.total_sha_received || side.total_sha_sent || 0);
    const count = playerNames.length + pickNames.length;
    const perAsset = count > 0 ? Math.round(totalSha / count) : 0;
    const players = playerNames.map(n => ({ name: n, isPick: false, position: "", value: perAsset }));
    const picks = pickNames.map(n => ({ name: n, isPick: true, position: "PICK", value: perAsset }));
    return { items: [...players, ...picks], total: Math.round(totalSha) };
  }

  const aReceived = parseAssets(sideA);
  const bReceived = parseAssets(sideB);
  const assetsA = { sent: bReceived.items, received: aReceived.items, totalSent: bReceived.total, totalRecv: aReceived.total };
  const assetsB = { sent: aReceived.items, received: bReceived.items, totalSent: aReceived.total, totalRecv: bReceived.total };

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
  const scoringType = String(sideA.scoring_type || "");

  // Hindsight data — merge from report.hindsight AND separate hindsight endpoint
  const hFromReport = (r?.hindsight || {}) as Record<string, unknown>;
  const hFromEndpoint = (hindsight || {}) as Record<string, unknown>;
  // Prefer endpoint (5-component grader) over report's simpler hindsight
  const h = (hFromEndpoint.side_a || hFromEndpoint.side_b) ? hFromEndpoint : hFromReport;
  const hA = (h?.side_a || {}) as Record<string, unknown>;
  const hB = (h?.side_b || {}) as Record<string, unknown>;
  const hasHindsight = (hA.score as number) > 0 || (hB.score as number) > 0;
  const hConfidence = String(hA.confidence || hB.confidence || h?.confidence || "");
  const hDaysAgo = Number(h?.days_ago || 0);
  const hOverall = String(h?.overall || "");

  // Key factors from hindsight grader
  const aKeyFactors = (hA.key_factors || []) as string[];
  const bKeyFactors = (hB.key_factors || []) as string[];

  // Grade factors from deep dive (supplement)
  const aGradeFactors = (sideA.grade_factors || []) as Array<Record<string, unknown>>;
  const bGradeFactors = (sideB.grade_factors || []) as Array<Record<string, unknown>>;

  // Merge: key_factors first, then grade_factors titles (deduped)
  function mergeFactors(keyFactors: string[], gradeFactors: Array<Record<string, unknown>>): Array<{ text: string; sentiment?: string }> {
    const seen = new Set<string>();
    const result: Array<{ text: string; sentiment?: string }> = [];
    for (const kf of keyFactors) {
      if (!seen.has(kf.toLowerCase())) {
        seen.add(kf.toLowerCase());
        result.push({ text: kf });
      }
    }
    for (const gf of gradeFactors) {
      const title = String(gf.title || "");
      const detail = String(gf.detail || "");
      const merged = detail || title;
      if (merged && !seen.has(merged.toLowerCase())) {
        seen.add(merged.toLowerCase());
        result.push({ text: merged, sentiment: String(gf.sentiment || "") });
      }
    }
    return result.slice(0, 5);
  }

  const aMergedFactors = mergeFactors(aKeyFactors, aGradeFactors);
  const bMergedFactors = mergeFactors(bKeyFactors, bGradeFactors);

  // Deep dive assets for Details tab
  const ddAssetsA = (sideA.assets || []) as Array<Record<string, unknown>>;
  const ddAssetsB = (sideB.assets || []) as Array<Record<string, unknown>>;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(94vw, 700px)", maxHeight: "92vh", overflowY: "auto",
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

            {/* ── TAB BAR ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {([["grade", "TRADE GRADE", "#5eead4"], ["details", "DETAILS", C.gold], ["share", "SHARE", C.blue]] as const).map(([id, label, accent]) => (
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
                  {/* ── TOP HALF: TRADE DAY ── */}

                  {/* Trade day grade circles — compact row */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 10 }}>
                    {[{ owner: aOwner, score: aScore, verdict: aVerdict },
                      { owner: bOwner, score: bScore, verdict: bVerdict }].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <GradeCircle score={s.score} size={56} />
                        <div>
                          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.primary, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.owner}</div>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: verdictColor(s.verdict), background: `${verdictColor(s.verdict)}15`, padding: "2px 7px", borderRadius: 3, border: `1px solid ${verdictColor(s.verdict)}25`, display: "inline-block", marginTop: 2 }}>{s.verdict || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Side-by-side asset breakdown — compact */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[{ side: sideA, assets: assetsA, owner: aOwner }, { side: sideB, assets: assetsB, owner: bOwner }].map(({ side, assets, owner }, idx) => (
                      <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
                          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{owner.toUpperCase()}</span>
                        </div>
                        <div style={{ padding: "5px 8px" }}>
                          <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.08em", color: C.red, marginBottom: 2 }}>GAVE</div>
                          {assets.sent.length > 0 ? assets.sent.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} position={a.position} value={a.value} />) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
                          {assets.totalSent > 0 && <div style={{ fontFamily: MONO, fontSize: 9, color: C.red, textAlign: "right", marginTop: 2 }}>{fmt(assets.totalSent)}</div>}
                          <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                          <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.08em", color: C.green, marginBottom: 2 }}>GOT</div>
                          {assets.received.length > 0 ? assets.received.map((a, j) => <AssetRow key={j} name={a.name} isPick={a.isPick} position={a.position} value={a.value} />) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
                          {assets.totalRecv > 0 && <div style={{ fontFamily: MONO, fontSize: 9, color: C.green, textAlign: "right", marginTop: 2 }}>{fmt(assets.totalRecv)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Balance bar */}
                  <div style={{ padding: "6px 10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 0 }}>
                    <BalanceBar sent={assetsA.totalSent || (sideA.total_sha_sent as number) || 0} received={assetsA.totalRecv || (sideA.total_sha_received as number) || 0} />
                    {scoringType && (
                      <div style={{ fontFamily: MONO, fontSize: 7, color: C.dim, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ color: C.gold }}>◆</span> {scoringType.toUpperCase().replace(/_/g, " ")}
                      </div>
                    )}
                  </div>

                  {/* ── DIVIDER: HINDSIGHT ── */}
                  <SectionDivider label="HINDSIGHT" color={C.gold} />

                  {/* ── BOTTOM HALF: HINDSIGHT ── */}
                  {hasHindsight ? (
                    <div>
                      {/* Grade circles with confidence badge in center — compact horizontal */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 10 }}>
                        {/* Side A hindsight */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <GradeCircle score={(hA.score as number) || 0} size={52} accentOverride={C.gold} />
                          <div>
                            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(hA.owner || aOwner)}</div>
                            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: verdictColor(String(hA.verdict || "")), background: `${verdictColor(String(hA.verdict || ""))}15`, padding: "1px 6px", borderRadius: 3, border: `1px solid ${verdictColor(String(hA.verdict || ""))}25`, display: "inline-block", marginTop: 2 }}>{String(hA.verdict || "—")}</span>
                          </div>
                        </div>

                        {/* Confidence badge */}
                        <ConfidenceBadge confidence={hConfidence || "Low"} daysAgo={hDaysAgo} overall={hOverall} />

                        {/* Side B hindsight */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(hB.owner || bOwner)}</div>
                            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: verdictColor(String(hB.verdict || "")), background: `${verdictColor(String(hB.verdict || ""))}15`, padding: "1px 6px", borderRadius: 3, border: `1px solid ${verdictColor(String(hB.verdict || ""))}25`, display: "inline-block", marginTop: 2 }}>{String(hB.verdict || "—")}</span>
                          </div>
                          <GradeCircle score={(hB.score as number) || 0} size={52} accentOverride={C.gold} />
                        </div>
                      </div>

                      {/* Two-column key factors — the story */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[{ owner: String(hA.owner || aOwner), factors: aMergedFactors, side: hA },
                          { owner: String(hB.owner || bOwner), factors: bMergedFactors, side: hB }].map((s, i) => {
                          // Build contextual fallback if no factors
                          const fallbackBullets: Array<{ text: string; sentiment?: string }> = [];
                          if (s.factors.length === 0) {
                            const rostered = Number(s.side.assets_rostered || 0);
                            const cut = Number(s.side.assets_cut || 0);
                            const flipped = Number(s.side.assets_flipped || 0);
                            const totalProd = Number(s.side.total_production || 0);
                            if (totalProd > 0) {
                              fallbackBullets.push({ text: `${fmt(totalProd)} total pts delivered`, sentiment: totalProd > 100 ? "positive" : "neutral" });
                            } else if (rostered + cut + flipped === 0) {
                              // Likely a pick-only trade with no production yet
                              fallbackBullets.push({ text: "Picks haven't conveyed yet — check back after the draft", sentiment: "neutral" });
                            }
                            if (rostered > 0) fallbackBullets.push({ text: `${rostered} asset${rostered > 1 ? "s" : ""} still on roster` });
                            if (flipped > 0) fallbackBullets.push({ text: `${flipped} asset${flipped > 1 ? "s" : ""} flipped in subsequent trades` });
                            if (cut > 0) fallbackBullets.push({ text: `${cut} asset${cut > 1 ? "s" : ""} cut or dropped`, sentiment: "negative" });
                            if (fallbackBullets.length === 0) {
                              fallbackBullets.push({ text: "Too early to tell — production data still accumulating" });
                            }
                          }
                          const display = s.factors.length > 0 ? s.factors : fallbackBullets;
                          return (
                            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: C.gold, marginBottom: 4 }}>{s.owner.toUpperCase()}</div>
                              {display.map((f, j) => <FactorBullet key={j} text={f.text} sentiment={f.sentiment} />)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Empty state for no hindsight */
                    <div style={{ padding: "24px 16px", textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontStyle: "italic", color: C.goldBright, marginBottom: 4 }}>Hindsight grades unlock over time</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>Sync your league to unlock hindsight grades — we track production, flips, and championships to grade how trades actually turned out.</div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════ TAB 2: DETAILS ════════════════ */}
              {tab === "details" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* 5-Component Hindsight Breakdown */}
                  {hasHindsight && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>HINDSIGHT BREAKDOWN</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {hDaysAgo > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{hDaysAgo}d ago</span>}
                          {hConfidence && <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, color: confidenceColor(hConfidence), background: `${confidenceColor(hConfidence)}15` }}>{hConfidence}</span>}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                        {[hA, hB].map((s, i) => {
                          const bd = (s.breakdown || {}) as Record<string, number>;
                          return (
                            <div key={i} style={{ padding: "12px 14px", borderRight: i === 0 ? `1px solid ${C.border}` : "none" }}>
                              <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 8 }}>{String(s.owner || "")}</div>
                              {[
                                { label: "Production", val: bd.production, sub: `${fmt(s.total_production as number)} pts · ${fmtDec(s.ppg as number)} PPG` },
                                { label: "Remaining Value", val: bd.remaining_value, sub: `${s.assets_rostered} rost · ${s.assets_cut} cut · ${s.assets_flipped} flip` },
                                { label: "Chain Return", val: bd.chain_return, sub: s.chain_pts ? `${fmt(s.chain_pts as number)} chain pts` : null },
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Per-Asset Deep Dive */}
                  {(ddAssetsA.length > 0 || ddAssetsB.length > 0) && (
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 8 }}>ASSETS ACQUIRED</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[{ owner: aOwner, assets: ddAssetsA }, { owner: bOwner, assets: ddAssetsB }].map(({ owner, assets }, idx) => (
                          <div key={idx}>
                            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 6 }}>{owner}</div>
                            {assets.length > 0 ? assets.map((a, j) => <AssetDetailCard key={j} asset={a} />) : (
                              <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, padding: 12, textAlign: "center", background: C.card, borderRadius: 8 }}>No asset data</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Context */}
                  {(sideA.season_context || sideB.season_context) && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 8 }}>TEAM CONTEXT</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[{ owner: aOwner, side: sideA }, { owner: bOwner, side: sideB }].map(({ owner, side }, i) => {
                          const ctx = (side.season_context || {}) as Record<string, unknown>;
                          const si = (ctx.season_info || ctx) as Record<string, unknown>;
                          const recBefore = (side.record_before_trade || ctx.record_before_trade || {}) as Record<string, number>;
                          const recAfter = (side.record_after_trade || ctx.record_after_trade || {}) as Record<string, number>;
                          return (
                            <div key={i}>
                              <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 4 }}>{owner}</div>
                              {(recBefore.wins != null || recBefore.losses != null) && (
                                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginBottom: 2 }}>
                                  Before: {recBefore.wins || 0}-{recBefore.losses || 0}
                                  {recAfter.wins != null && ` → After: ${recAfter.wins}-${recAfter.losses}`}
                                </div>
                              )}
                              {si.wins != null && (
                                <div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>
                                  Season: {si.wins}-{si.losses}
                                  {si.made_playoffs && <span style={{ color: C.green }}> · Playoffs</span>}
                                  {si.is_champion && <span style={{ color: C.gold, fontWeight: 700 }}> · CHAMPION</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Positional Impact */}
                  {(sideA.position_sold || sideA.position_targeted) && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 8 }}>POSITIONAL IMPACT</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[sideA, sideB].map((side, i) => (
                          <div key={i}>
                            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 4 }}>{String(side.owner || "")}</div>
                            {side.position_targeted && <div style={{ fontFamily: MONO, fontSize: 10, color: posColor(String(side.position_targeted)) }}>Targeted: {String(side.position_targeted)}</div>}
                            {side.position_sold && <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Sold: {String(side.position_sold)}</div>}
                            {side.roster_need_filled && <div style={{ fontFamily: MONO, fontSize: 9, color: C.green, marginTop: 2 }}>Filled a roster need</div>}
                            {side.sold_from_strength && <div style={{ fontFamily: MONO, fontSize: 9, color: C.blue, marginTop: 2 }}>Sold from strength</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trade Context Badges */}
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

                  {/* No hindsight fallback */}
                  {!hasHindsight && (
                    <div style={{ padding: 20, textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>Hindsight analysis not yet available for this trade</span>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════ TAB 3: SHARE CARD ════════════════ */}
              {tab === "share" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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

                    {/* Grade circles + assets */}
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
                        hasHindsight ? `Hindsight: ${hOverall}` : null,
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
