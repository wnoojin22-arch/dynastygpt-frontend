import { create } from "zustand";

export interface SavedLeague {
  id: string;
  slug: string;
  name: string;
  owner: string | null;
  ownerId: string | null;
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
);
