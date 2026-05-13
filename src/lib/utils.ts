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
