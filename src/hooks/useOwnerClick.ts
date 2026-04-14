"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useOwnerQuickViewStore } from "@/lib/stores/owner-quickview-store";

/**
 * Returns a click handler for owner names.
 * Resolves platform_user_id from the cached owners query.
 * If the owner is the logged-in user, skips the modal (modal handles nav internally).
 */
export function useOwnerClick() {
  const lid = useLeagueStore((s) => s.currentLeagueId);
  const qc = useQueryClient();
  const open = useOwnerQuickViewStore((s) => s.open);

  return useCallback(
    (ownerName: string, knownUserId?: string | null) => {
      let userId = knownUserId || null;
      if (!userId && lid) {
        const data = qc.getQueryData<{ owners: { name: string; platform_user_id?: string }[] }>(["owners", lid]);
        const match = data?.owners?.find(
          (o) => o.name === ownerName || o.name.toLowerCase() === ownerName.toLowerCase()
        );
        userId = match?.platform_user_id || null;
      }
      open(ownerName, userId);
    },
    [lid, qc, open]
  );
}
