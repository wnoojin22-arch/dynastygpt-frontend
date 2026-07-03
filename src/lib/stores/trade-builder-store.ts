import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SuggestedPackage } from "@/components/league/trade-builder/types";
import { useLeagueStore } from "./league-store";

/**
 * Trade Builder store.
 *
 * intent: ephemeral cross-page navigation (DashboardView → TradeBuilder).
 * queuedTrades: shopping cart — persisted to localStorage so saved trades
 *   survive page reloads and return visits.
 */
interface TradeBuilderIntent {
  type: "sell" | "buy" | "position";
  value: string;
}

interface TradeBuilderStore {
  intent: TradeBuilderIntent | null;
  setIntent: (intent: TradeBuilderIntent) => void;
  consumeIntent: () => TradeBuilderIntent | null;

  queuedTrades: SuggestedPackage[];
  addToQueue: (pkg: SuggestedPackage) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

export const useTradeBuilderStore = create<TradeBuilderStore>()(
  persist(
    (set, get) => ({
      intent: null,
      setIntent: (intent) => set({ intent }),
      consumeIntent: () => {
        const current = get().intent;
        set({ intent: null });
        return current;
      },

      queuedTrades: [],
      addToQueue: (pkg) => set((s) => ({ queuedTrades: [...s.queuedTrades, pkg] })),
      removeFromQueue: (index) =>
        set((s) => ({ queuedTrades: s.queuedTrades.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queuedTrades: [] }),
    }),
    {
      name: "dg-trade-queue",
      partialize: (state) => ({ queuedTrades: state.queuedTrades }),
    },
  ),
);

// ── Reset on league switch ────────────────────────────────────────────────
// A trade-cart pinned to League A is meaningless in League B — the packages
// reference League A's owners, players, and value math. Clear both the
// in-memory intent AND the persisted queuedTrades on a genuine league change
// (persist middleware auto-writes [] to localStorage, effectively wiping
// the dg-trade-queue entry).
// Guard: skips initial null → first-league hydration so a queue restored
// from localStorage survives the app's first mount.
// See docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md (gap J).
if (typeof window !== "undefined") {
  useLeagueStore.subscribe((state, prev) => {
    const cur = state.currentLeagueId;
    const before = prev.currentLeagueId;
    if (!cur || !before || cur === before) return;
    useTradeBuilderStore.setState({ intent: null, queuedTrades: [] });
  });
}
