# Multi-League Functionality — Full State Audit (2026-07-03)

Scope: both repos (dynastygpt-api, dynastygpt-frontend). Read-only reconnaissance of what's shipped, what's parked, and what's missing for multi-league support. No code changes made.

---

## 1. Executive Summary

**Shippability status: partially scaffolded, actively blocked, ~5% shipped.**

Multi-league work was scoped as Phase A1–A4 in April with locked decisions (junction table `beta_user_leagues`, primary=original, dropdown switcher, `owner_user_id` canonical, no cross-league rollups). Real-world state as of today:

- The schema junction table (`beta_user_leagues`) **does not exist** in prod. No migration written.
- Backend has a **tracked, working** `/api/user/{user_id}/leagues` endpoint that returns all leagues via `owners` join — usable today without the junction table.
- Backend `/api/user/approve` still returns a **single, non-deterministic** league. The Phase A1 fix (return `league_ids` + `primary_league_id`, deterministic ORDER BY) is **parked in `stash@{1}` on main** and has never been merged.
- Frontend Zustand `useLeagueStore` has a `savedLeagues[]` array baked in from day 1 — but nothing writes multiple entries and no UI reads them. It's dormant scaffolding.
- Frontend `getUserLeagues(uid)` API client function exists in `src/lib/api.ts:403` with **zero callsites**.
- The `[slug]/layout.tsx` auth gate at line 449 (`if (gateApprovedLeagueId !== currentLeagueId) router.replace("/dashboard")`) **actively bounces users back to /dashboard if they try to view any league that isn't their Clerk-metadata `approved_league_id`**. This is the load-bearing block: even bypassing the frontend UX, a URL-hack attempt gets kicked out.
- Zustand store has no `persist` middleware — state is memory-only, would not survive reload.
- Currently only **1 beta user (Sleeper user_id `474304233173151744`) has more than one approved league** (3 of them). Everyone else's UX is a no-op.

Reachable end-to-end functionality: ~5%. The one user with 3 leagues sees exactly one of them today, determined by whichever row PostgreSQL happens to return first from an unordered SELECT, then locked in via Clerk unsafeMetadata.

---

## 2. Schema State (Section 1)

### `beta_user_leagues` — does NOT exist

```
SELECT to_regclass('public.beta_user_leagues')  →  NULL
```

No migration file references it. Backend migrations run 015 → 046 (with 037, 043 absent as sequence gaps — checked, neither references multi-league). Grep for `beta_user_leagues` across `*.sql`: zero hits.

### Related tables — current shape

**`sleeper_user_links`** (159 rows) — Clerk↔Sleeper 1:1 mapping.
```
sleeper_user_id       text
clerk_user_id         text
sleeper_username      text
linked_at             timestamptz
```
No `league_id` column. Enforces one Sleeper account per Clerk account (via 409 in `/api/user/link-sleeper`).

**`beta_users`** (187 rows) — user record. Has a **singular** `league_id` column, so today one row = one user = one league association.
```
id                    uuid
clerk_user_id         text
sleeper_user_id       text
sleeper_username      text
league_id             text        ← scalar; upserted from /api/user/approve's matched_league_id
league_name           text
wave                  integer
invited_at, signed_up_at, last_active_at, status, created_at
```

**`approved_leagues`** (184 rows) — the whitelist.
```
league_id, league_name, wave, approved_at
```

**`owners`** (existing, not shown) — every roster ownership; `platform_user_id` maps to the Sleeper user, `league_id` is the association. This is the **de facto** source of "which leagues does this user belong to" today — and `queries.get_user_leagues` already reads from here.

### Users with >1 league today

```
SELECT sul.sleeper_user_id, COUNT(DISTINCT o.league_id)
FROM sleeper_user_links sul
JOIN owners o          ON o.platform_user_id = sul.sleeper_user_id
JOIN approved_leagues  ON approved_leagues.league_id = o.league_id
GROUP BY 1 HAVING COUNT(*) > 1
```

Exactly **one** user: Sleeper user_id `474304233173151744`, 3 leagues. Everyone else is a single-league user, so the current miscalibration hasn't produced visible bugs yet.

---

## 3. Backend API State (Section 2)

### `/api/user/approve` (POST) — SHIPPED, single-league

Location: `app/routers/user.py:98–204`. Current behavior:

1. `SELECT DISTINCT league_id FROM owners WHERE platform_user_id = $1` → user's leagues
2. Cross-reference against `approved_leagues` (unordered, no ORDER BY)
3. **Picks `approved_rows[0]`** — first row of undefined order
4. Writes singular `approved_league_id` to Clerk `unsafeMetadata`
5. Upserts one row into `beta_users` with that league_id
6. Returns `{"approved": true, "league_id": matched_league_id}` — single string

For a multi-league user, this endpoint effectively randomizes their primary league across cache flushes / PG restarts.

### `/api/user/{user_id}/leagues` (GET) — SHIPPED, multi-league ready

Location: `app/routers/user.py:218–228`. Backing query at `app/db/queries.py:934–946`:

```sql
SELECT DISTINCT o.league_id, o.display_name, l.name, l.season,
       l.num_teams, l.is_superflex, l.scoring_type
FROM owners o JOIN leagues l ON o.league_id = l.league_id
WHERE o.platform_user_id = $1
ORDER BY l.season DESC
```

**Already returns all leagues** for a user. No 404-guard beyond "no leagues found". **This endpoint is production-ready and can be consumed by a frontend switcher immediately** — the junction table is not a prerequisite. Related user-centric endpoints also shipped: `/api/user/{user_id}/trades`, `/verdicts`, `/profile`.

### Active league context server-side — none

Every non-user-centric endpoint takes `league_id` as an explicit URL path segment (`/api/leagues/{league_id}/...`). No session, no server-side "active league" concept. This is architecturally correct for multi-league — no server state to migrate.

### Stashes on backend

`git stash list --stat` returns 10 stashes. The one that matters:

**`stash@{1}: On main: parked-multi-league-and-docs-before-phase3`** — 2 files:
- `app/routers/intel.py` (+21 lines) — **unrelated**: a coaches_corner cache staleness gate (checks `NOT EXISTS SELECT 1 FROM enriched_trades WHERE trade_date > ccc.updated_at`). Got mixed into the same stash by accident during the Phase 3 cherry-pick prep.
- `app/routers/user.py` (+28 lines) — **this IS Phase A1**. Adds:
  - Deterministic `ORDER BY COALESCE(wave, 1) ASC, league_id ASC` on the approved_rows fetch
  - `approved_league_ids = [r["league_id"] for r in approved_rows]`
  - Response reshape: `{"approved": true, "league_id": matched_league_id, "league_ids": approved_league_ids, "primary_league_id": matched_league_id}`
  - Docstring comment: `"Phase A1 of multi-league rollout (docs/MULTI_LEAGUE_AUDIT.md)"` — that referenced doc **does not exist** anywhere in the repo. Grep confirmed.

Other stashes (`stash@{0}`, `{2}`–`{9}`) — unrelated (beta_sync, contamination, player_page_assembler, trade_pick_keys, tradabase). None reference multi-league concepts.

### Frontend stashes

None of the 4 frontend stashes contain multi-league work. `stash@{0}` on main touches `[slug]/dashboard/page.tsx` (2-line getRoster fix). The rest are trade-analyzer / mobile / analyze modal scrubber WIP.

### Commits mentioning multi-league / phase-a

Both repos: `git log --all --grep="multi-league|multileague|phase-a|beta_user_leagues|user_leagues|leagueSwitcher|activeLeague|active_league" -i` returns **zero results**. Nothing has been committed under any of the tags Billy expected.

### Backend scaffolding grep

`beta_user_leagues` / `active_league_id` / `activeLeagueId` across `*.py` and `*.sql`: **zero hits**.

`user_leagues` hits: legitimate references only (`queries.get_user_leagues`, router endpoint, and a couple of scripts that iterate a user's Sleeper leagues during backfill). No scaffolding.

---

## 4. Frontend State (Section 3)

### Zustand store (`src/lib/stores/league-store.ts`) — dormant scaffolding

Full shape:
```ts
interface SavedLeague { id, slug, name, owner, ownerId }
interface LeagueState {
  currentLeagueId, currentLeagueSlug, currentOwner, currentOwnerId,
  savedLeagues: SavedLeague[],
  setLeague(id, slug, name),
  setOwner(owner, userId?),
  clearLeague(),
}
```

`setLeague` **already appends to `savedLeagues`** on every call — the store was built expecting an eventual switcher. But:
- `create<LeagueState>()( ... )` is called with **no `persist` middleware**. Store is memory-only; every reload starts empty and re-hydrates via `useEffect` from URL params.
- `savedLeagues` is destructured in `[slug]/layout.tsx:383` and `debug/page.tsx:14` — and used nowhere else in production paths. Dead read.
- `debug/page.tsx` prints `savedLeagues.length` as a devtool but doesn't offer switching.

### Nav / switcher UI — none

Grep for `leagueSwitcher`, `LeagueSwitcher`, `multiLeague`, `switchLeague` across `*.ts`/`*.tsx`: **zero hits**. Nav is rendered in `[slug]/layout.tsx` and has no dropdown / no league name link / no leagues list. It shows the current league's name as static text.

### `/api/user/{uid}/leagues` client — wired, uncalled

`src/lib/api.ts:403`:
```ts
export const getUserLeagues = (uid: string) => get<...>(`/api/user/${uid}/leagues`);
```

`grep -rn "getUserLeagues"` in `src/`: exactly **one match** — the definition itself. Zero callsites. Same for `getUserProfile` at line 405.

### Login flow — where user lands

Traced from `src/app/dashboard/page.tsx` and `src/app/onboarding/page.tsx`:

1. Clerk sign-in → `/dashboard`
2. Dashboard reads `sleeper_user_id` from `user.unsafeMetadata`. If missing → redirect to `/onboarding`
3. Reads `approved_league_id` from `user.unsafeMetadata` OR `?league_id=` URL param
4. If neither present, POSTs to `/api/user/approve` with `{sleeper_user_id, clerk_user_id}` → gets back a **single** `league_id`
5. Calls `setLeague(id, slug, name)` on the store — writes **one** entry to `savedLeagues`
6. `router.replace(`/l/${slug}?league_id=${approvedLeagueId}`)`

The onboarding flow (`onboarding/page.tsx:93`) does actually fetch the full list of user's leagues from Sleeper (`sleeper.app/v1/user/${sleeperId}/leagues/nfl/2025`), filters to dynasty (`type === 2`), and shows the list — but only to let them pick one that will get linked via `/api/user/approve`. Nothing threads the full list through to app state.

### `[slug]/layout.tsx` gate — the load-bearing block

`src/app/l/[slug]/layout.tsx:441–450`:
```ts
useEffect(() => {
  if (gateChecked) return;
  if (!isLoaded && !DEV_BYPASS_ACTIVE) return;
  if (!currentLeagueId) return;
  if (!gateSleeperUserId) { router.replace("/onboarding"); return; }
  if (!gateApprovedLeagueId) { router.replace("/dashboard"); return; }
  if (gateApprovedLeagueId !== currentLeagueId) { router.replace("/dashboard"); return; }
  setGateChecked(true);
}, [...]);
```

`gateApprovedLeagueId = urlLeagueId || metadata.approved_league_id`. So a user CAN reach `/l/otherleague-slug?league_id=<other_id>` only if `<other_id>` equals what the URL passes AND matches what the store hydrated — but on a plain refresh without `?league_id`, `gateApprovedLeagueId` falls back to Clerk metadata (their original league) which will not match `currentLeagueId`, and they get bounced to `/dashboard`. Which then routes them back to their original league.

### Uncommitted frontend work

`git status`: only `src/lib/api.ts` modified (pre-existing parked `LeagueMode` edit unrelated to multi-league — per handoff, don't touch). Untracked: `.claude/`, `backfill_missing_draft_slots.log`, `beta_apps_full.csv`, `beta_audit_results.json`, `docs/DRAFTHQ_GRADUATION_AUDIT.md`, `docs/DRAFT_BOARD_RECOMMENDATION_AUDIT.md`. Nothing multi-league.

---

## 5. Current User Experience for a Multi-League User (Section 4)

End-to-end walkthrough as coded today, for user `474304233173151744` (the one real multi-league beta user, 3 approved leagues):

1. **Clerk sign-in.** Lands on `/dashboard`.
2. **Sleeper metadata check.** `user.unsafeMetadata.sleeper_user_id` is set from prior onboarding → don't redirect to `/onboarding`.
3. **Approval check.** `approved_league_id` may or may not be in metadata. If not, POST `/api/user/approve` fires.
4. **Backend approval logic.** `approve` runs the SELECT, gets 3 rows from `approved_leagues`, **picks `approved_rows[0]`** — which row is first is defined only by PostgreSQL's internal storage order at that moment. **This can change across cache flushes and vacuum runs.**
5. **Clerk write.** That one league_id gets written to `unsafeMetadata.approved_league_id`, persisted forever until unlinked.
6. **Frontend routes** to `/l/<slug-of-that-one-league>?league_id=<that-id>`.
7. **[slug]/layout.tsx** loads. `setLeague(that-id, slug, name)` fires — `savedLeagues` now has exactly ONE entry, the same league.
8. **Nav renders.** No switcher, no dropdown, no indication of the other 2 leagues.
9. **User has no way to switch.** They can't URL-hack it either — the layout gate at line 449 sees `gateApprovedLeagueId (from Clerk) !== currentLeagueId (from URL)` and forces them back to `/dashboard`, which forces them back to the Clerk-locked league.
10. **To view another league** they must: sign out → hope the backend picks a different row next time (or delete/reset their metadata via the "Use a different Sleeper account" flow, which unlinks + re-onboards).

**Nothing crashes.** The system silently commits to one of the three leagues and never mentions the others.

---

## 6. Gap Analysis (Section 5)

| ID | Gap | Location / target | Status | Notes |
|---|---|---|---|---|
| A | Junction table `beta_user_leagues` schema | `app/db/migrations/047_*.sql` | **NOT STARTED** | No migration written. Whether it's actually needed is debatable: `owners`+`approved_leagues` already give the answer. The junction adds `is_primary` (Phase A2's target). |
| B | `/api/user/approve` returns leagues list | `app/routers/user.py:98–204` | **IN PROGRESS — stashed** | Fix parked in backend `stash@{1}`. Adds `ORDER BY wave, league_id`, `league_ids[]`, `primary_league_id`. ~28 lines, ready to apply. Mixed with unrelated intel.py changes in same stash — needs surgical split. |
| C | Backend endpoint returning user's leagues | `/api/user/{user_id}/leagues` | **SHIPPED** | Already exists, already correct, already reads `owners`. |
| D | Backend context: request-scoped league | (no target — architecturally not needed) | **N/A / SHIPPED** | All league endpoints take `league_id` as URL path segment. Nothing to do. |
| E | Frontend state: `activeLeagueId` source of truth | `src/lib/stores/league-store.ts` | **IN PROGRESS — dormant** | `currentLeagueId` + `savedLeagues[]` already exist. Missing: (a) persist middleware for cross-reload survival, (b) hydration from `getUserLeagues` on login, (c) `setActiveLeague(id)` action that updates BOTH Clerk metadata AND store. |
| F | Frontend UI: league switcher component | `src/app/l/[slug]/layout.tsx` nav area | **NOT STARTED** | No `LeagueSwitcher` component exists. Needs design (dropdown vs. modal picker), placement (nav header?), and a fetch of `getUserLeagues(sleeper_user_id)` on mount. |
| G | URL routing: `/l/[slug]` ↔ league_id mapping | `src/app/l/[slug]/layout.tsx:410–436` (hydration) | **PARTIALLY SHIPPED** | URL param `?league_id=` is treated as source of truth, slug is vanity. Slug→league_id fallback via `getLeagueBySlug` works. What's missing: making the switcher call `router.push(/l/<newslug>?league_id=<newid>)` and having the auth gate NOT bounce it. |
| H | Session persistence across reload | `src/lib/stores/league-store.ts` | **NOT STARTED** | No `persist` middleware. Refresh nukes `currentLeagueId`; the layout re-hydrates from URL param. Adequate for single-league; for multi-league, we need to remember "which of my leagues was I looking at" across reload. |
| I | Auth gate: allow switching to any approved league | `src/app/l/[slug]/layout.tsx:441–450` | **NOT STARTED — BLOCKING** | Gate line 449 forces `gateApprovedLeagueId === currentLeagueId`. Must be relaxed to `currentLeagueId ∈ user's approved leagues` (fetched from `getUserLeagues`). This is the single blocker that makes everything else moot. |
| J | Per-league recomputation on switch | Various — `useQuery` keyed by `currentLeagueId` | **MOSTLY SHIPPED** | Almost every page uses `useQuery({queryKey: [..., currentLeagueId], ...})` — swapping `currentLeagueId` invalidates and refetches automatically. Trade builder / mock draft may need explicit resets (stores keyed by league). Audit these on the switch itself. |
| K | Test coverage | `src/lib/stores/__tests__/`, backend `tests/test_user.py` (if exists) | **NOT STARTED** | No tests for approve endpoint's ordering. No frontend tests for switching flow. |
| L | Clerk `unsafeMetadata` schema | Frontend + `app/routers/user.py:149` | **NEEDS DECISION** | Today: singular `approved_league_id`. Options: (1) keep singular = "last active league" and treat `savedLeagues` as truth, (2) switch to array `approved_league_ids[]` + scalar `active_league_id`. Impact: Clerk-metadata reads throughout dashboard/layout/api routes. |

---

## 7. Recommendation + Effort Estimate (Section 6)

### First ship — lowest-risk unblock

**Ship gap I (relax the gate) + minimal switcher backed by existing endpoints.** The junction table (gap A) is not on the critical path. The already-shipped `/api/user/{uid}/leagues` endpoint gives the frontend the list; `savedLeagues` in Zustand is ready for population.

Concrete order:
1. **BE** — apply the parked `stash@{1}` `user.py` half (surgical split from the intel.py cache-staleness change). Adds deterministic ordering + list response to `/api/user/approve`. ~30 min including test + PR.
2. **FE** — call `getUserLeagues(sleeper_user_id)` in `[slug]/layout.tsx` after hydration; populate `savedLeagues`. Then relax the gate at line 449 to `currentLeagueId ∈ savedLeagues.map(s=>s.id)`. ~1–2 hrs.
3. **FE** — add a minimal switcher in the layout nav. Dropdown listing `savedLeagues` names; onSelect → `setLeague(id, slug, name)` + `router.push(/l/<newslug>?league_id=<newid>)`. ~2–3 hrs.
4. **FE** — add `persist` middleware to `useLeagueStore` with a whitelist (`currentLeagueId`, `currentLeagueSlug`, `currentOwner`, `currentOwnerId`). Don't persist `savedLeagues` — always re-fetch from backend on mount so a new league auto-appears. ~30 min.
5. **BE** — decide + apply gap L (Clerk metadata shape). Recommend keeping singular `approved_league_id` semantics but treating it as "last active league" — write it every time frontend calls a new `POST /api/user/set-active-league` endpoint (new). Backward-compatible with the current `dashboard/page.tsx` landing behavior. ~1–2 hrs.

Total for a functional MVP (user with multiple leagues can switch, choice persists across sessions): **~1 focused session, ~5–7 hours of work**.

### Assumptions from April that no longer hold

1. **`beta_user_leagues` junction table is no longer necessary for the MVP.** The tracked `queries.get_user_leagues` reads from `owners` join, which already answers "which leagues does this user belong to." The junction was originally scoped to store `is_primary` and `is_active`, but Clerk `unsafeMetadata` can hold those flags per-user without a table. Skip the migration until we need admin surfaces that need to enumerate memberships fast; when that day comes, it's a small backfill from `owners` + `sleeper_user_links`.
2. **"No cross-league rollups" still holds** — no reason to revisit. Every user-centric endpoint (`/user/{uid}/trades`, `/verdicts`, `/profile`) already scopes by `league_id` param or aggregates trivially.
3. **Roster archetype work landed** since the April plan. `owner_archetype_derived` MV (migration 027) is keyed by `owner_user_id` — multi-league safe. No changes needed there.
4. **Projections + starter impact landed** since April. Both take `league_id` as an explicit parameter. Fully compatible with switching.
5. **DraftHQ / mock draft state** lives in per-page Zustand stores (`mock-draft-store.ts`, `war-room-store.ts`, `trade-builder-store.ts`). Confirmed via file inventory. **These will need `clearOnLeagueChange`-style hooks** on switch, otherwise user could see mock draft state from League A while browsing League B. Adds one small task under gap J.

### Not recommended right now

- Do NOT ship the junction table migration in this pass — it's a distraction from actual UX blockers.
- Do NOT commit to a Clerk-metadata schema change (gap L) until a switcher is live and we've observed real login patterns for user 474304233173151744.
- Do NOT try to unstash the whole `stash@{1}` — half of it is an unrelated cache-staleness change that belongs on its own PR.

---

## Appendix — Files inspected

Backend (`/Users/amandamcdougall/dynastygpt-api`):
- `app/routers/user.py` (tracked + stash@{1} diff)
- `app/routers/intel.py` (stash@{1} diff — unrelated)
- `app/db/queries.py:920–1000` (`get_user_leagues`, `get_user_trades`, `get_user_verdicts`)
- `app/db/migrations/` full listing (015 → 046)
- Live DB introspection (`sleeper_user_links`, `beta_users`, `approved_leagues`, junction table absence, user membership counts)

Frontend (`/Users/amandamcdougall/dynastygpt-frontend`):
- `src/lib/stores/league-store.ts` (full)
- `src/app/dashboard/page.tsx` (full)
- `src/app/onboarding/page.tsx:70–150` (link + approve flow)
- `src/app/l/[slug]/layout.tsx:370–470` (gate + hydration)
- `src/lib/api.ts:395–415` (user-centric client fns)
- Grep sweep across `src/**/*.{ts,tsx}` for `activeLeague`, `useLeagueStore`, `leagueSwitcher`, `multiLeague`, `getUserLeagues`, `savedLeagues`

Git history: both repos, `--all --grep` on multi-league related tags — zero commits. Stash lists on both repos — one relevant (`api/stash@{1}`).

---

## Ship Log — MVP Complete 2026-07-03

The 6-step MVP shipped end-to-end the same afternoon this audit was written.

| Step | Description | dynastygpt-api commit | dynastygpt-frontend commit |
|---|---|---|---|
| 1 | `/api/user/approve` returns `league_ids` + `primary_league_id`, deterministic order | dev `ac68075` → main `e8c7641` | — |
| 2 | New `POST /api/user/set-active-league` endpoint (+ tests) | dev `9f4d95a` → main `ab675df` | — |
| 3 | Layout gate: allow any league the user owns | — | dev `80203b8` → main `c32df44` |
| 4 | LeagueSwitcher dropdown in top nav | — | dev `6c8d80f` → main `a0e2910` |
| 5 | Zustand persist middleware on `useLeagueStore` (whitelist: `currentLeagueId/Slug/Owner/OwnerId`) | — | dev `a2e985f` → main `bf5d777` |
| 6 | Per-page store resets on league switch (`mock-draft`, `war-room`, `trade-builder`) | — | dev `2111e9b` → main `717427e` |

### What we intentionally did NOT ship

- The `beta_user_leagues` junction table (Gap A). Not needed for the MVP — `owners` join carries it.
- Clerk `unsafeMetadata` schema change (Gap L). Kept `approved_league_id` as scalar; the semantics widened to "last active league" without any field rename.

### Post-MVP follow-ups (backlog, none urgent)

**Testing (Gap K)**
- Unit tests for the switch-triggered store reset subscriptions in `mock-draft-store.ts`, `war-room-store.ts`, `trade-builder-store.ts`. Test both fire paths (real switch resets) and guard paths (initial hydration doesn't reset a legitimate persisted `queuedTrades`).
- Integration test for the layout gate: mocked `getUserLeagues` returns a set that includes `currentLeagueId` → renders; excludes it → redirects to `/dashboard`.

**Cross-user localStorage hardening**
- Wire a Clerk sign-out lifecycle hook that runs `localStorage.removeItem("dynastygpt-league")` + `useLeagueStore.getState().clearLeague()`. Eliminates the "one-tick spinner" cross-user leak when the same browser signs out then signs a different user in. The Step 3 gate already prevents actual data exposure — this is polish for the UX artifact.

**Auto-approve + auto-sync newly discovered leagues**
- Today the switcher only lists leagues that are ALREADY in `approved_leagues`. If a user joins a new dynasty league mid-season, that league won't appear until it's manually added to the whitelist. Options:
  1. On login/mount, call a new backend endpoint that fetches the user's Sleeper league list and auto-adds any dynasty leagues to `approved_leagues` + kicks off `bulletproof_sync` in the background.
  2. Make the switcher's "no leagues found" UX branch offer a "scan for new leagues" button that triggers the same.
- Backend cost: one Sleeper API call per user on login. Not free — do behind a stale-timer.

**Deterministic tests for `approve_user`'s parked Clerk-swallow behavior**
- Two pre-existing failures in `tests/test_approve_user.py` (`test_approve_user_clerk_failure`, `test_approve_user_no_clerk_key`) assert `HTTPException` where the current code intentionally swallows the failure to keep approval non-fatal. Logged in `dynastygpt-api/docs/KNOWN_ISSUES.md` on 2026-07-03. Update the tests to assert graceful degradation instead. Non-urgent — no user impact.

### Manual end-to-end test target

User Sleeper ID `474304233173151744` — the only real multi-league beta user, 3 approved leagues. Test scenarios (Billy owns):

1. Sign in → land on last-active league (default first time = deterministic primary from ORDER BY wave/id)
2. Switcher chevron appears in top nav next to the league name; dropdown lists 2 other leagues
3. Click a different league → data loads for new league, no stale mock-draft / trade-builder / war-room state bleeds through
4. Hard refresh → same league still shown (persist survives)
5. Sign out + sign back in → land on the league last viewed (Clerk metadata + persist agree)
6. Verify with a single-league beta user account: switcher is completely absent (no disabled chevron, no empty dropdown)
