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

// ─── Consensus board (top 24 — full fit payload on top 20, bare on 21-24) ─
//
// SLOT-AWARE FIT SCORE — canonical implementation in the backend at
// app/services/mock_draft_fit.py. Duke @ pickNum=12 Big Jer context.
//
//   delta = pick_num - consensus_rank   (positive = prospect fell past ADP)
//
//   STEAL   (delta >= 5):  value 65 | need 20 | tendency 10 | window 3 | boom 2
//   FAIR    (|delta| < 5): value 30 | need 35 | tendency 20 | window 10 | boom 5
//   REACH   (delta <= -5): value 15 | need 50 | tendency 25 | window 7  | boom 3
//
// Plus grand-slam bonuses:
//   BPA_bonus = max(0, 8 - consensus_rank) * clamp((delta - 5) / 10, 0, 1)
//   NEED_FIT_bonus = +8 when STEAL band AND grade ∈ (CRITICAL, WEAK, AVG)
//
// A MEGA STEAL (delta ≥ 10) on a top-5 prospect hits ≈ 75-90 even against
// an ELITE room (Love). A reach for a real need (Nussmeier, QB in SF)
// still clears 50. Redundant picks at ADP (Price, RB ELITE) sit near 47.
// Fit scores below are produced by the B1 slot-aware fit_score formula
// (app/services/mock_draft_fit.py) using Duke Nukem's live context at 1.12:
// RB/WR ELITE, QB/TE AVERAGE, SF, no TEP, BALANCED window. Reasons are
// rendered by the same module's template bank — do not hand-edit these
// strings; regenerate via the formula if the context changes.
export const mockConsensusBoard: ConsensusBoardEntry[] = [
  // ── STEAL zone at 1.12 (delta ≥ 5). Value dominant; MEGA at delta ≥ 10.
  //    These are 0% available at 1.12 in reality; scores show what would
  //    happen if they fell.
  { rank: 1, name: "Jeremiyah Love", position: "RB", tier: 1, boom_bust: "SAFE", fp_rank: 1, ktc_rank: 1, fit_score: 75, fit_reasons: ["MEGA STEAL — fell 11 picks past ADP at #1 overall", "Redundant — RB room already ELITE", "Week-1 floor, no bust risk"], fit_negatives: ["Redundant — RB room already ELITE"] },
  { rank: 2, name: "Fernando Mendoza", position: "QB", tier: 1, boom_bust: "SAFE", fp_rank: 2, ktc_rank: 2, fit_score: 90, fit_reasons: ["MEGA STEAL — fell 10 picks past ADP at #2 overall", "Plugs a real need at QB in Superflex", "Week-1 floor, no bust risk"], fit_negatives: [] },
  { rank: 3, name: "Carnell Tate", position: "WR", tier: 1, boom_bust: "SAFE", fp_rank: 3, ktc_rank: 3, fit_score: 70, fit_reasons: ["STEAL — fell 9 picks past ADP at #3", "Consensus top-3 still on the board", "Redundant — WR room already ELITE", "Week-1 floor, no bust risk"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 4, name: "Makai Lemon", position: "WR", tier: 1, boom_bust: "SAFE", fp_rank: 4, ktc_rank: 4, fit_score: 68, fit_reasons: ["STEAL — fell 8 picks past ADP at #4", "Consensus top-4 still on the board", "Redundant — WR room already ELITE", "Week-1 floor, no bust risk"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 5, name: "Jordyn Tyson", position: "WR", tier: 2, boom_bust: "MODERATE", fp_rank: 5, ktc_rank: 5, fit_score: 66, fit_reasons: ["STEAL — fell 7 picks past ADP at #5", "Consensus top-5 still on the board", "Redundant — WR room already ELITE"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 6, name: "K.C. Concepcion", position: "WR", tier: 2, boom_bust: "MODERATE", fp_rank: 6, ktc_rank: 6, fit_score: 64, fit_reasons: ["STEAL — fell 6 picks past ADP at #6", "Consensus top-6 still on the board", "Redundant — WR room already ELITE"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 7, name: "Kenyon Sadiq", position: "TE", tier: 2, boom_bust: "MODERATE", fp_rank: 7, ktc_rank: 6, fit_score: 79, fit_reasons: ["STEAL — fell 5 picks past ADP at #7", "Plugs a real need at TE"], fit_negatives: [] },

  // ── FAIR zone at 1.12 (-4 ≤ delta ≤ 4). Need dominant. Tweak 3: FAIR +
  //    redundant at ELITE position renders as 2 bullets (no archetype).
  { rank: 8, name: "Omar Cooper Jr.", position: "WR", tier: 3, boom_bust: "MODERATE", fp_rank: 8, ktc_rank: 7, fit_score: 48, fit_reasons: ["Fair value at WR #8, right where he's going", "Redundant — WR room already ELITE"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 9, name: "Denzel Boston", position: "WR", tier: 3, boom_bust: "POLARIZING", fp_rank: 9, ktc_rank: 8, fit_score: 46, fit_reasons: ["Fair value at WR #9, right where he's going", "Redundant — WR room already ELITE"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 10, name: "Jadarian Price", position: "RB", tier: 3, boom_bust: "MODERATE", fp_rank: 11, ktc_rank: 10, fit_score: 47, fit_reasons: ["Fair value at RB #10, right where he's going", "Redundant — RB room already ELITE"], fit_negatives: ["Redundant — RB room already ELITE"] },
  { rank: 11, name: "Ty Simpson", position: "QB", tier: 3, boom_bust: "POLARIZING", fp_rank: 12, ktc_rank: 9, fit_score: 62, fit_reasons: ["Plugs a real need at QB in Superflex", "Fair value at QB #11, right where he's going", "Board is split — love him or pass"], fit_negatives: ["Board is split — love him or pass"] },
  { rank: 12, name: "Eli Stowers", position: "TE", tier: 3, boom_bust: "MODERATE", fp_rank: 10, ktc_rank: 12, fit_score: 60, fit_reasons: ["Plugs a real need at TE", "Fair value at TE #12, right where he's going"], fit_negatives: [] },
  { rank: 13, name: "Jonah Coleman", position: "RB", tier: 3, boom_bust: "MODERATE", fp_rank: 13, ktc_rank: 11, fit_score: 44, fit_reasons: ["Fair value at RB #13, right where he's going", "Redundant — RB room already ELITE"], fit_negatives: ["Redundant — RB room already ELITE"] },
  { rank: 14, name: "Mike Washington Jr.", position: "RB", tier: 3, boom_bust: "POLARIZING", fp_rank: 14, ktc_rank: 15, fit_score: 42, fit_reasons: ["Fair value at RB #14, right where he's going", "Redundant — RB room already ELITE"], fit_negatives: ["Redundant — RB room already ELITE"] },
  { rank: 15, name: "Elijah Sarratt", position: "WR", tier: 3, boom_bust: "MODERATE", fp_rank: 16, ktc_rank: 14, fit_score: 41, fit_reasons: ["Fair value at WR #15, right where he's going", "Redundant — WR room already ELITE"], fit_negatives: ["Redundant — WR room already ELITE"] },
  { rank: 16, name: "Nicholas Singleton", position: "RB", tier: 4, boom_bust: "MODERATE", fp_rank: 17, ktc_rank: 13, fit_score: 40, fit_reasons: ["Fair value at RB #16, right where he's going", "Redundant — RB room already ELITE"], fit_negatives: ["Redundant — RB room already ELITE"] },

  // ── REACH zone at 1.12 (delta ≤ -5). Need dominant. Tweak 4: REACH +
  //    need-fill (Nussmeier) leads with need line, not reach.
  { rank: 17, name: "Emmett Johnson", position: "RB", tier: 3, boom_bust: "POLARIZING", fp_rank: 15, ktc_rank: 16, fit_score: 32, fit_reasons: ["Reach — 5 picks ahead of ADP at #17", "Redundant — RB room already ELITE", "Board is split — love him or pass"], fit_negatives: ["Reach — 5 picks ahead of ADP at #17", "Redundant — RB room already ELITE", "Board is split — love him or pass"] },
  { rank: 18, name: "Chris Brazzell II", position: "WR", tier: 4, boom_bust: "POLARIZING", fp_rank: 18, ktc_rank: 17, fit_score: 32, fit_reasons: ["Reach — 6 picks ahead of ADP at #18", "Redundant — WR room already ELITE", "Board is split — love him or pass"], fit_negatives: ["Reach — 6 picks ahead of ADP at #18", "Redundant — WR room already ELITE", "Board is split — love him or pass"] },
  { rank: 19, name: "Chris Bell", position: "WR", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 20, ktc_rank: 20, fit_score: 30, fit_reasons: ["Reach — 7 picks ahead of ADP at #19", "Redundant — WR room already ELITE", "High-variance swing — hit or miss"], fit_negatives: ["Reach — 7 picks ahead of ADP at #19", "Redundant — WR room already ELITE", "High-variance swing — hit or miss"] },
  { rank: 20, name: "Kaytron Allen", position: "RB", tier: 4, boom_bust: "POLARIZING", fp_rank: 19, ktc_rank: 22, fit_score: 30, fit_reasons: ["Reach — 8 picks ahead of ADP at #20", "Redundant — RB room already ELITE", "Board is split — love him or pass"], fit_negatives: ["Reach — 8 picks ahead of ADP at #20", "Redundant — RB room already ELITE", "Board is split — love him or pass"] },

  // ── Rank 21-24: bare fit_score only (top 20 own the full payload).
  { rank: 21, name: "Garrett Nussmeier", position: "QB", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 22, ktc_rank: 19, fit_score: 53 },
  { rank: 22, name: "Zachariah Branch", position: "WR", tier: 4, boom_bust: "BOOM/BUST", fp_rank: 23, ktc_rank: 18, fit_score: 28 },
  { rank: 23, name: "Germie Bernard", position: "WR", tier: 4, boom_bust: "POLARIZING", fp_rank: 21, ktc_rank: 24, fit_score: 28 },
  { rank: 24, name: "Ja'Kobi Lane", position: "WR", tier: 5, boom_bust: "POLARIZING", fp_rank: 25, ktc_rank: 23, fit_score: 27 },
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
