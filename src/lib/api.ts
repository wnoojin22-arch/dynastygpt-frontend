import type {
  RosterResponse, PicksResponse, StandingEntry, RankingEntry,
  OwnerProfile, OwnerRecord, Championships, Tendencies, OwnerNeeds,
  GradedTrade, TradeGradeResponse, Rival, TradePartner,
  TrendingResponse, OwnerTrendingResponse, RosterValueChangeResponse, LeagueIntelOwner, LeagueMode,
  PositionalPowerEntry, HeadToHeadResponse, TradeChain,
  PlayerSignal, PlayerCard, PlayerTrend, ValueHistoryPoint,
  LeagueOverview, SyncResponse, FranchiseIntel, OwnerListItem,
  SeasonStat, ResolvedAsset, LeagueReportCardResponse,
  GlobalPlayerRankingsResponse,
} from "./types";

const API = "";

async function getAuthToken(skipCache = false): Promise<string | null> {
  try {
    // window.Clerk is injected by ClerkProvider after mount
    // In dev bypass mode or SSR, it won't exist — that's fine
    const clerk = (window as any).Clerk;
    if (!clerk?.session) return null;
    const token = await clerk.session.getToken(skipCache ? { skipCache: true } : undefined);
    return token || null;
  } catch {
    return null;
  }
}

async function authHeaders(skipCache = false): Promise<Record<string, string>> {
  const token = await getAuthToken(skipCache);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// Fire-and-forget error log — never throws, never blocks
function _logApiError(path: string, status: number, msg: string) {
  try {
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    fetch(`${API}/api/error-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, endpoint: path, error_message: msg.slice(0, 500), status_code: status }),
    }).catch(() => {});
  } catch { /* silent */ }
}

/** Check if a response needs a token refresh retry (401, or 403 with "Token expired"). */
async function _needsTokenRefresh(res: Response): Promise<boolean> {
  if (res.status === 401) return true;
  if (res.status === 403) {
    const text = await res.clone().text();
    return text.toLowerCase().includes("token expired");
  }
  return false;
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API}${path}`, { headers });
  // On 401 or 403 "Token expired": force a fresh Clerk token and retry once.
  // If the retry still fails, surface the error to the caller — pages
  // decide their own UX. Do NOT auto-redirect to /sign-in: a single
  // endpoint 401ing does not mean the session is dead, and blind redirects
  // cause loops when Clerk sees a valid session and bounces back.
  if (await _needsTokenRefresh(res)) {
    const freshHeaders = await authHeaders(true);
    const retry = await fetch(`${API}${path}`, { headers: freshHeaders });
    if (!retry.ok) {
      const text = await retry.text();
      _logApiError(path, retry.status, text.slice(0, 500));
      throw new Error(`API ${retry.status}: ${text}`);
    }
    return retry.json();
  }
  if (!res.ok) {
    const text = await res.text();
    _logApiError(path, res.status, text.slice(0, 500));
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders();
  const payload = body ? JSON.stringify(body) : undefined;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: payload });
  // Same policy as get(): retry once with a fresh token, then surface
  // the error to the caller. No blind sign-in redirects.
  if (await _needsTokenRefresh(res)) {
    const freshHeaders = await authHeaders(true);
    const retry = await fetch(`${API}${path}`, { method: "POST", headers: freshHeaders, body: payload });
    if (!retry.ok) {
      const text = await retry.text();
      _logApiError(path, retry.status, text.slice(0, 500));
      throw new Error(`API ${retry.status}: ${text}`);
    }
    return retry.json();
  }
  if (!res.ok) {
    const text = await res.text();
    _logApiError(path, res.status, text.slice(0, 500));
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Get auth headers for direct fetch calls outside this module */
export { authHeaders };

const L = (id: string) => `/api/league/${id}`;
const E = (s: string) => encodeURIComponent(s);
/** Prefer user_id for API calls; fall back to display name */
const O = (owner: string, userId?: string | null) => E(userId || owner);

// ── Sync & League ────────────────────────────────────────────────────────
export const syncLeague = (id: string) => get<SyncResponse>(`${L(id)}/sync`);
export const getLeagueBySlug = (slug: string) => get<{ league_id: string; name: string; slug: string; owners: { name: string; user_id: string | null }[] }>(`${L("by-slug")}/${slug}`);
export const getOverview = (id: string) => get<LeagueOverview>(`${L(id)}/overview`);
export const getStandings = (id: string) => get<{ standings: StandingEntry[] }>(`${L(id)}/standings`);
export const getRankings = (id: string) => get<{ rankings: RankingEntry[] }>(`${L(id)}/rankings`);
export const getAllRosters = (id: string) => get<{ rosters: Array<{ owner: string; players: Array<{ name: string; position: string; sha_value: number; sha_pos_rank: string; age: number | null }> }> }>(`${L(id)}/all-rosters`);
export const getOwners = (id: string) => get<{ owners: OwnerListItem[] }>(`${L(id)}/owners`);

// ── Roster ───────────────────────────────────────────────────────────────
export const getRoster = (id: string, owner: string, userId?: string | null) => get<RosterResponse>(`${L(id)}/roster/${O(owner, userId)}${userId ? `?owner_id=${E(userId)}` : ''}`);
export const getIdealLineupSHA = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/roster/${O(owner, userId)}/ideal-lineup`);

// ── Picks ────────────────────────────────────────────────────────────────
export const getPicks = (id: string, owner: string, userId?: string | null) => get<PicksResponse>(`${L(id)}/picks/${O(owner, userId)}`);

export const getPickAcquisition = (id: string, owner: string, userId?: string | null) => get<Record<string, unknown>>(`${L(id)}/owner/${O(owner, userId)}/pick-acquisition`);

// ── Trades ───────────────────────────────────────────────────────────────
export const getTrades = (id: string) => get<{ trades: unknown[] }>(`${L(id)}/trades`);
export const getRecentTrades = (id: string, limit = 10) => get<{ trades: GradedTrade[] }>(`${L(id)}/trades/recent?limit=${limit}`);
export const getGradedTrades = (id: string) => get<{ trades: GradedTrade[] }>(`${L(id)}/graded-trades`);
export const getGradedTradesByOwner = (id: string, owner: string, userId?: string | null) => get<{ trades: GradedTrade[]; wins: number; losses: number; even: number; win_rate: number }>(`${L(id)}/graded-trades/${O(owner, userId)}`);
export const getTradesByPlayer = (id: string, player: string) => get<{ trades: unknown[] }>(`${L(id)}/trades/player/${E(player)}`);
export const gradeTrade = (id: string, body: { side_a: { owner: string; assets: string[] }; side_b: { owner: string; assets: string[] } }) => post<TradeGradeResponse>(`${L(id)}/trade/grade`, body);
export const getTradeReport = (id: string, tradeId: string) => get<unknown>(`${L(id)}/trade/${tradeId}/report`);
export const getTradeHindsight = (id: string, tradeId: string) => get<unknown>(`${L(id)}/trade/${tradeId}/hindsight`);
export const getVerdictCache = (id: string) => get<{ verdicts: Record<string, unknown> }>(`${L(id)}/verdict-cache`);
export const getTradeRecord = (id: string, owner: string, userId?: string | null) => get<{ hindsight: { won: number; lost: number; even: number; decided: number; win_rate: number; pending_count: number; total_displayable: number }; trade_day: { won: number; lost: number; even: number; decided: number; win_rate: number } }>(`${L(id)}/trades/record?owner=${E(owner)}${userId ? `&owner_user_id=${E(userId)}` : ''}`);

// ── Draft ───────────────────────────────────────────────────────────────
export type UpcomingDraft = {
  draft_id: string | null;
  season: string | null;
  status: string | null;
  start_time_ms: number | null;
  last_picked_ms: number | null;
  rounds: number | null;
  teams: number | null;
  type: string | null;
  scoring_type: string | null;
  name: string | null;
};
export const getUpcomingDraft = (id: string) => get<{ upcoming: UpcomingDraft | null }>(`${L(id)}/draft/upcoming`);

export type HeroSummary = {
  num_seasons: number;
  current_champion: { season: number; owner: string } | null;
};
export const getHeroSummary = (id: string) => get<HeroSummary>(`${L(id)}/hero-summary`);

// ── Mock Draft ──────────────────────────────────────────────────────────
export const getMockDraftPreDraft = (id: string, owner?: string, ownerId?: string) => get<unknown>(`${L(id)}/draft/mock-draft/pre-draft?owner=${E(owner || '')}${ownerId ? `&owner_id=${E(ownerId)}` : ''}`);
export const simulateMockDraft = (id: string, body: { user_owner?: string; user_owner_id?: string }) => post<unknown>(`${L(id)}/draft/mock-draft/simulate`, body);
export const mockDraftPick = (id: string, body: { slot: string; prospect_name: string; prior_picks: Record<string, string>; user_owner?: string; user_owner_id?: string }) => post<unknown>(`${L(id)}/draft/mock-draft/pick`, body);

/**
 * Re-run the sim from a hypothetical state — user locked-in picks, known
 * other-owner picks, and post-trade ownership overrides. Returns the same
 * shape as /simulate, with a fresh sim_id the trade-preview endpoints can
 * reference. Empty body works too; no locked picks → behaves like /simulate.
 */
export const simulateMockDraftFromState = (
  id: string,
  body: {
    user_owner?: string;
    user_owner_id?: string;
    user_picks?: Record<string, string>;
    locked_picks?: Record<string, string>;
    pick_ownership_overrides?: Record<string, string>;
  },
) => post<unknown>(`${L(id)}/draft/mock-draft/simulate-from-state`, body);

/** Trade-up preview — user gives picks to move up to target_slot. */
export const mockDraftTradeUpPreview = (
  id: string,
  body: { sim_id: string; target_slot: string; user_owner?: string; user_owner_id?: string },
) => post<unknown>(`${L(id)}/draft/mock-draft/trade-up-preview`, body);

/** Trade-back preview — user moves down, partner moves up, user gets fillers. */
export const mockDraftTradeBackPreview = (
  id: string,
  body: { sim_id: string; target_slot: string; user_owner?: string; user_owner_id?: string },
) => post<unknown>(`${L(id)}/draft/mock-draft/trade-back-preview`, body);

/** Per-pick trade exploration — partner + willingness + up to 3 package options with verdicts. */
export const mockDraftTradeExplore = (
  id: string,
  body: {
    sim_id: string;
    direction: "up" | "back";
    target_slot: string;
    user_owner?: string;
    user_owner_id?: string;
    include_future_picks?: boolean;
  },
) => post<unknown>(`${L(id)}/draft/mock-draft/trade-explore`, body);

/** Commit a chosen trade package — swaps pick ownership in the sim, appends trade_log. */
export const mockDraftCommitTrade = (
  id: string,
  body: {
    sim_id: string;
    direction: "up" | "back";
    package: Record<string, unknown>;
    partner_owner: string;
    user_owner?: string;
    user_owner_id?: string;
  },
) => post<unknown>(`${L(id)}/draft/mock-draft/commit-trade`, body);

/** Rank partners by willingness to engage on a trade for the given slot. */
export const mockDraftLikelyBuyers = (
  id: string,
  body: {
    sim_id: string;
    slot: string;
    direction?: "up" | "back";
    limit?: number;
    user_owner?: string;
    user_owner_id?: string;
  },
) => post<unknown>(`${L(id)}/draft/mock-draft/likely-buyers`, body);

// ── Trade Builder ────────────────────────────────────────────────────────
export const getTradeBuilderSuggestions = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/trade-builder/${O(owner, userId)}`);
export const getTradeBuilderTargets = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/trade-builder/${O(owner, userId)}/targets`);
export const evaluateTrade = (id: string, body: { i_give: string[]; i_receive: string[] }) => post<unknown>(`${L(id)}/trade-builder/evaluate`, body);
export const getTradeContext = (id: string, ownerA: string, ownerB: string, userIdA?: string | null, userIdB?: string | null) => post<unknown>(`${L(id)}/trade/context?owner_a=${E(userIdA || ownerA)}&owner_b=${E(userIdB || ownerB)}`);

// ── Trade Partners ───────────────────────────────────────────────────────
export const getTradePartners = (id: string, owner: string, userId?: string | null) => get<{ partners: TradePartner[]; my_needs: string[]; my_surplus: string[] }>(`${L(id)}/trade-partners/${O(owner, userId)}`);

// ── Dynasty Score ───────────────────────────────────────────────────────
export const getDynastyScore = (id: string, owner: string, userId?: string | null) => get<DynastyScoreResponse>(`${L(id)}/owner/${O(owner, userId)}/dynasty-score`);
export const getAllDynastyScores = (id: string) => get<{ league_id: string; scores: DynastyScoreResponse[] }>(`${L(id)}/dynasty-scores`);

export interface DynastyScoreResponse {
  score: number;
  tier: {
    label: string;
    color: string;
    threshold: number;
  };
  components: {
    trade_win_rate: { score: number; max: number; detail: string; win_rate?: number; trades?: number };
    value_extraction: { score: number; max: number; detail: string; avg_surplus?: number };
    roster_construction: { score: number; max: number; detail: string; grades?: Record<string, string> };
    draft_capital: { score: number; max: number; detail: string; net_picks?: number };
    behavioral_intelligence: { score: number; max: number; detail: string; smart_moves?: number; bad_moves?: number };
    activity: { score: number; max: number; detail: string; league_avg?: number; ratio?: number };
  };
  bullets: { type: "strength" | "weakness" | "highlight" | "warning"; text: string; component: string }[];
  owner: string;
  league_id: string;
  percentile?: number;
}

// ── Owner Intel ──────────────────────────────────────────────────────────
export const getOwnerProfile = (id: string, owner: string, userId?: string | null) => get<Record<string, unknown>>(`${L(id)}/owner/${O(owner, userId)}/profile`);
export const getOwnerTendencies = (id: string, owner: string, userId?: string | null) => get<Tendencies>(`${L(id)}/owner/${O(owner, userId)}/tendencies`);
export const getOwnerTradeHistory = (id: string, owner: string, userId?: string | null) => get<{ trades: unknown[] }>(`${L(id)}/owner/${O(owner, userId)}/trade-history`);
export const getOwnerProfiles = (id: string) => get<{ profiles: OwnerProfile[] }>(`${L(id)}/owner-profiles`);
export const getOwnerRecord = (id: string, owner: string, userId?: string | null) => get<OwnerRecord>(`${L(id)}/owner-record/${O(owner, userId)}`);
export const getChampionships = (id: string, owner: string, userId?: string | null) => get<Championships>(`${L(id)}/championships/${O(owner, userId)}`);
export const getOwnerNeeds = (id: string, owner: string, userId?: string | null) => get<{ needs: OwnerNeeds[] }>(`${L(id)}/owner-needs/${O(owner, userId)}`);

// ── Waiver-wire recommendations (Rank 1, in-season basics package) ───────
// Response shape lives in docs/ships/in-season-basics-waiver-recs.md.
// Layer 2 (insurance) and Layer 3 (faab) fields on each rec are nullable
// stubs that will populate when those layers land — do not add rework here.
export type DroppableCandidate = {
  player_id: string;
  player_name: string;
  position: string;
  team: string;
  sha_value: number;
  sha_adjusted: number;
  projected_ppg: number;
  reason: "worst_value" | "position_surplus";
};
export type WaiverRec = {
  sleeper_id: string;
  player_name: string;
  position: string;
  team: string;
  // Waivers V2 headline: projected PPG + PORP (Projected Points Over
  // Positional Replacement). Replacement = best FA at position OUTSIDE
  // the top-N rec set (BE constant _PORP_TOP_N = 3).
  projected_ppg: number;
  replacement_ppg: number;
  porp: number;
  // SHA demoted to secondary (dynasty stash relevance).
  sha_value: number;
  sha_adjusted: number;
  priority_tag: string;
  position_need: "deficit" | "adequate" | "surplus";
  pos_rank: string | null;              // e.g. "TE14", from player_values.sha_pos_rank
  injury_status: string | null;
  injury_body_part: string | null;
  depth_chart_order: number | null;
  // Drop fields anchor on droppable_candidates[0] (the default worst).
  suggested_drop: DroppableCandidate | null;
  net_delta: number;                    // projected_ppg - default_drop.projected_ppg (0 when no_drop_needed)
  marginal: boolean;                    // porp <= 0
  no_drop_needed: boolean;
  insurance: unknown | null;
  // Waivers V2 Layer 3: typical FAAB cost for this rec, blended with
  // honest labels. Null when the league is priority (no bid data).
  faab: {
    typical_pct: number;                // % of team budget
    source: "league_avg" | "fleet_avg";
    n_bids: number;                     // sample size backing the estimate
    budget: number;
  } | null;
};
export type WaiverRecsResponse = {
  owner: string;
  owner_user_id: string | null;
  league_id: string;
  season: number | null;
  format: { is_superflex: boolean; scoring_type: string; pass_td_pts: number; te_premium: number };
  positional_needs: Record<string, "deficit" | "adequate" | "surplus">;
  rookie_draft_complete: boolean;
  draft_pool_hidden: number;
  open_bench_slots: number;
  protected_from_drop: { top_n_count: number; handcuff_count: number };
  droppable_candidates: DroppableCandidate[];  // Waivers V2 strip above table
  faab_context: {
    is_faab_league: boolean;
    budget: number;
  };
  counts: {
    universe: number;
    rostered_filtered_from_universe: number;
    season_killer_dropped: number;
    draft_pool_hidden: number;
    positive_delta: number;
    marginal: number;
    returned: number;
  };
  recommendations: WaiverRec[];
  notes: string[];
  generated_at: string;
};
export const getWaiverRecs = (id: string, owner: string, userId?: string | null, limit = 25) =>
  get<WaiverRecsResponse>(`${L(id)}/waiver-recs/${O(owner, userId)}?limit=${limit}`);

// Full free-agent browse — lightweight list of all available players.
export type WaiverAllPlayer = {
  sleeper_id: string;
  player_name: string;
  position: string;
  team: string;
  pos_rank: string | null;
  sha_value: number;
  sha_adjusted: number;
  projected_ppg: number;
  injury_status: string | null;
  injury_body_part: string | null;
  depth_chart_order: number | null;
  // Value ladder
  dynasty_value: number | null;
  dynasty_pos_rank: string | null;
  redraft_value: number | null;
  redraft_pos_rank: string | null;
  // Bio
  age: number | null;
  years_exp: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  // Schedule / weekly — enriched 2026-07-23 with NFL opponent per week.
  // pts is null on weeks with no projection (bye or unranked); opp is
  // null on bye week or when nfl_schedule row missing.
  weekly_ppg: Record<string, { pts: number | null; opp: string | null }>;
  bye_week: number | null;
  // Handcuff-for-opponent flag
  handcuff_for: {
    player_name: string;
    injury_status: string;
    rostered_by: string;
    team: string;
    position: string;
  } | null;
};
export type WaiversAllResponse = {
  format: { is_superflex: boolean; scoring_type: string; pass_td_pts: number; te_premium: number };
  season: number | null;
  rookie_draft_complete: boolean;
  counts: {
    universe: number;
    rostered_filtered: number;
    season_killer_dropped: number;
    draft_pool_hidden: number;
    returned: number;
  };
  players: WaiverAllPlayer[];
};
export const getWaiversAll = (id: string) =>
  get<WaiversAllResponse>(`${L(id)}/waivers-all`);

// ── Rivalries ────────────────────────────────────────────────────────────
export const getRivalries = (id: string, owner: string, userId?: string | null) => get<{ rivals: Rival[] }>(`${L(id)}/rivalries/${O(owner, userId)}`);
export const getHeadToHead = (id: string, o1: string, o2: string, uid1?: string | null, uid2?: string | null) => get<HeadToHeadResponse>(`${L(id)}/head-to-head/${O(o1, uid1)}/${O(o2, uid2)}`);

// ── Franchise Intel ──────────────────────────────────────────────────────
export const getFranchiseIntel = (id: string, owner: string, userId?: string | null) => get<FranchiseIntel>(`${L(id)}/intel/${O(owner, userId)}`);
export const getCoachesCorner = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/intel/${O(owner, userId)}/coaches-corner`);
export const getGmVerdict = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/intel/${O(owner, userId)}/gm-verdict`);
export const getActions = (id: string, owner: string, userId?: string | null) => get<{ stop: string[]; start: string[]; keep: string[] }>(`${L(id)}/intel/${O(owner, userId)}/actions`);

// ── League Intel ─────────────────────────────────────────────────────────
export const getLeagueIntel = (id: string) => get<{ owners: LeagueIntelOwner[]; league_mode: LeagueMode | null }>(`${L(id)}/league-intel`);

// ── Welcome articles (read-only from ai_insights cache) ─────────────────
export interface WelcomeArticle {
  headline: string;
  subheadline: string;
  body: string;
}
export interface WelcomeArticleResponse {
  available: boolean;
  league_id: string;
  owner?: string;
  generated_at?: string | null;
  expired?: boolean;
  article?: WelcomeArticle;
}
export const getPlatformUpdate = (id: string) =>
  get<WelcomeArticleResponse>(`${L(id)}/welcome/platform-update`);
export const getLeagueNewsWelcome = (id: string) =>
  get<WelcomeArticleResponse>(`${L(id)}/welcome/league-news`);
export const getMyNewsFirstReport = (id: string, owner: string, userId?: string | null) =>
  get<WelcomeArticleResponse>(`${L(id)}/welcome/my-news/${O(owner, userId)}`);

// ── League Report Card ──────────────────────────────────────────────────
export const getReportCard = (id: string) => get<LeagueReportCardResponse>(`${L(id)}/report-card`);
export const getMarketPulse = (id: string) => get<{ league_id: string; most_traded: { player: string; trade_count: number }[]; above_market: { player: string; position: string; pct_diff: number; sha_value: number; market_price: number }[]; below_market: { player: string; position: string; pct_diff: number; sha_value: number; market_price: number }[] }>(`${L(id)}/market-pulse`);

// ── Positional Power ─────────────────────────────────────────────────────
export const getPositionalPower = (id: string, pos: string) => get<{ rankings: PositionalPowerEntry[] }>(`${L(id)}/positional-power/${pos}`);

// ── Trending ─────────────────────────────────────────────────────────────
export const getTrending = (id: string, days = 7) => get<TrendingResponse>(`${L(id)}/trending?days=${days}`);
export const getOwnerTrending = (id: string, owner: string, userId?: string | null, days = 7) => get<OwnerTrendingResponse>(`${L(id)}/trending/${O(owner, userId)}?days=${days}`);
export const getRosterValueChange = (id: string, owner: string, userId?: string | null, days = 30) => get<RosterValueChangeResponse>(`${L(id)}/roster-value-change/${O(owner, userId)}?days=${days}`);

// ── Player ───────────────────────────────────────────────────────────────
export const getPlayerSignals = (id: string) => get<{ signals: PlayerSignal[] }>(`${L(id)}/player-signals`);
export const batchPlayerSignals = (id: string, players: string[]) => post<{ signals: { player: string; signal: string; sha_value: number; reasons: string[] }[] }>(`${L(id)}/player-signals/batch`, { players });
export const getPlayerCard = (id: string, player: string) => get<PlayerCard>(`${L(id)}/player-card/${E(player)}`);
export const getPlayerPpg = (id: string, player: string) => get<{ seasons: SeasonStat[] }>(`${L(id)}/player-card/ppg/${E(player)}`);
export const getPlayerAcquisition = (id: string, player: string) => get<unknown>(`${L(id)}/player-card/acquisition/${E(player)}`);
export const getPlayerHistory = (id: string, player: string) => get<{ timeline: unknown[] }>(`${L(id)}/player-history/${E(player)}`);
export const getPlayerValueHistory = (id: string, player: string, days = 90) => get<{ history: ValueHistoryPoint[] }>(`${L(id)}/player/history/${player}?days=${days}`);
export const getPlayerTrend = (id: string, player: string, days = 30) => get<PlayerTrend>(`${L(id)}/player-trend/${player}?days=${days}`);
export const getPlayerValue = (id: string, player: string, date?: string) => get<unknown>(`${L(id)}/player-value/${player}${date ? `?date=${date}` : ""}`);
export const getPlayerProduction = (id: string, player: string) => get<unknown>(`${L(id)}/player-production/${E(player)}`);
export const getWhoHas = (id: string, player: string) => get<unknown>(`${L(id)}/who-has/${E(player)}`);
export const getPointInTimeRank = (id: string, player: string, date: string) => get<unknown>(`${L(id)}/point-in-time-rank/${player}?date=${date}`);
export const getPlayerPriceHistory = (player: string, leagueId?: string) =>
  get<Record<string, unknown>>(
    `/api/market/player/${encodeURIComponent(player)}/price-history${leagueId ? `?league_id=${encodeURIComponent(leagueId)}` : ""}`
  );

// ── Draft ────────────────────────────────────────────────────────────────
export const getDraftHistory = (id: string) => get<any>(`${L(id)}/draft/history`);
export const getDraftHitRates = (id: string) => get<any>(`${L(id)}/draft/hit-rates`);
export const getDraftOwnerProfiles = (id: string) => get<any>(`${L(id)}/draft/owner-profiles`);
export const getDraftGrades = (id: string) => get<any>(`${L(id)}/draft/grades`);
export const getDraftPickIntel = (id: string, owner: string) => get<any>(`${L(id)}/draft/pick-intel/${E(owner)}`);
export const getDraftDayTrades = (id: string) => get<any>(`${L(id)}/draft/draft-day-trades`);
export const getDraftAnalysis = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/draft/analysis/${O(owner, userId)}`);

// ── Draft HQ (composite + tendencies) ────────────────────────────────────
export const getDraftHQYourPicks = (id: string, owner: string, userId?: string | null, partnersPerPick = 3) =>
  get<any>(`${L(id)}/draft-hq/your-picks?owner=${E(owner)}${userId ? `&owner_id=${E(userId)}` : ""}&partners_per_pick=${partnersPerPick}`);
export const getDraftHQYourPicksRecs = (id: string, owner: string, userId?: string | null) =>
  get<any>(`${L(id)}/draft-hq/your-picks-recs?owner=${E(owner)}${userId ? `&owner_id=${E(userId)}` : ""}`);
export const getDraftHQTendencies = (id: string) => get<any>(`${L(id)}/draft-hq/tendencies`);
export const getDraftHQOwnerStrategicIntel = (id: string) =>
  get<any>(`${L(id)}/draft-hq/owner-strategic-intel`);
export const getDraftHQRookieADP = (id: string, limit = 60, position?: string) =>
  get<any>(`${L(id)}/draft-hq/rookie-adp-2026?limit=${limit}${position ? `&position=${E(position)}` : ""}`);
export const getDraftHQBoardProjection = (id: string) =>
  get<any>(`${L(id)}/draft-hq/board-projection`);

// ── Rankings ─────────────────────────────────────────────────────────────
export const getDynastyRanks = (id: string) => get<{ rankings: unknown[] }>(`${L(id)}/dynasty-ranks`);
export const getRedraftRanks = (id: string) => get<{ rankings: unknown[] }>(`${L(id)}/redraft-ranks`);

// ── Trade Chains ─────────────────────────────────────────────────────────
export const getTradeChains = (id: string) => get<{ chains: TradeChain[] }>(`${L(id)}/trade-chains`);

// ── AI ───────────────────────────────────────────────────────────────────
export const aiChat = (id: string, message: string, owner?: string, userId?: string | null) => post<{ response: string }>(`${L(id)}/ai/chat`, { message, owner: userId || owner });
export const getScoutingReport = (id: string, owner: string, userId?: string | null) => get<{ report: string; owner: string; sha_rank: number; total_sha: number }>(`${L(id)}/ai/scouting-report/${O(owner, userId)}`);
export const getAiTradeCommentary = (id: string, tradeId: string) => post<unknown>(`${L(id)}/ai/trade-commentary?trade_id=${tradeId}`);
export const getAiTradeIntel = (id: string, owner: string, userId?: string | null) => post<unknown>(`${L(id)}/ai/trade-intel?owner=${O(owner, userId)}`);

// ── Lineup Efficiency ────────────────────────────────────────────────────
export const getIdealLineup = (id: string, owner: string, userId?: string | null, season = 2025) => get<Record<string, unknown>>(`${L(id)}/ideal-lineup/${O(owner, userId)}?season=${season}`);
export const getLineupEfficiency = (id: string, season = 2025) => get<{ rankings: Array<Record<string, unknown>> }>(`${L(id)}/lineup-efficiency?season=${season}`);

// ── Market Feed ─────────────────────────────────────────────────────────
export const getMarketFeed = (id: string, owner: string, userId?: string | null, days = 120) => get<Record<string, unknown>>(`${L(id)}/owner/${O(owner, userId)}/market-feed?days=${days}`);

// ── Price Check ─────────────────────────────────────────────────────────
export const getPriceCheck = (id: string, query: string, days = 180) => get<Record<string, unknown>>(`${L(id)}/price-check/${E(query)}?days=${days}`);

// ── Share Image ─────────────────────────────────────────────────────────
export const getTradeShareImageUrl = (id: string, tradeId: string) => `${API}${L(id)}/trade/${tradeId}/share-image`;

// ── Hindsight ───────────────────────────────────────────────────────────
export const getTradeHindsightGrade = (id: string, tradeId: string) => get<Record<string, unknown>>(`${L(id)}/trade/${tradeId}/hindsight`);

// ── User (cross-league by platform_user_id) ─────────────────────────────
const U = (uid: string) => `/api/user/${uid}`;
export const getUserLeagues = (uid: string) => get<{ user_id: string; display_name: string; leagues: { league_id: string; league_name: string; season: string; display_name: string }[] }>(`${U(uid)}/leagues`);
export const getUserTrades = (uid: string, leagueId?: string) => get<{ trades: unknown[] }>(`${U(uid)}/trades${leagueId ? `?league_id=${leagueId}` : ""}`);
export const getUserProfile = (uid: string) => get<{ user_id: string; display_name: string; leagues: unknown[]; total_trades: number }>(`${U(uid)}/profile`);

// Portfolio home — one-shot card payload for the redesigned /dashboard.
export type PortfolioCard = {
  league_id: string;
  slug: string;
  league_name: string;
  team_name: string | null;
  // Raw Sleeper login handle. Populated from the standings fan-out; null when
  // that fetch fell back to the DB `owners.display_name` label. FE renders
  // this as a secondary line only when it differs from `team_name`.
  sleeper_username: string | null;
  season: string | number | null;
  format: {
    num_teams: number | null;
    is_superflex: boolean | null;
    scoring_type: string | null;
    te_premium: number;
    label: string;
  };
  record: {
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
  } | null;
  rank: {
    dynasty_rank: number | null;
    dynasty_score: number | null;
    dynasty_tier: string | null;
    dynasty_percentile: number | null;
    of_teams: number | null;
  };
  odds: {
    playoff_pct: number | null;
    title_pct: number | null;
    bye_pct: number | null;
    expected_wins: number | null;
    as_of_week: number | null;
    computed_at: string | null;
    awaiting_projections: boolean;
  };
};
export type Portfolio = {
  user_id: string;
  display_name: string | null;
  leagues: PortfolioCard[];
};
export const getPortfolio = (uid: string) => get<Portfolio>(`${U(uid)}/portfolio`);

export type CrossLeagueProfile = {
  user_id: string;
  totals: {
    leagues: number;
    trades: number;
    decided_verdicts: number;
    verdicts_win_rate: number | null;
  };
  // Career record + titles from season_results. `record_source` marks whether
  // wins/losses came from the current season's live standings or from the
  // most-recent completed season fallback (pre-season case).
  record: {
    wins: number;
    losses: number;
    record_source: "current" | "last_completed";
    seasons_counted: number;
    championships: number;
    seasons_on_record: number;
    record_by_league: Array<{
      league_id: string;
      season: number | string;
      wins: number;
      losses: number;
    }>;
  };
  archetype: {
    primary: string | null;
    confidence: number | null;
    early_read: boolean;
    description: string;
  };
  positional_tilt: {
    buys: string[];
    sells: string[];
    net_flow: Record<string, number>;
    counts: { bought: Record<string, number>; sold: Record<string, number> };
  };
  cadence: {
    peak_months: number[];
    longest_gap_days: number | null;
    trades_last_30d: number;
    active_leagues_last_30d: number;
  };
  // Team-state windows powered by the shared `competitive_window.classify_window`
  // (BE — same function drives the league dashboard's owner_profiles path).
  // `active_leagues` = contender + balanced + rebuilder — exposes the count of
  // leagues that have active-season odds available for classification, so the
  // hero strip can render "N active leagues" without recomputing.
  windows: {
    contender: number;
    rebuilder: number;
    balanced: number;
    active_leagues: number;
  };
};
export const getCrossLeagueProfile = (uid: string) =>
  get<CrossLeagueProfile>(`${U(uid)}/cross-league-profile`);
export const setActiveLeague = (clerkUserId: string, sleeperUserId: string, leagueId: string) =>
  post<{ success: boolean; active_league_id: string }>(
    `/api/user/set-active-league`,
    { clerk_user_id: clerkUserId, sleeper_user_id: sleeperUserId, league_id: leagueId },
  );

// ── Global Player Rankings (format-adjusted when league_id passed) ──
export const getGlobalPlayerRankings = (leagueId?: string) =>
  get<GlobalPlayerRankingsResponse>(
    `/api/market/player-rankings${leagueId ? `?league_id=${leagueId}` : ""}`,
  );

// ── Admin ────────────────────────────────────────────────────────────────
export const enrichTrades = (id: string) => get<unknown>(`${L(id)}/trades/enrich`);
export const precomputeVerdicts = (id: string) => post<unknown>(`${L(id)}/verdicts/precompute`);
