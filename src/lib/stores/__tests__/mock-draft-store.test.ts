import { beforeEach, describe, expect, test } from "vitest";
import {
  useMockDraftStore,
  type PendingTrade,
  type TradePreviewResponse,
  type TradeSnapshot,
} from "../mock-draft-store";
import type { SimulateResponse } from "../../../app/l/[slug]/mock-draft/contracts";

// ─── Fixtures ────────────────────────────────────────────────────────────
function makeSim(overrides: Partial<SimulateResponse> = {}): SimulateResponse {
  return {
    league_id: "L",
    format: "SF",
    rounds: 4,
    num_teams: 12,
    te_premium: false,
    simulations_run: 500,
    sim_id: "sim-1",
    consensus_board: [],
    chalk: [
      { slot: "1.01", owner: "Alpha", window: "CONTENDER", prospect_name: "A1", prospect_position: "RB", prospect_tier: 1, prospect_boom_bust: "SAFE", board_position: 1 },
      { slot: "1.02", owner: "Bravo", window: "BALANCED",  prospect_name: "B1", prospect_position: "WR", prospect_tier: 1, prospect_boom_bust: "MODERATE", board_position: 2 },
      { slot: "1.03", owner: "Duke",  window: "CONTENDER", prospect_name: "D1", prospect_position: "QB", prospect_tier: 1, prospect_boom_bust: "SAFE", board_position: 3 },
    ],
    pick_probabilities: {},
    prospect_availability: {},
    user_pick_analysis: [],
    trade_flags: [],
    user_missed_opportunities: [],
    post_draft_positional_grades: {
      QB: { before: "WEAK",    after: "AVERAGE", delta: 1 },
      RB: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
      WR: { before: "STRONG",  after: "STRONG",  delta: 0 },
      TE: { before: "WEAK",    after: "WEAK",    delta: 0 },
    },
    ...overrides,
  } as SimulateResponse;
}

function makePreview(
  direction: "up" | "back",
  opts: {
    current: string;
    target: string;
    partner: string;
    picksGiven?: string[];
    picksReceived?: string[];
  },
): TradePreviewResponse {
  return {
    direction,
    current_slot: opts.current,
    target_slot: opts.target,
    suggested_cost: {
      picks_given: (opts.picksGiven ?? []).map((slot, i) => ({
        slot,
        round: parseInt(slot.split(".")[0] ?? "0", 10),
        value_sha: 10 - i,
      })),
      value_total: 0,
    },
    picks_received: (opts.picksReceived ?? []).map((slot, i) => ({
      slot,
      round: parseInt(slot.split(".")[0] ?? "0", 10),
      value_sha: 10 - i,
    })),
    value_gap_sha: 0,
    value_delta_pct: 0,
    fit_score_at_target: 70,
    likely_player_at_target: "P",
    acceptance_pct: 55,
    verdict: "FAIR",
    verdict_reason: "test",
    partner_owner: opts.partner,
  };
}

// ─── Reset store between tests ───────────────────────────────────────────
beforeEach(() => {
  useMockDraftStore.getState().resetDraft();
});

// ─── setSim ──────────────────────────────────────────────────────────────
describe("setSim", () => {
  test("resetCursor=false (default) preserves userPicks / lockedPicks / ownerOverrides", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    s.lockPick("1.02", "B1", "partner");
    // Seed an ownerOverride manually via commitTrade path
    s.registerTrade({
      direction: "up",
      target_slot: "1.02",
      user_owner: "Duke",
      preview: makePreview("up", { current: "1.12", target: "1.02", partner: "Bravo" }),
    });
    s.commitTrade();

    const sim = makeSim();
    useMockDraftStore.getState().setSim(sim);

    const after = useMockDraftStore.getState();
    expect(after.userPicks).toEqual({ "1.04": "Ty Simpson" });
    expect(after.lockedPicks).toEqual({ "1.02": "B1" });
    // The commit swapped 1.12 ↔ 1.02 ownership
    expect(after.ownerOverrides["1.02"]).toBe("Duke");
    expect(after.ownerOverrides["1.12"]).toBe("Bravo");
    expect(after.sim).toBe(sim);
    expect(after.simId).toBe("sim-1");
  });

  test("resetCursor=true wipes userPicks / lockedPicks / ownerOverrides and zeros the cursor", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    s.lockPick("1.02", "B1", "partner");
    s.advanceRevealedTo(2);

    const sim = makeSim();
    useMockDraftStore.getState().setSim(sim, { resetCursor: true });

    const after = useMockDraftStore.getState();
    expect(after.userPicks).toEqual({});
    expect(after.lockedPicks).toEqual({});
    expect(after.ownerOverrides).toEqual({});
    expect(after.revealedCount).toBe(0);
    expect(after.currentSlot).toBe("1.01");
    expect(after.sim).toBe(sim);
  });
});

// ─── lockPick / unlockPick ──────────────────────────────────────────────
describe("lockPick", () => {
  test("kind='user' writes to userPicks, NOT lockedPicks", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    const after = useMockDraftStore.getState();
    expect(after.userPicks).toEqual({ "1.04": "Ty Simpson" });
    expect(after.lockedPicks).toEqual({});
  });

  test("kind='partner' writes to lockedPicks, NOT userPicks", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.02", "B1", "partner");
    const after = useMockDraftStore.getState();
    expect(after.lockedPicks).toEqual({ "1.02": "B1" });
    expect(after.userPicks).toEqual({});
  });

  test("successive calls accumulate entries in the correct map", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    s.lockPick("2.04", "J Harper", "user");
    s.lockPick("1.01", "A1", "partner");
    const after = useMockDraftStore.getState();
    expect(after.userPicks).toEqual({ "1.04": "Ty Simpson", "2.04": "J Harper" });
    expect(after.lockedPicks).toEqual({ "1.01": "A1" });
  });
});

describe("unlockPick", () => {
  test("removes from both maps safely (works whether slot is in userPicks, lockedPicks, or neither)", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    s.lockPick("1.02", "B1", "partner");

    s.unlockPick("1.04");
    expect(useMockDraftStore.getState().userPicks).toEqual({});
    expect(useMockDraftStore.getState().lockedPicks).toEqual({ "1.02": "B1" });

    s.unlockPick("1.02");
    expect(useMockDraftStore.getState().lockedPicks).toEqual({});

    // No-op when slot is absent — should not throw or mutate
    s.unlockPick("9.99");
    expect(useMockDraftStore.getState().userPicks).toEqual({});
    expect(useMockDraftStore.getState().lockedPicks).toEqual({});
  });
});

// ─── commitTrade ─────────────────────────────────────────────────────────
describe("commitTrade", () => {
  test("direction='up' swaps target↔current AND layers in filler picks", () => {
    const s = useMockDraftStore.getState();
    const preview = makePreview("up", {
      current: "1.12",
      target: "1.02",
      partner: "Bravo",
      picksGiven: ["3.12"],    // user gives Bravo a 3rd
      picksReceived: ["4.02"], // user gets a 4th back
    });
    s.registerTrade({
      direction: "up",
      target_slot: "1.02",
      user_owner: "Duke",
      preview,
    });
    s.commitTrade();

    const after = useMockDraftStore.getState();
    expect(after.ownerOverrides).toEqual({
      "1.02": "Duke",   // user now owns the earlier slot
      "1.12": "Bravo",  // partner now owns the user's old slot
      "3.12": "Bravo",  // user gave 3rd to partner
      "4.02": "Duke",   // user received 4th from partner
    });
    expect(after.tradeModalOpen).toBe(false);
    expect(after.pendingTrade).toBeNull();
  });

  test("direction='back' swaps target↔current AND layers in filler picks", () => {
    const s = useMockDraftStore.getState();
    const preview = makePreview("back", {
      current: "1.02",
      target: "1.08",
      partner: "Echo",
      picksGiven: [],             // trading back — user gives only the early slot
      picksReceived: ["2.08", "3.08"], // receives later 1st + 2 picks
    });
    s.registerTrade({
      direction: "back",
      target_slot: "1.08",
      user_owner: "Duke",
      preview,
    });
    s.commitTrade();

    const after = useMockDraftStore.getState();
    expect(after.ownerOverrides).toEqual({
      "1.08": "Duke",   // user now owns the later slot
      "1.02": "Echo",   // partner now owns the user's old early slot
      "2.08": "Duke",   // received
      "3.08": "Duke",   // received
    });
    expect(after.tradeModalOpen).toBe(false);
    expect(after.pendingTrade).toBeNull();
  });

  test("commitTrade with no pendingTrade closes the modal and does NOT touch overrides", () => {
    const s = useMockDraftStore.getState();
    const snap = s.commitTrade();
    const after = useMockDraftStore.getState();
    expect(snap).toBeNull();
    expect(after.ownerOverrides).toEqual({});
    expect(after.tradeModalOpen).toBe(false);
  });

  test("commitTrade returns a snapshot of pre-commit ownerOverrides + lockedPicks", () => {
    const s = useMockDraftStore.getState();
    // Seed prior state — unrelated override + a partner lock.
    s.lockPick("1.07", "Stale B1", "partner");
    useMockDraftStore.setState({ ownerOverrides: { "5.01": "Foxtrot" } });

    s.registerTrade({
      direction: "up",
      target_slot: "1.02",
      user_owner: "Duke",
      preview: makePreview("up", { current: "1.12", target: "1.02", partner: "Bravo" }),
    });
    const snap = s.commitTrade();
    expect(snap).not.toBeNull();
    // Snapshot captures state BEFORE the trade mutations.
    expect(snap!.ownerOverrides).toEqual({ "5.01": "Foxtrot" });
    expect(snap!.lockedPicks).toEqual({ "1.07": "Stale B1" });
    // And the current state reflects the swap layered over prior overrides.
    const after = useMockDraftStore.getState();
    expect(after.ownerOverrides).toEqual({
      "5.01": "Foxtrot",
      "1.02": "Duke",
      "1.12": "Bravo",
    });
  });
});

// ─── revertTrade ─────────────────────────────────────────────────────────
describe("revertTrade", () => {
  test("restores ownerOverrides + lockedPicks from snapshot exactly", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.07", "Original B1", "partner");
    useMockDraftStore.setState({ ownerOverrides: { "5.01": "Foxtrot" } });

    s.registerTrade({
      direction: "up",
      target_slot: "1.02",
      user_owner: "Duke",
      preview: makePreview("up", {
        current: "1.12",
        target: "1.02",
        partner: "Bravo",
        picksGiven: ["3.12"],
        picksReceived: ["4.02"],
      }),
    });
    const snap = s.commitTrade();
    expect(snap).not.toBeNull();

    // After commit: 4 swap entries layered on top.
    expect(Object.keys(useMockDraftStore.getState().ownerOverrides).sort()).toEqual(
      ["1.02", "1.12", "3.12", "4.02", "5.01"].sort(),
    );

    // Revert and confirm exact pre-commit state.
    s.revertTrade(snap as TradeSnapshot);
    const reverted = useMockDraftStore.getState();
    expect(reverted.ownerOverrides).toEqual({ "5.01": "Foxtrot" });
    expect(reverted.lockedPicks).toEqual({ "1.07": "Original B1" });
  });

  test("revertTrade is idempotent — same snapshot applied twice leaves identical state", () => {
    const s = useMockDraftStore.getState();
    const snap: TradeSnapshot = {
      ownerOverrides: { "2.01": "Zulu" },
      lockedPicks: { "2.05": "Locked Guy" },
    };
    s.revertTrade(snap);
    const first = useMockDraftStore.getState();
    s.revertTrade(snap);
    const second = useMockDraftStore.getState();
    expect(second.ownerOverrides).toEqual(first.ownerOverrides);
    expect(second.lockedPicks).toEqual(first.lockedPicks);
  });
});

// ─── clearTrade ──────────────────────────────────────────────────────────
describe("clearTrade", () => {
  test("closes the modal + drops pendingTrade without mutating other state", () => {
    const s = useMockDraftStore.getState();
    s.lockPick("1.04", "Ty Simpson", "user");
    s.lockPick("1.02", "B1", "partner");
    s.registerTrade({
      direction: "up",
      target_slot: "1.02",
      user_owner: "Duke",
      preview: makePreview("up", {
        current: "1.12",
        target: "1.02",
        partner: "Bravo",
        picksGiven: ["3.12"],
      }),
    });
    expect(useMockDraftStore.getState().tradeModalOpen).toBe(true);
    expect(useMockDraftStore.getState().pendingTrade).not.toBeNull();

    s.clearTrade();

    const after = useMockDraftStore.getState();
    expect(after.tradeModalOpen).toBe(false);
    expect(after.pendingTrade).toBeNull();
    // Everything else untouched
    expect(after.userPicks).toEqual({ "1.04": "Ty Simpson" });
    expect(after.lockedPicks).toEqual({ "1.02": "B1" });
    expect(after.ownerOverrides).toEqual({});
  });
});

// ─── advanceRevealedTo + currentSlot derivation ─────────────────────────
describe("advanceRevealedTo", () => {
  test("writes revealedCount AND derives currentSlot from sim.chalk", () => {
    const s = useMockDraftStore.getState();
    s.setSim(makeSim());
    s.advanceRevealedTo(2);
    const after = useMockDraftStore.getState();
    expect(after.revealedCount).toBe(2);
    expect(after.currentSlot).toBe("1.03");
  });

  test("currentSlot is null when index is past the end of chalk", () => {
    const s = useMockDraftStore.getState();
    s.setSim(makeSim());
    s.advanceRevealedTo(99);
    expect(useMockDraftStore.getState().currentSlot).toBeNull();
  });
});
