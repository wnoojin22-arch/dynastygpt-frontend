import { describe, expect, test } from "vitest";
import {
  biggestSteal,
  letterGrade,
  mapScoreToLetter,
  pickNumFromSlot,
  valueVsSlot,
  VALUE_THRESHOLD,
} from "./helpers";
import type { ConsensusBoardEntry, PostDraftPositionalGrades } from "./contracts";

// ─── pickNumFromSlot ─────────────────────────────────────────────────────
describe("pickNumFromSlot", () => {
  test("1.12 with 12 teams = 12", () => {
    expect(pickNumFromSlot("1.12", 12)).toBe(12);
  });
  test("2.01 with 12 teams = 13", () => {
    expect(pickNumFromSlot("2.01", 12)).toBe(13);
  });
  test("4.08 with 10 teams = 38", () => {
    expect(pickNumFromSlot("4.08", 10)).toBe(38);
  });
  test("malformed slot returns NaN", () => {
    expect(Number.isNaN(pickNumFromSlot("R2", 12))).toBe(true);
  });
});

// ─── valueVsSlot ─────────────────────────────────────────────────────────
describe("valueVsSlot", () => {
  test("5+ below pickNum = STEAL (symmetric threshold)", () => {
    expect(valueVsSlot(5, 10)).toBe("STEAL");
    expect(valueVsSlot(1, 10)).toBe("STEAL");
  });
  test("within ±5 = FAIR", () => {
    expect(valueVsSlot(10, 10)).toBe("FAIR");
    expect(valueVsSlot(12, 10)).toBe("FAIR");
    expect(valueVsSlot(8, 10)).toBe("FAIR");
  });
  test("5+ above pickNum = REACH", () => {
    expect(valueVsSlot(15, 10)).toBe("REACH");
    expect(valueVsSlot(25, 10)).toBe("REACH");
  });
  test("threshold boundary is inclusive on STEAL/REACH sides", () => {
    expect(valueVsSlot(10 - VALUE_THRESHOLD, 10)).toBe("STEAL");
    expect(valueVsSlot(10 + VALUE_THRESHOLD, 10)).toBe("REACH");
  });
  test("undefined rank = FAIR", () => {
    expect(valueVsSlot(undefined, 10)).toBe("FAIR");
  });
});

// ─── biggestSteal ────────────────────────────────────────────────────────
describe("biggestSteal", () => {
  const cb: Array<Pick<ConsensusBoardEntry, "name" | "rank" | "position">> = [
    { name: "A", rank: 3, position: "WR" },
    { name: "B", rank: 15, position: "RB" },
    { name: "C", rank: 1, position: "WR" },
  ];

  test("picks the largest positive delta", () => {
    // Slot 1.12 = pick 12 (12 teams). A is rank 3 → delta = 9
    // Slot 2.01 = pick 13. B is rank 15 → delta = -2, not a steal
    // Slot 2.02 = pick 14. C is rank 1 → delta = 13, BIGGEST
    const picks = { "1.12": "A", "2.01": "B", "2.02": "C" };
    const result = biggestSteal(picks, cb, 12);
    expect(result?.name).toBe("C");
    expect(result?.delta).toBe(13);
  });

  test("returns null when no picks or no steals", () => {
    expect(biggestSteal({}, cb, 12)).toBeNull();
    expect(biggestSteal({ "1.01": "B" }, cb, 12)).toBeNull(); // B is reach
  });

  test("skips players not on consensus board", () => {
    const picks = { "1.12": "Ghost" };
    expect(biggestSteal(picks, cb, 12)).toBeNull();
  });
});

// ─── mapScoreToLetter ────────────────────────────────────────────────────
describe("mapScoreToLetter", () => {
  test("boundary scores map correctly", () => {
    expect(mapScoreToLetter(100)).toBe("A+");
    expect(mapScoreToLetter(95)).toBe("A+");
    expect(mapScoreToLetter(94)).toBe("A");
    expect(mapScoreToLetter(90)).toBe("A");
    expect(mapScoreToLetter(89)).toBe("A-");
    expect(mapScoreToLetter(85)).toBe("A-");
    expect(mapScoreToLetter(84)).toBe("B+");
    expect(mapScoreToLetter(75)).toBe("B");
    expect(mapScoreToLetter(70)).toBe("B-");
    expect(mapScoreToLetter(65)).toBe("C+");
    expect(mapScoreToLetter(60)).toBe("C");
    expect(mapScoreToLetter(55)).toBe("C-");
    expect(mapScoreToLetter(50)).toBe("D+");
    expect(mapScoreToLetter(30)).toBe("D");
    expect(mapScoreToLetter(0)).toBe("D");
  });
});

// ─── letterGrade ─────────────────────────────────────────────────────────
describe("letterGrade", () => {
  const noChangeGrades: PostDraftPositionalGrades = {
    QB: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
    RB: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
    WR: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
    TE: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
  };

  test("no picks, no grade deltas = base B-", () => {
    const result = letterGrade({
      userPicks: {},
      consensusBoard: [],
      postDraftGrades: noChangeGrades,
      numTeams: 12,
    });
    expect(result.score).toBe(70);
    expect(result.letter).toBe("B-");
    expect(result.breakdown).toEqual({ base: 70, value_vs_slot: 0, grade_delta_bonus: 0 });
  });

  test("all steals maxes the value bonus before grade bonus", () => {
    // 4 picks, each 10+ ranks below their slot → 4 × +5 = +20 → 90 → A
    const cb = [
      { name: "S1", rank: 1, position: "WR" as const },
      { name: "S2", rank: 2, position: "WR" as const },
      { name: "S3", rank: 3, position: "WR" as const },
      { name: "S4", rank: 4, position: "WR" as const },
    ];
    const picks = { "1.12": "S1", "2.12": "S2", "3.12": "S3", "4.12": "S4" };
    const result = letterGrade({
      userPicks: picks,
      consensusBoard: cb,
      postDraftGrades: noChangeGrades,
      numTeams: 12,
    });
    expect(result.breakdown.value_vs_slot).toBe(20);
    expect(result.score).toBe(90);
    expect(result.letter).toBe("A");
  });

  test("all reaches floors below B-", () => {
    const cb = [
      { name: "R1", rank: 40, position: "WR" as const },
      { name: "R2", rank: 50, position: "WR" as const },
    ];
    const picks = { "1.01": "R1", "1.02": "R2" };
    const result = letterGrade({
      userPicks: picks,
      consensusBoard: cb,
      postDraftGrades: noChangeGrades,
      numTeams: 12,
    });
    expect(result.breakdown.value_vs_slot).toBe(-10);
    expect(result.score).toBe(60);
    expect(result.letter).toBe("C");
  });

  test("critical fill (CRITICAL→STRONG at RB) adds +9", () => {
    const grades: PostDraftPositionalGrades = {
      ...noChangeGrades,
      RB: { before: "CRITICAL", after: "STRONG", delta: 3 },
    };
    const result = letterGrade({
      userPicks: {},
      consensusBoard: [],
      postDraftGrades: grades,
      numTeams: 12,
    });
    // 4 + 3 + 2 = +9 bonus
    expect(result.breakdown.grade_delta_bonus).toBe(9);
    expect(result.score).toBe(79);
    expect(result.letter).toBe("B");
  });

  test("regressions do not penalize", () => {
    const grades: PostDraftPositionalGrades = {
      ...noChangeGrades,
      RB: { before: "STRONG", after: "WEAK", delta: -2 },
    };
    const result = letterGrade({
      userPicks: {},
      consensusBoard: [],
      postDraftGrades: grades,
      numTeams: 12,
    });
    expect(result.breakdown.grade_delta_bonus).toBe(0);
    expect(result.score).toBe(70);
  });

  test("score is clamped to 100 ceiling (A+)", () => {
    // 8 steals × +5 = +40, plus massive grade bonus
    const cb = Array.from({ length: 8 }, (_, i) => ({
      name: `P${i}`,
      rank: 1,
      position: "WR" as const,
    }));
    const picks: Record<string, string> = {};
    for (let i = 0; i < 8; i++) picks[`${i + 1}.12`] = `P${i}`;
    const grades: PostDraftPositionalGrades = {
      QB: { before: "CRITICAL", after: "ELITE", delta: 4 },
      RB: { before: "CRITICAL", after: "ELITE", delta: 4 },
      WR: { before: "CRITICAL", after: "ELITE", delta: 4 },
      TE: { before: "CRITICAL", after: "ELITE", delta: 4 },
    };
    const result = letterGrade({
      userPicks: picks,
      consensusBoard: cb,
      postDraftGrades: grades,
      numTeams: 12,
    });
    expect(result.score).toBe(100);
    expect(result.letter).toBe("A+");
  });

  test("score is clamped to 30 floor (D) on extreme reaches", () => {
    // Rank 200 is >= every pickNum + 5 through round 10, so every pick = REACH.
    const cb = Array.from({ length: 10 }, (_, i) => ({
      name: `R${i}`,
      rank: 200,
      position: "WR" as const,
    }));
    const picks: Record<string, string> = {};
    for (let i = 0; i < 10; i++) picks[`${i + 1}.01`] = `R${i}`;
    const result = letterGrade({
      userPicks: picks,
      consensusBoard: cb,
      postDraftGrades: noChangeGrades,
      numTeams: 12,
    });
    // 10 reaches × -5 = -50 → 20 raw → floored to 30
    expect(result.score).toBe(30);
    expect(result.letter).toBe("D");
  });
});
