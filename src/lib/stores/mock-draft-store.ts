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
