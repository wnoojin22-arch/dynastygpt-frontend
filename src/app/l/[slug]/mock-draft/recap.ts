/**
 * F3 recap — pure helpers for hero priority + insight derivations.
 *
 * Hero priority (computed at render time):
 *   P1 — biggestSteal.delta >= 3        → steal hero
 *   P2 — letter grade in {A+, A, A-}    → grade hero
 *   P3 — fallback                        → identity + owner name
 *
 * Null-safety: every consumer section must degrade gracefully when optional
 * Phase 2A data is absent. See callers.
 */
import type { BiggestSteal, LetterGradeResult } from "./helpers";
import { pickNumFromSlot } from "./helpers";
import type { DraftIdentity } from "./contracts";

export type HeroVariant =
  | {
      kind: "steal";
      steal: BiggestSteal;
      gradeSecondary: LetterGradeResult | null;
    }
  | {
      kind: "grade";
      grade: LetterGradeResult;
      stealSecondary: BiggestSteal | null;
    }
  | {
      kind: "identity";
      identity: DraftIdentity | null;
      ownerName: string;
      pickCount: number;
      format: "SF" | "1QB";
      teP: boolean;
      numTeams: number;
    };

export interface ComputeHeroInputs {
  biggestSteal: BiggestSteal | null;
  letterGrade: LetterGradeResult | null;
  identity: DraftIdentity | null;
  ownerName: string;
  pickCount: number;
  format: "SF" | "1QB";
  teP: boolean;
  numTeams: number;
}

const FLEX_LETTERS = new Set(["A+", "A", "A-"]);

export function computeHero(inputs: ComputeHeroInputs): HeroVariant {
  const { biggestSteal, letterGrade } = inputs;
  // P1: meaningful steal
  if (biggestSteal && biggestSteal.delta >= 3) {
    return { kind: "steal", steal: biggestSteal, gradeSecondary: letterGrade };
  }
  // P2: flex-worthy grade
  if (letterGrade && FLEX_LETTERS.has(letterGrade.letter)) {
    return { kind: "grade", grade: letterGrade, stealSecondary: biggestSteal };
  }
  // P3: identity fallback
  return {
    kind: "identity",
    identity: inputs.identity,
    ownerName: inputs.ownerName,
    pickCount: inputs.pickCount,
    format: inputs.format,
    teP: inputs.teP,
    numTeams: inputs.numTeams,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// avgRankDelta — mean of (pickNum - consensus_rank) across user picks.
// Positive = value; negative = reaches. Null when no rankings resolve.
// ─────────────────────────────────────────────────────────────────────────
export function avgRankDelta(
  userPicks: Record<string, string>,
  consensusBoard: ReadonlyArray<{ name: string; rank: number }>,
  numTeams: number,
): number | null {
  const deltas: number[] = [];
  for (const [slot, name] of Object.entries(userPicks)) {
    const p = consensusBoard.find((c) => c.name === name);
    if (!p) continue;
    deltas.push(pickNumFromSlot(slot, numTeams) - p.rank);
  }
  if (!deltas.length) return null;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return Math.round(mean * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────
// Identity accent color map — each archetype gets an earned-feeling hue.
// Displayed as typography + thin underline, not tinted pill.
// ─────────────────────────────────────────────────────────────────────────
export const IDENTITY_COLOR: Record<DraftIdentity, string> = {
  DEVELOPER: "#5fd4c4",        // teal
  "PIPELINE BUILDER": "#d4a532", // gold
  GAMBLER: "#e88560",          // red-orange
  INEFFICIENT: "#9596a5",      // muted
  BALANCED: "#d0d3df",         // silver
};

export const IDENTITY_LABEL: Record<DraftIdentity, string> = {
  DEVELOPER: "DEVELOPER",
  "PIPELINE BUILDER": "PIPELINE BUILDER",
  GAMBLER: "GAMBLER",
  INEFFICIENT: "INEFFICIENT",
  BALANCED: "BALANCED",
};
