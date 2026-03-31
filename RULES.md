# DynastyGPT Development Rules — READ BEFORE EVERY SESSION

## Project History
- DynastyGPT evolved from Shadynasty — a personal dynasty fantasy football tool Billy built over ~6 months
- Shadynasty is the design quality reference and code source for all DynastyGPT ports
- Shadynasty frontend: ~/shadynasty-frontend/ — Shadynasty API: ~/Shadynasty-API/
- BEFORE building or porting any feature, check Shadynasty first — match or beat it, never make it worse
- 16,778 lines of Shadynasty logic were ported across 7 service files to build DynastyGPT
- When something doesn't work in DynastyGPT, check how Shadynasty does it — it probably works there

## Identity Resolution
- ALWAYS use platform_user_id (user_id) for owner matching — NEVER display_name alone
- Display names change across seasons. The same owner can be "Duke Nukem" in 2025 and "Dukeofthenuke" in 2024
- Every query that touches owner data across seasons MUST resolve by user_id first, display_name fallback only
- When writing new endpoints or services, accept both owner name and user_id params, prefer user_id internally
- The owner-record and championships endpoints use Sleeper API chain walks with user_id and WORK CORRECTLY — use the same pattern everywhere
- Frontend: currentOwnerId is the canonical identifier for ALL API calls. Display name is ONLY for rendering text on screen.
- Every new API function in api.ts MUST accept and prefer userId param. Use the O(owner, userId) helper — it sends userId when available, owner as fallback.
- The league store has currentOwnerId (platform_user_id) set when owner is selected from dropdown.
- Backend _match_owner() in ALL routers checks platform_user_id FIRST, then falls back to display name matching.

## Format Awareness
- Every value, ranking, grade, and trade suggestion MUST be format-aware
- Two axes: SF vs 1QB (changes QB value dramatically) and PPR vs half vs standard (changes reception-dependent players)
- Always load format config from the league: is_superflex, scoring_type, league_size, te_premium, pass_td_pts
- Use get_format_multiplier() for all player value adjustments
- QB in 1QB = 0.73x multiplier (NOT 0.48)
- Never hardcode "Superflex" or "1QB" — always read from league data
- SF PPR is the base format — adjust at read time with format multipliers

## Python 3.9 Compatibility
- This project runs on Python 3.9
- ALWAYS add `from __future__ import annotations` as the FIRST line of every new Python file
- NEVER use `X | Y` type hints without the future import — use Optional[X] or Union[X, Y] if no future import
- NEVER use `list[x]`, `dict[x, y]`, `set[x]` lowercase — use List, Dict, Set from typing if no future import

## Tailwind CSS Only
- Frontend uses Tailwind exclusively — NEVER write inline styles
- No style={{ }} props — use className with Tailwind utilities
- Exception: dynamic values that Tailwind can't handle (e.g., calculated widths) can use inline styles sparingly

## Pick Format
- 2026 picks display as slot format: "2026 1.07 (Owner)" not "2026 Round 1 (Owner)"
- 2027+ picks display as round format: "2027 Round 1 (Owner)" (slots not determined)
- All pick regex patterns must handle BOTH formats: r"(\d{4})\s+(?:Round\s+)?(\d+)(?:\.(\d+))?"
- Pick values use prospect-backed SHA for current year (1.01 = Jeremiyah Love = 5,468)
- Late round picks (4th+) have minimal value — don't include as meaningful trade assets

## Trade Verdicts
- Source of truth: trade_verdicts table with PIT grades
- WON = Won / Slight Edge / ROBBERY winner
- LOST = Lost / Slight Loss / Victim
- EVEN = Win-Win / Push
- Win rate = WON / (WON + LOST) — EVEN excluded
- ALWAYS use compute_trade_record() — never compute win rates inline

## User-Facing Text
- NEVER show "SHA" to users — use "value" or "consensus value"
- NEVER show raw internal column names
- Pick values must show next to every pick on every surface
- Player values must show next to every player on every surface
- "Consensus" = our value blend (KTC/FP/SHA). "Trade Market" = what people actually pay in real trades.

## Trade Logic Rules

### TE Value (Format-Aware)
- Every trade suggestion involving TEs MUST check te_premium from league settings
- Non-TEP leagues: TE is the LEAST valuable position
  - Only top-3 TEs (Bowers/McBride/LaPorta tier) have standalone trade value
  - TE4+ are throw-ins, NEVER centerpieces
  - Hard rule: kill any package where TE outside top 5 is primary send for a top-15 RB/WR/QB
  - TE weakness is lowest-priority need unless owner has zero TEs
- TEP leagues (te_premium > 0): TEs have real scoring premium
  - Top 5-8 TEs are legitimate standalone trade assets
  - TE5-8 for a positional upgrade is reasonable
  - Hard rule: kill any package where TE outside top 10 is primary send for a top-10 RB/WR/QB
  - TE weakness is a real roster concern worth addressing

### Draft Picks in Trades
- 80%+ of real dynasty trades include draft picks — suggestions must reflect this
- 1st round picks (SHA ~5000-8000) are foundation pieces, not throwaway sweeteners
- 2nd round picks (SHA ~2500-4000) are quality sweeteners that make deals realistic
- At least half of all suggested packages should include picks on one or both sides
- Picks-only packages are valid ("player for 2 firsts" is a real dynasty move)
- Contenders should sell future picks for win-now players; rebuilders should acquire picks
- Never ignore pick capital when evaluating roster strength or trade feasibility

## Two Supabase Projects
- "Production DynastyGPT" = all trade data, enriched_trades, player_values, trade_verdicts (API connects here)
- "DynastyGPT Project" = the original Shadynasty Supabase project, now also hosts the DynastyGPT landing page, beta_applications, and waitlist (Next.js frontend connects here)
- NEVER confuse the two — beta league IDs come from the PROJECT database, not production

## Code Patterns
- Use PITCache (bulk in-memory) for batch operations, not per-asset DB queries
- All backfill scripts must be idempotent and resumable
- Sync endpoint runs the full pipeline: trades → enrichment → PIT grading → scoring collection → hindsight grading → season_results
- Every new endpoint that returns owner data must work across name changes via user_id
- Render Pro ($85/mo) — never suggest cold starts or free tier issues
- Claude API for all AI features — NOT OpenAI
- Billy never manually edits files — all changes through terminal commands

## Testing
- Billy tests on localhost:3000 — frontend hits Render API or localhost:8000
- Never suggest running uvicorn manually — Billy uses the existing dev setup
- Write unit tests with mocked data before deploying logic changes
- Don't chain blind debug commands — ask to see files first, think logically

## League Sync
- During development, league data auto-resyncs on page load if last sync was > 1 hour ago
- In production, auto-resync threshold is 24 hours
- A manual Resync button is always visible in the league header bar
- Sync invalidates all React Query caches for the league, forcing fresh data on all pages
- Sync timestamp tracked in localStorage per league (key: `dgpt_sync_ts_{leagueId}`)

## Deployment
- Frontend deploys from `dev` branch to Vercel — ALWAYS commit and push to dev
- Backend deploys from `dev` branch to Render — ALWAYS commit and push to dev
- After making changes, ALWAYS: git add . && git commit -m "description" && git push origin dev
- NEVER leave changes uncommitted — if you built it, commit it
- localhost:3000 uses a proxy rewrite to hit the backend — API calls go through /api/:path* → backend
- If localhost:3000 shows "failed to fetch", check if the API is running on port 8000 first
- Production frontend: dynastygpt-frontend.vercel.app
- Production backend: dynastygpt-api.onrender.com
