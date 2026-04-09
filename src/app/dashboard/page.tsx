"use client";

import { Suspense, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  const initialApprovedLeagueId = urlLeagueId
    || (metadata.approved_league_id as string | undefined)
    || (typeof window !== "undefined" ? localStorage.getItem("approved_league_id") : null)
    || undefined;

  // Re-checked approval state (in case Clerk metadata write failed previously)
  const [recheckedLeagueId, setRecheckedLeagueId] = useState<string | undefined>(undefined);
  const [recheckDone, setRecheckDone] = useState(false);

  const approvedLeagueId = initialApprovedLeagueId || recheckedLeagueId;

  if (approvedLeagueId && typeof window !== "undefined") {
    localStorage.setItem("approved_league_id", approvedLeagueId);
  }

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

          {/* DEBUG: surface clerk identity so we can compare to DB */}
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 8,
            background: "rgba(212,165,50,0.04)",
            border: "1px solid rgba(212,165,50,0.15)",
            fontFamily: MONO, fontSize: 10, color: C.dim,
            wordBreak: "break-all",
          }}>
            <div style={{ marginBottom: 4 }}>clerk_user_id: <span style={{ color: C.gold }}>{user?.id || "(none)"}</span></div>
            <div style={{ marginBottom: 4 }}>sleeper_user_id: <span style={{ color: C.gold }}>{sleeperId || "(none)"}</span></div>
            <div style={{ marginBottom: 8 }}>approved_league_id (metadata): <span style={{ color: C.gold }}>{(metadata.approved_league_id as string) || "(none)"}</span></div>
            <button
              onClick={async () => {
                try {
                  const { authHeaders } = await import("@/lib/api");
                  const hdrs = await authHeaders();
                  const res = await fetch("/api/user/approve", {
                    method: "POST",
                    headers: hdrs,
                    body: JSON.stringify({
                      sleeper_user_id: sleeperId,
                      clerk_user_id: user?.id,
                    }),
                  });
                  const txt = await res.text();
                  alert(`HTTP ${res.status}\n\n${txt}`);
                } catch (e) {
                  alert(`fetch error: ${e}`);
                }
              }}
              style={{
                width: "100%", padding: "8px 0", borderRadius: 6,
                border: "1px solid rgba(212,165,50,0.4)",
                background: "transparent", color: C.gold,
                fontFamily: MONO, fontSize: 10, cursor: "pointer",
              }}
            >
              TEST APPROVE ENDPOINT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
