"use client";

/**
 * Shared pieces for TradeUpPanel + TradeBackPanel. Both panels render the
 * same single-line "slot row" (slot · owner · 4 grade pills · willingness ·
 * Explore). Keeping the primitives here prevents drift between the two
 * panels and keeps each panel focused on its own ordering + fetch shape.
 */

import { C } from "@/components/league/tokens";
import type {
  LikelyBuyer,
  WillingnessBand,
} from "@/lib/stores/mock-draft-store";
import type { Position, PositionalGrade } from "./contracts";

// ─── Grade pill styling — mirrors WarRoomLanding for visual consistency ───
const GRADE_LETTER: Record<string, string> = {
  CRITICAL: "D",
  WEAK: "C",
  AVERAGE: "B",
  STRONG: "A-",
  ELITE: "A+",
};
const GRADE_TONE: Record<string, string> = {
  CRITICAL: "#e47272",
  WEAK: "#e09c6b",
  AVERAGE: "#b0b2c8",
  STRONG: "#7dd3a0",
  ELITE: "#d4a532",
};

// ─── Willingness band styling ─────────────────────────────────────────────
const BAND_STYLE: Record<WillingnessBand, { fg: string; bg: string; label: string }> = {
  HIGH:     { fg: C.green,   bg: "rgba(125,211,160,0.14)", label: "HIGH" },
  MEDIUM:   { fg: C.gold,    bg: "rgba(212,165,50,0.14)",  label: "MED"  },
  LOW:      { fg: "#b0b2c8", bg: "rgba(176,178,200,0.12)", label: "LOW"  },
  UNLIKELY: { fg: "#7a7c8e", bg: "rgba(122,124,142,0.14)", label: "NO"   },
};

export function WillingnessBadge({
  band, score,
}: { band: WillingnessBand; score: number }) {
  const s = BAND_STYLE[band];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-[2px] text-[10px] font-bold tracking-[0.06em] uppercase"
      style={{ color: s.fg, background: s.bg }}
      title={`Willingness ${score}/100 — ${band}`}
    >
      <span>{s.label}</span>
      <span className="opacity-70 font-semibold tabular-nums">{score}</span>
    </span>
  );
}

// ─── Grade pills: 4 tiny chips, one per position ──────────────────────────
const POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

export function GradePills({
  grades,
}: { grades: Partial<Record<Position, string>> | undefined }) {
  return (
    <div className="flex gap-[3px]">
      {POSITIONS.map((pos) => {
        const g = (grades?.[pos] ?? "AVERAGE") as PositionalGrade;
        const letter = GRADE_LETTER[g] ?? "—";
        const tone = GRADE_TONE[g] ?? "#b0b2c8";
        return (
          <div
            key={pos}
            className="flex flex-col items-center justify-center rounded-[3px] leading-none"
            style={{
              width: 20,
              height: 20,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.04)`,
            }}
            title={`${pos}: ${g}`}
          >
            <span
              className="text-[7px] font-bold tracking-[0.04em]"
              style={{ color: "#6c6e80" }}
            >
              {pos}
            </span>
            <span
              className="text-[9px] font-bold tabular-nums"
              style={{ color: tone, marginTop: 1 }}
            >
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SlotRow — compact single-line row shared between up/back panels ──────
export function SlotRow({
  slot, owner, buyer, onExplore, disabled,
}: {
  slot: string;
  owner: string;
  buyer: LikelyBuyer | undefined;   // willingness + grades, undefined while loading
  onExplore: () => void;
  disabled?: boolean;
}) {
  const isLoading = !buyer;
  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5"
      style={{
        borderTop: `1px solid rgba(255,255,255,0.035)`,
        fontFamily: "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif",
      }}
    >
      <span
        className="tabular-nums font-semibold text-[13px]"
        style={{ color: C.primary, width: 48 }}
      >
        {slot}
      </span>
      <span
        className="text-[12px] truncate"
        style={{ color: C.secondary, flex: "1 1 auto", minWidth: 0 }}
        title={owner}
      >
        {owner}
      </span>
      <GradePills grades={buyer?.grades as Record<Position, string> | undefined} />
      <div style={{ width: 72, textAlign: "right" }}>
        {isLoading ? (
          <span
            className="inline-block rounded"
            style={{
              width: 54, height: 16,
              background: "rgba(255,255,255,0.05)",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        ) : (
          <WillingnessBadge
            band={buyer.willingness.band}
            score={buyer.willingness.score}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onExplore}
        disabled={disabled || isLoading}
        className="text-[11px] font-semibold tracking-[0.08em] uppercase rounded px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          color: C.gold,
          background: "rgba(212,165,50,0.10)",
          border: `1px solid rgba(212,165,50,0.28)`,
        }}
      >
        Explore →
      </button>
    </div>
  );
}

// ─── Error / empty states ─────────────────────────────────────────────────
export function PanelError({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 text-[12px]"
      style={{ color: C.red, background: "rgba(228,114,114,0.06)" }}
    >
      <span>{msg}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[11px] font-semibold tracking-[0.08em] uppercase underline"
          style={{ color: C.red }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
