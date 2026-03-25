import type {
  RosterResponse, PicksResponse, StandingEntry, RankingEntry,
  OwnerProfile, OwnerRecord, Championships, Tendencies, OwnerNeeds,
  GradedTrade, TradeGradeResponse, Rival, TradePartner,
  TrendingResponse, OwnerTrendingResponse, LeagueIntelOwner,
  PositionalPowerEntry, HeadToHeadResponse, TradeChain,
  PlayerSignal, PlayerCard, PlayerTrend, ValueHistoryPoint,
  LeagueOverview, SyncResponse, FranchiseIntel, OwnerListItem,
  SeasonStat, ResolvedAsset,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

// ── Sync & League ────────────────────────────────────────────────────────
export const syncLeague = (id: string) => get<SyncResponse>(`${L(id)}/sync`);
export const getOverview = (id: string) => get<LeagueOverview>(`${L(id)}/overview`);
export const getStandings = (id: string) => get<{ standings: StandingEntry[] }>(`${L(id)}/standings`);
export const getRankings = (id: string) => get<{ rankings: RankingEntry[] }>(`${L(id)}/rankings`);
export const getOwners = (id: string) => get<{ owners: OwnerListItem[] }>(`${L(id)}/owners`);

// ── Roster ───────────────────────────────────────────────────────────────
export const getRoster = (id: string, owner: string) => get<RosterResponse>(`${L(id)}/roster/${owner}`);
export const getIdealLineup = (id: string, owner: string) => get<unknown>(`${L(id)}/roster/${owner}/ideal-lineup`);

// ── Picks ────────────────────────────────────────────────────────────────
export const getPicks = (id: string, owner: string) => get<PicksResponse>(`${L(id)}/picks/${owner}`);

// ── Trades ───────────────────────────────────────────────────────────────
export const getTrades = (id: string) => get<{ trades: unknown[] }>(`${L(id)}/trades`);
export const getRecentTrades = (id: string, limit = 10) => get<{ trades: GradedTrade[] }>(`${L(id)}/trades/recent?limit=${limit}`);
export const getGradedTrades = (id: string) => get<{ trades: GradedTrade[] }>(`${L(id)}/graded-trades`);
export const getGradedTradesByOwner = (id: string, owner: string) => get<{ trades: GradedTrade[]; wins: number; losses: number; pushes: number; win_rate: number }>(`${L(id)}/graded-trades/${owner}`);
export const getTradesByPlayer = (id: string, player: string) => get<{ trades: unknown[] }>(`${L(id)}/trades/player/${player}`);
export const gradeTrade = (id: string, body: { side_a: { owner: string; assets: string[] }; side_b: { owner: string; assets: string[] } }) => post<TradeGradeResponse>(`${L(id)}/trade/grade`, body);
export const getTradeReport = (id: string, tradeId: string) => get<unknown>(`${L(id)}/trade/${tradeId}/report`);
export const getTradeHindsight = (id: string, tradeId: string) => get<unknown>(`${L(id)}/trade/${tradeId}/hindsight`);
export const getVerdictCache = (id: string) => get<{ verdicts: Record<string, unknown> }>(`${L(id)}/verdict-cache`);

// ── Trade Builder ────────────────────────────────────────────────────────
export const getTradeBuilderSuggestions = (id: string, owner: string) => get<unknown>(`${L(id)}/trade-builder/${owner}`);
export const getTradeBuilderTargets = (id: string, owner: string) => get<unknown>(`${L(id)}/trade-builder/${owner}/targets`);
export const evaluateTrade = (id: string, body: { i_give: string[]; i_receive: string[] }) => post<unknown>(`${L(id)}/trade-builder/evaluate`, body);
export const getTradeContext = (id: string, ownerA: string, ownerB: string) => post<unknown>(`${L(id)}/trade/context?owner_a=${ownerA}&owner_b=${ownerB}`);

// ── Trade Partners ───────────────────────────────────────────────────────
export const getTradePartners = (id: string, owner: string) => get<{ partners: TradePartner[]; my_needs: string[]; my_surplus: string[] }>(`${L(id)}/trade-partners/${owner}`);

// ── Owner Intel ──────────────────────────────────────────────────────────
export const getOwnerProfile = (id: string, owner: string) => get<{ owner: string; tendencies: Tendencies; trade_count: number; recent_trades: unknown[] }>(`${L(id)}/owner/${owner}/profile`);
export const getOwnerTendencies = (id: string, owner: string) => get<Tendencies>(`${L(id)}/owner/${owner}/tendencies`);
export const getOwnerTradeHistory = (id: string, owner: string) => get<{ trades: unknown[] }>(`${L(id)}/owner/${owner}/trade-history`);
export const getOwnerProfiles = (id: string) => get<{ profiles: OwnerProfile[] }>(`${L(id)}/owner-profiles`);
export const getOwnerRecord = (id: string, owner: string) => get<OwnerRecord>(`${L(id)}/owner-record/${owner}`);
export const getChampionships = (id: string, owner: string) => get<Championships>(`${L(id)}/championships/${owner}`);
export const getOwnerNeeds = (id: string, owner: string) => get<{ needs: OwnerNeeds[] }>(`${L(id)}/owner-needs/${owner}`);

// ── Rivalries ────────────────────────────────────────────────────────────
export const getRivalries = (id: string, owner: string) => get<{ rivals: Rival[] }>(`${L(id)}/rivalries/${owner}`);
export const getHeadToHead = (id: string, o1: string, o2: string) => get<HeadToHeadResponse>(`${L(id)}/head-to-head/${o1}/${o2}`);

// ── Franchise Intel ──────────────────────────────────────────────────────
export const getFranchiseIntel = (id: string, owner: string) => get<FranchiseIntel>(`${L(id)}/intel/${owner}`);
export const getCoachesCorner = (id: string, owner: string) => get<unknown>(`${L(id)}/intel/${owner}/coaches-corner`);
export const getGmVerdict = (id: string, owner: string) => get<unknown>(`${L(id)}/intel/${owner}/gm-verdict`);
export const getActions = (id: string, owner: string) => get<{ stop: string[]; start: string[]; keep: string[] }>(`${L(id)}/intel/${owner}/actions`);

// ── League Intel ─────────────────────────────────────────────────────────
export const getLeagueIntel = (id: string) => get<{ owners: LeagueIntelOwner[] }>(`${L(id)}/league-intel`);

// ── Positional Power ─────────────────────────────────────────────────────
export const getPositionalPower = (id: string, pos: string) => get<{ rankings: PositionalPowerEntry[] }>(`${L(id)}/positional-power/${pos}`);

// ── Trending ─────────────────────────────────────────────────────────────
export const getTrending = (id: string, days = 7) => get<TrendingResponse>(`${L(id)}/trending?days=${days}`);
export const getOwnerTrending = (id: string, owner: string, days = 7) => get<OwnerTrendingResponse>(`${L(id)}/trending/${owner}?days=${days}`);

// ── Player ───────────────────────────────────────────────────────────────
export const getPlayerSignals = (id: string) => get<{ signals: PlayerSignal[] }>(`${L(id)}/player-signals`);
export const batchPlayerSignals = (id: string, players: string[]) => post<{ signals: { player: string; signal: string; sha_value: number; reasons: string[] }[] }>(`${L(id)}/player-signals/batch`, { players });
export const getPlayerCard = (id: string, player: string) => get<PlayerCard>(`${L(id)}/player-card/${player}`);
export const getPlayerPpg = (id: string, player: string) => get<{ seasons: SeasonStat[] }>(`${L(id)}/player-card/ppg/${player}`);
export const getPlayerAcquisition = (id: string, player: string) => get<unknown>(`${L(id)}/player-card/acquisition/${player}`);
export const getPlayerHistory = (id: string, player: string) => get<{ timeline: unknown[] }>(`${L(id)}/player-history/${player}`);
export const getPlayerValueHistory = (id: string, player: string, days = 90) => get<{ history: ValueHistoryPoint[] }>(`${L(id)}/player/history/${player}?days=${days}`);
export const getPlayerTrend = (id: string, player: string, days = 30) => get<PlayerTrend>(`${L(id)}/player-trend/${player}?days=${days}`);
export const getPlayerValue = (id: string, player: string, date?: string) => get<unknown>(`${L(id)}/player-value/${player}${date ? `?date=${date}` : ""}`);
export const getPlayerProduction = (id: string, player: string) => get<unknown>(`${L(id)}/player-production/${player}`);
export const getWhoHas = (id: string, player: string) => get<unknown>(`${L(id)}/who-has/${player}`);
export const getPointInTimeRank = (id: string, player: string, date: string) => get<unknown>(`${L(id)}/point-in-time-rank/${player}?date=${date}`);

// ── Draft ────────────────────────────────────────────────────────────────
export const getDraftHistory = (id: string, season?: string) => get<{ picks: unknown[] }>(`${L(id)}/draft/history${season ? `?season=${season}` : ""}`);
export const getDraftAnalysis = (id: string, owner: string) => get<unknown>(`${L(id)}/draft/analysis/${owner}`);

// ── Rankings ─────────────────────────────────────────────────────────────
export const getDynastyRanks = (id: string) => get<{ rankings: unknown[] }>(`${L(id)}/dynasty-ranks`);
export const getRedraftRanks = (id: string) => get<{ rankings: unknown[] }>(`${L(id)}/redraft-ranks`);

// ── Trade Chains ─────────────────────────────────────────────────────────
export const getTradeChains = (id: string) => get<{ chains: TradeChain[] }>(`${L(id)}/trade-chains`);

// ── AI ───────────────────────────────────────────────────────────────────
export const aiChat = (id: string, message: string, owner?: string) => post<{ response: string }>(`${L(id)}/ai/chat`, { message, owner });
export const getScoutingReport = (id: string, owner: string) => get<{ report: string; owner: string; sha_rank: number; total_sha: number }>(`${L(id)}/ai/scouting-report/${owner}`);
export const getAiTradeCommentary = (id: string, tradeId: string) => post<unknown>(`${L(id)}/ai/trade-commentary?trade_id=${tradeId}`);
export const getAiTradeIntel = (id: string, owner: string) => post<unknown>(`${L(id)}/ai/trade-intel?owner=${owner}`);

// ── Admin ────────────────────────────────────────────────────────────────
export const enrichTrades = (id: string) => get<unknown>(`${L(id)}/trades/enrich`);
export const precomputeVerdicts = (id: string) => post<unknown>(`${L(id)}/verdicts/precompute`);
