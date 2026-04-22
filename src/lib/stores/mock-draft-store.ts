import { create } from "zustand";
import type {
  PostDraftPositionalGrades,
  SimulateResponse,
} from "@/app/l/[slug]/mock-draft/contracts";

/**
 * Mock draft store — single source of truth for the interactive draft flow.
 *
 * State preserved across post-trade re-sims: userPicks, lockedPicks,
 * ownerOverrides. setSim re-derives revealedCount + currentSlot from the new
 * chalk but never wipes those maps unless { resetCursor: true } is passed.
 *
 * Selectors (hooks at bottom of file) expose derived values without
 * duplicating them in state — e.g. positionalGradeDeltas is just a read of
 * sim.post_draft_positional_grades.
 */

// ─── Map aliases ──────────────────────────────────────────────────────────
export type SlotProspectMap = Record<string, string>; // slot → prospect name
export type SlotOwnerMap = Record<string, string>;    // slot → owner name

// ─── Trade preview response (shape returned by /trade-up-preview and
//     /trade-back-preview). Partial to stay null-graceful while Phase 2A
//     fields evolve on the backend. ──
export interface TradePreviewResponse {
  direction: "up" | "back";
  current_slot: string;
  target_slot: string;
  suggested_cost: {
    picks_given: Array<{ slot: string; round: number; value_sha: number }>;
    value_total: number;
  };
  picks_received: Array<{ slot: string; round: number; value_sha: number }>;
  value_gap_sha: number;
  value_delta_pct: number;
  fit_score_at_target: number;
  likely_player_at_target: string | null;
  acceptance_pct: number;
  verdict: string;
  verdict_reason: string;
  partner_owner: string;
}

export interface PendingTrade {
  direction: "up" | "back";
  target_slot: string;
  user_owner: string;              // the store is owner-agnostic; the caller
                                   // pins who "user" is when registering
  preview: TradePreviewResponse;
}

// ─── Explore-flow types (mock-draft-lite /trade-explore + /commit-trade) ──
export type WillingnessBand = "HIGH" | "MEDIUM" | "LOW" | "UNLIKELY";
export type VerdictLabel = "GREAT" | "FAIR" | "BAD" | "NOT REALISTIC";

export interface WillingnessFactor {
  score: number;
  max: number;
  detail: string;
}

export interface WillingnessResult {
  score: number;
  band: WillingnessBand;
  factors: {
    activity: WillingnessFactor;
    window_alignment: WillingnessFactor;
    panic_signal: WillingnessFactor;
    h2h_history: WillingnessFactor;
  };
  blocker: string | null;
}

export interface TradeVerdict {
  label: VerdictLabel;
  color: string;
  headline: string;
  why_lines: string[];
  confirm_enabled: boolean;
}

export interface TradePackagePick {
  slot: string;
  round: number;
  value_sha: number;
}

export interface FuturePick {
  year: number;
  round: number;
  value_sha: number;
  slot?: string;
}

export interface TradePackage {
  kind: string;
  picks_given: TradePackagePick[];
  picks_received: TradePackagePick[];
  future_picks_given: FuturePick[];
  future_picks_received: FuturePick[];
  player_given: string | null;
  value_given: number;
  value_received: number;
  value_delta_pct: number;
  asset_count: number;
  verdict?: TradeVerdict;
  fit_score_at_target?: number;
}

export interface TradeExploreResponse {
  sim_id: string;
  direction: "up" | "back";
  current_slot: string;
  target_slot: string;
  partner_owner: string;
  willingness: WillingnessResult;
  likely_player_at_target: string | null;
  fit_score_at_target: number;
  packages: TradePackage[];
}

export interface CommittedTradeEntry {
  committed_at: string;
  direction: "up" | "back";
  user_owner: string;
  partner_owner: string;
  package: TradePackage;
}

export interface CommitTradeResponse {
  success: boolean;
  trade_log_entry: CommittedTradeEntry;
  pick_ownership_overrides: Record<string, string>;
  trade_log_count: number;
}

export interface LikelyBuyer {
  partner_owner: string;
  willingness: WillingnessResult;
  window: string;
  slots_owned: string[];
}

export interface LikelyBuyersResponse {
  user_owner: string;
  slot: string;
  direction: "up" | "back";
  buyers: LikelyBuyer[];
}

/**
 * Snapshot of pre-trade state — returned by commitTrade so the caller can
 * roll back if the downstream /simulate-from-state call fails. Only the
 * maps commitTrade touches are snapshotted; sim + revealedCount are not
 * mutated by commitTrade, so they need no capture.
 */
export interface TradeSnapshot {
  ownerOverrides: SlotOwnerMap;
  lockedPicks: SlotProspectMap;
}

/**
 * Snapshot for the explore-flow commit. Captures everything the commit-trade
 * response mutates so a failed re-sim can roll the store back cleanly.
 */
export interface ExploreTradeSnapshot {
  ownerOverrides: SlotOwnerMap;
  lockedPicks: SlotProspectMap;
  tradesCommitted: CommittedTradeEntry[];
  futurePicksGiven: FuturePick[];
  futurePicksReceived: FuturePick[];
}

// ─── State + actions ──────────────────────────────────────────────────────
interface MockDraftState {
  sim: SimulateResponse | null;
  simId: string | null;

  userPicks: SlotProspectMap;
  lockedPicks: SlotProspectMap;
  ownerOverrides: SlotOwnerMap;

  revealedCount: number;
  currentSlot: string | null;

  tradeModalOpen: boolean;
  pendingTrade: PendingTrade | null;

  // Explore flow — history ledger + Tier A future-pick tracking. These are
  // additive to the existing commit path; the old tradeModal still drives
  // ownerOverrides directly. Committed entries are appended here so the UI
  // can render a trade log and so revert can pop the last one on failure.
  tradesCommitted: CommittedTradeEntry[];
  futurePicksGiven: FuturePick[];
  futurePicksReceived: FuturePick[];
}

interface MockDraftActions {
  setSim: (sim: SimulateResponse, opts?: { resetCursor?: boolean }) => void;
  resetDraft: () => void;

  lockPick: (slot: string, prospectName: string, kind: "user" | "partner") => void;
  unlockPick: (slot: string) => void;

  registerTrade: (trade: PendingTrade) => void;
  commitTrade: () => TradeSnapshot | null;
  revertTrade: (snapshot: TradeSnapshot) => void;
  clearTrade: () => void;

  // Explore-flow commit. applyCommitTradeResponse merges the server response
  // (authoritative pick_ownership_overrides map + trade_log_entry) into the
  // store and returns a snapshot the caller can feed to revertCommitTrade if
  // the follow-up /simulate-from-state fails.
  applyCommitTradeResponse: (resp: CommitTradeResponse) => ExploreTradeSnapshot;
  revertCommitTrade: (snapshot: ExploreTradeSnapshot) => void;

  advanceRevealedTo: (index: number) => void;
  updateCurrentSlot: () => void;
}

export type MockDraftStore = MockDraftState & MockDraftActions;

const INITIAL_STATE: MockDraftState = {
  sim: null,
  simId: null,
  userPicks: {},
  lockedPicks: {},
  ownerOverrides: {},
  revealedCount: 0,
  currentSlot: null,
  tradeModalOpen: false,
  pendingTrade: null,
  tradesCommitted: [],
  futurePicksGiven: [],
  futurePicksReceived: [],
};

function slotAtIndex(sim: SimulateResponse | null, idx: number): string | null {
  const chalk = sim?.chalk ?? [];
  if (idx < 0 || idx >= chalk.length) return null;
  return chalk[idx]?.slot ?? null;
}

export const useMockDraftStore = create<MockDraftStore>((set, get) => ({
  ...INITIAL_STATE,

  setSim: (sim, opts) => {
    const resetCursor = opts?.resetCursor ?? false;
    if (resetCursor) {
      set({
        ...INITIAL_STATE,
        sim,
        simId: sim.sim_id ?? null,
        currentSlot: slotAtIndex(sim, 0),
      });
      return;
    }
    set((s) => ({
      sim,
      simId: sim.sim_id ?? s.simId,
      // Cursor is always re-derived from the fresh chalk. The caller is
      // responsible for feeding in a revealedCount that points at the user's
      // next unmade pick (via fastForwardIdx on the NEW chalk) — we keep the
      // existing one here and let advanceRevealedTo bring it to the right
      // index after the sim lands.
      currentSlot: slotAtIndex(sim, s.revealedCount),
    }));
  },

  resetDraft: () => set({ ...INITIAL_STATE }),

  lockPick: (slot, prospectName, kind) => {
    set((s) => {
      if (kind === "user") {
        return { userPicks: { ...s.userPicks, [slot]: prospectName } };
      }
      return { lockedPicks: { ...s.lockedPicks, [slot]: prospectName } };
    });
  },

  unlockPick: (slot) => {
    set((s) => {
      const nextUser = { ...s.userPicks };
      const nextLocked = { ...s.lockedPicks };
      delete nextUser[slot];
      delete nextLocked[slot];
      return { userPicks: nextUser, lockedPicks: nextLocked };
    });
  },

  registerTrade: (trade) => set({ tradeModalOpen: true, pendingTrade: trade }),

  commitTrade: () => {
    const pt = get().pendingTrade;
    if (!pt) {
      set({ tradeModalOpen: false });
      return null;
    }
    // Snapshot the pre-commit state so the caller can revert if the
    // downstream /simulate-from-state call fails.
    const snapshot: TradeSnapshot = {
      ownerOverrides: { ...get().ownerOverrides },
      lockedPicks: { ...get().lockedPicks },
    };

    const { target_slot, user_owner, preview } = pt;
    const partner = preview.partner_owner;
    const currentSlotOfUser = preview.current_slot;
    const picksGiven = preview.suggested_cost?.picks_given ?? [];
    const picksReceived = preview.picks_received ?? [];

    const next: SlotOwnerMap = { ...snapshot.ownerOverrides };
    // Primary swap: user ends up owning target_slot, partner owns the slot
    // the user moved off of.
    next[target_slot] = user_owner;
    next[currentSlotOfUser] = partner;
    // Filler swaps (later-round picks changing hands).
    for (const p of picksGiven) next[p.slot] = partner;
    for (const p of picksReceived) next[p.slot] = user_owner;

    set({
      ownerOverrides: next,
      tradeModalOpen: false,
      pendingTrade: null,
    });
    return snapshot;
  },

  revertTrade: (snapshot) => {
    set({
      ownerOverrides: { ...snapshot.ownerOverrides },
      lockedPicks: { ...snapshot.lockedPicks },
    });
  },

  clearTrade: () => set({ tradeModalOpen: false, pendingTrade: null }),

  applyCommitTradeResponse: (resp) => {
    const snapshot: ExploreTradeSnapshot = {
      ownerOverrides: { ...get().ownerOverrides },
      lockedPicks: { ...get().lockedPicks },
      tradesCommitted: [...get().tradesCommitted],
      futurePicksGiven: [...get().futurePicksGiven],
      futurePicksReceived: [...get().futurePicksReceived],
    };

    const entry = resp.trade_log_entry;
    const pkg = entry.package ?? ({} as TradePackage);

    set((s) => ({
      // Server returns the authoritative slot→owner map — replace wholesale
      // so we don't leak stale entries from prior commits.
      ownerOverrides: { ...resp.pick_ownership_overrides },
      tradesCommitted: [...s.tradesCommitted, entry],
      futurePicksGiven: [...s.futurePicksGiven, ...(pkg.future_picks_given ?? [])],
      futurePicksReceived: [...s.futurePicksReceived, ...(pkg.future_picks_received ?? [])],
      tradeModalOpen: false,
      pendingTrade: null,
    }));

    return snapshot;
  },

  revertCommitTrade: (snapshot) => {
    set({
      ownerOverrides: { ...snapshot.ownerOverrides },
      lockedPicks: { ...snapshot.lockedPicks },
      tradesCommitted: [...snapshot.tradesCommitted],
      futurePicksGiven: [...snapshot.futurePicksGiven],
      futurePicksReceived: [...snapshot.futurePicksReceived],
    });
  },

  advanceRevealedTo: (index) =>
    set((s) => ({
      revealedCount: index,
      currentSlot: slotAtIndex(s.sim, index),
    })),

  updateCurrentSlot: () =>
    set((s) => ({ currentSlot: slotAtIndex(s.sim, s.revealedCount) })),
}));

// ─── Selector hooks ───────────────────────────────────────────────────────

/**
 * Grade deltas are read straight from the active sim's
 * post_draft_positional_grades. Returns null when the sim hasn't populated
 * them yet (e.g. before any user pick has been locked).
 */
export function useMockDraftPositionalGradeDeltas(): PostDraftPositionalGrades | null {
  return useMockDraftStore((s) => s.sim?.post_draft_positional_grades ?? null);
}
