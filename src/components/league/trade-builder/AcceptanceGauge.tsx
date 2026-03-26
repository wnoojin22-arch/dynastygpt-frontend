"use client";

import { C, MONO, SANS } from "../tokens";

export default function AcceptanceGauge({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score / 100, 0), 1);
  const color = score >= 60 ? C.green : score >= 40 ? C.gold : score >= 20 ? C.orange : C.red;
  const label = score >= 60 ? "LIKELY" : score >= 40 ? "POSSIBLE" : score >= 20 ? "LONG SHOT" : "UNLIKELY";

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={`${pct * circ} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: size * 0.28, fontWeight: 900, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontFamily: MONO, fontSize: size * 0.1, fontWeight: 700, color: C.dim, letterSpacing: "0.04em" }}>{label}</span>
      </div>
    </div>
  );
}
