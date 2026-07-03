/* ═══════════════════════════════════════════════════════════════
   Trade Builder Types — ported from Shadynasty
   ═══════════════════════════════════════════════════════════════ */

export interface TradeAsset {
  name: string;
  sha: number;
  dynasty: number;
  winnow: number;
  position: string;
  age: number | null;
  is_pick: boolean;
  sha_positional_rank: string;
  sha_pos_rank_num: number;
  error: string | null;
  proj_pts?: number | null;
}

export interface TradeSide {
  assets: TradeAsset[];
  sha_total_raw: number;
  sha_total: number;
  dynasty_total_raw: number;
  dynasty_total: number;
  winnow_total_raw: number;
  winnow_total: number;
  consolidation_premium: number;
}

export interface SHABalance {
  i_give: TradeSide;
  i_receive: TradeSide;
  sha_gap: number;
  sha_gap_percentage: number;
  dynasty_gap: number;
  dynasty_gap_percentage: number;
  winnow_gap: number;
  winnow_gap_percentage: number;
  sha_verdict: string;
  consolidation_applied: boolean;
  consolidation_detail: string | null;
}

export interface AcceptanceResult {
  acceptance_likelihood: number;
  capped: boolean;
  cap_reason: string | null;
  blocked: boolean;
  block_reason: string | null;
  breakdown: Record<string, number>;
  modifiers: Array<{ type: string; adjustment: number; reason: string }>;
  partner_lens: string;
  roster_fit_detail: { fills: string[]; hurts: string[] };
  error?: string;
}

export interface GradeResult {
  grade: string;
  score: number;
  verdict: string;
  dimension_scores: {
    value_return: number;
    asset_quality: number;
    roster_impact: number;
    positional_need: number;
    strategic_fit: number;
  };
  reasons: string[];
}

export interface NegotiationInsight {
  insight: string;
  type: string;
  priority: number;
}

export interface PositionalImpact {
  owner?: Record<string, { before: string; after: string; direction: "up" | "down" | "same" }>;
  partner?: Record<string, { before: string; after: string; direction: "up" | "down" | "same" }>;
}

export interface PartnerArchetype {
  window: string | null;
  tendency: string | null;
  activity: string | null;
  line: string;
}

export interface H2HHistory {
  total_trades: number;
  wins: number;
  partner_user_id: string;
}

export interface TradeEvaluation {
  league_id: string;
  i_give: TradeAsset[];
  i_receive: TradeAsset[];
  sha_balance: SHABalance;
  acceptance: AcceptanceResult;
  owner_grade: GradeResult;
  negotiation_insights: NegotiationInsight[];
  ask_for_more: Array<{ asset: string; sha_value: number; position: string; reason: string }>;
  positional_impact?: PositionalImpact;
  partner_archetype?: PartnerArchetype | null;
  h2h_history?: H2HHistory | null;
  ai_insight?: string | null;
  personal_insights?: Array<{ text: string; tone: "positive" | "warning" | "neutral"; category: string }>;
  suggestion_id?: string | null;
  annotation?: string | null;
  market_reality?: {
    summary_line: string;
    verdict: "below_market" | "fair_market" | "premium_price";
    direction: "acquiring" | "selling" | "swap";
    magnitude: "blockbuster" | "significant" | "slight" | "marginal" | "none";
    headline_asset?: { name?: string; position?: string; tier?: string; side?: string };
    secondary_asset?: { name?: string; position?: string; tier?: string } | null;
  } | null;
  projections?: {
    give_pts: number;
    receive_pts: number;
    delta: number;
    season: number;
    format: { scoring_type: string; pass_td_pts: number; te_premium: number };
  } | null;
}

/* ─── Starter Impact (Phase 3/4 — Trade Analyzer only) ───────────── */

export type DataFreshness = "live" | "snapshot" | "unavailable";

export interface StarterImpactPositionBlock {
  total_starter_pts: number;
  [pos: string]: number;
}

export interface StarterImpactLineupChange {
  starters_added: string[];
  starters_lost: string[];
  depth_only_changes: Record<string, string>;
}

export interface StarterImpactPicks {
  picks_in: string[];
  picks_out: string[];
}

export interface StarterImpactLineupSlot {
  slot: string;
  player_id: string;
  position: string | null;
  proj_pts: number;
}

export interface StarterImpactSide {
  owner_user_id: string;
  data_freshness: DataFreshness;
  error?: string | null;
  season?: number;
  format?: {
    scoring_type: string;
    is_superflex: boolean;
    te_premium: number;
    pass_td_pts: number;
    lineup_slots: string[];
  };
  before: StarterImpactPositionBlock | null;
  after: StarterImpactPositionBlock | null;
  delta: ({ total: number } & Record<string, number>) | null;
  lineup_changes: StarterImpactLineupChange | null;
  picks: StarterImpactPicks;
  before_lineup?: StarterImpactLineupSlot[];
  after_lineup?: StarterImpactLineupSlot[];
  unresolved_names?: string[];
}

export interface StarterImpactResponse {
  league_id: string;
  season: number;
  side_a: StarterImpactSide;
  side_b: StarterImpactSide;
  insight: { side_a: string | null; side_b: string | null };
}

export interface SuggestedPackage {
  partner: string;
  partner_user_id?: string | null;
  i_give: TradeAsset[];
  i_receive: TradeAsset[];
  i_give_names: string[];
  i_receive_names: string[];
  sha_balance: Partial<SHABalance>;
  acceptance_likelihood: number;
  owner_trade_grade: Partial<GradeResult>;
  negotiation_insights: NegotiationInsight[];
  combined_score: number;
  pitch: string;
  narrative?: string;
  narration_bullets?: string[];
  tier?: string;
  market_comparison?: string;
  roster_warnings?: string[];
  suggestion_id?: string;
}

export interface RosterPlayer {
  name: string;
  name_clean: string;
  position: string;
  sha_value: number;
  sha_pos_rank: string;
  age: number | null;
  dynasty_value?: number;
  redraft_value?: number;
  ktc_value?: number;
  trend_label?: string;
  mkt_vs_pct?: number;
  original_owner?: string;
  is_own_pick?: boolean;
}

export interface LiveBalance {
  giveRaw: number;
  giveAdj: number;
  recvRaw: number;
  recvAdj: number;
  gapPct: number;
  verdict: string;
  consPremium: number;
  consSide: string;
}
