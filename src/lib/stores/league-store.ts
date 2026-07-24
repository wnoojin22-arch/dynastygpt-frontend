import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SavedLeague {
  id: string;
  slug: string;
  name: string;
  owner: string | null;
  ownerId: string | null;
  // Season string ("2026", "2025"…) sourced from the Sleeper league record.
  // Optional because older persisted entries (v1 shape) never populated it.
  // The switcher filters on `season === CURRENT_NFL_SEASON` to hide
  // completed leagues from the dropdown — a season-string match beats
  // adding a `status` column just for this. Missing/undefined is treated
  // as inactive.
  season?: string;
}

interface LeagueState {
  currentLeagueId: string | null;
  currentLeagueSlug: string | null;
  currentOwner: string | null;
  currentOwnerId: string | null;
  savedLeagues: SavedLeague[];

  setLeague: (id: string, slug: string, name: string) => void;
  setOwner: (owner: string, userId?: string | null) => void;
  setSavedLeagues: (leagues: SavedLeague[]) => void;
  clearLeague: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set, get) => ({
      currentLeagueId: null,
      currentLeagueSlug: null,
      currentOwner: null,
      currentOwnerId: null,
      savedLeagues: [],

      setLeague: (id, slug, name) => {
        const existing = get().savedLeagues;
        const updated = existing.some((l) => l.id === id)
          ? existing.map((l) => (l.id === id ? { ...l, slug, name } : l))
          : [...existing, { id, slug, name, owner: null, ownerId: null }];
        set({ currentLeagueId: id, currentLeagueSlug: slug, savedLeagues: updated });
      },

      setOwner: (owner, userId = null) => {
        const { currentLeagueId, savedLeagues } = get();
        set({
          currentOwner: owner,
          currentOwnerId: userId ?? null,
          savedLeagues: savedLeagues.map((l) =>
            l.id === currentLeagueId ? { ...l, owner, ownerId: userId ?? null } : l
          ),
        });
      },

      setSavedLeagues: (leagues) => {
        // Bulk-replace the list of leagues this user belongs to. Called after
        // a fresh /api/user/{uid}/leagues fetch. Preserves owner/ownerId for
        // leagues we already had — the server response only tells us the user's
        // display_name in each league, not necessarily the owner selection state.
        const existing = get().savedLeagues;
        const byId = new Map(existing.map((l) => [l.id, l]));
        set({
          savedLeagues: leagues.map((l) => {
            const prev = byId.get(l.id);
            return {
              ...l,
              owner: l.owner ?? prev?.owner ?? null,
              ownerId: l.ownerId ?? prev?.ownerId ?? null,
            };
          }),
        });
      },

      clearLeague: () =>
        set({ currentLeagueId: null, currentLeagueSlug: null, currentOwner: null, currentOwnerId: null }),
    }),
    {
      // Persist middleware — Phase A2 multi-league. Whitelist keeps the
      // user on their last-viewed league across page reloads so a hard
      // refresh doesn't nuke context.
      //
      // savedLeagues is intentionally NOT persisted: the layout re-fetches
      // it from /api/user/{uid}/leagues on every mount, so a league added
      // since last session shows up automatically without a stale-cache
      // window.
      //
      // Cross-user safety: localStorage is per-BROWSER, not per-Clerk-user.
      // If user A signs out and user B signs in on the same browser, B
      // hydrates with A's currentLeagueId briefly. The layout gate
      // (see `[slug]/layout.tsx`) catches this: it validates
      // currentLeagueId against B's own /api/user/{uid}/leagues result
      // and bounces to /dashboard if it's not B's league. The bad-league
      // exposure window is a "loading league…" spinner tick.
      //
      // See docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md (gap H).
      name: "dynastygpt-league",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentLeagueId: state.currentLeagueId,
        currentLeagueSlug: state.currentLeagueSlug,
        currentOwner: state.currentOwner,
        currentOwnerId: state.currentOwnerId,
      }),
    }
  ),
);
