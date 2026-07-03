import { create } from "zustand";
import { useLeagueStore } from "./league-store";

interface WarRoomState {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const useWarRoomStore = create<WarRoomState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
}));

// ── Reset on league switch ────────────────────────────────────────────────
// activeView pinned to a sub-tab in League A shouldn't survive into League B.
// Reset to the default landing view on a genuine league change (skips the
// initial null → first-league hydration).
// See docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md (gap J).
if (typeof window !== "undefined") {
  useLeagueStore.subscribe((state, prev) => {
    const cur = state.currentLeagueId;
    const before = prev.currentLeagueId;
    if (!cur || !before || cur === before) return;
    useWarRoomStore.setState({ activeView: "dashboard" });
  });
}
