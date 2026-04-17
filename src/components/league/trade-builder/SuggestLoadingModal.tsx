"use client";

/**
 * Full-screen overlay shown while the trade-suggest job runs (70-90s typical).
 * Renders regardless of partner/tray state so the user always has visible
 * feedback after clicking Suggest. Synthetic stages based on elapsed time —
 * the backend doesn't emit progress events, so stage labels are advisory.
 */
import React from "react";
import { C, SANS, MONO, DISPLAY } from "../tokens";

const STAGES: Array<{ upTo: number; label: string; sub: string }> = [
  { upTo: 5,   label: "Loading rosters",           sub: "Pulling your roster and partner roster from Sleeper" },
  { upTo: 15,  label: "Reading behavioral intel",  sub: "Checking partner's trade history and tendencies" },
  { upTo: 30,  label: "Scanning comparable trades", sub: "Matching against 509K+ historical trades" },
  { upTo: 60,  label: "Evaluating packages",       sub: "AI building 3-8 trade structures" },
  { upTo: 90,  label: "Finalizing proposals",      sub: "Grading each package and computing acceptance" },
  { upTo: 999, label: "Almost done",               sub: "Hang tight, wrapping up" },
];

export default function SuggestLoadingModal({
  elapsedSec,
  query,
  onCancel,
}: {
  elapsedSec: number;
  query?: string;
  onCancel?: () => void;
}) {
  const ETA = 90;
  // Cap visual progress at 95% so the bar keeps moving past the ETA without
  // appearing "stuck at 100%".
  const pct = Math.min(95, Math.round((elapsedSec / ETA) * 100));
  const stage =
    STAGES.find((s) => elapsedSec <= s.upTo) ?? STAGES[STAGES.length - 1];

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
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          FINDING THE BEST TRADES
        </div>
        {query && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.dim,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {query}
          </div>
        )}

        <div
          style={{
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 600,
            color: C.primary,
            marginBottom: 4,
          }}
        >
          {stage.label}…
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
              background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright})`,
              transition: "width 0.8s ease-out",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontSize: 10,
            color: C.dim,
          }}
        >
          <span>{elapsedSec}s elapsed</span>
          <span>~{ETA}s typical</span>
        </div>
        {elapsedSec >= 10 && onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: 16, width: "100%", padding: "10px 0",
              borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", color: C.dim,
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
