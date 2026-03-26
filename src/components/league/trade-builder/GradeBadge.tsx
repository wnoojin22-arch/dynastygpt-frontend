"use client";

import { C, MONO, DISPLAY, gradeColor } from "../tokens";

export default function GradeBadge({ grade, score, verdict, large }: {
  grade: string; score: number; verdict?: string; large?: boolean;
}) {
  const color = gradeColor(grade);
  const size = large ? 72 : 48;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score / 100, 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={3} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
            strokeLinecap="round" strokeDasharray={`${pct * circ} ${circ}`}
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: size * 0.35, fontWeight: 900, color, lineHeight: 1 }}>{grade}</span>
          {large && <span style={{ fontFamily: MONO, fontSize: size * 0.13, fontWeight: 700, color: C.dim, marginTop: 2 }}>{score}</span>}
        </div>
      </div>
      {large && verdict && (
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color, textAlign: "center" }}>{verdict}</span>
      )}
    </div>
  );
}
