# RULES.md — DynastyGPT Mandatory Rules & Processes

## 1. TRADE DATA PIPELINE — MANDATORY PROCESS

Every league, every time. No step is optional. No step runs "later." The league is not ready until ALL steps complete.

### Sync Order:
a. Pull rosters, owners, settings from Sleeper
b. Walk FULL historical chain (previous_league_id) — every season
c. Collect ALL trades across ALL seasons
d. Collect ALL draft results across ALL seasons (get_draft_history per season → draft_results table)
e. Collect scoring data (league_player_scoring)
f. Collect season results (championships, records)
g. Enrich all trades (enriched_trades — full 91-column enrichment)
h. PIT grade all trades (trade_verdicts via PITCache)
i. Hindsight grade all eligible trades (>90 days old, picks resolved to players)
j. Generate trade fingerprints (trade_fingerprints table)
k. Pre-compute caches (dynasty_scores_cache, coaches_corner_cache, behavioral_intel per owner)

If ANY step is missing, the league is INCOMPLETE. Log it. Fix it. Do not ship incomplete leagues.

## 2. IDENTITY RULES

- owner_user_id (platform_user_id) is THE canonical identity — EVERYWHERE, NO EXCEPTIONS
- Never match by display_name alone — owners change names across seasons
- All enriched_trades rows must have non-null owner_user_id
- All trade_verdicts must have side_a_owner_user_id and side_b_owner_user_id
- Dedup enriched_trades by owner_user_id before grading — NEVER grade same person against themselves
- If two enriched_trades rows for the same trade_id share the same owner_user_id, they are duplicates from a name change. Keep one, discard the duplicate.
- All endpoints that accept an owner parameter must resolve user_id first via _match_owner() pattern

## 3. GRADING RULES

### PIT Grading:
- Thresholds: Push ≤10, Slight Edge ≤22, Won/Lost above — DO NOT CHANGE EVER
- These were calibrated against 48K trades. Changing them invalidates all existing grades.
- PITCache loads ONCE at script/server start, reuse for all leagues — never per-trade DB queries
- 80-80 scores = grader picked same person twice OR pick-for-pick swap — investigate, never ignore
- Pick-for-pick swaps (both sides only picks, same round) = exclude from win/loss records or grade as Push

### Hindsight Grading:
- Thresholds: 5/12/44 — separate system from PIT, DO NOT CHANGE
- Requires: draft_results (pick → player mapping) + league_player_scoring (production data)
- Picks resolve to the player drafted → grade based on that player's actual production
- Only grade trades >90 days old (need time to evaluate outcomes)
- Hindsight runs DURING SYNC, not as a separate backfill — every league gets hindsight at sync time

### Canonical Trade Record:
- WON/LOST/EVEN via compute_trade_record() is the ONLY definition
- No other function or endpoint may define its own win/loss logic
- trade_verdicts is the single source of truth for all grades

## 4. PICK RULES

- 2025 and earlier: picks are PLAYERS now — resolve via draft_results table, never display as "2025 Round 1"
- 2026: show exact slot numbers (1.07, 2.03) from draft_slots/pick ownership data
- 2027+: show tier labels (Round 1, Early 2nd) — slots not yet determined
- KTC pick values from PITCache for real pricing — NEVER use hardcoded formulas like max(500, 8000 - (round-1)*3000)
- draft_results must be collected for EVERY season during sync — if empty for any season, sync is incomplete
- Trade engine must never suggest picks from completed draft years (2025 and earlier) as tradeable assets

## 5. ENDPOINT RULES

- ALL trade endpoints return trades across ALL seasons — never filter by current season unless user explicitly requests it
- All owner matching uses user_id as primary, display_name as fallback only
- Every endpoint must respond in under 3 seconds — use cache tables, not live computation
- coaches_corner: read from coaches_corner_cache (JSONB blob per owner)
- market_feed: read from player_market_prices (JOIN to roster, no enriched_trades scan)
- price_history: read from player_market_prices + player_trade_comps
- trending: read from trending_cache (daily job)
- dynasty_scores: read from dynasty_scores_cache
- If cache is empty, compute live as fallback with 10-second timeout — better partial data than 30-second hang

## 6. TE HARD RULE

- NEVER suggest trading a TE in any trade engine mode EXCEPT when user clicks "FIND TE"
- Only exception: top 2 TEs by value league-wide (Bowers/McBride tier, value 6000+)
- Three layers of defense:
  1. Context filtering: remove ALL TEs from tradeable assets and partner rosters before AI sees them
  2. System prompt: "ABSOLUTE RULE: Never suggest trading a TE unless user specifically requested TE trades"
  3. Validator: hard kill any package with TE as primary asset (highest value piece) when mode is not "te"

## 7. TRADE ENGINE RULES

### Coach Mode (blind suggest):
- 5 hard blocks before AI sees anything:
  1. Top 1 QB, top 2 RBs, top 2 WRs, top 1 TE by value = UNTRADEABLE
  2. ALL players at WEAK/CRITICAL positions = UNTRADEABLE
  3. SF leagues: ALL QBs if owner has ≤2 startable QBs = UNTRADEABLE
  4. Non-TEP: TEs outside top 3 removed. TEP: TEs outside top 10 removed.
  5. TE hard rule (see section 6)
- AI only sees TRADEABLE ASSETS (depth pieces, aging players, surplus positions)
- Validator kills any package containing an untradeable player

### All Modes:
- Never send 2+ young ascending players (age ≤24, top-30 positional rank) for one older/troubled asset
- Consolidation premium: 2-for-1 requires 15-20% overpay, 3-for-1 requires 30-40%, 4+-for-1 almost never works
- Window-aware: don't offer aging vets (28+ RB, 30+ WR) to rebuilders, don't offer projects to contenders
- AI narrates, code decides — acceptance likelihood computed by compute_acceptance_likelihood(), NEVER by AI hallucination
- Generate exactly 5 suggestions with 5 DIFFERENT partners
- Flexible pick format validation: accept "1st", "2nd", "1.07", "Round 1" — do not kill valid picks over formatting
- Fuzzy partner name matching: normalize smart quotes (\u2018\u2019\u201c\u201d → regular quotes), lowercase, strip whitespace
- SHA must NEVER appear in any trade engine output — scrub at prompt level, output level, and frontend level

## 8. VERIFICATION — MANDATORY

### Before and after ANY change to trade grading, hindsight, enrichment, or verdict code:
1. Run: python3 scripts/verify_trade_grades.py {league_id}
2. Save output as BEFORE
3. Make the change
4. Run verify again — save as AFTER
5. Compare: no test that was PASS should become FAIL
6. If any regression: REVERT IMMEDIATELY

### verify_trade_grades.py checks:
- TEST 1: No duplicate owner rows (same trade_id + same owner_user_id)
- TEST 2: Verdict correctness (scores match labels, thresholds correct)
- TEST 3: Pick-swap trades identified
- TEST 4: Hindsight coverage (% of eligible trades graded)
- TEST 5: Draft results exist for all seasons
- TEST 6: Pick resolution works (picks → players)
- TEST 7: Owner identity consistency (no null user_ids)
- TEST 8: Trade count consistency (enriched count ≈ verdict count)

### Verification runs automatically at end of every sync. If any FAIL: log warning.

## 9. DEPLOYMENT RULES

- Test EVERY endpoint after changes — run full timing audit before deploying
- Never deploy untested code to production
- Commit and push after every working fix — do not accumulate 40+ uncommitted files
- One backfill/crawl at a time — 60 connection pool max on Supabase Pro
- TRADE GRADING CODE IS FROZEN after verification passes — do not modify fast_verdicts.py, pit_values.py, or any grading function without explicit approval
- Always run python3 -c "import ast; ast.parse(open('filename').read())" before restarting API after changes
- Deploy from dev branch to both Vercel and Render

## 10. CODE STANDARDS

- Python 3.9: always `from __future__ import annotations` as line 1 in every file
- Tailwind CSS exclusively — never inline styles on frontend
- Billy never manually edits code — always provide terminal commands in ``` blocks for copy-paste
- Tests on localhost:3000 — frontend hits Render API on production, localhost:8000 on local
- Render Pro ($85/mo) — never suggest cold starts, free tier issues, or upgrading Render
- Always read Shadynasty code before porting — match or beat it, never make it worse
- Write unit tests with mocked data before deploying any logic changes to Render
- When debugging: don't chain blind commands — ask to see files first, explain what you're looking for and why

## 11. SHA RULES

- The word "SHA" must NEVER appear in any user-facing text, anywhere in the product
- Scrub at three layers: prompt (never mention SHA), output (regex replace), frontend (strip before display)
- Say "value" instead of "SHA" everywhere
- Behavioral intel: "overpays by 1,800 value" not "overpays by 1,800 SHA"
- Market prices: show just the number, no unit label

## 12. TWO SUPABASE PROJECTS

- "Production DynastyGPT" = ALL trade data, enriched_trades, player_values, trade_verdicts, fingerprints (API connects here)
- "DynastyGPT Project" = beta_applications, waitlist, approved_leagues, trade_swipes, app management (Next.js frontend connects here)
- Beta league IDs come from PROJECT database, not production
- Always clarify which project when beta data is involved

## 13. NEVER AGAIN LIST

- Never auto-sync on production page load
- Never run user_id migration across 40+ files in one session without testing each change
- Never guess at the cause of a bug — trace with raw data and proof first
- Never tell Billy "it's working" or "it's transient" without testing the actual endpoint and showing proof
- Never change grading thresholds without re-running calibration against 48K trades
- Never state "Supabase pool is maxed" or any infrastructure diagnosis without checking the dashboard first
- Never revert commits without understanding what they contain — the revert may undo critical fixes
- Never build auto-sync, auto-refresh, or any feature that fires expensive endpoints on page load
- Never assume a fix deployed — verify the running code matches the fix
- Before editing any component, search the entire codebase for the component that is ACTUALLY rendering the UI being discussed. Never assume the component name matches the feature name. Search for the visible text string (e.g. 'BUILD THIS TRADE') to find the real render location before touching any code.
