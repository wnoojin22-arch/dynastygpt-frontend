/**
 * Dev bypass constants for local development.
 *
 * When NEXT_PUBLIC_DEV_BYPASS=true in .env.local (and NODE_ENV=development),
 * these are used in place of real Clerk unsafeMetadata so pages render
 * without requiring Clerk auth.
 *
 * Set the NEXT_PUBLIC_DEV_* vars in .env.local to match your test user.
 */

export const DEV_BYPASS_ACTIVE =
  process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
  process.env.NODE_ENV === "development";

export const DEV_USER_METADATA: Record<string, unknown> = DEV_BYPASS_ACTIVE
  ? {
      sleeper_username: process.env.NEXT_PUBLIC_DEV_SLEEPER_USERNAME ?? "DevUser",
      sleeper_user_id: process.env.NEXT_PUBLIC_DEV_SLEEPER_USER_ID ?? "",
      approved_league_id: process.env.NEXT_PUBLIC_DEV_APPROVED_LEAGUE_ID ?? "",
    }
  : {};
