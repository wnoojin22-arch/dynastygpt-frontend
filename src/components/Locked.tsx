"use client";
import { Lock } from "lucide-react";

interface LockedProps {
  /** Custom copy; defaults to "Unlocks after your league completes 10 trades." */
  reason?: string;
  /** Used in the default copy when `reason` is unset. */
  minTrades?: number;
  /** Optional heading shown above the copy. */
  title?: string;
  /** Extra tailwind classes for the outer card. */
  className?: string;
}

/**
 * Locked-state banner for surfaces that require trade history but the
 * league hasn't accumulated enough yet.
 *
 * Ships alongside the new-league mode gate. Callers gate on
 * `useLeagueMode(lid)?.is_new_league` and render this in place of the
 * behavioral-heavy surface (Trade Profile body, MyTradesView trader
 * profile tab, etc.). See docs/audits/NEW_LEAGUE_MODE_SWAP_PLAN_2026-07-03.md.
 */
export function Locked({
  reason,
  minTrades = 10,
  title = "Not enough history yet",
  className,
}: LockedProps) {
  const message =
    reason ?? `Unlocks after your league completes ${minTrades} trades.`;
  return (
    <div
      className={`bg-card border border-border rounded-xl px-6 py-10 flex flex-col items-center justify-center text-center ${
        className ?? ""
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-3">
        <Lock className="w-5 h-5 text-gold" />
      </div>
      <p className="font-sans text-sm font-semibold text-primary mb-1">
        {title}
      </p>
      <p className="font-sans text-xs text-secondary max-w-md leading-relaxed">
        {message}
      </p>
    </div>
  );
}

export default Locked;
