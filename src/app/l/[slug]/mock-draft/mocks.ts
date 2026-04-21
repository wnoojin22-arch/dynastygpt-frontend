/**
 * Mock fixture data — War Room landing (Duke Nukem / Big Jer 12-team SF TE-Prem).
 * Matches approved contracts in ./contracts.ts. Swapped for real endpoints in F4.
 *
 * Any field present here MUST eventually be carried by the real endpoint.
 * owner_avatar_id on OwnerProfile is the one extension: Sleeper user_id allows
 * us to render sleepercdn avatars. Backend will need to add it in F4.
 */
import type {
  ConsensusBoardEntry,
  HitRatesResponse,
  OwnerProfile,
  OwnerProfilesResponse,
  PreDraftResponse,
  SimulateResponse,
  TradeFlag,
  AvailabilityEntry,
  ChalkPick,
} from "./contracts";

// ─── Duke Nukem + Big Jer constants ──────────────────────────────────────
export const MOCK_LEAGUE_ID = "1312047513884184576";
export const MOCK_OWNER = "Duke Nukem";
export const MOCK_OWNER_ID = "679906771438989312";

// ─── Pre-Draft ───────────────────────────────────────────────────────────
// Duke holds slot 1.12 in real Big Jer sim — top 6-9 consensus prospects are
// gone 100% of the time. Fit scores on mockConsensusBoard reflect the 1.12
// decision lens (slot-aware weighting — see formula block there).
export const mockPreDraft: PreDraftResponse = {
  league_id: MOCK_LEAGUE_ID,
  league_name: "Big Jer Dynasty",
  format: "SF",
  te_premium: true,
  num_teams: 12,
  owner: MOCK_OWNER,
  window: "BALANCED",
  // Duke's stack: ELITE RB+WR from prior drafts, AVERAGE at QB/TE. No critical needs.
  positional_grades: { QB: "AVERAGE", RB: "ELITE", WR: "ELITE", TE: "AVERAGE" },
  needs: [],
  // Real pick ownership from Big Jer sim — Duke has no 2026 round 4 pick.
  user_picks: [
    { slot: "1.12", round: 1, picks_before: 11 },
    { slot: "2.03", round: 2, picks_before: 14 },
    { slot: "2.05", round: 2, picks_before: 16 },
    { slot: "3.09", round: 3, picks_before: 32 },
    { slot: "3.12", round: 3, picks_before: 35 },
  ],
  total_picks_2026: 5,
  // Top of the 2026 class — `fills_need=false` for all because Duke's ELITE RB/WR
  // make the top of the board redundant for need. Sadiq (TE) and Mendoza/Simpson
  // (QB) fill AVERAGE positions but don't register as needs.
  top_prospects: [
    { name: "Jeremiyah Love", position: "RB", rank: 1, tier: 1, boom_bust: "SAFE", fills_need: false },
    { name: "Fernando Mendoza", position: "QB", rank: 2, tier: 1, boom_bust: "SAFE", fills_need: false },
    { name: "Carnell Tate", position: "WR", rank: 3, tier: 1, boom_bust: "SAFE", fills_need: false },
    { name: "Makai Lemon", position: "WR", rank: 4, tier: 1, boom_bust: "SAFE", fills_need: false },
    { name: "Jordyn Tyson", position: "WR", rank: 5, tier: 2, boom_bust: "MODERATE", fills_need: false },
    { name: "K.C. Concepcion", position: "WR", rank: 6, tier: 2, boom_bust: "MODERATE", fills_need: false },
    { name: "Kenyon Sadiq", position: "TE", rank: 7, tier: 2, boom_bust: "MODERATE", fills_need: false },
    { name: "Omar Cooper Jr.", position: "WR", rank: 8, tier: 3, boom_bust: "MODERATE", fills_need: false },
  ],
};

// ─── Owner directory (drives chalk + threat radar + archetypes) ──────────
// Order = pick position 1-12. Duke Nukem holds slot 12 (end of round 1 snake).
interface MockOwnerMeta {
  owner: string;
  owner_user_id: string;
  avatar_id?: string; // Sleeper avatar hash — contract extension (F4 adds to backend)
}

export const mockOwnerOrder: MockOwnerMeta[] = [
  { owner: "Big Jer", owner_user_id: "111000000000000001", avatar_id: "a8f3c9b5e24f17d3" },
  { owner: "Trey Day", owner_user_id: "111000000000000002", avatar_id: "b7e4c2a9d18f2e5c" },
  { owner: "The Commish", owner_user_id: "111000000000000003" },
  { owner: "Barrens McGee", owner_user_id: "111000000000000004", avatar_id: "c9d7e5b3a16f48e2" },
  { owner: "Sidewinder", owner_user_id: "111000000000000005" },
  { owner: "Iron Wolff", owner_user_id: "111000000000000006", avatar_id: "d5a3b9c7e24f16d8" },
  { owner: "Poole Party", owner_user_id: "111000000000000007" },
  { owner: "Hoggs Gone Wild", owner_user_id: "111000000000000008", avatar_id: "f3c9d7e5b24a16f8" },
  { owner: "Darkroast", owner_user_id: "111000000000000009", avatar_id: "a6b4c2d8e16f3a5c" },
  { owner: "Backbreaker", owner_user_id: "111000000000000010" },
  { owner: "Kelce Farm", owner_user_id: "111000000000000011", avatar_id: "b8d6e4a2c13f7a9c" },
  { owner: MOCK_OWNER, owner_user_id: MOCK_OWNER_ID, avatar_id: "e4b2c8a6d13f5e9c" },
];

// ─── Owner profiles (hit rates / identity) ───────────────────────────────
// OwnerProfile ships without avatar today — extend locally for design support.
type MockOwnerProfile = OwnerProfile & { avatar_id?: string };

export const mockOwnerProfiles: OwnerProfilesResponse & { profiles: MockOwnerProfile[] } = {
  league_id: MOCK_LEAGUE_ID,
  profiles: mockOwnerOrder.map((m, i) => {
    const archetypes = ["PIPELINE BUILDER", "GAMBLER", "BALANCED", "DEVELOPER", "INEFFICIENT", "PIPELINE BUILDER", "BALANCED", "GAMBLER", "DEVELOPER", "BALANCED", "INEFFICIENT", "PIPELINE BUILDER"] as const;
    const hitRates = [0.62, 0.58, 0.44, 0.51, 0.33, 0.56, 0.48, 0.54, 0.47, 0.40, 0.36, 0.53];
    const starRates = [0.22, 0.18, 0.09, 0.14, 0.06, 0.16, 0.11, 0.19, 0.12, 0.08, 0.07, 0.13];
    return {
      owner: m.owner,
      owner_user_id: m.owner_user_id,
      total_picks: 24 + (i % 4) * 2,
      evaluated: 20 + (i % 5),
      hit_rate: hitRates[i],
      star_rate: starRates[i],
      bust_rate: 1 - hitRates[i] - 0.05,
      stars: Math.floor(starRates[i] * 22),
      hits: Math.floor(hitRates[i] * 22),
      busts: Math.max(0, 22 - Math.floor(hitRates[i] * 22) - Math.floor(starRates[i] * 22)),
      position_distribution: { QB: 3 + (i % 3), RB: 6 + (i % 4), WR: 8 - (i % 3), TE: 2 + (i % 2) },
      round1_position_distribution:
        archetypes[i] === "GAMBLER" ? { QB: 3, WR: 1, RB: 0 }
        : archetypes[i] === "PIPELINE BUILDER" ? { RB: 2, WR: 2, TE: 0 }
        : archetypes[i] === "DEVELOPER" ? { WR: 3, RB: 1 }
        : { QB: 1, RB: 1, WR: 2 },
      draft_identity: archetypes[i],
      stars_kept: Math.floor(starRates[i] * 22 * 0.7),
      stars_flipped: Math.floor(starRates[i] * 22 * 0.3),
      avatar_id: m.avatar_id,
    };
  }),
};

// ─── Hit Rates (league vs global) ────────────────────────────────────────
export const mockHitRates: HitRatesResponse = {
  league_id: MOCK_LEAGUE_ID,
  league: {
    by_position_round: [
      { round: 1, position: "QB", total: 14, hits: 8, hit_pct: 0.57 },
      { round: 1, position: "RB", total: 21, hits: 11, hit_pct: 0.52 },
      { round: 1, position: "WR", total: 38, hits: 26, hit_pct: 0.68 },
      { round: 1, position: "TE", total: 8, hits: 3, hit_pct: 0.38 },
      { round: 2, position: "QB", total: 18, hits: 7, hit_pct: 0.39 },
      { round: 2, position: "RB", total: 24, hits: 9, hit_pct: 0.38 },
      { round: 2, position: "WR", total: 32, hits: 15, hit_pct: 0.47 },
      { round: 2, position: "TE", total: 10, hits: 4, hit_pct: 0.40 },
      { round: 3, position: "QB", total: 12, hits: 3, hit_pct: 0.25 },
      { round: 3, position: "RB", total: 28, hits: 7, hit_pct: 0.25 },
      { round: 3, position: "WR", total: 30, hits: 9, hit_pct: 0.30 },
      { round: 3, position: "TE", total: 14, hits: 3, hit_pct: 0.21 },
      { round: 4, position: "QB", total: 14, hits: 2, hit_pct: 0.14 },
      { round: 4, position: "RB", total: 26, hits: 4, hit_pct: 0.15 },
      { round: 4, position: "WR", total: 30, hits: 5, hit_pct: 0.17 },
      { round: 4, position: "TE", total: 12, hits: 1, hit_pct: 0.08 },
    ],
    overall_hit_pct: 0.38,
    total_evaluated: 331,
  },
  global: {
    by_position_round: [
      { round: 1, position: "QB", total: 820, hits: 394, hit_pct: 0.48 },
      { round: 1, position: "RB", total: 1240, hits: 595, hit_pct: 0.48 },
      { round: 1, position: "WR", total: 2100, hits: 1260, hit_pct: 0.60 },
      { round: 1, position: "TE", total: 410, hits: 135, hit_pct: 0.33 },
      { round: 2, position: "QB", total: 980, hits: 323, hit_pct: 0.33 },
      { round: 2, position: "RB", total: 1420, hits: 483, hit_pct: 0.34 },
      { round: 2, position: "WR", total: 1810, hits: 724, hit_pct: 0.40 },
      { round: 2, position: "TE", total: 520, hits: 156, hit_pct: 0.30 },
      { round: 3, position: "QB", total: 720, hits: 151, hit_pct: 0.21 },
      { round: 3, position: "RB", total: 1480, hits: 281, hit_pct: 0.19 },
      { round: 3, position: "WR", total: 1650, hits: 363, hit_pct: 0.22 },
      { round: 3, position: "TE", total: 680, hits: 109, hit_pct: 0.16 },
      { round: 4, position: "QB", total: 840, hits: 101, hit_pct: 0.12 },
      { round: 4, position: "RB", total: 1520, hits: 182, hit_pct: 0.12 },
      { round: 4, position: "WR", total: 1620, hits: 226, hit_pct: 0.14 },
      { round: 4, position: "TE", total: 620, hits: 56, hit_pct: 0.09 },
    ],
    overall_hit_pct: 0.29,
    total_evaluated: 18470,
  },
};

// ─── Consensus board (top 24 — full fit payloads on top 10, bare on rest) ─
//
// SLOT-AWARE FIT SCORE FORMULA (applied here for Duke @ pickNum=12):
// ---------------------------------------------------------------------
// Fit score = weighted sum of 5 sub-scores (value, need, tendency, window, boom)
// Weights are DYNAMIC based on the value-vs-slot gap, not static. The static
// weights in the original Phase 2A contract (35 need / 30 value) are WRONG:
// at 1.01 BPA dominates; at 1.12 fit-vs-BPA tension is smaller; by late rounds
// need dominates because talent is flat. Formula implements that principle.
//
//   delta = consensus_rank - pickNum   (negative = BPA sitting there)
//
//   STEAL   (delta <= -5):  value 65 | need 20 | tendency 10 | window 3 | boom 2
//   FAIR    (|delta| <  5): value 30 | need 35 | tendency 20 | window 10 | boom 5
//   REACH   (delta >=  5):  value 15 | need 50 | tendency 25 | window 7  | boom 3
//
// Implications:
//  - A generational prospect who falls (top-5 at 1.12) hits 95+ regardless of
//    positional redundancy — STEAL weighting makes need nearly irrelevant.
//  - Prospects at their expected draft range (FAIR) are scored on need first.
//  - Reaches justify themselves only when filling a real need.
//
// This supersedes the static-weight version of the Bug 6 / Phase 2A contract.
// See: dynastygpt-api KNOWN_BUGS.md — "Fit score formula must be slot-aware".
export const mockConsensusBoard: ConsensusBoardEntry[] = [
  // ── STEAL zone at 1.12 (rank <= 7) — value-dominant. Edge case demonstration:
  //    these are 0% available at 1.12 in reality, but the score shows what
  //    would happen if they fell. Love @ 96 ignores RB ELITE redundancy.
  { rank: 1, name: "Jeremiyah Love", position: "RB", tier: 1, boom_bust: "SAFE", fp_rank: 1, ktc_rank: 1, fit_score: 96, fit_reasons: ["STEAL — generational bell-cow fallen 11 picks", "Value dominates despite RB ELITE stack", "Workhorse profile — 85%+ projected snaps", "Flip or start: can't pass BPA of this magnitude"], fit_negatives: [] },
  { rank: 2, name: "Fernando Mendoza", position: "QB", tier: 1, boom_bust: "SAFE", fp_rank: 2, ktc_rank: 2, fit_score: 94, fit_reasons: ["STEAL — SF-scoring QB1 at pick 12 is free money", "Fills AVERAGE QB to STRONG in one pick", "Pocket passer with 12+ year runway", "Value + need both reinforce"] },
  { rank: 3, name: "Carnell Tate", position: "WR", tier: 1, boom_bust: "SAFE", fp_rank: 3, ktc_rank: 3, fit_score: 88, fit_reasons: ["STEAL — tier-1 WR falling past pick 7", "WR ELITE stack makes need flat, value carries", "Ohio State pedigree, clean route tree", "Flip asset if not starting"] },
  { rank: 4, name: "Makai Lemon", position: "WR", tier: 1, boom_bust: "SAFE", fp_rank: 4, ktc_rank: 4, fit_score: 86, fit_reasons: ["STEAL — top-5 WR at pick 12", "USC target earner, reliable separation", "WR depth redundant but value wins"] },
  { rank: 5, name: "Jordyn Tyson", position: "WR", tier: 2, boom_bust: "MODERATE", fp_rank: 5, ktc_rank: 5, fit_score: 84, fit_reasons: ["STEAL — alpha WR falling to end of round", "ASU contested-catch upside", "Landing spot swings final value"] },
  { rank: 6, name: "K.C. Concepcion", position: "WR", tier: 2, boom_bust: "MODERATE", fp_rank: 6, ktc_rank: 6, fit_score: 80, fit_reasons: ["STEAL-boundary — tier-2 WR value", "YAC dynamo, slot floor", "WR redundant but value prevails"] },
  { rank: 7, name: "Kenyon Sadiq", position: "TE", tier: 2, boom_bust: "MODERATE", fp_rank: 7, ktc_rank: 6, fit_score: 91, fit_reasons: ["STEAL + fills AVERAGE TE position", "Elite athletic profile at TE", "TE-premium scoring boost", "Year-1 receiving usage projected", "Rare overlap of value and need"] },

  // ── FAIR zone at 1.12 (rank 8-16) — need dominant, scored on roster context.
  //    Rank 10-11 (Price/Simpson) show the "minor steal" signal at top of FAIR.
  { rank: 8, name: "Omar Cooper Jr.", position: "WR", tier: 3, boom_bust: "MODERATE", fp_rank: 8, ktc_rank: 7, fit_score: 58, fit_reasons: ["FAIR — value aligns with slot", "WR ELITE stack makes another WR redundant", "Indiana production scaled up"] },
  { rank: 9, name: "Denzel Boston", position: "WR", tier: 3, boom_bust: "POLARIZING", fp_rank: 9, ktc_rank: 8, fit_score: 54, fit_reasons: ["FAIR — slot-aligned value", "Big-body X profile, polarizing projection", "WR depth redundant"] },
  { rank: 10, name: "Jadarian Price", position: "RB", tier: 3, boom_bust: "MODERATE", fp_rank: 11, ktc_rank: 10, fit_score: 62, fit_reasons: ["Minor steal — falling 2 past ADP", "Notre Dame pedigree, three-down upside", "RB ELITE makes him redundant for starts", "Flip-value more than start-value"], fit_negatives: ["Committee concerns"] },
  { rank: 11, name: "Ty Simpson", position: "QB", tier: 3, boom_bust: "POLARIZING", fp_rank: 12, ktc_rank: 9, fit_score: 78, fit_reasons: ["Minor steal at pick 12", "SF scoring amplifies QB2 value", "Fills AVERAGE QB depth", "Polarizing projection"] },
  { rank: 12, name: "Eli Stowers", position: "TE", tier: 3, boom_bust: "MODERATE", fp_rank: 10, ktc_rank: 12, fit_score: 74, fit_reasons: ["FAIR @ slot — perfect value/need balance", "Fills AVERAGE TE need", "TE-premium scoring boost", "Day-1 receiving role likely"] },
  { rank: 13, name: "Jonah Coleman", position: "RB", tier: 3, boom_bust: "MODERATE", fp_rank: 13, ktc_rank: 11, fit_score: 56, fit_reasons: ["FAIR value at slot", "RB ELITE stack redundant", "Depth flier at best"] },
  { rank: 14, name: "Mike Washington Jr.", position: "RB", tier: 3, boom_bust: "POLARIZING", fp_rank: 14, ktc_rank: 15, fit_score: 58, fit_reasons: ["BPA at slot — consensus 14 matches pick", "RB ELITE = redundant need", "Chalk pick by value alone"] },
  { rank: 15, name: "Elijah Sarratt", position: "WR", tier: 3, boom_bust: "MODERATE", fp_rank: 16, ktc_rank: 14, fit_score: 54, fit_reasons: ["FAIR-boundary value", "WR ELITE makes redundant", "Mid-round target"] },
  { rank: 16, name: "Nicholas Singleton", position: "RB", tier: 4, boom_bust: "MODERATE", fp_rank: 17, ktc_rank: 13, fit_score: 52, fit_reasons: ["FAIR-boundary value", "Penn State pedigree", "RB stack redundant for starts"] },

  // ── REACH zone at 1.12 (rank >= 17) — need-dominant; only QB/TE justify here.
  { rank: 17, name: "Emmett Johnson", position: "RB", tier: 3, boom_bust: "POLARIZING", fp_rank: 15, ktc_rank: 16, fit_score: 48, fit_reasons: ["REACH — 5+ picks past ADP", "RB redundant, no need to reach"], fit_negatives: ["Reach with no need justification"] },
  { rank: 18, name: "Chris Brazzell II", position: "WR", tier: 4, boom_bust: "POLARIZING", fp_rank: 18, ktc_rank: 17, fit_score: 44 },
  { rank: 19, name: "Chris Bell", position: "WR", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 20, ktc_rank: 20, fit_score: 40 },
  { rank: 20, name: "Kaytron Allen", position: "RB", tier: 4, boom_bust: "POLARIZING", fp_rank: 19, ktc_rank: 22, fit_score: 42 },
  { rank: 21, name: "Garrett Nussmeier", position: "QB", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 22, ktc_rank: 19, fit_score: 64, fit_reasons: ["REACH justified by QB AVERAGE need", "SF-scoring floor", "Boom/bust — volatile outcome"], fit_negatives: ["Big reach for tier-4 QB"] },
  { rank: 22, name: "Zachariah Branch", position: "WR", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 23, ktc_rank: 18, fit_score: 36 },
  { rank: 23, name: "Germie Bernard", position: "WR", tier: 4, boom_bust: "POLARIZING", fp_rank: 21, ktc_rank: 24, fit_score: 35 },
  { rank: 24, name: "Ja'Kobi Lane", position: "WR", tier: 5, boom_bust: "POLARIZING", fp_rank: 25, ktc_rank: 23, fit_score: 33 },
];

// ─── Chalk picks (48 = 12 teams × 4 rounds) ──────────────────────────────
// Owner order 1-12 snake. Duke (slot 7) is on round 1/3 pick 7 & round 2/4 pick 6.
const CHALK_BOARD = [
  "Jeremiyah Love", "Makai Lemon", "Carnell Tate", "Fernando Mendoza", "Jordyn Tyson", "Jadarian Price",
  "Kenyon Sadiq", "K.C. Concepcion", "Omar Cooper Jr.", "Denzel Boston", "Eli Stowers", "Ty Simpson",
  "Elijah Sarratt", "Jonah Coleman", "Mike Washington Jr.", "Chris Bell", "Nicholas Singleton", "Emmett Johnson",
  "Chris Brazzell II", "Kaytron Allen", "Garrett Nussmeier", "Zachariah Branch", "Germie Bernard", "Malachi Fields",
  "Ja'Kobi Lane", "Antonio Williams", "Skyler Bell", "Demond Claiborne", "Max Klare", "Seth McGowan",
  "Ted Hurst", "Bryce Lance", "Drew Allar", "Adam Randall", "J'Mari Taylor", "Michael Trigg",
  "Le'Veon Moss", "Cade Klubnik", "Roman Hemby", "Justin Joly", "Deion Burks", "Jam Miller",
  "Cole Payton", "Carson Beck", "Eric McAlister", "Jaydn Ott", "Jack Endries", "Taylen Green",
];

function buildChalk(): ChalkPick[] {
  const picks: ChalkPick[] = [];
  const cbByName = new Map(mockConsensusBoard.map((c) => [c.name, c]));
  for (let round = 1; round <= 4; round++) {
    for (let pickInRound = 1; pickInRound <= 12; pickInRound++) {
      const slot = `${round}.${String(pickInRound).padStart(2, "0")}`;
      const orderIdx = round % 2 === 1 ? pickInRound - 1 : 12 - pickInRound;
      const owner = mockOwnerOrder[orderIdx];
      const globalIdx = (round - 1) * 12 + (pickInRound - 1);
      const name = CHALK_BOARD[globalIdx] || `Prospect ${globalIdx}`;
      const cb = cbByName.get(name);
      const profile = mockOwnerProfiles.profiles.find((p) => p.owner === owner.owner);
      picks.push({
        slot,
        owner: owner.owner,
        window: "BALANCED",
        prospect_name: name,
        prospect_position: (cb?.position ?? "WR") as ChalkPick["prospect_position"],
        prospect_tier: cb?.tier ?? 3,
        prospect_boom_bust: (cb?.boom_bust ?? "MODERATE") as ChalkPick["prospect_boom_bust"],
        board_position: cb?.rank ?? globalIdx + 1,
        confidence: 0.68 + ((orderIdx * 3) % 20) / 100,
        reasoning: profile?.draft_identity
          ? `${profile.draft_identity} profile → tends to ${profile.draft_identity === "GAMBLER" ? "reach on upside" : profile.draft_identity === "DEVELOPER" ? "take ceiling WRs" : "play board value"}`
          : undefined,
      });
    }
  }
  return picks;
}

export const mockChalk: ChalkPick[] = buildChalk();

// ─── Prospect availability (keyed by user's slot) ────────────────────────
// "If availability < 50%, flag as prospect-at-risk" — drives prospectsAtRisk.
// Real availability from /simulate for Duke @ 1.12 (user_owner=Duke Nukem).
// Top 9 are gone 100% of the time — that's draft reality for slot 12.
// Secondary slots (2.03, 2.05) shown where meaningful.
export const mockProspectAvailability: Record<string, AvailabilityEntry[]> = {
  "Jeremiyah Love": [{ slot: "1.12", pct_available: 0.00 }],
  "Fernando Mendoza": [{ slot: "1.12", pct_available: 0.00 }],
  "Carnell Tate": [{ slot: "1.12", pct_available: 0.00 }],
  "Makai Lemon": [{ slot: "1.12", pct_available: 0.00 }],
  "Jordyn Tyson": [{ slot: "1.12", pct_available: 0.00 }],
  "K.C. Concepcion": [{ slot: "1.12", pct_available: 0.00 }],
  "Kenyon Sadiq": [{ slot: "1.12", pct_available: 0.00 }],
  "Omar Cooper Jr.": [{ slot: "1.12", pct_available: 0.00 }],
  "Denzel Boston": [{ slot: "1.12", pct_available: 0.00 }],
  "Jadarian Price": [{ slot: "1.12", pct_available: 0.05 }],
  "Ty Simpson": [{ slot: "1.12", pct_available: 0.03 }, { slot: "2.03", pct_available: 0.00 }],
  "Eli Stowers": [{ slot: "1.12", pct_available: 0.96 }, { slot: "2.03", pct_available: 0.00 }],
  "Jonah Coleman": [{ slot: "1.12", pct_available: 0.96 }, { slot: "2.03", pct_available: 0.00 }],
  "Mike Washington Jr.": [{ slot: "1.12", pct_available: 1.00 }, { slot: "2.03", pct_available: 0.00 }],
  "Elijah Sarratt": [{ slot: "1.12", pct_available: 1.00 }, { slot: "2.03", pct_available: 0.08 }],
  "Nicholas Singleton": [{ slot: "1.12", pct_available: 1.00 }, { slot: "2.05", pct_available: 0.12 }],
  "Emmett Johnson": [{ slot: "1.12", pct_available: 1.00 }, { slot: "2.05", pct_available: 0.26 }],
  "Chris Brazzell II": [{ slot: "2.03", pct_available: 0.62 }, { slot: "2.05", pct_available: 0.38 }],
  "Garrett Nussmeier": [{ slot: "2.05", pct_available: 0.88 }, { slot: "3.09", pct_available: 0.14 }],
};

// ─── Trade flags (user-slot flagged owners) ──────────────────────────────
export const mockTradeFlags: TradeFlag[] = [
  {
    slot: "1.12",
    trade_probability: 0.58,
    reason: "Sadiq (TE) or a tier-1 QB likely to fall past 1.10 — REBUILDER above you may sell.",
    top_buyer: {
      name: "Backbreaker",
      window: "REBUILDER",
      reason: "Picking 1.11 with no roster urgency — behavioral profile trades down often.",
      estimated_cost: "1.12 + 3.12 for 1.11",
      picks_2026: 5,
      picks_2027: 4,
      h2h_trades: 3,
      pick_value_delta: 240,
      pick_value_source: "KTC",
    },
    alt_buyer: {
      name: "Kelce Farm",
      window: "BALANCED",
      reason: "Needs QB, may flip 2.01 for your 1.12 to get Simpson.",
      estimated_cost: "1.12 for 2.01 + 2.12",
      picks_2026: 4,
      picks_2027: 3,
      h2h_trades: 6,
      pick_value_delta: 140,
      pick_value_source: "KTC",
    },
  },
];

// ─── Simulate response snapshot (for landing threat radar + top prospects) ─
export const mockSimSnapshot: SimulateResponse = {
  league_id: MOCK_LEAGUE_ID,
  format: "SF",
  rounds: 4,
  num_teams: 12,
  te_premium: true,
  simulations_run: 100,
  sim_id: "mock-sim-00000000-0000-0000-0000-000000000001",
  consensus_board: mockConsensusBoard,
  chalk: mockChalk,
  pick_probabilities: {},
  prospect_availability: mockProspectAvailability,
  user_pick_analysis: [],
  trade_flags: mockTradeFlags,
  user_missed_opportunities: [],
  post_draft_positional_grades: {
    QB: { before: "AVERAGE", after: "STRONG", delta: 1 },
    RB: { before: "ELITE", after: "ELITE", delta: 0 },
    WR: { before: "ELITE", after: "ELITE", delta: 0 },
    TE: { before: "AVERAGE", after: "STRONG", delta: 1 },
  },
};
