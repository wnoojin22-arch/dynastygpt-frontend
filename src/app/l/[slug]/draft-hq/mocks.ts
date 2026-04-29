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

// Shape mirrors real backend: /draft/owner-profiles + /draft/mock-draft/likely-buyers
export type DraftIdentity = "DEVELOPER" | "PIPELINE BUILDER" | "GAMBLER" | "INEFFICIENT" | "BALANCED";
export type WillingnessBand = "HIGH" | "MEDIUM" | "LOW" | "UNLIKELY";

export type ManagerIntel = {
  // From /draft/owner-profiles
  owner_user_id: string;
  owner: string;
  draft_identity: DraftIdentity;
  hit_rate: number;              // 0..1
  star_rate: number;             // 0..1
  bust_rate: number;             // 0..1
  round1_position_distribution: { QB: number; RB: number; WR: number; TE: number }; // ratios summing to 1
  // From /draft/mock-draft/likely-buyers willingness (per partner)
  willingness: {
    score: number;               // 0..100
    band: WillingnessBand;
    factors: {
      activity: number;          // 0..100
      window_alignment: number;  // 0..100
      panic_signal: number;      // 0..100
      h2h_history: number;       // 0..100
    };
  };
  // From new adapter (item 1+2)
  pick_surplus_delta: number;    // partner picks 2026+2027 minus league avg
  down_move_bias: number;        // 0..1
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

// ── Mock manager intel — fields mirror /draft/owner-profiles + likely-buyers ──
const mkR1 = (q: number, r: number, w: number, t: number) => ({ QB: q, RB: r, WR: w, TE: t });

export const MOCK_MANAGER_INTEL: ManagerIntel[] = [
  { owner_user_id: "u1",  owner: "Big Jer",       draft_identity: "GAMBLER",          hit_rate: 0.52, star_rate: 0.18, bust_rate: 0.31, round1_position_distribution: mkR1(0.10, 0.30, 0.55, 0.05), willingness: { score: 82, band: "HIGH",     factors: { activity: 88, window_alignment: 72, panic_signal: 65, h2h_history: 41 } }, pick_surplus_delta: +1.2, down_move_bias: 0.62 },
  { owner_user_id: "u2",  owner: "Duke Nukem",    draft_identity: "BALANCED",         hit_rate: 0.61, star_rate: 0.14, bust_rate: 0.18, round1_position_distribution: mkR1(0.15, 0.40, 0.40, 0.05), willingness: { score: 24, band: "UNLIKELY", factors: { activity: 18, window_alignment: 38, panic_signal: 12, h2h_history: 33 } }, pick_surplus_delta: -0.4, down_move_bias: 0.18 },
  { owner_user_id: "u3",  owner: "TheCommish",    draft_identity: "INEFFICIENT",      hit_rate: 0.38, star_rate: 0.09, bust_rate: 0.42, round1_position_distribution: mkR1(0.55, 0.20, 0.25, 0.00), willingness: { score: 65, band: "HIGH",     factors: { activity: 55, window_alignment: 71, panic_signal: 45, h2h_history: 62 } }, pick_surplus_delta: +0.3, down_move_bias: 0.41 },
  { owner_user_id: "u4",  owner: "Zyn",           draft_identity: "PIPELINE BUILDER", hit_rate: 0.66, star_rate: 0.21, bust_rate: 0.16, round1_position_distribution: mkR1(0.05, 0.35, 0.55, 0.05), willingness: { score: 71, band: "HIGH",     factors: { activity: 62, window_alignment: 84, panic_signal: 28, h2h_history: 71 } }, pick_surplus_delta: +2.1, down_move_bias: 0.15 },
  { owner_user_id: "u5",  owner: "ChiefsKingdom", draft_identity: "DEVELOPER",        hit_rate: 0.55, star_rate: 0.16, bust_rate: 0.25, round1_position_distribution: mkR1(0.20, 0.20, 0.30, 0.30), willingness: { score: 38, band: "MEDIUM",   factors: { activity: 28, window_alignment: 52, panic_signal: 18, h2h_history: 48 } }, pick_surplus_delta: -0.8, down_move_bias: 0.22 },
  { owner_user_id: "u6",  owner: "RebuildBob",    draft_identity: "PIPELINE BUILDER", hit_rate: 0.59, star_rate: 0.19, bust_rate: 0.21, round1_position_distribution: mkR1(0.10, 0.45, 0.45, 0.00), willingness: { score: 12, band: "UNLIKELY", factors: { activity: 79, window_alignment: 18, panic_signal: 8,  h2h_history: 25 } }, pick_surplus_delta: +3.4, down_move_bias: 0.08 },
  { owner_user_id: "u7",  owner: "WinNowWill",    draft_identity: "GAMBLER",          hit_rate: 0.41, star_rate: 0.12, bust_rate: 0.38, round1_position_distribution: mkR1(0.10, 0.30, 0.55, 0.05), willingness: { score: 88, band: "HIGH",     factors: { activity: 35, window_alignment: 92, panic_signal: 88, h2h_history: 68 } }, pick_surplus_delta: -2.2, down_move_bias: 0.78 },
  { owner_user_id: "u8",  owner: "Anchor",        draft_identity: "BALANCED",         hit_rate: 0.58, star_rate: 0.13, bust_rate: 0.22, round1_position_distribution: mkR1(0.15, 0.35, 0.45, 0.05), willingness: { score: 31, band: "MEDIUM",   factors: { activity: 22, window_alignment: 41, panic_signal: 22, h2h_history: 38 } }, pick_surplus_delta: -0.1, down_move_bias: 0.28 },
  { owner_user_id: "u9",  owner: "Slim",          draft_identity: "INEFFICIENT",      hit_rate: 0.42, star_rate: 0.11, bust_rate: 0.36, round1_position_distribution: mkR1(0.30, 0.25, 0.35, 0.10), willingness: { score: 55, band: "MEDIUM",   factors: { activity: 48, window_alignment: 58, panic_signal: 41, h2h_history: 58 } }, pick_surplus_delta: +0.0, down_move_bias: 0.45 },
  { owner_user_id: "u10", owner: "Chaos",         draft_identity: "GAMBLER",          hit_rate: 0.46, star_rate: 0.22, bust_rate: 0.32, round1_position_distribution: mkR1(0.25, 0.25, 0.40, 0.10), willingness: { score: 92, band: "HIGH",     factors: { activity: 95, window_alignment: 78, panic_signal: 71, h2h_history: 82 } }, pick_surplus_delta: +0.8, down_move_bias: 0.71 },
  { owner_user_id: "u11", owner: "Lurker",        draft_identity: "DEVELOPER",        hit_rate: 0.63, star_rate: 0.15, bust_rate: 0.18, round1_position_distribution: mkR1(0.10, 0.30, 0.55, 0.05), willingness: { score: 18, band: "UNLIKELY", factors: { activity: 14, window_alignment: 32, panic_signal: 11, h2h_history: 22 } }, pick_surplus_delta: +0.5, down_move_bias: 0.12 },
  { owner_user_id: "u12", owner: "Rookie",        draft_identity: "BALANCED",         hit_rate: 0.49, star_rate: 0.10, bust_rate: 0.28, round1_position_distribution: mkR1(0.15, 0.35, 0.45, 0.05), willingness: { score: 44, band: "MEDIUM",   factors: { activity: 33, window_alignment: 48, panic_signal: 35, h2h_history: 51 } }, pick_surplus_delta: -0.3, down_move_bias: 0.34 },
];
