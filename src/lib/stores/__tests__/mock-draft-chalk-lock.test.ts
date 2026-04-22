import { describe, expect, test } from "vitest";
import { buildChalkLockedPicks } from "../mock-draft-chalk-lock";

// Minimal chalk pick builder — only the fields the helper reads.
const ck = (slot: string, owner: string, prospect_name: string) =>
  ({ slot, owner, prospect_name });

const CHALK_1_12 = [
  ck("1.01", "Tyler", "Jeremiyah Love"),
  ck("1.02", "Steve", "Makai Lemon"),
  ck("1.03", "Marcus", "Carnell Tate"),
  ck("1.04", "Evan", "Fernando Mendoza"),
  ck("1.05", "Ryan", "Jordyn Tyson"),
  ck("1.06", "Chris", "K.C. Concepcion"),
  ck("1.07", "Phil", "Kenyon Sadiq"),
  ck("1.08", "Dave", "Omar Cooper Jr."),
  ck("1.09", "Nick", "Denzel Boston"),
  ck("1.10", "Mike", "Jadarian Price"),
  ck("1.11", "John", "Ty Simpson"),
  ck("1.12", "Duke Nukem", "Eli Stowers"),
];

describe("buildChalkLockedPicks", () => {
  test("trade-up 1.12 → 1.06: locks chalk picks 1.01 through 1.05", () => {
    // Post-trade: user now owns 1.06, old slot 1.12 belongs to partner.
    const overrides = { "1.06": "Duke Nukem", "1.12": "Chris" };
    const locks = buildChalkLockedPicks(CHALK_1_12, overrides, {}, "Duke Nukem");
    expect(Object.keys(locks).sort()).toEqual(["1.01", "1.02", "1.03", "1.04", "1.05"]);
    expect(locks["1.04"]).toBe("Fernando Mendoza");
    expect(locks["1.01"]).toBe("Jeremiyah Love");
    expect(locks["1.06"]).toBeUndefined();
  });

  test("trade-back 1.12 → 2.03: locks everything up to 2.03, including old 1.12", () => {
    const chalk = [
      ...CHALK_1_12,
      ck("2.01", "Chris", "Eli Stowers"),
      ck("2.02", "Phil", "Jonah Coleman"),
      ck("2.03", "Duke Nukem", "Mike Washington Jr."),
    ];
    // Trade-back: user moves off 1.12 (partner takes it) and onto 2.03.
    const overrides = { "1.12": "Chris", "2.03": "Duke Nukem" };
    const locks = buildChalkLockedPicks(chalk, overrides, {}, "Duke Nukem");
    expect(Object.keys(locks)).toHaveLength(14);
    expect(locks["1.12"]).toBe("Eli Stowers");
    expect(locks["2.02"]).toBe("Jonah Coleman");
    expect(locks["2.03"]).toBeUndefined();
  });

  test("user at 1.01 (new slot is index 0) returns empty lock map", () => {
    const chalk = [ck("1.01", "Duke Nukem", "Jeremiyah Love"), ck("1.02", "Steve", "Makai Lemon")];
    const locks = buildChalkLockedPicks(chalk, {}, {}, "Duke Nukem");
    expect(locks).toEqual({});
  });

  test("user not found in chalk/overrides returns empty lock map", () => {
    const locks = buildChalkLockedPicks(CHALK_1_12, {}, {}, "Unknown Owner");
    expect(locks).toEqual({});
  });

  test("user's first slot already picked — skips it and finds next unmade pick", () => {
    // Extended chalk where Duke owns both 1.12 and 2.05.
    const chalk = [
      ...CHALK_1_12,
      ck("2.01", "John", "Jonah Coleman"),
      ck("2.02", "Mike", "Mike Washington Jr."),
      ck("2.03", "Nick", "Chris Brazzell II"),
      ck("2.04", "Dave", "Elijah Sarratt"),
      ck("2.05", "Duke Nukem", "Drew Allar"),
    ];
    // userPicks already has 1.12 — the user picked there before the trade.
    const userPicks = { "1.12": "Ty Simpson" };
    const locks = buildChalkLockedPicks(chalk, {}, userPicks, "Duke Nukem");
    // New slot = 2.05 (index 16). Lock chalk 0..15 = 1.01 through 2.04.
    expect(Object.keys(locks)).toHaveLength(16);
    expect(locks["1.12"]).toBe("Eli Stowers");
    expect(locks["2.04"]).toBe("Elijah Sarratt");
    expect(locks["2.05"]).toBeUndefined();
  });

  test("owner matching is case-insensitive and trims whitespace", () => {
    const overrides = { "1.06": "duke nukem" };
    const locks = buildChalkLockedPicks(CHALK_1_12, overrides, {}, "  DUKE NUKEM  ");
    expect(Object.keys(locks)).toHaveLength(5);
    expect(locks["1.05"]).toBe("Jordyn Tyson");
  });

  test("empty chalk returns empty lock map", () => {
    expect(buildChalkLockedPicks([], {}, {}, "Duke Nukem")).toEqual({});
  });

  test("prospect_name is preserved verbatim (no transformation)", () => {
    const chalk = [
      ck("1.01", "Steve", "Marvin Harrison Jr."),
      ck("1.02", "Duke Nukem", "placeholder"),
    ];
    const locks = buildChalkLockedPicks(chalk, {}, {}, "Duke Nukem");
    expect(locks["1.01"]).toBe("Marvin Harrison Jr.");
  });
});
