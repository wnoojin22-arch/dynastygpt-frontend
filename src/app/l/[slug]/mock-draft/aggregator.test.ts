import { describe, expect, test } from "vitest";
import { countDraftedAtPosition } from "./aggregator";

describe("countDraftedAtPosition", () => {
  test("WR pick does not leak into RB row even when chalk at that slot was RB", () => {
    const userPicks = { "1.12": "Zachariah Branch" };
    const consensus = [{ name: "Zachariah Branch", position: "WR" }];
    expect(countDraftedAtPosition(userPicks, consensus, "RB")).toEqual([]);
    expect(countDraftedAtPosition(userPicks, consensus, "WR")).toEqual(["Zachariah Branch"]);
  });

  test("groups multiple picks at the same position", () => {
    const userPicks = { "1.01": "Player A", "2.01": "Player B", "3.01": "Player C" };
    const consensus = [
      { name: "Player A", position: "WR" },
      { name: "Player B", position: "WR" },
      { name: "Player C", position: "RB" },
    ];
    expect(countDraftedAtPosition(userPicks, consensus, "WR")).toEqual(["Player A", "Player B"]);
    expect(countDraftedAtPosition(userPicks, consensus, "RB")).toEqual(["Player C"]);
    expect(countDraftedAtPosition(userPicks, consensus, "QB")).toEqual([]);
  });

  test("player missing from consensus board returns no position (no chalk fallback)", () => {
    const userPicks = { "1.01": "Ghost Player" };
    const consensus = [{ name: "Real Player", position: "RB" }];
    expect(countDraftedAtPosition(userPicks, consensus, "RB")).toEqual([]);
    expect(countDraftedAtPosition(userPicks, consensus, "WR")).toEqual([]);
  });

  test("empty inputs", () => {
    expect(countDraftedAtPosition({}, [], "WR")).toEqual([]);
  });
});
