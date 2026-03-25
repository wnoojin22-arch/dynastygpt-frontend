import { create } from "zustand";
import { persist } from "zustand/middleware";

// Dev defaults — bypass sync flow during development
const DEV_LEAGUE_ID = "1181734873299496960";
const DEV_LEAGUE_SLUG = "dlp-dynasty-league";
const DEV_LEAGUE_NAME = "DLP Dynasty League";

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
      currentLeagueId: DEV_LEAGUE_ID,
      currentLeagueSlug: DEV_LEAGUE_SLUG,
      currentOwner: null,
      savedLeagues: [{ id: DEV_LEAGUE_ID, slug: DEV_LEAGUE_SLUG, name: DEV_LEAGUE_NAME, owner: null }],

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

      clearLeague: () => set({ currentLeagueId: null, currentLeagueSlug: null, currentOwner: null }),
    }),
    {
      name: "dynastygpt-league",
      merge: (persisted, current) => {
        const p = persisted as Partial<LeagueState> | undefined;
        // If persisted state has no league, use dev defaults
        if (!p?.currentLeagueId) return current;
        return { ...current, ...p };
      },
    }
  )
);
