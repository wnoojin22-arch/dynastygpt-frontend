// ── Position & Grade types ──────────────────────────────────────────────

export type Position = "QB" | "RB" | "WR" | "TE" | "PICK";
export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "D" | "F" | "N/A";
export type Signal = "BUY" | "SELL" | "HOLD";
export type Window = "CONTENDER" | "WIN_NOW" | "REBUILDER" | "BALANCED";
export type NeedLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

// ── Player types ────────────────────────────────────────────────────────

export interface RosterPlayer {
  name: string;
  name_clean: string;
  position: Position;
  team: string;
  age: number | null;
  is_starter: boolean;
  is_taxi: boolean;
  sha_value: number;
  sha_pos_rank: string;
  sha_overall_rank: number | null;
  ktc_value: number;
  dynasty_value: number;
  redraft_value: number;
  mkt_vs_pct: number | null;
}

export interface PlayerSignal {
  player: string;
  name_clean: string;
  position: string;
  owner: string;
  age: number | null;
  sha_value: number;
  ktc_value: number;
  signal: Signal;
  reasons: string[];
}

export interface PlayerCard {
  found: boolean;
  player: string;
  position: string;
  team: string;
  age: number | null;
  college: string | null;
  sleeper_id: string | null;
  height: string | null;
  weight: string | null;
  rookie_year: number | null;
  years_exp: number | null;
  sha_value: number;
  ktc_value: number | null;
  dynasty_value: number | null;
  redraft_value: number | null;
  sha_overall_rank: number;
  sha_pos_rank: string;
  dynasty_rank: number | null;
  redraft_rank: number | null;
  current_owner: string | null;
  acquisition: { method: string; from?: string; date?: string; trade_id?: string; round?: number; pick?: number; year?: number } | null;
  season_stats: SeasonStat[];
  snapshot_date: string;
}

export interface SeasonStat {
  season: number;
  games_played: number;
  ppg: number;
  total_points: number;
  best_week: number;
  worst_week: number;
}

export interface PlayerTrend {
  player: string;
  position: string;
  trend: "ascending" | "declining" | "stable" | "insufficient_data";
  sha_start: number;
  sha_current: number;
  sha_delta: number;
  pct_change: number;
  period_days: number;
  data_points: number;
}

export interface ValueHistoryPoint {
  date: string;
  value: number | null;
  sha_value: number | null;
  ktc_value: number | null;
  sha_rank: number | null;
  sha_pos_rank: string | null;
}

// ── Roster Response ─────────────────────────────────────────────────────

export interface RosterResponse {
  league_id: string;
  owner: string;
  total_sha: number;
  starter_sha: number;
  roster_size: number;
  positional_grades: Record<string, string>;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
  taxi: RosterPlayer[];
  by_position: Record<string, RosterPlayer[]>;
  players?: RosterPlayer[];
}

// ── Pick types ──────────────────────────────────────────────────────────

export interface Pick {
  season: string;
  round: number;
  original_owner: string;
  current_owner: string;
  is_own_pick: boolean;
  trade_history: string[];
  sha_value: number;
  ktc_value: number;
}

export interface PicksResponse {
  owner: string;
  total_picks: number;
  total_sha_value: number;
  picks: Pick[];
  by_year: Record<string, Pick[]>;
}

// ── Rankings & Standings ────────────────────────────────────────────────

export interface RankingEntry {
  owner: string;
  total_sha: number;
  positional: Record<string, number>;
  roster_size: number;
  top_players: { name: string; position: string; sha_value: number; age: number | null }[];
  rank: number;
}

export interface StandingEntry {
  owner: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  win_pct: number;
  rank: number;
}

// ── Owner types ─────────────────────────────────────────────────────────

export interface OwnerProfile {
  owner: string;
  total_sha: number;
  window: Window;
  window_years: string;
  avg_starter_age: number | null;
  young_core_count: number;
  aging_assets: number;
  roster_size: number;
  record: { wins: number; losses: number } | null;
  sha_rank: number;
}

export interface OwnerRecord {
  owner: string;
  all_time_wins: number;
  all_time_losses: number;
  all_time_ties: number;
  all_time_pf: number;
  win_pct: number;
  seasons_played: number;
  seasons: { season: string; wins: number; losses: number; points_for: number }[];
}

export interface Championships {
  owner: string;
  championships: number;
  championship_years: string[];
  playoff_appearances: number;
  playoff_years: string[];
  season_finishes?: Array<{ season: string; finish: number }>;
  championship_history?: Record<string, unknown>;
}

export interface Tendencies {
  owner: string;
  badges: string[];
  trade_win_rate: number;
  trades_per_year: number;
  positional_bias: Record<string, number>;
  seasonal_timing: Record<string, number>;
}

export interface OwnerNeeds {
  position: string;
  grade: string;
  league_rank: number;
  total_sha: number;
  league_avg: number;
  depth: number;
  need_level: NeedLevel;
  top_player: { name: string; sha_value: number } | null;
  surplus: number;
}

// ── Trade types ─────────────────────────────────────────────────────────

export interface GradedTrade {
  trade_id: string;
  date: string;
  owner: string;
  counter_party: string;
  players_sent: string[] | null;
  players_received: string[] | null;
  picks_sent: string[] | null;
  picks_received: string[] | null;
  sha_balance: number | null;
  season_phase: string | null;
  is_blockbuster: boolean | null;
  verdict: string | null;
  side_a_verdict: string | null;
  side_b_verdict: string | null;
  side_a_owner: string | null;
  side_b_owner: string | null;
  side_a_score: number | null;
  side_b_score: number | null;
  side_a_letter: string | null;
  side_b_letter: string | null;
  hindsight_verdict: string | null;
  hindsight_score: number | null;
  hindsight_confidence: string | null;
  hindsight_status: string | null;
  hindsight_label: string | null;
  is_championship_trade: boolean;
}

export interface TradeGradeResponse {
  league_id: string;
  side_a: { owner: string; assets: ResolvedAsset[]; total_sha: number };
  side_b: { owner: string; assets: ResolvedAsset[]; total_sha: number };
  sha_balance: number;
  grade: Grade;
  winner: string;
}

export interface ResolvedAsset {
  name: string;
  sha: number;
  dynasty: number;
  winnow: number;
  position: string | null;
  age: number | null;
  sha_positional_rank: string | null;
  is_pick: boolean;
  error: string | null;
}

// ── Rivalry types ───────────────────────────────────────────────────────

export interface Rival {
  partner: string;
  trade_count: number;
  wins: number;
  losses: number;
  pushes: number;
  net_sha_balance: number;
  verdict: string;
}

// ── Trade Partner types ─────────────────────────────────────────────────

export interface TradePartner {
  owner: string;
  fit_score: number;
  badges: string[];
  they_have_you_need: string[];
  you_have_they_need: string[];
  prior_trades: number;
  positional_strength: Record<string, { total: number; depth: number }>;
}

// ── Trending types ──────────────────────────────────────────────────────

export interface TrendingPlayer {
  player: string;
  name?: string;
  position: string;
  sha_value: number;
  sha_delta: number;
  sha_pos_rank: string;
}

export interface TrendingResponse {
  league_id: string;
  period_days: number;
  risers: TrendingPlayer[];
  fallers: TrendingPlayer[];
}

export interface OwnerTrendingResponse {
  owner: string;
  period_days: number;
  total_roster_delta: number;
  risers: TrendingPlayer[];
  fallers: TrendingPlayer[];
}

export interface RosterValueChangeResponse {
  owner: string;
  window_days: number;
  format: string;
  current_total: number;
  previous_total: number;
  delta: number;
  risers: { name: string; position: string; current_value: number; delta: number }[];
  fallers: { name: string; position: string; current_value: number; delta: number }[];
}

// ── League Intel ────────────────────────────────────────────────────────

export interface LeagueIntelOwner {
  owner: string;
  sha_rank: number;
  total_sha: number;
  window: Window;
  dynasty_rank: number;
  win_now_rank: number;
  mismatch: string | null;
  positional_grades: Record<string, string>;
  trade_count: number;
  positional_needs: string[];
  positional_strengths: string[];
}

// ── Positional Power ────────────────────────────────────────────────────

export interface PositionalPowerEntry {
  owner: string;
  total_sha: number;
  player_count: number;
  players: { name: string; sha_value: number; sha_pos_rank: string; age: number | null }[];
  rank: number;
}

// ── Head to Head ────────────────────────────────────────────────────────

export interface HeadToHeadResponse {
  owner1: {
    owner: string;
    total_sha: number;
    positional: Record<string, number>;
    top_5: { name: string; position: string; sha_value: number }[];
    record: { wins: number; losses: number; points_for: number } | null;
  };
  owner2: {
    owner: string;
    total_sha: number;
    positional: Record<string, number>;
    top_5: { name: string; position: string; sha_value: number }[];
    record: { wins: number; losses: number; points_for: number } | null;
  };
  positional_matchup: Record<string, { owner1: number; owner2: number; advantage: string }>;
  trade_history: { trade_id: string; date: string; sent: string[]; received: string[]; sha_balance: number }[];
  overall_advantage: string;
}

// ── Trade Chain ─────────────────────────────────────────────────────────

export interface TradeChain {
  owner: string;
  player: string;
  acquired_from: string;
  acquired_date: string;
  flipped_to: string;
  flipped_date: string;
  days_held: number | null;
}

// ── League Overview ─────────────────────────────────────────────────────

export interface LeagueOverview {
  league_id: string;
  name: string;
  season: string;
  format: {
    num_teams: number;
    is_superflex: boolean;
    is_dynasty: boolean;
    roster_positions: string[];
    starter_count: number;
    bench_count: number;
    taxi_slots: number;
  };
  scoring: { type: string; ppr: number; te_premium: number; pass_td: number };
  owners: string[];
  trade_volume: { total: number; most_active: { owner: string; trades: number }[] };
  power_rankings: { owner: string; total_sha: number }[];
}

// ── Sync Response ───────────────────────────────────────────────────────

export interface SyncResponse {
  league_id: string;
  name: string;
  season: string;
  owners: number;
  roster_players: number;
  trades: number;
  enriched_trades: number;
  synced: boolean;
}

// ── Franchise Intel ─────────────────────────────────────────────────────

export interface FranchiseIntel {
  owner: string;
  source: string;
  window?: Record<string, unknown>;
  roster_strength?: Record<string, unknown>;
  moveable_assets?: unknown[];
  ai_report?: Record<string, unknown>;
  intel?: Record<string, unknown>;
}

// ── Owner list ──────────────────────────────────────────────────────────

export interface OwnerListItem {
  name: string;
  slot: number;
  platform_user_id?: string;
}

// ── Global Player Rankings ─────────────────────────────────────────────

export interface GlobalPlayerRanking {
  player_name: string;
  name_clean: string;
  position: string;
  team: string;
  age: number | null;
  sha_value: number;
  ktc_value: number;
  dynasty_value: number;
  redraft_value: number;
  sha_overall_rank: number | null;
  sha_pos_rank: string;
  dynasty_rank: number | null;
  redraft_rank: number | null;
}

export interface GlobalPlayerRankingsResponse {
  count: number;
  snapshot_date: string | null;
  players: GlobalPlayerRanking[];
}

// ── League Report Card ─────────────────────────────────────────────────

export interface LeagueReportCardResponse {
  league_id: string;
  season: number;
  total_trades: number;
  db_avg_trades: number;
  activity_summary: string;
  biggest_robbery: { trade_id: string; date: string; winner: string; loser: string; winner_got: string[]; loser_got: string[]; sha_gap: number } | null;
  best_winwin: { trade_id: string; date: string; side_a: string; side_b: string; side_a_got: string[]; side_b_got: string[]; sha_gap: number } | null;
  most_active_trader: { owner: string; trades: number } | null;
  volume_by_owner: { owner: string; trades: number }[];
  position_market: { targeted: { position: string; count: number }[]; sold: { position: string; count: number }[]; hot_position: string; hot_count: number };
  pick_movement: { total_picks_traded: number; flow_by_owner: { owner: string; net_picks: number }[] };
  quality_leaderboard: { owner: string; trades: number; wins: number; win_pct: number; avg_sha_net: number }[];
  league_personality: { type: string; description: string };
  fun_stat: string;
  blockbusters: number;
  panic_trades: number;
  overpay_trades: number;
}
