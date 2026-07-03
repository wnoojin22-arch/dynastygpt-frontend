"use client";
import { useQuery } from "@tanstack/react-query";
import { getLeagueIntel } from "@/lib/api";
import type { LeagueMode } from "@/lib/types";

const HOUR = 60 * 60 * 1000;

/**
 * Read the `league_mode` block from the `/league-intel` response.
 *
 * Shares the react-query key `["league-intel", lid]` with every existing
 * consumer of `getLeagueIntel` (page.tsx, rankings/page.tsx, layout.tsx,
 * useTradeBuilder), so no extra HTTP fetch fires — the hook just reads
 * from the cached query result.
 *
 * Returns null when leagueId is falsy, the query is still loading, or
 * the field is absent (mature-league cache from before the backend
 * `get_league_mode` ship at commit 9807462).
 */
export function useLeagueMode(leagueId: string | null | undefined): LeagueMode | null {
  const { data } = useQuery({
    queryKey: ["league-intel", leagueId],
    queryFn: () => getLeagueIntel(leagueId!),
    enabled: !!leagueId,
    staleTime: 2 * HOUR,
  });
  return data?.league_mode ?? null;
}
