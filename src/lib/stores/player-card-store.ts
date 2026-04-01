import { create } from "zustand";

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
  openPlayerCard: (name: string, tab?: string) => set({ isOpen: true, playerName: name, defaultTab: tab || null }),
  closePlayerCard: () => set({ isOpen: false, playerName: "", defaultTab: null }),
}));
