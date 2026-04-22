/**
 * Pure helpers for TradeUpPanel + TradeBackPanel row derivation. Extracted
 * out of the components so the ordering / filtering can be unit-tested in
 * node-env vitest without mounting React.
 *
 * Row ordering rule for both panels: nearest-to-user-first. A one-slot
 * trade is cheaper than a four-slot trade, and the user scans top-down.
 */

import type { ChalkPick } from "./contracts";
import { pickNumFromSlot } from "./helpers";

export type SlotRowData = ChalkPick & { _pn: number };

/** Picks AHEAD of currentSlot, excluding user-owned, nearest-first. */
export function picksAheadOfSlot(
  chalk: ReadonlyArray<ChalkPick>,
  currentSlot: string,
  numTeams: number,
  userOwner: string,
): SlotRowData[] {
  const currentPickNum = pickNumFromSlot(currentSlot, numTeams);
  return chalk
    .filter((c) => c.owner !== userOwner)
    .map((c) => ({ ...c, _pn: pickNumFromSlot(c.slot, numTeams) }))
    .filter((c) => c._pn < currentPickNum)
    .sort((a, b) => b._pn - a._pn);   // highest pick num < current = nearest
}

/** Picks BEHIND currentSlot, excluding user-owned, nearest-first. */
export function picksBehindSlot(
  chalk: ReadonlyArray<ChalkPick>,
  currentSlot: string,
  numTeams: number,
  userOwner: string,
): SlotRowData[] {
  const currentPickNum = pickNumFromSlot(currentSlot, numTeams);
  return chalk
    .filter((c) => c.owner !== userOwner)
    .map((c) => ({ ...c, _pn: pickNumFromSlot(c.slot, numTeams) }))
    .filter((c) => c._pn > currentPickNum)
    .sort((a, b) => a._pn - b._pn);   // smallest pick num > current = nearest
}

/**
 * Target slot pick for a Likely Buyers strip card — the partner's
 * nearest-owned slot that lives BEHIND the user's current slot (the only
 * slots the user can credibly "trade back" for). Falls back to the
 * partner's first owned slot.
 */
export function targetSlotForBuyerCard(
  slotsOwned: ReadonlyArray<string>,
  currentSlot: string,
  numTeams: number,
): string | null {
  if (!slotsOwned.length) return null;
  const currentPickNum = pickNumFromSlot(currentSlot, numTeams);
  const behind = slotsOwned.find((s) => pickNumFromSlot(s, numTeams) > currentPickNum);
  return behind ?? slotsOwned[0] ?? null;
}
