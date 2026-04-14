"use client";

import { Suspense, useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { getOverview, syncLeague, authHeaders } from "@/lib/api";
import { useLeagueStore } from "@/lib/stores/league-store";
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
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#06080d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#d4a532", letterSpacing: "0.1em" }}>LOADING...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const metadata = DEV_BYPASS_ACTIVE
    ? DEV_USER_METADATA
    : (user?.unsafeMetadata ?? {});

  const searchParams = useSearchParams();
  const { setLeague } = useLeagueStore();
  const sleeperUsername = metadata.sleeper_username as string | undefined;
  const sleeperId = metadata.sleeper_user_id as string | undefined;
  const urlLeagueId = searchParams.get("league_id");
  // Per-user fields ONLY — never read approved_league_id from localStorage.
  // localStorage is per-browser, not per-Clerk-user, so it leaked state across
  // sign-outs / user deletions / different Sleeper accounts on the same browser.
  // Clerk unsafeMetadata is already per-user; the recheck useEffect below
  // re-fetches from /api/user/approve whenever metadata is missing.
  const initialApprovedLeagueId = urlLeagueId
    || (metadata.approved_league_id as string | undefined)
    || undefined;

  // Re-checked approval state (in case Clerk metadata write failed previously)
  const [recheckedLeagueId, setRecheckedLeagueId] = useState<string | undefined>(undefined);
  const [recheckDone, setRecheckDone] = useState(false);

  const approvedLeagueId = initialApprovedLeagueId || recheckedLeagueId;

  // Re-check approval if we have a sleeperId but no approvedLeagueId.
  // This handles the case where Clerk metadata write failed during onboarding
  // (e.g. missing CLERK_SECRET_KEY) or the user was approved AFTER signup.
  useEffect(() => {
    if (!isLoaded && !DEV_BYPASS_ACTIVE) return;
    if (DEV_BYPASS_ACTIVE) return;
    if (!sleeperId) return;
    if (initialApprovedLeagueId) return; // already have one
    if (recheckDone) return;

    (async () => {
      try {
        const hdrs = await authHeaders();
        const res = await fetch("/api/user/approve", {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({
            sleeper_user_id: sleeperId,
            clerk_user_id: user?.id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.approved && data.league_id) {
            setRecheckedLeagueId(data.league_id);
            return;
          }
        }
      } catch { /* fall through to waitlist */ }
      setRecheckDone(true);
    })();
  }, [isLoaded, sleeperId, initialApprovedLeagueId, recheckDone, user?.id]);

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

    const go = (name: string) => {
      const slug = toSlug(name);
      setLeague(approvedLeagueId!, slug, name);
      router.replace(`/l/${slug}?league_id=${approvedLeagueId}`);
    };

    // Redirect immediately with a temporary slug — don't wait for API
    // The league page will load the real name once it fetches overview
    const fallbackSlug = toSlug(approvedLeagueId!);
    setLeague(approvedLeagueId!, fallbackSlug, approvedLeagueId!);

    // Try to get real name for a nicer slug, but redirect either way after 3s
    const timeout = setTimeout(() => router.replace(`/l/${fallbackSlug}?league_id=${approvedLeagueId}`), 3000);

    getOverview(approvedLeagueId)
      .then((res) => { clearTimeout(timeout); go(res.name); })
      .catch(() => { clearTimeout(timeout); router.replace(`/l/${fallbackSlug}?league_id=${approvedLeagueId}`); });
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

  // Still re-checking approval — show loading instead of waitlist
  if (sleeperId && !recheckDone) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>CHECKING ACCESS...</span>
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
            fontFamily: SANS, fontSize: 24, fontWeight: 800,
            color: C.primary, margin: "0 0 12px", letterSpacing: "-0.02em",
          }}>
            DynastyGPT is currently in private beta
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: 15, color: C.secondary, lineHeight: 1.6,
            margin: "0 0 28px",
          }}>
            Request access to get in. We&apos;re onboarding new leagues every week.
          </p>
          <a
            href="https://dynastygpt.com/beta"
            style={{
              display: "block", width: "100%", padding: "13px 0", borderRadius: 8,
              background: C.gold, color: "#06080d",
              fontFamily: SANS, fontSize: 14, fontWeight: 700,
              textAlign: "center", textDecoration: "none",
              cursor: "pointer", transition: "opacity 0.15s",
            }}
          >
            Request Beta Access
          </a>
          <div style={{
            marginTop: 20, fontFamily: MONO, fontSize: 10, fontWeight: 800,
            letterSpacing: "0.12em", color: C.dim,
          }}>
            SLEEPER ACCOUNT: {sleeperUsername}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={async () => {
                if (!user?.id) return;
                try {
                  const hdrs = await authHeaders();
                  await fetch("/api/user/unlink-sleeper", {
                    method: "POST",
                    headers: hdrs,
                    body: JSON.stringify({ clerk_user_id: user.id }),
                  });
                  await user.update({
                    unsafeMetadata: {
                      sleeper_username: undefined,
                      sleeper_user_id: undefined,
                      approved_league_id: undefined,
                    },
                  });
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("approved_league_id");
                  }
                  router.replace("/onboarding");
                } catch {
                  router.replace("/onboarding");
                }
              }}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8,
                border: `1px solid ${C.goldBorder}`,
                background: C.goldDim, color: C.gold,
                fontFamily: SANS, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              Use a different Sleeper account
            </button>
            <SignOutButton redirectUrl="/sign-in">
              <button
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: "transparent", color: C.dim,
                  fontFamily: SANS, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
