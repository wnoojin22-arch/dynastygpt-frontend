/**
 * Redirect-URL validation helpers.
 *
 * Currently one function: `safeReturnTo`, used by the sign-in page to
 * validate the `return_to` query param that the /l/* middleware
 * (src/middleware.ts) attaches when redirecting signed-out visitors.
 *
 * The middleware always sets `return_to` to `pathname + search` on the
 * FE origin, so any well-formed value starts with `/`. Validation
 * exists to defeat crafted values that could turn our sign-in page
 * into an open redirect (attacker sends a phishing email with
 * `/sign-in?return_to=https://evil.example/…` or
 * `/sign-in?return_to=//evil.example/…`, victim signs in, Clerk
 * redirects them off-site).
 */

/** Return the candidate unchanged if it's a safe internal path,
 *  otherwise null. Callers substitute a default (`/dashboard`) for null. */
export function safeReturnTo(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  // Must be an internal path (starts with `/`). Absolute URLs like
  // `https://evil.example/x` fail here.
  if (!candidate.startsWith("/")) return null;
  // `//host/path` is a protocol-relative URL — browsers resolve it
  // against the current scheme and treat `host` as the origin.
  if (candidate.startsWith("//")) return null;
  // `/\evil.example` — some browsers normalize the backslash to `/`,
  // turning this into a protocol-relative URL. Reject.
  if (candidate.startsWith("/\\")) return null;
  return candidate;
}
