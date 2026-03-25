import { create } from "zustand";

interface WarRoomState {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const useWarRoomStore = create<WarRoomState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
}));
