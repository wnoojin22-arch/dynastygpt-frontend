import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Trade-list verdict gate.
 *
 * Returns true only when a trade is at least 365 days old, meaning the
 * persisted hindsight verdict is meaningful enough to display in compact
 * list-row UIs (league trade log, my-trades log, recent-trades widget).
 *
 * The TradeReportModal itself is unaffected — it shows the living grade
 * with its own confidence label. This helper is for list-row badges only.
 */
export function shouldShowVerdict(tradeDate: string | Date | null | undefined): boolean {
  if (!tradeDate) return false;
  const t = tradeDate instanceof Date ? tradeDate : new Date(tradeDate);
  if (isNaN(t.getTime())) return false;
  const days = (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 365;
}

/** Tone token for a list-row verdict pill — drives Tailwind classes.
 *  ROBBERY/BOTH LOST = red, WIN-WIN/WON = green, EVEN = blue,
 *  PENDING = gray box with gold lettering. */
export type VerdictTone = "green" | "red" | "blue" | "pending";

export interface OverallVerdict {
  /** Just the verdict word — what goes INSIDE the colored pill (e.g., "ROBBERY"). */
  pillText: string;
  tone: VerdictTone;
  /** Team name to render in body text BEFORE the pill, when applicable. */
  winnerName?: string;
}

/** Collapse a per-side verdict string to one of WON / LOST / EVEN / "". */
function bucketSide(v: string | null | undefined): "WON" | "LOST" | "EVEN" | "" {
  if (!v) return "";
  const lo = v.toLowerCase().trim();
  if (lo === "robbery" || lo === "won" || lo === "slight edge") return "WON";
  if (lo === "victim" || lo === "lost" || lo === "slight loss") return "LOST";
  if (lo === "win-win" || lo === "push" || lo === "both lost") return "EVEN";
  return "";
}

interface SideInput {
  name: string | null | undefined;
  verdict: string | null | undefined;
}

/**
 * Derive a single trade-day overall verdict for list-row display.
 *
 * - Balanced (both EVEN, or Win-Win/Push/Both Lost overall) → "EVEN" (gray).
 * - Favored (one side WON, other LOST) → "[winner name]: ROBBERY" (green).
 * - Missing/unknown verdicts → "EVEN" fallback so we never render a broken pill.
 *
 * Per Billy: list view uses ROBBERY as the single "favored" label regardless
 * of severity (Slight Edge / Won / ROBBERY all collapse). Severity stays in
 * the detail modal.
 */
export function deriveTradeDayVerdict(sideA: SideInput, sideB: SideInput): OverallVerdict {
  const a = bucketSide(sideA.verdict);
  const b = bucketSide(sideB.verdict);
  if (a === "WON" && b === "LOST") return { pillText: "ROBBERY", tone: "red", winnerName: sideA.name || undefined };
  if (b === "WON" && a === "LOST") return { pillText: "ROBBERY", tone: "red", winnerName: sideB.name || undefined };
  // Both even, or one even, or both blank → EVEN (no winner name).
  return { pillText: "EVEN", tone: "blue" };
}

/**
 * Derive a single hindsight overall verdict for list-row display.
 *
 * - Trade < 365 days → "PENDING" (muted). Hides noisy too-fresh grades.
 * - Both WON → "WIN-WIN" (green).
 * - Both LOST → "BOTH LOST" (red).
 * - One WON + one LOST → "[winner]: WON" (green).
 * - Any EVEN, or partial/blank data → "EVEN" (gray) or "PENDING" if neither is set.
 */
export function deriveHindsightVerdict(
  tradeDate: string | Date | null | undefined,
  sideA: SideInput,
  sideB: SideInput,
): OverallVerdict {
  if (!shouldShowVerdict(tradeDate)) return { pillText: "PENDING", tone: "pending" };
  const a = bucketSide(sideA.verdict);
  const b = bucketSide(sideB.verdict);
  if (!a && !b) return { pillText: "PENDING", tone: "pending" };
  if (a === "EVEN" || b === "EVEN") return { pillText: "EVEN", tone: "blue" };
  if (a === "WON" && b === "WON") return { pillText: "WIN-WIN", tone: "green" };
  if (a === "LOST" && b === "LOST") return { pillText: "BOTH LOST", tone: "red" };
  if (a === "WON" && b === "LOST") return { pillText: "WON", tone: "green", winnerName: sideA.name || undefined };
  if (b === "WON" && a === "LOST") return { pillText: "WON", tone: "green", winnerName: sideB.name || undefined };
  // Partial — only one side has a verdict.
  if (a === "WON") return { pillText: "WON", tone: "green", winnerName: sideA.name || undefined };
  if (b === "WON") return { pillText: "WON", tone: "green", winnerName: sideB.name || undefined };
  return { pillText: "PENDING", tone: "pending" };
}

/** Tailwind classes for a verdict pill given a tone. */
export function verdictPillClass(tone: VerdictTone): string {
  switch (tone) {
    case "green":   return "text-accent-green bg-accent-green/15 border-accent-green/30";
    case "red":     return "text-accent-red bg-accent-red/15 border-accent-red/30";
    case "blue":    return "text-accent-blue bg-accent-blue/15 border-accent-blue/30";
    // Pending: muted gray surface, gold (yellow/orange) lettering to flag
    // "grade is still cooking" without competing visually with real verdicts.
    case "pending": return "text-gold bg-elevated border-border";
  }
}
