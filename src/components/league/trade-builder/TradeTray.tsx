"use client";

import React from "react";
import { C, SANS, MONO, fmt, posColor } from "../tokens";
import BalanceBar from "./BalanceBar";
import AcceptanceGauge from "./AcceptanceGauge";
import GradeBadge from "./GradeBadge";
import type { RosterPlayer, LiveBalance, TradeEvaluation } from "./types";

interface Props {
  giveNames: string[];
  receiveNames: string[];
  giveRoster: RosterPlayer[];
  receiveRoster: RosterPlayer[];
  evaluation: TradeEvaluation | null;
  analyzing: boolean;
  onRemoveGive: (name: string) => void;
  onRemoveReceive: (name: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
}

function computeLiveBalance(giveNames: string[], receiveNames: string[], giveRoster: RosterPlayer[], receiveRoster: RosterPlayer[]): LiveBalance {
  const find = (name: string, roster: RosterPlayer[]) => roster.find(p => p.name.toLowerCase() === name.toLowerCase());

  let giveTotal = 0;
  for (const n of giveNames) {
    const p = find(n, giveRoster);
    giveTotal += p?.sha_value || 0;
  }
  let recvTotal = 0;
  for (const n of receiveNames) {
    const p = find(n, receiveRoster);
    recvTotal += p?.sha_value || 0;
  }

  // Consolidation premium
  const diff = Math.abs(giveNames.length - receiveNames.length);
  const pcts = [0, 0.25, 0.65, 0.85, 0.95];
  const consPct = diff < pcts.length ? pcts[diff] : 0.95;
  let consPremium = 0;
  let consSide = "";
  if (giveNames.length !== receiveNames.length && giveNames.length > 0 && receiveNames.length > 0) {
    const concentrated = giveNames.length < receiveNames.length ? "give" : "receive";
    const allValues = concentrated === "give"
      ? giveNames.map(n => find(n, giveRoster)?.sha_value || 0)
      : receiveNames.map(n => find(n, receiveRoster)?.sha_value || 0);
    const top = Math.max(...allValues, 0);
    consPremium = Math.round(top * consPct);
    consSide = concentrated === "give" ? "SEND" : "GET";
  }

  const giveAdj = giveTotal + (consSide === "SEND" ? consPremium : 0);
  const recvAdj = recvTotal + (consSide === "GET" ? consPremium : 0);
  const gap = recvAdj - giveAdj;
  const gapPct = giveAdj > 0 ? (gap / giveAdj) * 100 : 0;

  let verdict = "FAIR";
  const absPct = Math.abs(gapPct);
  if (absPct <= 5) verdict = "FAIR";
  else if (absPct <= 10) verdict = gap > 0 ? "SLIGHT_OVERPAY_YOU" : "SLIGHT_UNDERPAY";
  else if (absPct <= 20) verdict = gap > 0 ? "OVERPAY_YOU" : "UNDERPAY";
  else verdict = gap > 0 ? "SIGNIFICANT_OVERPAY" : "SIGNIFICANT_UNDERPAY";

  return { giveRaw: giveTotal, giveAdj, recvRaw: recvTotal, recvAdj, gapPct, verdict, consPremium, consSide };
}

function AssetRow({ name, roster, onRemove, side }: { name: string; roster: RosterPlayer[]; onRemove: (n: string) => void; side: "give" | "receive" }) {
  const p = roster.find(r => r.name.toLowerCase() === name.toLowerCase());
  const color = side === "give" ? C.red : C.green;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderLeft: `3px solid ${color}`, transition: "background 0.1s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {p && <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 900, color: posColor(p.position), background: posColor(p.position) + "18", padding: "0 3px", borderRadius: 2 }}>{p.position}</span>}
      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {p?.sha_pos_rank && (
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: posColor(p.position), background: C.elevated, padding: "1px 4px", borderRadius: 3 }}>{p.sha_pos_rank}</span>
      )}
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold, minWidth: 36, textAlign: "right" }}>{p ? fmt(p.sha_value) : "?"}</span>
      <span onClick={() => onRemove(name)} style={{ cursor: "pointer", fontSize: 12, color: C.dim, padding: "0 2px" }}>✕</span>
    </div>
  );
}

export default function TradeTray({ giveNames, receiveNames, giveRoster, receiveRoster, evaluation, analyzing, onRemoveGive, onRemoveReceive, onAnalyze, onClear }: Props) {
  const hasAssets = giveNames.length > 0 || receiveNames.length > 0;
  const live = computeLiveBalance(giveNames, receiveNames, giveRoster, receiveRoster);
  const grade = evaluation?.owner_grade;
  const acceptance = evaluation?.acceptance;

  return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {/* YOU SEND */}
      <div style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, background: `${C.red}08` }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.red }}>YOU SEND</span>
      </div>
      <div style={{ minHeight: 60, padding: "4px 0" }}>
        {giveNames.length > 0 ? giveNames.map(n => <AssetRow key={n} name={n} roster={giveRoster} onRemove={onRemoveGive} side="give" />) : (
          <div style={{ padding: "16px 10px", textAlign: "center", fontFamily: MONO, fontSize: 10, color: C.dim }}>Click players from YOUR roster</div>
        )}
      </div>

      {/* BALANCE BAR */}
      {hasAssets && <BalanceBar live={live} />}

      {/* YOU RECEIVE */}
      <div style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, background: `${C.green}08` }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.green }}>YOU RECEIVE</span>
      </div>
      <div style={{ minHeight: 60, padding: "4px 0" }}>
        {receiveNames.length > 0 ? receiveNames.map(n => <AssetRow key={n} name={n} roster={receiveRoster} onRemove={onRemoveReceive} side="receive" />) : (
          <div style={{ padding: "16px 10px", textAlign: "center", fontFamily: MONO, fontSize: 10, color: C.dim }}>Click players from THEIR roster</div>
        )}
      </div>

      {/* GAUGES + BUTTONS */}
      {hasAssets && (
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Gauges row */}
          {(grade || acceptance) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              {grade && <GradeBadge grade={grade.grade} score={grade.score} verdict={grade.verdict} large />}
              {acceptance && <AcceptanceGauge score={acceptance.acceptance_likelihood} size={64} />}
            </div>
          )}

          {/* Buttons */}
          <button onClick={onAnalyze} disabled={analyzing || giveNames.length === 0 || receiveNames.length === 0}
            style={{
              width: "100%", padding: "8px", borderRadius: 6, border: "none", cursor: "pointer",
              background: analyzing ? C.elevated : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
              color: analyzing ? C.dim : C.bg,
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              opacity: giveNames.length === 0 || receiveNames.length === 0 ? 0.4 : 1,
            }}>
            {analyzing ? "ANALYZING..." : "ANALYZE TRADE"}
          </button>
          <button onClick={onClear}
            style={{
              width: "100%", padding: "6px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.dim, fontFamily: MONO, fontSize: 9, fontWeight: 700, cursor: "pointer",
            }}>CLEAR TRADE</button>
        </div>
      )}
    </div>
  );
}
