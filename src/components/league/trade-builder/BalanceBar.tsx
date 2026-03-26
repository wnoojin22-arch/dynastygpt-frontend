"use client";

import { C, MONO, SANS, fmt } from "../tokens";
import type { LiveBalance } from "./types";

export default function BalanceBar({ live }: { live: LiveBalance }) {
  const max = Math.max(live.giveAdj, live.recvAdj, 1);
  const givePct = (live.giveAdj / max) * 100;
  const recvPct = (live.recvAdj / max) * 100;
  const gapColor = Math.abs(live.gapPct) <= 5 ? C.green : Math.abs(live.gapPct) <= 15 ? C.gold : C.red;

  return (
    <div style={{ padding: "10px 0" }}>
      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.red, width: 32, letterSpacing: "0.06em" }}>SEND</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.elevated, overflow: "hidden" }}>
            <div style={{ width: `${givePct}%`, height: "100%", borderRadius: 4, background: C.red, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.red, width: 48, textAlign: "right" }}>{fmt(live.giveAdj)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.green, width: 32, letterSpacing: "0.06em" }}>GET</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.elevated, overflow: "hidden" }}>
            <div style={{ width: `${recvPct}%`, height: "100%", borderRadius: 4, background: C.green, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.green, width: 48, textAlign: "right" }}>{fmt(live.recvAdj)}</span>
        </div>
      </div>

      {/* Gap indicator */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: gapColor }}>
          {live.gapPct >= 0 ? "+" : ""}{live.gapPct.toFixed(1)}%
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{live.verdict}</span>
      </div>

      {/* Consolidation */}
      {live.consPremium > 0 && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold, letterSpacing: "0.04em" }}>
            +{fmt(live.consPremium)} consolidation ({live.consSide})
          </span>
        </div>
      )}
    </div>
  );
}
