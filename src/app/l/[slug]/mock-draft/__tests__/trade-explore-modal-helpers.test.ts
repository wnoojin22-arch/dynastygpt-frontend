import { describe, expect, test } from "vitest";
import type {
  FuturePick,
  TradePackage,
  TradePackagePick,
} from "@/lib/stores/mock-draft-store";
import type { ConsensusBoardEntry } from "../contracts";
import {
  clampTabIndex,
  formatDeltaLabel,
  formatFuturePickLabel,
  formatPickLabel,
  formatValue,
  getDeltaTone,
  getVerdictStyle,
  isConfirmEnabled,
  lookupPlayerPosition,
  tabLabels,
  thinPoolMessage,
} from "../trade-explore-modal-helpers";

// ─── getVerdictStyle ──────────────────────────────────────────────────────
describe("getVerdictStyle", () => {
  test("returns distinct styles for each of the 4 labels", () => {
    const labels = ["GREAT", "FAIR", "BAD", "NOT REALISTIC"] as const;
    const fgs = labels.map((l) => getVerdictStyle(l).fg);
    // All four fg colors are unique — Billy's Q9 color override.
    expect(new Set(fgs).size).toBe(4);
  });

  test("GREAT is green, BAD is red, FAIR is gold, NOT REALISTIC is dim", () => {
    expect(getVerdictStyle("GREAT").fg).toBe("#7dd3a0");
    expect(getVerdictStyle("FAIR").fg).toBe("#d4a532");
    expect(getVerdictStyle("BAD").fg).toBe("#e47272");
    expect(getVerdictStyle("NOT REALISTIC").fg).toBe("#7a7c8e");
  });

  test("label field is echoed verbatim in the returned style", () => {
    for (const l of ["GREAT", "FAIR", "BAD", "NOT REALISTIC"] as const) {
      expect(getVerdictStyle(l).label).toBe(l);
    }
  });

  test("falls back to FAIR for unknown labels", () => {
    expect(getVerdictStyle("SOMETHING ELSE" as never).fg).toBe(
      getVerdictStyle("FAIR").fg,
    );
  });
});

// ─── formatPickLabel / formatFuturePickLabel / formatValue ────────────────
describe("formatPickLabel", () => {
  test("2026 pick renders year · slot · comma-separated value", () => {
    const pick: TradePackagePick = { slot: "1.06", round: 1, value_sha: 2900 };
    expect(formatPickLabel(pick)).toBe("2026 · 1.06 · 2,900");
  });

  test("rounds fractional values", () => {
    const pick: TradePackagePick = { slot: "3.12", round: 3, value_sha: 412.6 };
    expect(formatPickLabel(pick)).toBe("2026 · 3.12 · 413");
  });
});

describe("formatFuturePickLabel", () => {
  test("future pick renders year · R{round} · value", () => {
    const fp: FuturePick = { year: 2027, round: 3, value_sha: 900 };
    expect(formatFuturePickLabel(fp)).toBe("2027 · R3 · 900");
  });

  test("uses the year from the pick, not 2026", () => {
    const fp: FuturePick = { year: 2028, round: 1, value_sha: 1800 };
    expect(formatFuturePickLabel(fp)).toBe("2028 · R1 · 1,800");
  });
});

describe("formatValue", () => {
  test("adds thousands separators", () => {
    expect(formatValue(2900)).toBe("2,900");
    expect(formatValue(15000)).toBe("15,000");
  });

  test("never emits the string 'SHA'", () => {
    // Memory landmine: no SHA text anywhere on the frontend.
    expect(formatValue(2900)).not.toMatch(/SHA/i);
  });

  test("em-dash for null / undefined / NaN / Infinity", () => {
    expect(formatValue(null)).toBe("—");
    expect(formatValue(undefined)).toBe("—");
    expect(formatValue(NaN)).toBe("—");
    expect(formatValue(Infinity)).toBe("—");
  });
});

// ─── formatDeltaLabel — user-POV sign flip ────────────────────────────────
describe("formatDeltaLabel", () => {
  test("negative backend delta (user overpays) reads positive to user", () => {
    // Backend: partner receives 3.2% less → delta = -3.2 from backend's POV
    // From user's POV, inverted → user is "+3.2%" ahead.
    expect(formatDeltaLabel(-3.2)).toBe("+3.2%");
  });

  test("positive backend delta (partner overpays) reads negative to user", () => {
    expect(formatDeltaLabel(5.1)).toBe("-5.1%");
  });

  test("em-dash for null / undefined / NaN", () => {
    expect(formatDeltaLabel(null)).toBe("—");
    expect(formatDeltaLabel(undefined)).toBe("—");
    expect(formatDeltaLabel(NaN)).toBe("—");
  });

  test("zero renders without a sign", () => {
    expect(formatDeltaLabel(0)).toBe("0.0%");
  });
});

describe("getDeltaTone", () => {
  test("green when partner overpays by > 1%", () => {
    expect(getDeltaTone(2)).toBe("green");
    expect(getDeltaTone(10)).toBe("green");
  });

  test("red when user overpays by > 1%", () => {
    expect(getDeltaTone(-2)).toBe("red");
    expect(getDeltaTone(-10)).toBe("red");
  });

  test("dim within ±1% window", () => {
    expect(getDeltaTone(0)).toBe("dim");
    expect(getDeltaTone(0.5)).toBe("dim");
    expect(getDeltaTone(-0.9)).toBe("dim");
    expect(getDeltaTone(1)).toBe("dim");
    expect(getDeltaTone(-1)).toBe("dim");
  });

  test("dim for null / undefined / NaN", () => {
    expect(getDeltaTone(null)).toBe("dim");
    expect(getDeltaTone(undefined)).toBe("dim");
    expect(getDeltaTone(NaN)).toBe("dim");
  });
});

// ─── lookupPlayerPosition ─────────────────────────────────────────────────
function makeBoard(): ConsensusBoardEntry[] {
  return [
    {
      rank: 1, name: "Caleb Bryant", position: "WR", tier: 1,
      boom_bust: "SAFE", fp_rank: 1, ktc_rank: 1, fit_score: 85,
    },
    {
      rank: 2, name: "Jamal Rivers", position: "RB", tier: 1,
      boom_bust: "MODERATE", fp_rank: 2, ktc_rank: 2, fit_score: 82,
    },
  ] as ConsensusBoardEntry[];
}

describe("lookupPlayerPosition", () => {
  test("finds position case-insensitively", () => {
    expect(lookupPlayerPosition("caleb bryant", makeBoard())).toBe("WR");
    expect(lookupPlayerPosition("CALEB BRYANT", makeBoard())).toBe("WR");
    expect(lookupPlayerPosition("Caleb Bryant", makeBoard())).toBe("WR");
  });

  test("trims surrounding whitespace", () => {
    expect(lookupPlayerPosition("  Jamal Rivers  ", makeBoard())).toBe("RB");
  });

  test("returns null for unknown name", () => {
    expect(lookupPlayerPosition("Nobody", makeBoard())).toBeNull();
  });

  test("returns null for null / undefined / empty name", () => {
    expect(lookupPlayerPosition(null, makeBoard())).toBeNull();
    expect(lookupPlayerPosition(undefined, makeBoard())).toBeNull();
    expect(lookupPlayerPosition("", makeBoard())).toBeNull();
  });
});

// ─── isConfirmEnabled ─────────────────────────────────────────────────────
function makePkg(confirmEnabled: boolean | undefined): TradePackage {
  return {
    kind: "picks_only",
    picks_given: [],
    picks_received: [],
    future_picks_given: [],
    future_picks_received: [],
    player_given: null,
    value_given: 0,
    value_received: 0,
    value_delta_pct: 0,
    asset_count: 0,
    verdict: confirmEnabled === undefined
      ? undefined
      : {
          label: "FAIR",
          color: "#d4a532",
          headline: "Fair",
          why_lines: [],
          confirm_enabled: confirmEnabled,
        },
  };
}

describe("isConfirmEnabled", () => {
  test("true when verdict.confirm_enabled is true", () => {
    expect(isConfirmEnabled(makePkg(true))).toBe(true);
  });

  test("false when verdict.confirm_enabled is false", () => {
    expect(isConfirmEnabled(makePkg(false))).toBe(false);
  });

  test("false when verdict is absent", () => {
    expect(isConfirmEnabled(makePkg(undefined))).toBe(false);
  });

  test("false when package itself is null / undefined", () => {
    expect(isConfirmEnabled(null)).toBe(false);
    expect(isConfirmEnabled(undefined)).toBe(false);
  });
});

// ─── tabLabels / thinPoolMessage / clampTabIndex ──────────────────────────
describe("tabLabels", () => {
  test("builds one label per package", () => {
    expect(tabLabels(3)).toEqual(["Package 1", "Package 2", "Package 3"]);
    expect(tabLabels(1)).toEqual(["Package 1"]);
    expect(tabLabels(0)).toEqual([]);
  });
});

describe("thinPoolMessage", () => {
  test("distinct message for 0, 1, 2 packages", () => {
    const zero = thinPoolMessage(0);
    const one = thinPoolMessage(1);
    const two = thinPoolMessage(2);
    expect(zero).not.toBeNull();
    expect(one).not.toBeNull();
    expect(two).not.toBeNull();
    expect(new Set([zero, one, two]).size).toBe(3);
  });

  test("null when 3+ packages — no thin-pool callout needed", () => {
    expect(thinPoolMessage(3)).toBeNull();
    expect(thinPoolMessage(10)).toBeNull();
  });
});

describe("clampTabIndex", () => {
  test("in-range index passes through", () => {
    expect(clampTabIndex(0, 3)).toBe(0);
    expect(clampTabIndex(1, 3)).toBe(1);
    expect(clampTabIndex(2, 3)).toBe(2);
  });

  test("negative clamps to 0", () => {
    expect(clampTabIndex(-1, 3)).toBe(0);
    expect(clampTabIndex(-99, 3)).toBe(0);
  });

  test("over-range clamps to last valid index", () => {
    expect(clampTabIndex(5, 3)).toBe(2);
    expect(clampTabIndex(99, 3)).toBe(2);
  });

  test("packageCount 0 returns 0 (safe default for empty tab bar)", () => {
    expect(clampTabIndex(0, 0)).toBe(0);
    expect(clampTabIndex(5, 0)).toBe(0);
    expect(clampTabIndex(-5, 0)).toBe(0);
  });
});
