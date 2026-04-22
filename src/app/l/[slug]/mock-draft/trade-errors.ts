/**
 * classifyTradeError — pure helper used by MockDraftTradeExploreModal so
 * vitest can drive it without the framer-motion / zustand import chain.
 *
 * Matches the error surface area produced by the backend: 429/rate_limit,
 * 504/timeout, 410/expired, everything else = generic.
 */

export type TradeErrorKind = "rate_limit" | "timeout" | "expired" | "generic";

export interface ClassifiedTradeError {
  kind: TradeErrorKind;
  message: string;
}

export function classifyTradeError(err: unknown): ClassifiedTradeError {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("429") || lower.includes("rate limit")) {
    return { kind: "rate_limit", message: "Too many requests — give it a beat, then retry." };
  }
  if (lower.includes("504") || lower.includes("timeout") || lower.includes("timed out")) {
    return { kind: "timeout", message: "Server took too long. Retry or cancel the trade." };
  }
  if (lower.includes("410") || lower.includes("expired") || lower.includes("not found")) {
    return { kind: "expired", message: "This sim expired. Restart the draft to refresh." };
  }
  return { kind: "generic", message: raw || "Something went wrong. Try again or cancel." };
}
