import { describe, expect, test } from "vitest";
import type { ChalkPick } from "../contracts";
import {
  picksAheadOfSlot,
  picksBehindSlot,
  targetSlotForBuyerCard,
} from "../trade-panel-rows";

// ─── Fixture: 12-team snake chalk, round 1 only ──────────────────────────
// Slots 1.01 → 1.12, user owns 1.06. Partners own everything else.
function makeChalk(): ChalkPick[] {
  const owners = [
    "Alpha", "Bravo", "Charlie", "Delta", "Echo",
    "USER",
    "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima",
  ];
  return owners.map((owner, i) => ({
    slot: `1.${String(i + 1).padStart(2, "0")}`,
    owner,
    window: "BALANCED",
    prospect_name: `P${i + 1}`,
    prospect_position: "RB",
    prospect_tier: 1,
    prospect_boom_bust: "MODERATE",
    board_position: i + 1,
  })) as ChalkPick[];
}

describe("picksAheadOfSlot", () => {
  test("returns only slots with pick num < current, nearest-first", () => {
    const rows = picksAheadOfSlot(makeChalk(), "1.06", 12, "USER");
    expect(rows.map((r) => r.slot)).toEqual([
      "1.05", "1.04", "1.03", "1.02", "1.01",
    ]);
  });

  test("excludes user's own slot", () => {
    const rows = picksAheadOfSlot(makeChalk(), "1.06", 12, "USER");
    expect(rows.find((r) => r.owner === "USER")).toBeUndefined();
  });

  test("returns empty when user holds 1.01 (nothing ahead)", () => {
    const chalk = makeChalk().map((c, i) =>
      i === 0 ? { ...c, owner: "USER" } : c,
    );
    expect(picksAheadOfSlot(chalk, "1.01", 12, "USER")).toEqual([]);
  });

  test("nearest-first ordering across round boundaries", () => {
    // Slots 1.10 (pick 10) and 2.01 (pick 13) — user at 2.03 (pick 15).
    // pick 13 (2.01) should come before pick 10 (1.10) — nearer to 15.
    const chalk = [
      { slot: "1.10", owner: "A", window: "BALANCED", prospect_name: "x",
        prospect_position: "RB", prospect_tier: 1, prospect_boom_bust: "SAFE",
        board_position: 10 },
      { slot: "2.01", owner: "B", window: "BALANCED", prospect_name: "y",
        prospect_position: "WR", prospect_tier: 1, prospect_boom_bust: "SAFE",
        board_position: 13 },
      { slot: "2.02", owner: "C", window: "BALANCED", prospect_name: "z",
        prospect_position: "QB", prospect_tier: 1, prospect_boom_bust: "SAFE",
        board_position: 14 },
    ] as ChalkPick[];
    const rows = picksAheadOfSlot(chalk, "2.03", 12, "USER");
    expect(rows.map((r) => r.slot)).toEqual(["2.02", "2.01", "1.10"]);
  });
});

describe("picksBehindSlot", () => {
  test("returns only slots with pick num > current, nearest-first", () => {
    const rows = picksBehindSlot(makeChalk(), "1.06", 12, "USER");
    expect(rows.map((r) => r.slot)).toEqual([
      "1.07", "1.08", "1.09", "1.10", "1.11", "1.12",
    ]);
  });

  test("excludes user's own slot", () => {
    const rows = picksBehindSlot(makeChalk(), "1.06", 12, "USER");
    expect(rows.find((r) => r.owner === "USER")).toBeUndefined();
  });

  test("returns empty when user holds 1.12 (nothing behind)", () => {
    const chalk = makeChalk().map((c) =>
      c.slot === "1.12" ? { ...c, owner: "USER" } : c,
    );
    // swap 1.06 back to a normal partner so USER only holds 1.12
    const withUserAt12 = chalk.map((c) =>
      c.slot === "1.06" ? { ...c, owner: "Foxtrot" } : c,
    );
    expect(picksBehindSlot(withUserAt12, "1.12", 12, "USER")).toEqual([]);
  });
});

describe("targetSlotForBuyerCard", () => {
  test("prefers nearest slot owned that lives behind current", () => {
    // Partner owns 1.03 + 2.10 + 3.05. User at 1.06. Nearest-behind = 2.10 (pick 22).
    const slots = ["1.03", "2.10", "3.05"];
    expect(targetSlotForBuyerCard(slots, "1.06", 12)).toBe("2.10");
  });

  test("falls back to first slot when nothing owned behind current", () => {
    // Partner owns only 1.01 + 1.02. User at 1.06. No slot behind → first-owned.
    expect(targetSlotForBuyerCard(["1.01", "1.02"], "1.06", 12)).toBe("1.01");
  });

  test("returns null on empty slots_owned", () => {
    expect(targetSlotForBuyerCard([], "1.06", 12)).toBeNull();
  });
});
