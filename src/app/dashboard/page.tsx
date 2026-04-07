"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getOverview, syncLeague } from "@/lib/api";
import { DEV_BYPASS_ACTIVE, DEV_USER_METADATA } from "@/hooks/useDevUser";

const C = {
  bg: "#06080d", card: "#10131d", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const metadata = DEV_BYPASS_ACTIVE
    ? DEV_USER_METADATA
    : (user?.unsafeMetadata ?? {});

  const sleeperUsername = metadata.sleeper_username as string | undefined;
  const sleeperId = metadata.sleeper_user_id as string | undefined;
  const approvedLeagueId = metadata.approved_league_id as string | undefined;

  // Route: no sleeper → onboarding, has approved league → fetch overview & redirect to /l/{slug}
  useEffect(() => {
    if (!isLoaded && !DEV_BYPASS_ACTIVE) return;

    if (!sleeperId) {
      router.replace("/onboarding");
      return;
    }

    if (!approvedLeagueId) return; // show pending state below

    const toSlug = (name: string) =>
      (name || approvedLeagueId!)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    getOverview(approvedLeagueId)
      .then((res) => router.replace(`/l/${toSlug(res.name)}`))
      .catch(() => {
        // Overview failed (league not cached) — trigger sync then redirect
        syncLeague(approvedLeagueId!)
          .then((res) => router.replace(`/l/${toSlug(res.name)}`))
          .catch(() => router.replace(`/l/${toSlug(approvedLeagueId!)}`));
      });
  }, [isLoaded, sleeperId, approvedLeagueId, router]);

  if (!isLoaded && !DEV_BYPASS_ACTIVE) return null;

  // If approved league exists, show loading while we redirect
  if (approvedLeagueId) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING LEAGUE...</span>
      </div>
    );
  }

  // Pending state: Sleeper linked but no approved league yet
  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center" }}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "48px 36px",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 24px",
            background: C.goldDim, border: `2px solid ${C.goldBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: SERIF, fontSize: 28, fontWeight: 900, fontStyle: "italic",
            color: C.gold,
          }}>
            D
          </div>
          <h1 style={{
            fontFamily: SERIF, fontSize: 28, fontWeight: 900, fontStyle: "italic",
            color: C.goldBright, margin: "0 0 12px",
          }}>
            You&apos;re on the list
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: 15, color: C.secondary, lineHeight: 1.6,
            margin: 0,
          }}>
            Your beta application is under review.
            {email && (
              <> You&apos;ll get an email at{" "}
                <span style={{ color: C.gold, fontWeight: 600 }}>{email}</span>
                {" "}when your league is approved.</>
            )}
            {!email && <> You&apos;ll get an email when your league is approved.</>}
          </p>
          <div style={{
            marginTop: 28, fontFamily: MONO, fontSize: 10, fontWeight: 800,
            letterSpacing: "0.12em", color: C.dim,
          }}>
            SLEEPER ACCOUNT: {sleeperUsername}
          </div>
        </div>
      </div>
    </div>
  );
}
