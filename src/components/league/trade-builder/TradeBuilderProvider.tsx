"use client";

/**
 * TradeBuilderProvider — Context + useReducer wrapping useTradeBuilder hook.
 *
 * All API logic stays in useTradeBuilder (proven, 550 lines).
 * This layer adds UI state (view mode, overlays, tabs, filters)
 * and derived values (totals, balance, suggest context).
 */
import React, { createContext, useContext, useReducer, useMemo, useCallback } from "react";
import { useTradeBuilder, useTradePreview, type UseTradeBuilderReturn } from "@/hooks/useTradeBuilder";
import type { SuggestedPackage } from "./types";

// ── UI State (reducer-managed) ───────────────────────────────────────────

type ViewMode = "entry" | "builder" | "swipe" | "analyze";
type RosterTab = "yours" | "theirs";
type PosFilter = "ALL" | "QB" | "RB" | "WR" | "TE" | "PICK";

interface UIState {
  viewMode: ViewMode;
  showSwipeOverlay: boolean;
  showAnalyzeModal: boolean;
  activeRosterTab: RosterTab;
  posFilter: PosFilter;
}

type UIAction =
  | { type: "SET_VIEW"; mode: ViewMode }
  | { type: "TOGGLE_SWIPE"; open: boolean }
  | { type: "TOGGLE_ANALYZE"; open: boolean }
  | { type: "SET_ROSTER_TAB"; tab: RosterTab }
  | { type: "SET_POS_FILTER"; filter: PosFilter }
  | { type: "ENTER_BUILDER" }
  | { type: "RESET" };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, viewMode: action.mode };
    case "TOGGLE_SWIPE":
      return { ...state, showSwipeOverlay: action.open };
    case "TOGGLE_ANALYZE":
      return { ...state, showAnalyzeModal: action.open };
    case "SET_ROSTER_TAB":
      return { ...state, activeRosterTab: action.tab };
    case "SET_POS_FILTER":
      return { ...state, posFilter: action.filter };
    case "ENTER_BUILDER":
      return { ...state, viewMode: "builder", showSwipeOverlay: false };
    case "RESET":
      return initialUIState;
    default:
      return state;
  }
}

const initialUIState: UIState = {
  viewMode: "entry",
  showSwipeOverlay: false,
  showAnalyzeModal: false,
  activeRosterTab: "yours",
  posFilter: "ALL",
};

// ── Suggest Context (auto-detected "no modes" magic) ─────────────────────

type SuggestContext =
  | "coach"       // no partner, no players
  | "partner"     // partner selected, no players
  | "sell"        // your player selected
  | "acquire"     // their player selected
  | "improve";    // partial trade built

function detectSuggestContext(
  partner: string,
  giveNames: string[],
  receiveNames: string[],
): SuggestContext {
  if (giveNames.length > 0 && receiveNames.length > 0) return "improve";
  if (receiveNames.length > 0) return "acquire";
  if (giveNames.length > 0) return "sell";
  if (partner) return "partner";
  return "coach";
}

// ── Context shape ────────────────────────────────────────────────────────

interface TradeBuilderContextValue {
  // From useTradeBuilder hook (all fields)
  tb: UseTradeBuilderReturn;

  // UI state
  ui: UIState;
  dispatch: React.Dispatch<UIAction>;

  // Derived — all four totals are BE-authoritative and NULL while /evaluate
  // is in-flight or before the first response. Downstream must render "—"
  // (never fall back to client math — that IS the bug class this fix killed).
  sendTotal: number | null;
  getTotal: number | null;
  balance: number | null;
  balancePct: number | null;
  totalsLoading: boolean;
  canAnalyze: boolean;
  suggestContext: SuggestContext;

  // Actions that bridge UI + hook
  loadPackage: (pkg: SuggestedPackage) => void;
  openAnalyze: () => void;
  closeAnalyze: () => void;
  selectPartner: (name: string) => void;
}

const TradeBuilderContext = createContext<TradeBuilderContextValue | null>(null);

export function useTradeBuilderContext() {
  const ctx = useContext(TradeBuilderContext);
  if (!ctx) throw new Error("useTradeBuilderContext must be used within TradeBuilderProvider");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────

export default function TradeBuilderProvider({
  leagueId,
  owner,
  ownerId,
  children,
}: {
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  children: React.ReactNode;
}) {
  const tb = useTradeBuilder({ leagueId, owner, ownerId });
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);

  // BE-authoritative preview — same /evaluate the AnalysisModal fires.
  // Debounced 300ms in the hook. Returns null totals while in-flight so
  // no stale/wrong value ever renders. See useTradePreview docblock for
  // the Aug 3 chip-bug case study this fix closes.
  const preview = useTradePreview({
    leagueId,
    owner,
    ownerId,
    partner: tb.partner,
    giveNames: tb.giveNames,
    receiveNames: tb.receiveNames,
    mode: tb.mode,
    myWindow: tb.myWindow,
    theirWindow: tb.theirWindow,
  });

  // Null-safe derived values. Downstream renders "—" when either total
  // is null; DO NOT reintroduce a client-side sum fallback here.
  const sendTotal = preview.giveTotal;
  const getTotal = preview.getTotal;
  const balance = sendTotal != null && getTotal != null ? getTotal - sendTotal : null;
  const balancePct = sendTotal != null && getTotal != null && sendTotal > 0
    ? Math.round(((getTotal - sendTotal) / sendTotal) * 100)
    : null;
  const totalsLoading = preview.loading;
  const canAnalyze = !!tb.partner && tb.giveNames.length > 0 && tb.receiveNames.length > 0 && !tb.analyzing;
  const suggestContext = useMemo(
    () => detectSuggestContext(tb.partner, tb.giveNames, tb.receiveNames),
    [tb.partner, tb.giveNames, tb.receiveNames],
  );

  // Bridge actions
  const loadPackage = useCallback(
    (pkg: SuggestedPackage) => {
      tb.buildPackage(pkg);
      dispatch({ type: "ENTER_BUILDER" });
    },
    [tb],
  );

  const openAnalyze = useCallback(() => {
    dispatch({ type: "TOGGLE_ANALYZE", open: true });
  }, []);

  const closeAnalyze = useCallback(() => {
    dispatch({ type: "TOGGLE_ANALYZE", open: false });
  }, []);

  const selectPartner = useCallback(
    (name: string) => {
      tb.setPartner(name);
      dispatch({ type: "ENTER_BUILDER" });
    },
    [tb],
  );

  const value = useMemo<TradeBuilderContextValue>(
    () => ({
      tb,
      ui,
      dispatch,
      sendTotal,
      getTotal,
      balance,
      balancePct,
      totalsLoading,
      canAnalyze,
      suggestContext,
      loadPackage,
      openAnalyze,
      closeAnalyze,
      selectPartner,
    }),
    [tb, ui, sendTotal, getTotal, balance, balancePct, totalsLoading, canAnalyze, suggestContext, loadPackage, openAnalyze, closeAnalyze, selectPartner],
  );

  return (
    <TradeBuilderContext.Provider value={value}>
      {children}
    </TradeBuilderContext.Provider>
  );
}
