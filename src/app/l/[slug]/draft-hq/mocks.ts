// Mock data for Draft HQ shell. Replace as backend endpoints come online.

export type Pos = "QB" | "RB" | "WR" | "TE";

export type RookieRow = {
  rank: number;          // overall rank (format-aware in real data)
  name: string;
  position: Pos;
  team: string;          // NFL team / "FA"
  age: number;
  adp_avg: number | null;        // null until crawl finishes
  adp_p10: number | null;
  adp_p90: number | null;
  tier: number;
  pct_drafted: number | null;    // % of dynasty leagues already taken
  trend: "up" | "down" | "flat";
};

export type UserPickRow = {
  slot: string;          // "1.06"
  pick_num: number;      // absolute (1-based)
  recommended: { name: string; position: Pos; rank: number; fit_score: number; reason: string }[];
  tier_cliff_after: boolean;
};

export type ManagerIntel = {
  user_id: string;
  name: string;
  reach_rate: number;        // 0..100 — % of past picks classified REACH
  pick_trade_rate: number;   // % of trades involving picks
  qb_early_score: number;    // 0..100 — drafts QBs above their ADP
  te_premium_score: number;  // 0..100 — drafts TEs above their ADP
  trade_up_willingness: number; // 0..100 — heuristic placeholder
  recent_move: string | null;
};

// ── Mock rookies (FP rookie_dynasty 2026 top-30 SF order, fabricated stats) ──
export const MOCK_ROOKIES: RookieRow[] = [
  { rank: 1,  name: "Jeremiyah Love",     position: "RB", team: "ND",  age: 21, adp_avg: 1.8,  adp_p10: 1.0, adp_p90: 3.0,  tier: 1, pct_drafted: 0.92, trend: "up" },
  { rank: 2,  name: "Fernando Mendoza",   position: "QB", team: "CAL", age: 22, adp_avg: 3.1,  adp_p10: 2.0, adp_p90: 5.0,  tier: 1, pct_drafted: 0.88, trend: "flat" },
  { rank: 3,  name: "Carnell Tate",       position: "WR", team: "OSU", age: 21, adp_avg: 3.4,  adp_p10: 2.0, adp_p90: 6.0,  tier: 1, pct_drafted: 0.85, trend: "up" },
  { rank: 4,  name: "Jordyn Tyson",       position: "WR", team: "ASU", age: 22, adp_avg: 4.2,  adp_p10: 3.0, adp_p90: 7.0,  tier: 1, pct_drafted: 0.79, trend: "up" },
  { rank: 5,  name: "Makai Lemon",        position: "WR", team: "USC", age: 20, adp_avg: 5.1,  adp_p10: 4.0, adp_p90: 8.0,  tier: 2, pct_drafted: 0.71, trend: "flat" },
  { rank: 6,  name: "Drew Allar",         position: "QB", team: "PSU", age: 22, adp_avg: 6.4,  adp_p10: 5.0, adp_p90: 11.0, tier: 2, pct_drafted: 0.66, trend: "down" },
  { rank: 7,  name: "Jeremiah Smith",     position: "WR", team: "OSU", age: 19, adp_avg: 2.4,  adp_p10: 1.0, adp_p90: 4.0,  tier: 1, pct_drafted: 0.94, trend: "up" },
  { rank: 8,  name: "Antonio Williams",   position: "WR", team: "CLE", age: 22, adp_avg: 8.3,  adp_p10: 6.0, adp_p90: 12.0, tier: 2, pct_drafted: 0.55, trend: "flat" },
  { rank: 9,  name: "Garrett Nussmeier",  position: "QB", team: "LSU", age: 24, adp_avg: 9.5,  adp_p10: 7.0, adp_p90: 14.0, tier: 2, pct_drafted: 0.48, trend: "down" },
  { rank: 10, name: "Eric Singleton",     position: "WR", team: "GT",  age: 21, adp_avg: 10.1, adp_p10: 8.0, adp_p90: 14.0, tier: 2, pct_drafted: 0.42, trend: "up" },
  { rank: 11, name: "Jaydn Ott",          position: "RB", team: "CAL", age: 22, adp_avg: 11.6, adp_p10: 9.0, adp_p90: 16.0, tier: 3, pct_drafted: 0.36, trend: "flat" },
  { rank: 12, name: "Cam Coleman",        position: "WR", team: "AUB", age: 19, adp_avg: 12.8, adp_p10: 10.0,adp_p90: 18.0, tier: 3, pct_drafted: 0.31, trend: "up" },
  { rank: 13, name: "Kaleb Johnson",      position: "RB", team: "IOWA",age: 22, adp_avg: 14.0, adp_p10: 11.0,adp_p90: 19.0, tier: 3, pct_drafted: 0.27, trend: "flat" },
  { rank: 14, name: "Dante Moore",        position: "QB", team: "ORE", age: 20, adp_avg: 15.6, adp_p10: 12.0,adp_p90: 22.0, tier: 3, pct_drafted: 0.22, trend: "up" },
  { rank: 15, name: "Cade Klubnik",       position: "QB", team: "CLEM",age: 22, adp_avg: 16.4, adp_p10: 13.0,adp_p90: 24.0, tier: 3, pct_drafted: 0.18, trend: "down" },
  { rank: 16, name: "Trebor Pena",        position: "WR", team: "SYR", age: 22, adp_avg: 18.1, adp_p10: 14.0,adp_p90: 26.0, tier: 4, pct_drafted: 0.14, trend: "flat" },
  { rank: 17, name: "Eli Stowers",        position: "TE", team: "VAN", age: 23, adp_avg: 18.7, adp_p10: 15.0,adp_p90: 27.0, tier: 4, pct_drafted: 0.12, trend: "up" },
  { rank: 18, name: "Tory Horton",        position: "WR", team: "CSU", age: 23, adp_avg: 20.2, adp_p10: 16.0,adp_p90: 28.0, tier: 4, pct_drafted: 0.10, trend: "flat" },
  { rank: 19, name: "RJ Harvey",          position: "RB", team: "UCF", age: 23, adp_avg: 21.5, adp_p10: 17.0,adp_p90: 30.0, tier: 4, pct_drafted: 0.08, trend: "up" },
  { rank: 20, name: "Bryson Daily",       position: "RB", team: "ARMY",age: 22, adp_avg: 23.8, adp_p10: 19.0,adp_p90: 32.0, tier: 4, pct_drafted: 0.06, trend: "flat" },
];

// ── Mock user picks (assuming slot 6 in 12-team SF) ──
export const MOCK_USER_PICKS: UserPickRow[] = [
  {
    slot: "1.06",
    pick_num: 6,
    tier_cliff_after: false,
    recommended: [
      { name: "Drew Allar",       position: "QB", rank: 6, fit_score: 84, reason: "Slot value, fills QB2 hole, age fit" },
      { name: "Jeremiah Smith",   position: "WR", rank: 2, fit_score: 91, reason: "Massive STEAL — falls 4 picks past consensus" },
      { name: "Carnell Tate",     position: "WR", rank: 3, fit_score: 78, reason: "WR depth surplus already; FAIR but lower fit" },
    ],
  },
  {
    slot: "2.06",
    pick_num: 18,
    tier_cliff_after: true,
    recommended: [
      { name: "Tory Horton",      position: "WR", rank: 18, fit_score: 76, reason: "Tier 4 cliff right after — last reliable WR" },
      { name: "Eli Stowers",      position: "TE", rank: 17, fit_score: 81, reason: "Only TE in top-25, your TE is 31yo" },
      { name: "RJ Harvey",        position: "RB", rank: 19, fit_score: 65, reason: "RB room is set; depth lottery only" },
    ],
  },
  {
    slot: "3.06",
    pick_num: 30,
    tier_cliff_after: false,
    recommended: [
      { name: "Bryson Daily",     position: "RB", rank: 20, fit_score: 70, reason: "STEAL by 10 — late RB lottery" },
      { name: "Cade Klubnik",     position: "QB", rank: 15, fit_score: 73, reason: "QB3 dynasty stash, falling" },
    ],
  },
];

// ── Mock manager intel (12-team league) ──
export const MOCK_MANAGER_INTEL: ManagerIntel[] = [
  { user_id: "u1",  name: "Big Jer",       reach_rate: 28, pick_trade_rate: 71, qb_early_score: 38, te_premium_score: 12, trade_up_willingness: 82, recent_move: "Sent 2027 1st for 1.04 in 2025 draft" },
  { user_id: "u2",  name: "Duke Nukem",    reach_rate: 12, pick_trade_rate: 18, qb_early_score: 22, te_premium_score: 8,  trade_up_willingness: 24, recent_move: null },
  { user_id: "u3",  name: "TheCommish",    reach_rate: 41, pick_trade_rate: 55, qb_early_score: 88, te_premium_score: 31, trade_up_willingness: 65, recent_move: "Always reaches for QBs round 1" },
  { user_id: "u4",  name: "Zyn",           reach_rate: 19, pick_trade_rate: 62, qb_early_score: 41, te_premium_score: 19, trade_up_willingness: 71, recent_move: "Traded back twice in 2024 — pick hoarder" },
  { user_id: "u5",  name: "ChiefsKingdom", reach_rate: 33, pick_trade_rate: 28, qb_early_score: 71, te_premium_score: 84, trade_up_willingness: 38, recent_move: "Drafted Bowers 1.04 in 2024 — TE premium" },
  { user_id: "u6",  name: "RebuildBob",    reach_rate: 8,  pick_trade_rate: 79, qb_early_score: 18, te_premium_score: 11, trade_up_willingness: 12, recent_move: "Shipped 4 starters for picks last 6 months" },
  { user_id: "u7",  name: "WinNowWill",    reach_rate: 22, pick_trade_rate: 35, qb_early_score: 31, te_premium_score: 22, trade_up_willingness: 88, recent_move: "Aging roster, traded 2 future 1sts for vets" },
  { user_id: "u8",  name: "Anchor",        reach_rate: 16, pick_trade_rate: 22, qb_early_score: 27, te_premium_score: 14, trade_up_willingness: 31, recent_move: null },
  { user_id: "u9",  name: "Slim",          reach_rate: 35, pick_trade_rate: 48, qb_early_score: 58, te_premium_score: 52, trade_up_willingness: 55, recent_move: null },
  { user_id: "u10", name: "Chaos",         reach_rate: 47, pick_trade_rate: 81, qb_early_score: 62, te_premium_score: 39, trade_up_willingness: 92, recent_move: "Made 11 trades this offseason — most active" },
  { user_id: "u11", name: "Lurker",        reach_rate: 11, pick_trade_rate: 14, qb_early_score: 24, te_premium_score: 17, trade_up_willingness: 18, recent_move: null },
  { user_id: "u12", name: "Rookie",        reach_rate: 24, pick_trade_rate: 33, qb_early_score: 35, te_premium_score: 28, trade_up_willingness: 44, recent_move: null },
];
