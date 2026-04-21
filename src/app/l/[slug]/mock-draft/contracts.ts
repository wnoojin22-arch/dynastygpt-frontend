/**
 * Approved contracts for the mock-draft rebuild.
 * Mirrors the backend shapes returned by:
 *   - GET  /leagues/{id}/draft/mock-draft/pre-draft
 *   - POST /leagues/{id}/draft/mock-draft/simulate
 *   - POST /leagues/{id}/draft/mock-draft/alternate-simulate
 *   - GET  /leagues/{id}/draft/mock-draft/fit/{sim_id}/{prospect_name}
 *
 * Frontend consumes these types; do not drift from backend without updating both.
 */

export type Position = "QB" | "RB" | "WR" | "TE";
export type PositionalGrade = "CRITICAL" | "WEAK" | "AVERAGE" | "STRONG" | "ELITE";
export type BoomBust = "SAFE" | "MODERATE" | "POLARIZING" | "BOOM/BUST";
export type OwnerWindow = "CONTENDER" | "BALANCED" | "REBUILDER";
export type DraftIdentity =
  | "DEVELOPER"
  | "PIPELINE BUILDER"
  | "GAMBLER"
  | "INEFFICIENT"
  | "BALANCED";
export type PickValueSource = "KTC" | "SHA" | "FP_CONSENSUS";

// ─── FitPayload (Contract 1) ──────────────────────────────────────────────
// Full payload rides on every LikelyAvailableEntry and on the top 20 of
// consensus_board. Remaining consensus entries carry only bare fit_score.
//
// SLOT-AWARE FIT SCORE — canonical implementation lives at
// dynastygpt-api app/services/mock_draft_fit.py.
//
// fit_score = weighted sum of 5 sub-scores in [0, 100] (value, need,
// tendency, window, boom) plus grand-slam bonuses. Weights flex by the
// value-vs-slot gap:
//
//   delta = pick_num - consensus_rank   (positive = prospect fell past ADP)
//
//   STEAL   (delta >=  5): value 65 | need 20 | tendency 10 | window 3 | boom 2
//   FAIR    (|delta| <  5): value 30 | need 35 | tendency 20 | window 10 | boom 5
//   REACH   (delta <= -5): value 15 | need 50 | tendency 25 | window 7  | boom 3
//
// Bonuses:
//   BPA_bonus      = max(0, 8 - consensus_rank) * clamp((delta - 5) / 10, 0, 1)
//   NEED_FIT_bonus = +8 when STEAL band AND grade ∈ (CRITICAL, WEAK, AVG)
//
// fit_reasons carry the product narrative — see the mock_draft_fit template
// bank for the approved bullet catalog (MEGA STEAL lead-in, need-first
// ordering on REACH+need-fill, two-bullet render on FAIR+redundant, etc).
export interface FitPayload {
  fit_score: number;          // integer 0..100
  fit_reasons: string[];      // 3-5 bullets, <= 90 chars each
  fit_negatives: string[];    // up to 3; only when fit_score < 50
}

export interface ConsensusBoardEntry extends Partial<FitPayload> {
  rank: number;
  name: string;
  position: Position;
  tier: number;
  boom_bust: BoomBust;
  fp_rank: number;
  ktc_rank: number;
  fit_score: number; // always present (full or bare)
}

export interface LikelyAvailableEntry extends FitPayload {
  prospect: string;
  position: Position;
  board_position: number;
  tier: number;
  boom_bust: BoomBust;
  fills_need: boolean;
  your_grade_at_position: PositionalGrade;
}

// ─── Contract 2: pick_value_delta on trade buyers ────────────────────────
export interface TradeBuyer {
  name: string;
  window: OwnerWindow;
  reason: string;
  estimated_cost: string;
  picks_2026: number;
  picks_2027: number;
  h2h_trades: number;
  pick_value_delta: number;        // signed; positive = user wins value
  pick_value_source: PickValueSource;
}

export interface TradeFlag {
  slot: string;
  trade_probability: number;
  reason: string;
  top_buyer?: TradeBuyer;
  alt_buyer?: TradeBuyer;
}

// ─── Simulate response components ─────────────────────────────────────────
export interface ChalkPick {
  slot: string;
  owner: string;
  window: OwnerWindow;
  prospect_name: string;
  prospect_position: Position;
  prospect_tier: number;
  prospect_boom_bust: BoomBust;
  board_position: number;
  confidence?: number;
  reasoning?: string;
}

export interface PickProbability {
  prospect: string;
  position: Position;
  pct: number;
}

export interface AvailabilityEntry {
  slot: string;
  pct_available: number;
}

export interface UserPickAnalysis {
  slot: string;
  likely_available: LikelyAvailableEntry[];
  trade_up_targets: { suggestion: string }[];
}

// ─── Contract 4: Missed opportunities ─────────────────────────────────────
export interface MissedOpportunity {
  user_slot: string;
  user_actual_pick: {
    name: string;
    position: Position;
    rank: number;
    fit_score: number;
  };
  missed_prospect: {
    name: string;
    position: Position;
    rank: number;
    tier: number;
    fit_score: number;
  };
  available_until_slot: string;
  value_delta: number;    // missed.fit_score - actual.fit_score
}

// ─── Contract 5: Real post-draft positional grades ────────────────────────
export interface PositionalGradeDelta {
  before: PositionalGrade;
  after: PositionalGrade;
  delta: number;
}

export interface PostDraftPositionalGrades {
  QB: PositionalGradeDelta;
  RB: PositionalGradeDelta;
  WR: PositionalGradeDelta;
  TE: PositionalGradeDelta;
}

// ─── Simulate response aggregate ──────────────────────────────────────────
export interface SimulateResponse {
  league_id: string;
  format: "SF" | "1QB";
  rounds: number;
  num_teams: number;
  te_premium: boolean;
  simulations_run: number;
  sim_id: string; // required by /alternate-simulate; Redis-backed, 1h TTL

  consensus_board: ConsensusBoardEntry[];
  chalk: ChalkPick[];
  pick_probabilities: Record<string, PickProbability[]>;
  prospect_availability: Record<string, AvailabilityEntry[]>;

  user_pick_analysis: UserPickAnalysis[];
  trade_flags: TradeFlag[];

  user_missed_opportunities: MissedOpportunity[]; // max 5, sorted by value_delta desc
  post_draft_positional_grades: PostDraftPositionalGrades;
}

// ─── Contract 3: Alternate-path simulate ──────────────────────────────────
export type ForcedSwap =
  | {
      slot: string;
      action: "trade_back";
      params: { target_slot: string; received_picks: string[] };
    }
  | {
      slot: string;
      action: "trade_up";
      params: { target_slot: string; cost_picks: string[] };
    }
  | {
      slot: string;
      action: "take_different";
      params: { prospect_name: string };
    };

export interface AlternateSimulateRequest {
  league_id: string;
  owner_id: string;
  base_sim_id: string;
  forced_swaps: ForcedSwap[];
  label?: string; // optional scenario label for recap titles
}

export interface PickChange {
  slot: string;
  before: { prospect: string; position: Position; rank: number };
  after: { prospect: string; position: Position; rank: number };
}

export interface DiffVsBase {
  picks_changed: PickChange[];                                // only user-affecting picks
  positional_grade_deltas: Record<Position, PositionalGradeDelta>;
  summary: string;                                            // <= 140 chars
}

export interface AlternateSimulateResponse extends SimulateResponse {
  alternate_id: string;
  diff_vs_base: DiffVsBase;
}

// ─── Pre-draft response (unchanged from existing) ─────────────────────────
export interface UserPick {
  slot: string;
  round: number;
  picks_before: number;
}

export interface PreDraftTopProspect {
  name: string;
  position: Position;
  rank: number;
  tier: number;
  boom_bust: BoomBust;
  fills_need: boolean;
}

export interface PreDraftResponse {
  league_id: string;
  league_name: string;
  format: "SF" | "1QB";
  te_premium: boolean;
  num_teams: number;
  owner: string;
  window: OwnerWindow;
  positional_grades: Record<Position, PositionalGrade>;
  needs: Position[];
  user_picks: UserPick[];
  total_picks_2026: number;
  top_prospects: PreDraftTopProspect[];
}

// ─── /draft/hit-rates, /draft/owner-profiles, /draft/pick-intel ────────────
// Subset used by the landing War Room. Full responses have more fields.

export interface HitRateByPositionRound {
  round: number;
  position: Position;
  total: number;
  hits: number;
  hit_pct: number;
}

export interface HitRatesResponse {
  league_id: string;
  league: {
    by_position_round: HitRateByPositionRound[];
    overall_hit_pct: number;
    total_evaluated: number;
  };
  global: {
    by_position_round: HitRateByPositionRound[];
    overall_hit_pct: number;
    total_evaluated: number;
  };
}

export interface OwnerProfile {
  owner: string;
  owner_user_id: string | null;
  total_picks: number;
  evaluated: number;
  hit_rate: number;
  star_rate: number;
  bust_rate: number;
  stars: number;
  hits: number;
  busts: number;
  position_distribution: Partial<Record<Position, number>>;
  round1_position_distribution: Partial<Record<Position, number>>;
  draft_identity: DraftIdentity;
  stars_kept: number;
  stars_flipped: number;
}

export interface OwnerProfilesResponse {
  league_id: string;
  profiles: OwnerProfile[];
}

export interface PickIntelRecommendation {
  slot: string | null;
  round: number;
  hit_rate: number;
  pos_breakdown: Partial<Record<Position, number>>;
  recommendation: string;
  reason: string;
}

export interface PickIntelResponse {
  league_id: string;
  owner: string;
  recommendations: PickIntelRecommendation[];
}
