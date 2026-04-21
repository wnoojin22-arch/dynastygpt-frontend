/**
 * Pure helpers for the War Room landing.
 * All pure — no I/O, no React, no time — so they are vitest-friendly and
 * give the landing component a stable seam for the data-heavy sections.
 */
import type {
  ChalkPick,
  ConsensusBoardEntry,
  OwnerProfile,
  AvailabilityEntry,
  PickProbability,
} from "./contracts";
import { pickNumFromSlot } from "./helpers";

// ═══════════════════════════════════════════════════════════════════════════
// activeDrafters
// ─────────────────────────────────────────────────────────────────────────
// Given the chalk board + the user's owner name, return the distinct owners
// who pick in the user's round(s), sorted by earliest pick first.
// Each entry carries total picks in the shown window — the radar surfaces
// "who drafts most often before you in round 1."
// ═══════════════════════════════════════════════════════════════════════════
export interface ActiveDrafter {
  owner: string;
  owner_pick_count: number;     // picks in this window
  earliest_slot: string;
  earliest_pickNum: number;
}

export function activeDrafters(
  chalk: ReadonlyArray<ChalkPick>,
  userOwner: string,
  numTeams: number,
  opts: { window: "round1" | "before_user_first" } = { window: "round1" },
): ActiveDrafter[] {
  if (!chalk.length) return [];

  // Locate user's first pick.
  const userFirst = chalk
    .filter((c) => c.owner.toLowerCase() === userOwner.toLowerCase())
    .map((c) => ({ slot: c.slot, pickNum: pickNumFromSlot(c.slot, numTeams) }))
    .sort((a, b) => a.pickNum - b.pickNum)[0];

  const boundary = opts.window === "before_user_first"
    ? (userFirst?.pickNum ?? numTeams + 1) - 1
    : numTeams; // round 1 = pickNum ≤ numTeams

  const pool = chalk.filter((c) => {
    const pickNum = pickNumFromSlot(c.slot, numTeams);
    if (!Number.isFinite(pickNum) || pickNum > boundary) return false;
    return c.owner.toLowerCase() !== userOwner.toLowerCase();
  });

  const byOwner = new Map<string, ActiveDrafter>();
  for (const p of pool) {
    const pickNum = pickNumFromSlot(p.slot, numTeams);
    const cur = byOwner.get(p.owner);
    if (!cur) {
      byOwner.set(p.owner, {
        owner: p.owner,
        owner_pick_count: 1,
        earliest_slot: p.slot,
        earliest_pickNum: pickNum,
      });
    } else {
      cur.owner_pick_count += 1;
      if (pickNum < cur.earliest_pickNum) {
        cur.earliest_pickNum = pickNum;
        cur.earliest_slot = p.slot;
      }
    }
  }

  return Array.from(byOwner.values()).sort((a, b) => a.earliest_pickNum - b.earliest_pickNum);
}

// ═══════════════════════════════════════════════════════════════════════════
// threatsAheadOfUser
// ─────────────────────────────────────────────────────────────────────────
// For the threat radar: the N drafters who pick immediately before the user's
// first slot, with their draft identity, round-1 position distribution
// (weighted top position), hit rate, and a human delta label describing how
// their likely pick shifts a named prospect's availability to the user.
// The availability delta is computed from the caller-provided snapshot, so
// this stays pure.
// ═══════════════════════════════════════════════════════════════════════════
export interface ThreatAhead {
  owner: string;
  owner_user_id: string;
  slot: string;
  draft_identity: OwnerProfile["draft_identity"];
  hit_rate: number;
  top_position: string | null;
  top_position_count: number;
  avatar_id?: string;
  /** Most likely pick at this slot, with the probability across all sims. */
  most_likely?: { prospect: string; position: string; pct: number };
  /**
   * Effect of THIS specific pick on the user's top target making it to the
   * user's slot. Independent-survival approximation:
   *   before = after + pct_threat_takes_target
   *   (when threats are independent, arrival probability drops by exactly
   *    the P(this owner takes target) delivered by pick_probabilities.)
   * Only populated when the threat has a non-zero probability of taking
   * the user's chosen target — otherwise the "shift" would be 0% and not
   * worth rendering.
   */
  target_impact?: {
    prospect: string;
    position: string;
    before: number;
    after: number;
  };
}

interface ThreatOwnerMeta {
  owner: string;
  owner_user_id: string;
  draft_identity: OwnerProfile["draft_identity"];
  hit_rate: number;
  round1_position_distribution: Partial<Record<string, number>>;
  avatar_id?: string;
}

export function threatsAheadOfUser(params: {
  userOwner: string;
  userFirstSlot: string;
  numTeams: number;
  chalk: ReadonlyArray<ChalkPick>;
  ownerMeta: ReadonlyArray<ThreatOwnerMeta>;
  availability?: Readonly<Record<string, ReadonlyArray<AvailabilityEntry>>>;
  /** Per-slot pick probability distribution — powers "most likely". */
  pickProbabilities?: Readonly<Record<string, ReadonlyArray<PickProbability>>>;
  /**
   * Ordered list of prospect names the user is targeting (best fit first).
   * The first target with non-zero P(threat takes it) becomes the
   * target_impact for each threat. Left empty = no target impact
   * computed; renderer falls back to the "most_likely" line alone.
   */
  userTargets?: ReadonlyArray<string>;
  /**
   * User-slot availability for each target prospect (0..100). Used as the
   * "after" baseline in target_impact before/after math.
   */
  userTargetAvailability?: Readonly<Record<string, number>>;
  userTargetPositions?: Readonly<Record<string, string>>;
}): ThreatAhead[] {
  const { userOwner, userFirstSlot, numTeams, chalk, ownerMeta, pickProbabilities, userTargets, userTargetAvailability, userTargetPositions } = params;
  const userPickNum = pickNumFromSlot(userFirstSlot, numTeams);
  if (!Number.isFinite(userPickNum)) return [];

  const metaByOwner = new Map(ownerMeta.map((m) => [m.owner.toLowerCase(), m]));
  const threats: ThreatAhead[] = [];

  for (const pick of chalk) {
    const pickNum = pickNumFromSlot(pick.slot, numTeams);
    if (!Number.isFinite(pickNum) || pickNum >= userPickNum) continue;
    if (pick.owner.toLowerCase() === userOwner.toLowerCase()) continue;

    // Only include picks in the same round as the user's first pick — "ahead of you."
    const pickRound = Math.ceil(pickNum / numTeams);
    const userRound = Math.ceil(userPickNum / numTeams);
    if (pickRound !== userRound) continue;

    const meta = metaByOwner.get(pick.owner.toLowerCase());
    if (!meta) continue;

    const topEntry = Object.entries(meta.round1_position_distribution)
      .filter((e): e is [string, number] => typeof e[1] === "number")
      .sort((a, b) => b[1] - a[1])[0];
    const [topPos, topCount] = topEntry ?? [null, 0];

    // Most likely pick — top of pick_probabilities for this slot, falling
    // back to chalk (100% confidence) if probabilities aren't provided.
    const probs = pickProbabilities?.[pick.slot] ?? [];
    const topProb = [...probs].sort((a, b) => b.pct - a.pct)[0];
    const most_likely = topProb
      ? { prospect: topProb.prospect, position: topProb.position, pct: topProb.pct }
      : { prospect: pick.prospect_name, position: pick.prospect_position, pct: 100 };

    // Target impact — find the first user target that this threat has a
    // non-zero probability of taking.
    let target_impact: ThreatAhead["target_impact"];
    if (userTargets && userTargets.length > 0) {
      for (const tName of userTargets) {
        const p = probs.find((e) => e.prospect === tName)?.pct ?? 0;
        if (p <= 0) continue;
        const after = userTargetAvailability?.[tName];
        if (typeof after !== "number") continue;
        const before = Math.min(100, Math.round(after + p));
        const pos = userTargetPositions?.[tName] ?? "";
        target_impact = { prospect: tName, position: pos, before, after };
        break;
      }
    }

    threats.push({
      owner: pick.owner,
      owner_user_id: meta.owner_user_id,
      slot: pick.slot,
      draft_identity: meta.draft_identity,
      hit_rate: meta.hit_rate,
      top_position: topPos,
      top_position_count: topCount,
      avatar_id: meta.avatar_id,
      most_likely,
      target_impact,
    });
  }

  return threats.sort((a, b) => pickNumFromSlot(a.slot, numTeams) - pickNumFromSlot(b.slot, numTeams));
}

// ═══════════════════════════════════════════════════════════════════════════
// prospectsAtRisk
// ─────────────────────────────────────────────────────────────────────────
// Return consensus-top prospects whose pct_available at the user's first
// slot is below `threshold` (default 0.50). Sorted by lowest availability first
// (most at risk). This is what the "won't make it back to you" column shows.
// ═══════════════════════════════════════════════════════════════════════════
export interface ProspectAtRisk {
  name: string;
  position: ConsensusBoardEntry["position"];
  rank: number;
  tier: number;
  pct_available: number;
  fit_score: number;
}

export function prospectsAtRisk(params: {
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  availability: Readonly<Record<string, ReadonlyArray<AvailabilityEntry>>>;
  userFirstSlot: string;
  threshold?: number;
  topN?: number;
}): ProspectAtRisk[] {
  const { consensusBoard, availability, userFirstSlot, threshold = 50, topN = 10 } = params;
  const top = consensusBoard.slice(0, topN);
  const risks: ProspectAtRisk[] = [];

  for (const p of top) {
    const entry = availability[p.name];
    if (!entry) continue;
    const atSlot = entry.find((e) => e.slot === userFirstSlot);
    if (!atSlot) continue;
    if (atSlot.pct_available >= threshold) continue;
    risks.push({
      name: p.name,
      position: p.position,
      rank: p.rank,
      tier: p.tier,
      pct_available: atSlot.pct_available,
      fit_score: p.fit_score,
    });
  }

  return risks.sort((a, b) => a.pct_available - b.pct_available);
}
