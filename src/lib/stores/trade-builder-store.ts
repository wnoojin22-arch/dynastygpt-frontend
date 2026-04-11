import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SuggestedPackage } from "@/components/league/trade-builder/types";

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
