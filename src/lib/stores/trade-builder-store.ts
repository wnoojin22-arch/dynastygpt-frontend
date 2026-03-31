import { create } from "zustand";

/**
 * Ephemeral intent store for cross-page navigation into the Trade Builder.
 * Written by DashboardView "Your Move" cards, consumed once by TradeBuilderView.
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
}

export const useTradeBuilderStore = create<TradeBuilderStore>()((set, get) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  consumeIntent: () => {
    const current = get().intent;
    set({ intent: null });
    return current;
  },
}));
