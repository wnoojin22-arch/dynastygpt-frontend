"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useOwnerQuickViewStore } from "@/lib/stores/owner-quickview-store";

type OwnerEntry = { name: string; platform_user_id?: string };

function findInCache(
  data: { owners?: OwnerEntry[] } | undefined,
  ownerName: string,
  knownUserId?: string | null,
): OwnerEntry | undefined {
  if (!data?.owners) return undefined;
  if (knownUserId) {
    const byUid = data.owners.find((o) => o.platform_user_id === knownUserId);
    if (byUid) return byUid;
  }
  return data.owners.find(
    (o) => o.name === ownerName || o.name.toLowerCase() === ownerName.toLowerCase(),
  );
}

/**
 * Returns a click handler for owner names.
 * Resolves platform_user_id from the cached owners query.
 * Departed owners (no match in current owners cache) silently no-op so the
 * modal never opens to a doomed roster/picks/profile fetch. Pair with
 * useIsOwnerCurrent below to drop the cursor/underline styling on those names.
 */
export function useOwnerClick() {
  const lid = useLeagueStore((s) => s.currentLeagueId);
  const qc = useQueryClient();
  const open = useOwnerQuickViewStore((s) => s.open);

  return useCallback(
    (ownerName: string, knownUserId?: string | null) => {
      if (!lid) return;
      const data = qc.getQueryData<{ owners: OwnerEntry[] }>(["owners", lid]);
      // Cache not loaded yet — preserve old behavior so first-paint clicks still work.
      if (!data?.owners) {
        open(ownerName, knownUserId || null);
        return;
      }
      const match = findInCache(data, ownerName, knownUserId);
      if (!match) return;
      open(ownerName, match.platform_user_id || knownUserId || null);
    },
    [lid, qc, open]
  );
}

/**
 * Predicate for whether an owner name (and optional UID) resolves to a current
 * league member. While the owners cache is still loading, returns true so we
 * don't flash inert styling on first paint.
 */
export function useIsOwnerCurrent() {
  const lid = useLeagueStore((s) => s.currentLeagueId);
  const qc = useQueryClient();

  return useCallback(
    (ownerName: string, knownUserId?: string | null): boolean => {
      if (!lid) return true;
      const data = qc.getQueryData<{ owners: OwnerEntry[] }>(["owners", lid]);
      if (!data?.owners) return true;
      return !!findInCache(data, ownerName, knownUserId);
    },
    [lid, qc]
  );
}
