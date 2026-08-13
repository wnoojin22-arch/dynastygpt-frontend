# FE identity + mount-order hardening (design stub)

**Filed 2026-08-13.** Scheduled post-season-prep, not now. This
document merges what were previously two scheduled follow-ups —
"Layer B" from the 2026-08-13 signed-out-invitee incident, and "Wide"
from the same day's display-name-in-URL audit. Both target the same
root failure: React child components fire API calls before the
identity data those calls depend on is fully hydrated.

---

## Ground truth as of ship day (2026-08-13, in prod)

Layer A ships today, freeze-compatible:
- FE middleware at `/l/*` redirects signed-out visitors to
  `/sign-in?return_to=<path>` before any React mounts
  (`src/middleware.ts`)
- Sign-in page consumes `return_to` and passes to
  `<SignIn forceRedirectUrl={…}>` via `safeReturnTo()` allow-list
  (`src/lib/redirect.ts`)
- BE public endpoint `/api/public/league/by-slug/{slug}` returns
  minimal metadata unauth for slug resolution before sign-in
- `_logApiError` now sends Bearer so `beta_errors` carries
  `clerk_user_id`

Narrow fix ships in the same commit as this doc:
- Three hard-unsafe URL-builder call sites patched to thread a uid
  through (`TradeReportModal.tsx:802`, `TapToBuild.tsx:171,177`)
- `O(owner, userId)` in `src/lib/api.ts` instrumented — logs a
  `[owner-id-fallback]` marker to `beta_errors.metadata.kind =
  "owner_id_fallback"` when userId is falsy, deduped per session per
  (page + owner)

**What's still broken but not yet observed at volume**:
- ~49 other FE call sites pass a userId variable that CAN be null at
  runtime (store hydration race, unknown/synthetic owner). None have
  been root-caused to a specific incident yet.
- `LeagueLayout` at `src/app/l/[slug]/layout.tsx` mounts children
  synchronously with layout-owned queries, gating both via
  `!!currentLeagueId` but NOT `!!user`, `!!currentOwnerId`, or
  Clerk's `isLoaded`. Race window is ~200-500ms between store
  hydration and owner auto-select.

---

## Wide, part 1 — layout gate-first restructure (was Layer B)

**Rework**: `LeagueLayout` renders a spinner only (no children
mounted, no useQueries fired) until:
1. Clerk `isLoaded && !!user`
2. `currentLeagueId !== null`
3. `currentOwnerId !== null`

Only when all three hold do children mount and fire their queries.
Every child's `useQuery` `enabled` predicate becomes `enabled: !!lid
&& !!owner && !!ownerId` — the ownerId condition is currently
missing from all 49 sites.

Blast radius: mount order changes for every league page. Test surface
is every league route + every child component that assumes it's
mounted with a partial-hydration state.

## Wide, part 2 — `O()` becomes uid-required (was Wide)

**Change**: `O(owner: string, userId: string)` — no more nullable
userId. Throws at build time (TypeScript) if a caller passes a
possibly-null value. Every one of the 49 conditional-unsafe sites
gets a mandatory `resolveOwnerUid(owner, leagueId)` upstream that
returns `Promise<string>` from the owners lookup and blocks the
query.

Two-step implementation:
1. Introduce `resolveOwnerUid(owner, leagueId)` helper. Ship it as
   opt-in. Migrate the 49 sites one at a time; each migration is a
   ~5-line diff.
2. Once all sites migrated (verify via the instrumentation data
   below), tighten `O()`'s signature to require string. Delete the
   display-name fallback + the `_logOwnerIdFallback` telemetry.

## Instrumentation data — sizing input

`_logOwnerIdFallback` (in `src/lib/api.ts`) logs to `beta_errors`
with `metadata.kind = "owner_id_fallback"`, one row per session per
(page + owner). Query to prioritize sites:

```sql
SELECT
  page,
  substring(error_message from 'owner=([^ ]+)') AS owner_name,
  substring(error_message from 'stack=(.+)$') AS stack,
  COUNT(*) AS session_hits,
  COUNT(DISTINCT clerk_user_id) AS users_affected
FROM beta_errors
WHERE metadata->>'kind' = 'owner_id_fallback'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY page, owner_name, stack
ORDER BY users_affected DESC, session_hits DESC
LIMIT 50;
```

Two weeks of data should surface the top 5–10 offending sites. Those
migrate first. Rest can follow at leisure or wait for the layout
gate-first change to remove the null-hydration window entirely.

---

## Timeline

- **Not this week**: beta week + freeze constraints.
- **Not next week**: sync-cadence + T1's ongoing DB routing work take
  priority.
- **Post-season-prep**: schedule the layout restructure as a
  dedicated pass. `O()` tightening rides on top once instrumentation
  data lands.

## Cross-links
- Incident report / Layer A design: 2026-08-13 conversation summary
  in the beta-week thread (this session).
- Audit findings (52 call sites, 3 hard-unsafe, 49 conditional-
  unsafe): same session, "Display-name-in-URL audit" section.
- ROADMAP entry that predates this doc: `dynastygpt-api/docs/ROADMAP.md`
  "Layer B — league layout gate-first restructure (2026-08-13)".
  This doc supersedes that entry as the scoping surface.
