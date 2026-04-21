import { describe, expect, test } from "vitest";
import {
  activeDrafters,
  threatsAheadOfUser,
  prospectsAtRisk,
} from "./warroom";
import type {
  AvailabilityEntry,
  ChalkPick,
  ConsensusBoardEntry,
  PickProbability,
} from "./contracts";

// ─── Fixtures ────────────────────────────────────────────────────────────
const CHALK: ChalkPick[] = [
  { slot: "1.01", owner: "Alpha", window: "CONTENDER", prospect_name: "A1", prospect_position: "RB", prospect_tier: 1, prospect_boom_bust: "SAFE", board_position: 1 },
  { slot: "1.02", owner: "Bravo", window: "BALANCED", prospect_name: "B1", prospect_position: "WR", prospect_tier: 1, prospect_boom_bust: "MODERATE", board_position: 2 },
  { slot: "1.03", owner: "Charlie", window: "REBUILDER", prospect_name: "C1", prospect_position: "WR", prospect_tier: 1, prospect_boom_bust: "MODERATE", board_position: 3 },
  { slot: "1.04", owner: "Duke", window: "BALANCED", prospect_name: "D1", prospect_position: "RB", prospect_tier: 2, prospect_boom_bust: "SAFE", board_position: 4 },
  { slot: "1.05", owner: "Alpha", window: "CONTENDER", prospect_name: "A2", prospect_position: "TE", prospect_tier: 2, prospect_boom_bust: "SAFE", board_position: 5 },
  { slot: "2.01", owner: "Alpha", window: "CONTENDER", prospect_name: "A3", prospect_position: "QB", prospect_tier: 2, prospect_boom_bust: "MODERATE", board_position: 13 },
  { slot: "2.02", owner: "Duke", window: "BALANCED", prospect_name: "D2", prospect_position: "WR", prospect_tier: 2, prospect_boom_bust: "MODERATE", board_position: 14 },
];
const NUM_TEAMS = 12;

// ─── activeDrafters ──────────────────────────────────────────────────────
describe("activeDrafters", () => {
  test("round1 window lists distinct non-user owners sorted by earliest pick", () => {
    const out = activeDrafters(CHALK, "Duke", NUM_TEAMS, { window: "round1" });
    expect(out.map((d) => d.owner)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(out[0]).toEqual({
      owner: "Alpha",
      owner_pick_count: 2, // 1.01 + 1.05
      earliest_slot: "1.01",
      earliest_pickNum: 1,
    });
  });

  test("before_user_first window stops at user's first pickNum - 1", () => {
    // Duke's first = 1.04 (pickNum 4). Boundary = 3. Alpha(1.01), Bravo(1.02), Charlie(1.03).
    const out = activeDrafters(CHALK, "Duke", NUM_TEAMS, { window: "before_user_first" });
    expect(out.map((d) => d.owner)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(out.find((d) => d.owner === "Alpha")?.owner_pick_count).toBe(1); // only 1.01, not 1.05
  });

  test("empty chalk returns []", () => {
    expect(activeDrafters([], "Duke", NUM_TEAMS)).toEqual([]);
  });

  test("case-insensitive owner match (user excluded even with different casing)", () => {
    const out = activeDrafters(CHALK, "duke", NUM_TEAMS, { window: "round1" });
    expect(out.every((d) => d.owner.toLowerCase() !== "duke")).toBe(true);
  });
});

// ─── threatsAheadOfUser ──────────────────────────────────────────────────
describe("threatsAheadOfUser", () => {
  const OWNER_META = [
    { owner: "Alpha", owner_user_id: "a1", draft_identity: "GAMBLER" as const, hit_rate: 58, round1_position_distribution: { QB: 3, WR: 1 } },
    { owner: "Bravo", owner_user_id: "b1", draft_identity: "DEVELOPER" as const, hit_rate: 62, round1_position_distribution: { WR: 4 } },
    { owner: "Charlie", owner_user_id: "c1", draft_identity: "BALANCED" as const, hit_rate: 48, round1_position_distribution: { RB: 2, WR: 2 } },
  ];

  test("returns picks in user's round with pickNum < user, sorted by pickNum asc", () => {
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
    });
    expect(out.map((t) => t.owner)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(out.map((t) => t.slot)).toEqual(["1.01", "1.02", "1.03"]);
  });

  test("top_position is the highest count from round1_position_distribution", () => {
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
    });
    expect(out.find((t) => t.owner === "Alpha")?.top_position).toBe("QB");
    expect(out.find((t) => t.owner === "Bravo")?.top_position).toBe("WR");
  });

  test("most_likely uses top pick_probability and falls back to chalk when missing", () => {
    const pickProbabilities: Record<string, PickProbability[]> = {
      "1.01": [
        { prospect: "A1", position: "RB", pct: 62 },
        { prospect: "X2", position: "WR", pct: 20 },
      ],
      // 1.02 absent — Bravo falls back to chalk @ 100
    };
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
      pickProbabilities,
    });
    const alpha = out.find((t) => t.owner === "Alpha");
    expect(alpha?.most_likely).toEqual({ prospect: "A1", position: "RB", pct: 62 });
    const bravo = out.find((t) => t.owner === "Bravo");
    expect(bravo?.most_likely).toEqual({ prospect: "B1", position: "WR", pct: 100 });
  });

  test("target_impact computes before/after for first user target with non-zero P(take)", () => {
    // Bravo at 1.02 has 35% chance of taking user's top target T1 (which is
    // 55% available at user's slot). So before = 55 + 35 = 90, after = 55.
    const pickProbabilities: Record<string, PickProbability[]> = {
      "1.02": [
        { prospect: "B1", position: "WR", pct: 45 },
        { prospect: "T1", position: "RB", pct: 35 },
      ],
    };
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
      pickProbabilities,
      userTargets: ["T1"],
      userTargetAvailability: { T1: 55 },
      userTargetPositions: { T1: "RB" },
    });
    const bravo = out.find((t) => t.owner === "Bravo");
    expect(bravo?.target_impact).toEqual({ prospect: "T1", position: "RB", before: 90, after: 55 });
    // Alpha at 1.01 has no P(take T1) in its probabilities → no target_impact.
    const alpha = out.find((t) => t.owner === "Alpha");
    expect(alpha?.target_impact).toBeUndefined();
  });

  // keep an availability-related var referenced so the unused type import
  // isn't treated as dead
  test("availability map still accepted without breaking sort order", () => {
    const availability: Record<string, AvailabilityEntry[]> = {
      B1: [{ slot: "1.02", pct_available: 80 }, { slot: "1.04", pct_available: 10 }],
    };
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
      availability,
    });
    expect(out.map((t) => t.slot)).toEqual(["1.01", "1.02", "1.03"]);
  });

  test("excludes picks in later rounds even if pickNum < userPickNum somehow", () => {
    // 2.01 has pickNum 13, user at 1.04 (pickNum 4) — filter out by pickNum >= userPickNum.
    // This also verifies the round-gate: same-round only.
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "1.04",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
    });
    expect(out.every((t) => t.slot.startsWith("1."))).toBe(true);
  });

  test("returns [] when user's first slot is malformed", () => {
    const out = threatsAheadOfUser({
      userOwner: "Duke",
      userFirstSlot: "R1",
      numTeams: NUM_TEAMS,
      chalk: CHALK,
      ownerMeta: OWNER_META,
    });
    expect(out).toEqual([]);
  });
});

// ─── prospectsAtRisk ─────────────────────────────────────────────────────
describe("prospectsAtRisk", () => {
  const BOARD: ConsensusBoardEntry[] = [
    { rank: 1, name: "P1", position: "RB", tier: 1, boom_bust: "SAFE", fp_rank: 1, ktc_rank: 1, fit_score: 90 },
    { rank: 2, name: "P2", position: "WR", tier: 1, boom_bust: "MODERATE", fp_rank: 2, ktc_rank: 2, fit_score: 72 },
    { rank: 3, name: "P3", position: "WR", tier: 2, boom_bust: "SAFE", fp_rank: 3, ktc_rank: 3, fit_score: 65 },
    { rank: 4, name: "P4", position: "TE", tier: 1, boom_bust: "SAFE", fp_rank: 4, ktc_rank: 4, fit_score: 80 },
    { rank: 5, name: "P5", position: "RB", tier: 2, boom_bust: "MODERATE", fp_rank: 5, ktc_rank: 5, fit_score: 60 },
  ];

  test("returns top-N prospects with pct_available below threshold, lowest first", () => {
    const avail: Record<string, AvailabilityEntry[]> = {
      P1: [{ slot: "1.07", pct_available: 0 }],
      P2: [{ slot: "1.07", pct_available: 10 }],
      P3: [{ slot: "1.07", pct_available: 65 }], // above threshold, excluded
      P4: [{ slot: "1.07", pct_available: 35 }],
    };
    const out = prospectsAtRisk({
      consensusBoard: BOARD,
      availability: avail,
      userFirstSlot: "1.07",
      threshold: 50,
    });
    expect(out.map((p) => p.name)).toEqual(["P1", "P2", "P4"]);
    expect(out[0].pct_available).toBe(0);
  });

  test("threshold is strict (>= threshold is excluded)", () => {
    const avail: Record<string, AvailabilityEntry[]> = {
      P1: [{ slot: "1.07", pct_available: 50 }], // exactly at threshold → excluded
      P2: [{ slot: "1.07", pct_available: 49 }], // just under → included
    };
    const out = prospectsAtRisk({
      consensusBoard: BOARD,
      availability: avail,
      userFirstSlot: "1.07",
      threshold: 50,
    });
    expect(out.map((p) => p.name)).toEqual(["P2"]);
  });

  test("skips prospects missing from availability map", () => {
    const avail: Record<string, AvailabilityEntry[]> = {
      P1: [{ slot: "1.07", pct_available: 20 }],
      // P2-P5 absent
    };
    const out = prospectsAtRisk({
      consensusBoard: BOARD,
      availability: avail,
      userFirstSlot: "1.07",
    });
    expect(out.map((p) => p.name)).toEqual(["P1"]);
  });

  test("topN clamps the consensus slice", () => {
    const avail: Record<string, AvailabilityEntry[]> = {
      P1: [{ slot: "1.07", pct_available: 10 }],
      P5: [{ slot: "1.07", pct_available: 5 }], // outside topN=3
    };
    const out = prospectsAtRisk({
      consensusBoard: BOARD,
      availability: avail,
      userFirstSlot: "1.07",
      topN: 3,
    });
    expect(out.map((p) => p.name)).toEqual(["P1"]);
  });
});
