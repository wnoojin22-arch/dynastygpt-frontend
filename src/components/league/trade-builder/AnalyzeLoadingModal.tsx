"use client";

/**
 * Full-screen overlay shown while the trade-analyze evaluation runs.
 * Synthetic stages based on elapsed time — backend doesn't emit progress.
 */
import React, { useState, useEffect } from "react";
import { C, SANS, MONO, DISPLAY } from "../tokens";

const STAGES: Array<{ upTo: number; label: string; sub: string }> = [
  { upTo: 2,  label: "Determining roster fit",                    sub: "Comparing positional depth and needs for both sides" },
  { upTo: 5,  label: "Searching behavioral tendencies",           sub: "Analyzing partner's trade history and patterns" },
  { upTo: 8,  label: "Loading owner profiles",                    sub: "Pulling competitive windows and dynasty scores" },
  { upTo: 14, label: "Searching through 2M trade database",       sub: "Finding similar trades for comparable valuation" },
  { upTo: 20, label: "Computing grade dimensions",                sub: "Value return, asset quality, positional need, strategic fit" },
  { upTo: 30, label: "Generating scouting report",                sub: "Building AI-powered trade analysis" },
  { upTo: 999,label: "Finalizing analysis",                       sub: "Almost there" },
];

export default function AnalyzeLoadingModal() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ETA = 25;
  const pct = Math.min(95, Math.round((elapsed / ETA) * 100));
  const stage = STAGES.find((s) => elapsed <= s.upTo) ?? STAGES[STAGES.length - 1];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.panel,
          border: `1px solid ${C.gold}40`,
          borderRadius: 12,
          padding: "28px 32px",
          boxShadow: `0 0 40px ${C.gold}20`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 18,
            color: C.gold,
            letterSpacing: "0.08em",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          ANALYZING TRADE
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 600,
            color: C.primary,
            marginBottom: 4,
          }}
        >
          {stage.label}...
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12,
            color: C.dim,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          {stage.sub}
        </div>

        <div
          style={{
            width: "100%",
            height: 6,
            background: C.elevated,
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})`,
              transition: "width 0.8s ease",
            }}
          />
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: C.dim,
            textAlign: "right",
          }}
        >
          {elapsed}s
        </div>
      </div>
    </div>
  );
}
