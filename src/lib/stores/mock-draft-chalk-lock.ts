/**
 * Pure helper for applyCommitTradeResponse — compute the lockedPicks delta
 * to append when a trade commits. After a trade-up or trade-back the user's
 * pick slot shifts; every chalk pick that happened BEFORE the new slot must
 * be locked so /simulate-from-state doesn't re-roll them. Without the lock,
 * the backend aggregates availability across 50 fresh sims and already-
 * chalked players re-surface as recommendations (Mendoza at 1.04 becoming
 * the 1.06 bpa after a trade-up).
 */

import type { ChalkPick } from "@/app/l/[slug]/mock-draft/contracts";
import type { SlotOwnerMap, SlotProspectMap } from "./mock-draft-store";

type MinChalkPick = Pick<ChalkPick, "slot" | "owner" | "prospect_name">;

export function buildChalkLockedPicks(
  chalk: ReadonlyArray<MinChalkPick>,
  postTradeOverrides: SlotOwnerMap,
  userPicks: SlotProspectMap,
  userOwner: string,
): SlotProspectMap {
  const userOwnerKey = userOwner.toLowerCase().trim();
  let newSlotIdx = -1;
  for (let i = 0; i < chalk.length; i++) {
    const { slot, owner } = chalk[i];
    const effective = (postTradeOverrides[slot] ?? owner).toLowerCase().trim();
    if (effective === userOwnerKey && !(slot in userPicks)) {
      newSlotIdx = i;
      break;
    }
  }
  if (newSlotIdx <= 0) return {};
  const out: SlotProspectMap = {};
  for (let i = 0; i < newSlotIdx; i++) {
    out[chalk[i].slot] = chalk[i].prospect_name;
  }
  return out;
}
