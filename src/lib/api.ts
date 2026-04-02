import type {
  RosterResponse, PicksResponse, StandingEntry, RankingEntry,
  OwnerProfile, OwnerRecord, Championships, Tendencies, OwnerNeeds,
  GradedTrade, TradeGradeResponse, Rival, TradePartner,
  TrendingResponse, OwnerTrendingResponse, RosterValueChangeResponse, LeagueIntelOwner,
  PositionalPowerEntry, HeadToHeadResponse, TradeChain,
  PlayerSignal, PlayerCard, PlayerTrend, ValueHistoryPoint,
  LeagueOverview, SyncResponse, FranchiseIntel, OwnerListItem,
  SeasonStat, ResolvedAsset, LeagueReportCardResponse,
  GlobalPlayerRankingsResponse,
} from "./types";

const API = "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

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
export const getRoster = (id: string, owner: string, userId?: string | null) => get<RosterResponse>(`${L(id)}/roster/${O(owner, userId)}`);
export const getIdealLineupSHA = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/roster/${O(owner, userId)}/ideal-lineup`);

// ── Picks ────────────────────────────────────────────────────────────────
export const getPicks = (id: string, owner: string, userId?: string | null) => get<PicksResponse>(`${L(id)}/picks/${O(owner, userId)}`);

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

// ── Rivalries ────────────────────────────────────────────────────────────
export const getRivalries = (id: string, owner: string, userId?: string | null) => get<{ rivals: Rival[] }>(`${L(id)}/rivalries/${O(owner, userId)}`);
export const getHeadToHead = (id: string, o1: string, o2: string, uid1?: string | null, uid2?: string | null) => get<HeadToHeadResponse>(`${L(id)}/head-to-head/${O(o1, uid1)}/${O(o2, uid2)}`);

// ── Franchise Intel ──────────────────────────────────────────────────────
export const getFranchiseIntel = (id: string, owner: string, userId?: string | null) => get<FranchiseIntel>(`${L(id)}/intel/${O(owner, userId)}`);
export const getCoachesCorner = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/intel/${O(owner, userId)}/coaches-corner`);
export const getGmVerdict = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/intel/${O(owner, userId)}/gm-verdict`);
export const getActions = (id: string, owner: string, userId?: string | null) => get<{ stop: string[]; start: string[]; keep: string[] }>(`${L(id)}/intel/${O(owner, userId)}/actions`);

// ── League Intel ─────────────────────────────────────────────────────────
export const getLeagueIntel = (id: string) => get<{ owners: LeagueIntelOwner[] }>(`${L(id)}/league-intel`);

// ── League Report Card ──────────────────────────────────────────────────
export const getReportCard = (id: string) => get<LeagueReportCardResponse>(`${L(id)}/report-card`);

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
export const getPlayerPriceHistory = (player: string) => get<Record<string, unknown>>(`/api/market/player/${encodeURIComponent(player)}/price-history`);

// ── Draft ────────────────────────────────────────────────────────────────
export const getDraftHistory = (id: string) => get<any>(`${L(id)}/draft/history`);
export const getDraftHitRates = (id: string) => get<any>(`${L(id)}/draft/hit-rates`);
export const getDraftOwnerProfiles = (id: string) => get<any>(`${L(id)}/draft/owner-profiles`);
export const getDraftGrades = (id: string) => get<any>(`${L(id)}/draft/grades`);
export const getDraftPickIntel = (id: string, owner: string) => get<any>(`${L(id)}/draft/pick-intel/${E(owner)}`);
export const getDraftDayTrades = (id: string) => get<any>(`${L(id)}/draft/draft-day-trades`);
export const getDraftAnalysis = (id: string, owner: string, userId?: string | null) => get<unknown>(`${L(id)}/draft/analysis/${O(owner, userId)}`);

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

// ── Global Player Rankings (no league required) ─────────────────────
export const getGlobalPlayerRankings = () => get<GlobalPlayerRankingsResponse>("/api/market/player-rankings");

// ── Admin ────────────────────────────────────────────────────────────────
export const enrichTrades = (id: string) => get<unknown>(`${L(id)}/trades/enrich`);
export const precomputeVerdicts = (id: string) => post<unknown>(`${L(id)}/verdicts/precompute`);
