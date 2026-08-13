import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes — no Clerk session required. Everything else is
// protected via auth.protect() below EXCEPT /l/* which gets an
// explicit redirect-with-return_to (see the /l/* block).
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/beta",
  "/admin(.*)",
  "/api/webhooks(.*)",
  "/api/health",
  // Public slug-resolution endpoint — Billy 2026-08-13. Returns
  // minimal league metadata (league_id, name, num_teams, format),
  // owners list stays on the auth'd `/api/league/by-slug/*` endpoint.
  // Rate-limited server-side via T1's CF-Connecting-IP _client_ip
  // helper. Listed here so middleware doesn't gate it.
  "/api/public/league/by-slug(.*)",
]);

// League-page paths — a signed-out visitor should NEVER see a partial
// render / fetch fanout on these. Layer A of the 2026-08-13 signed-out-
// invitee incident fix: explicit redirect to /sign-in with a return_to
// query param so Clerk's <SignIn redirectUrl=…> round-trips back to
// the exact league URL they clicked. Layer B (layout gate-first
// restructure) is parked per Billy — see docs/T5_STATE.md.
const isLeaguePage = createRouteMatcher(["/l/:slug", "/l/:slug/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Dev bypass — skip all auth in local development
  if (
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV === "development"
  ) {
    return NextResponse.next();
  }

  // /l/* path handling — signed-out redirect with return_to.
  //
  // We do this BEFORE auth.protect() (a) so we can attach return_to
  // (auth.protect() alone loses the original path), and (b) so we
  // decide the response shape ourselves for HTML navigations. This
  // block deliberately does NOT match /api/* paths — those are handled
  // by the BE ClerkAuthMiddleware which already returns 401 correctly
  // and doesn't need a redirect.
  if (isLeaguePage(request)) {
    const { userId } = await auth();
    if (!userId) {
      const signInUrl = new URL("/sign-in", request.url);
      // Preserve the exact path + any query string (e.g.
      // ?league_id=1312047513884184576). Encoded as a single value
      // via URL.searchParams so nested `?` and `&` in the return_to
      // don't corrupt the outer /sign-in URL's parsing.
      const returnTo =
        request.nextUrl.pathname + (request.nextUrl.search || "");
      signInUrl.searchParams.set("return_to", returnTo);
      return NextResponse.redirect(signInUrl);
    }
    // Signed in — continue to the page. The layout still runs its own
    // owner/league membership gate; that's Layer B territory.
    return NextResponse.next();
  }

  // All other non-public routes get Clerk's default protection.
  // auth.protect() handles HTML (redirect to sign-in) and API
  // (returns 404 for non-existent-to-anon posture) per Clerk defaults.
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
