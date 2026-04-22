/**
 * Pure helpers for MockDraftTradeExploreModal. Extracted so verdict styling,
 * asset-card formatting, and confirm-gate logic are testable in node-env
 * vitest without mounting React.
 */

import type {
  FuturePick,
  TradePackage,
  TradePackagePick,
  VerdictLabel,
} from "@/lib/stores/mock-draft-store";
import type { ConsensusBoardEntry, Position } from "./contracts";

// ─── Verdict banner styling — Billy's Q9 override ─────────────────────────
// GREAT → green, FAIR → gold, BAD → accent-red, NOT REALISTIC → dim gray.
export interface VerdictBannerStyle {
  label: VerdictLabel;
  fg: string;
  bg: string;
  border: string;
}

const VERDICT_STYLES: Record<VerdictLabel, VerdictBannerStyle> = {
  "GREAT":         { label: "GREAT",         fg: "#7dd3a0", bg: "rgba(125,211,160,0.12)", border: "rgba(125,211,160,0.35)" },
  "FAIR":          { label: "FAIR",          fg: "#d4a532", bg: "rgba(212,165,50,0.12)",  border: "rgba(212,165,50,0.35)"  },
  "BAD":           { label: "BAD",           fg: "#e47272", bg: "rgba(228,114,114,0.12)", border: "rgba(228,114,114,0.35)" },
  "NOT REALISTIC": { label: "NOT REALISTIC", fg: "#7a7c8e", bg: "rgba(122,124,142,0.10)", border: "rgba(122,124,142,0.28)" },
};

export function getVerdictStyle(label: VerdictLabel | string): VerdictBannerStyle {
  return VERDICT_STYLES[label as VerdictLabel] ?? VERDICT_STYLES.FAIR;
}

// ─── Asset-card formatting ───────────────────────────────────────────────

/** Format a 2026 pick card: "2026 · 1.06 · 2,900". Year is always 2026
 *  for picks in the active sim (future picks use formatFuturePickLabel). */
export function formatPickLabel(pick: TradePackagePick): string {
  const v = formatValue(pick.value_sha);
  return `2026 · ${pick.slot} · ${v}`;
}

/** Format a future pick card: "2027 R3 · 900". Future picks have a year
 *  (non-2026) and a round, but no slot (value is blind mid-slot). */
export function formatFuturePickLabel(pick: FuturePick): string {
  const v = formatValue(pick.value_sha);
  return `${pick.year} · R${pick.round} · ${v}`;
}

/** Format an integer value with thousands separators. Never shows "SHA". */
export function formatValue(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}

/** Delta indicator: "+3.2%" when user overpays (negative delta), "-5.1%"
 *  when user underpays. Backend sign convention: positive = partner
 *  overpays; from the user's POV we invert so overpay reads positive. */
export function formatDeltaLabel(deltaPct: number | null | undefined): string {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return "—";
  const fromUser = -deltaPct;
  const sign = fromUser > 0 ? "+" : "";
  return `${sign}${fromUser.toFixed(1)}%`;
}

/** Delta color: green when user receives more value, red when overpaying,
 *  dim when within ±1%. */
export function getDeltaTone(deltaPct: number | null | undefined): "green" | "red" | "dim" {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return "dim";
  if (deltaPct > 1) return "green";       // partner overpays (user gains)
  if (deltaPct < -1) return "red";        // user overpays
  return "dim";
}

// ─── Player cards (rare: only when player_given is non-null) ──────────────
// TODO(mock-draft-lite Phase 5): build_pick_packages does not currently
// emit roster-player-for-pick packages. This lookup is scaffolding for
// when/if that path is enabled.
export function lookupPlayerPosition(
  playerName: string | null | undefined,
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>,
): Position | null {
  if (!playerName) return null;
  const hit = consensusBoard.find(
    (p) => p.name.toLowerCase().trim() === playerName.toLowerCase().trim(),
  );
  return hit?.position ?? null;
}

// ─── Confirm gate ─────────────────────────────────────────────────────────

export function isConfirmEnabled(pkg: TradePackage | null | undefined): boolean {
  if (!pkg?.verdict) return false;
  return pkg.verdict.confirm_enabled === true;
}

// ─── Tab derivation ───────────────────────────────────────────────────────

/** Label for each tab — "Package 1", "Package 2", .... Falls back cleanly
 *  when fewer than 3 packages exist; the modal still renders the tab row
 *  but with only the available count. */
export function tabLabels(packageCount: number): string[] {
  return Array.from({ length: packageCount }, (_, i) => `Package ${i + 1}`);
}

/** Message when fewer than 3 packages came back — so the user knows the
 *  backend tried and the pool was just thin, not that the UI broke. */
export function thinPoolMessage(packageCount: number): string | null {
  if (packageCount === 0) return "No realistic packages — partner's assets can't cover this trade.";
  if (packageCount === 1) return "Only one realistic package — partner's asset pool is thin.";
  if (packageCount === 2) return "Two realistic packages — partner's asset pool is limited.";
  return null;
}

// ─── Clamp helper for tab index after packages array shrinks ──────────────
export function clampTabIndex(idx: number, packageCount: number): number {
  if (packageCount <= 0) return 0;
  if (idx < 0) return 0;
  if (idx >= packageCount) return packageCount - 1;
  return idx;
}
