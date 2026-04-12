import { create } from "zustand";

// Fire-and-forget tracking for player card opens (can't use useTrack hook in store)
function _trackPlayerCard(name: string) {
  try {
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    import("@/lib/api").then(({ authHeaders }) =>
      authHeaders().then((hdrs) =>
        fetch("/api/events", {
          method: "POST", headers: hdrs,
          body: JSON.stringify({ event_type: "player_card_opened", page, metadata: { player: name } }),
        }).catch(() => {})
      )
    ).catch(() => {});
  } catch { /* silent */ }
}

interface PlayerCardState {
  isOpen: boolean;
  playerName: string;
  defaultTab: string | null;
  openPlayerCard: (name: string, tab?: string) => void;
  closePlayerCard: () => void;
}

export const usePlayerCardStore = create<PlayerCardState>((set) => ({
  isOpen: false,
  playerName: "",
  defaultTab: null,
  openPlayerCard: (name: string, tab?: string) => {
    _trackPlayerCard(name);
    set({ isOpen: true, playerName: name, defaultTab: tab || null });
  },
  closePlayerCard: () => set({ isOpen: false, playerName: "", defaultTab: null }),
}));
