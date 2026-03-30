import { create } from "zustand";

interface PlayerCardState {
  isOpen: boolean;
  playerName: string;
  openPlayerCard: (name: string) => void;
  closePlayerCard: () => void;
}

export const usePlayerCardStore = create<PlayerCardState>((set) => ({
  isOpen: false,
  playerName: "",
  openPlayerCard: (name: string) => set({ isOpen: true, playerName: name }),
  closePlayerCard: () => set({ isOpen: false, playerName: "" }),
}));
