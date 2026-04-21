import type {
  ConsensusBoardEntry,
  PositionalGrade,
  PostDraftPositionalGrades,
  Position,
} from "./contracts";

export type LetterGrade =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D+" | "D";

// ═════════════════════════════════════════════════════════════════════════
// pickNumFromSlot
// ─────────────────────────────────────────────────────────────────────────
// Convert a slot string like "2.01" to the absolute pick number across the
// entire draft. Depends on league size. "1.12" with numTeams=12 => 12.
// "2.01" with numTeams=12 => 13.
// ═════════════════════════════════════════════════════════════════════════
export function pickNumFromSlot(slot: string, numTeams: number): number {
  const [rStr, sStr] = slot.split(".");
  const round = parseInt(rStr, 10);
  const pickInRound = parseInt(sStr, 10);
  if (!Number.isFinite(round) || !Number.isFinite(pickInRound)) return NaN;
  return (round - 1) * numTeams + pickInRound;
}

// ═════════════════════════════════════════════════════════════════════════
// valueVsSlot
// ─────────────────────────────────────────────────────────────────────────
// Classify a pick's value using symmetric ±5 thresholds against the player's
// consensus rank.
//   STEAL: rank <= pickNum - 5   (taken later than their rank suggests)
//   FAIR:  |rank - pickNum| < 5
//   REACH: rank >= pickNum + 5   (taken earlier than their rank suggests)
// Thresholds documented in contracts; default ±5 until data shows asymmetry.
// ═════════════════════════════════════════════════════════════════════════
export type ValueVsSlot = "STEAL" | "FAIR" | "REACH";

export const VALUE_THRESHOLD = 5;

export function valueVsSlot(rank: number | undefined, pickNum: number): ValueVsSlot {
  if (rank === undefined || !Number.isFinite(rank)) return "FAIR";
  if (rank <= pickNum - VALUE_THRESHOLD) return "STEAL";
  if (rank >= pickNum + VALUE_THRESHOLD) return "REACH";
  return "FAIR";
}

// ═════════════════════════════════════════════════════════════════════════
// biggestSteal
// ─────────────────────────────────────────────────────────────────────────
// Find the user's pick with the largest positive (pickNum - rank) delta —
// i.e. the player who fell farthest past their consensus rank.
// Returns null when no picks or nothing qualifies as a steal.
// ═════════════════════════════════════════════════════════════════════════
export interface BiggestSteal {
  slot: string;
  name: string;
  position: Position;
  rank: number;
  pickNum: number;
  delta: number; // pickNum - rank; larger = bigger steal
}

export function biggestSteal(
  userPicks: Record<string, string>,
  consensusBoard: ReadonlyArray<Pick<ConsensusBoardEntry, "name" | "rank" | "position">>,
  numTeams: number,
): BiggestSteal | null {
  let best: BiggestSteal | null = null;
  for (const [slot, name] of Object.entries(userPicks)) {
    const p = consensusBoard.find((c) => c.name === name);
    if (!p) continue;
    const pickNum = pickNumFromSlot(slot, numTeams);
    const delta = pickNum - p.rank;
    if (delta <= 0) continue;
    if (!best || delta > best.delta) {
      best = { slot, name, position: p.position, rank: p.rank, pickNum, delta };
    }
  }
  return best;
}

// ═════════════════════════════════════════════════════════════════════════
// letterGrade
// ─────────────────────────────────────────────────────────────────────────
// Pure composition — takes backend-authoritative inputs only.
// Formula (documented in contracts):
//   base = 70 (B-)
//   value_vs_slot: +5 per STEAL, 0 per FAIR, -5 per REACH
//   grade_delta_bonus: per position, +4 CRIT→WEAK, +3 WEAK→AVG, +2 AVG→STRONG, +1 STRONG→ELITE
//   regressions ignored (don't occur from drafting)
//   clamp floor 30 (D), ceiling 100 (A+)
// Score → letter table in mapScoreToLetter below.
// ═════════════════════════════════════════════════════════════════════════
export interface LetterGradeInputs {
  userPicks: Record<string, string>;
  consensusBoard: ReadonlyArray<Pick<ConsensusBoardEntry, "name" | "rank" | "position">>;
  postDraftGrades: PostDraftPositionalGrades;
  numTeams: number;
}

export interface LetterGradeResult {
  score: number;
  letter: LetterGrade;
  breakdown: {
    base: number;
    value_vs_slot: number;
    grade_delta_bonus: number;
  };
}

const GRADE_ORDER: PositionalGrade[] = ["CRITICAL", "WEAK", "AVERAGE", "STRONG", "ELITE"];
// Per-step improvement bonuses:
//   CRITICAL→WEAK +4, WEAK→AVG +3, AVG→STRONG +2, STRONG→ELITE +1
const STEP_BONUSES = [4, 3, 2, 1];

function gradeBonusPerPosition(before: PositionalGrade, after: PositionalGrade): number {
  const b = GRADE_ORDER.indexOf(before);
  const a = GRADE_ORDER.indexOf(after);
  if (b < 0 || a < 0) return 0;
  const diff = a - b;
  if (diff <= 0) return 0;
  let total = 0;
  for (let i = 0; i < diff; i++) {
    const stepIdx = b + i;
    if (stepIdx < STEP_BONUSES.length) total += STEP_BONUSES[stepIdx];
  }
  return total;
}

export function letterGrade(inputs: LetterGradeInputs): LetterGradeResult {
  const base = 70;

  // Value vs slot sum
  let valueSum = 0;
  for (const [slot, name] of Object.entries(inputs.userPicks)) {
    const p = inputs.consensusBoard.find((c) => c.name === name);
    if (!p) continue;
    const pickNum = pickNumFromSlot(slot, inputs.numTeams);
    const cls = valueVsSlot(p.rank, pickNum);
    if (cls === "STEAL") valueSum += 5;
    else if (cls === "REACH") valueSum -= 5;
  }

  // Positional grade bonus
  let gradeBonus = 0;
  for (const pos of ["QB", "RB", "WR", "TE"] as Position[]) {
    const d = inputs.postDraftGrades[pos];
    if (!d) continue;
    gradeBonus += gradeBonusPerPosition(d.before, d.after);
  }

  const raw = base + valueSum + gradeBonus;
  const score = Math.max(30, Math.min(100, raw));
  return {
    score,
    letter: mapScoreToLetter(score),
    breakdown: { base, value_vs_slot: valueSum, grade_delta_bonus: gradeBonus },
  };
}

export function mapScoreToLetter(score: number): LetterGrade {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  return "D";
}
