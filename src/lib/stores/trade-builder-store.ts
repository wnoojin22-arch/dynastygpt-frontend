import { create } from "zustand";
import type { SuggestedPackage } from "@/components/league/trade-builder/types";

/**
 * Ephemeral intent store for cross-page navigation into the Trade Builder.
 * Written by DashboardView "Your Move" cards, consumed once by TradeBuilderView.
 *
 * Also holds the trade queue (shopping cart) — persists across swipe sessions
 * until the user clears it or refreshes the page.
 */
interface TradeBuilderIntent {
  type: "sell" | "buy" | "position";
  /** Player name (sell/buy) or position code like "QB" (position) */
  value: string;
}

interface TradeBuilderStore {
  intent: TradeBuilderIntent | null;
  setIntent: (intent: TradeBuilderIntent) => void;
  consumeIntent: () => TradeBuilderIntent | null;

  // Trade queue (shopping cart)
  queuedTrades: SuggestedPackage[];
  addToQueue: (pkg: SuggestedPackage) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

export const useTradeBuilderStore = create<TradeBuilderStore>()((set, get) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  consumeIntent: () => {
    const current = get().intent;
    set({ intent: null });
    return current;
  },

  // Trade queue
  queuedTrades: [],
  addToQueue: (pkg) => set((s) => ({ queuedTrades: [...s.queuedTrades, pkg] })),
  removeFromQueue: (index) =>
    set((s) => ({ queuedTrades: s.queuedTrades.filter((_, i) => i !== index) })),
  clearQueue: () => set({ queuedTrades: [] }),
}));
