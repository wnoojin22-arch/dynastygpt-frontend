import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedLeague {
  id: string;
  slug: string;
  name: string;
  owner: string | null;
}

interface LeagueState {
  currentLeagueId: string | null;
  currentLeagueSlug: string | null;
  currentOwner: string | null;
  savedLeagues: SavedLeague[];

  setLeague: (id: string, slug: string, name: string) => void;
  setOwner: (owner: string) => void;
  clearLeague: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set, get) => ({
      currentLeagueId: null,
      currentLeagueSlug: null,
      currentOwner: null,
      savedLeagues: [],

      setLeague: (id, slug, name) => {
        const existing = get().savedLeagues;
        const updated = existing.some((l) => l.id === id)
          ? existing.map((l) => (l.id === id ? { ...l, slug, name } : l))
          : [...existing, { id, slug, name, owner: null }];
        set({ currentLeagueId: id, currentLeagueSlug: slug, savedLeagues: updated });
      },

      setOwner: (owner) => {
        const { currentLeagueId, savedLeagues } = get();
        set({
          currentOwner: owner,
          savedLeagues: savedLeagues.map((l) =>
            l.id === currentLeagueId ? { ...l, owner } : l
          ),
        });
      },

      clearLeague: () =>
        set({ currentLeagueId: null, currentLeagueSlug: null, currentOwner: null }),
    }),
    { name: "dynastygpt-league" }
  )
);
