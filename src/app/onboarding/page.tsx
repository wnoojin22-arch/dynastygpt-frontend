"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DEV_BYPASS_ACTIVE, DEV_USER_METADATA } from "@/hooks/useDevUser";

const C = {
  bg: "#06080d", card: "#10131d", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)", green: "#7dd3a0", red: "#e47272",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const DISPLAY = "'Archivo Black', sans-serif";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<Array<{ league_id: string; name: string; season: string }> | null>(null);

  // If user already has sleeper_username, skip to dashboard
  const metadata = DEV_BYPASS_ACTIVE
    ? DEV_USER_METADATA
    : (user?.unsafeMetadata ?? {});
  const existingUsername = metadata.sleeper_username as string | undefined;

  useEffect(() => {
    if ((isLoaded || DEV_BYPASS_ACTIVE) && existingUsername) {
      router.push("/dashboard");
    }
  }, [isLoaded, existingUsername, router]);

  const handleLink = async () => {
    if (!username.trim() || !user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Verify Sleeper username exists
      const sleeperRes = await fetch(`https://api.sleeper.app/v1/user/${username.trim()}`);
      if (!sleeperRes.ok) {
        setError("Sleeper username not found. Check spelling and try again.");
        setLoading(false);
        return;
      }
      const sleeperUser = await sleeperRes.json();
      const sleeperId = sleeperUser.user_id;
      const displayName = sleeperUser.display_name || username.trim();

      // 2. Get their dynasty leagues from Sleeper
      const leaguesRes = await fetch(`https://api.sleeper.app/v1/user/${sleeperId}/leagues/nfl/2025`);
      const allLeagues = await leaguesRes.json();
      const dynastyLeagues = (allLeagues || []).filter(
        (l: Record<string, unknown>) => (l.settings as Record<string, unknown>)?.type === 2
      );

      // 3. Store Sleeper username + user_id in Clerk metadata
      await user.update({
        unsafeMetadata: {
          sleeper_username: displayName,
          sleeper_user_id: sleeperId,
          linked_at: new Date().toISOString(),
        },
      });

      // 4. Auto-approve: check if user is in an approved league
      try {
        console.log("[ONBOARD] Calling /api/user/approve with: sleeper_user_id=" + sleeperId + " clerk_user_id=" + user.id);
        const approveRes = await fetch("/api/user/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sleeper_user_id: sleeperId,
            clerk_user_id: user.id,
          }),
        });
        const approveData = await approveRes.json();
        console.log("[ONBOARD] /api/user/approve response: status=" + approveRes.status + " body=" + JSON.stringify(approveData));
        if (approveRes.ok && approveData.approved) {
          router.push(`/dashboard?league_id=${approveData.league_id}`);
          return;
        }
      } catch (err) { console.error("[ONBOARD] /api/user/approve error:", err); }

      // 5. Show their leagues
      setLeagues(dynastyLeagues.map((l: Record<string, unknown>) => ({
        league_id: l.league_id as string,
        name: l.name as string,
        season: l.season as string,
      })));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push("/dashboard");
  };

  if (!isLoaded && !DEV_BYPASS_ACTIVE) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, padding: 20,
    }}>
      <div style={{
        maxWidth: 520, width: "100%", background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 28px", borderBottom: `1px solid ${C.border}`,
          background: C.goldDim,
        }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 900, fontStyle: "italic", color: C.goldBright, margin: 0 }}>
            Link Your Sleeper Account
          </h1>
          <p style={{ fontFamily: SANS, fontSize: 14, color: C.secondary, marginTop: 8 }}>
            Enter your Sleeper username so we can find your dynasty leagues.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px" }}>
          {!leagues ? (
            <>
              {/* Username input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, display: "block", marginBottom: 8 }}>
                  SLEEPER USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                  placeholder="e.g. DukeNukem"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 6,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.primary, fontFamily: SANS, fontSize: 16,
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{
                  fontFamily: MONO, fontSize: 12, color: C.red,
                  padding: "8px 12px", borderRadius: 4, background: "rgba(228,114,114,0.12)",
                  marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLink}
                disabled={loading || !username.trim()}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 6, border: "none",
                  background: loading ? C.dim : C.gold, color: C.bg,
                  fontFamily: MONO, fontSize: 14, fontWeight: 800, letterSpacing: "0.06em",
                  cursor: loading ? "wait" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "SEARCHING SLEEPER..." : "LINK ACCOUNT"}
              </button>

              <p style={{ fontFamily: SANS, fontSize: 12, color: C.dim, textAlign: "center", marginTop: 16 }}>
                Your Sleeper username is your display name on the Sleeper app. We only read public league data — nothing is modified.
              </p>
            </>
          ) : (
            <>
              {/* League discovery results */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.green, marginBottom: 4 }}>
                  ✓ ACCOUNT LINKED
                </div>
                <div style={{ fontFamily: SANS, fontSize: 14, color: C.secondary }}>
                  Found <strong style={{ color: C.gold }}>{leagues.length}</strong> dynasty league{leagues.length !== 1 ? "s" : ""} on Sleeper
                </div>
              </div>

              {/* League list */}
              <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 20 }}>
                {leagues.map((l) => (
                  <div key={l.league_id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.name}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{l.season}</div>
                    </div>
                  </div>
                ))}
                {leagues.length === 0 && (
                  <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim, textAlign: "center", padding: 20 }}>
                    No dynasty leagues found for this season. You can still enter a league ID manually.
                  </div>
                )}
              </div>

              <button
                onClick={handleContinue}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 6, border: "none",
                  background: C.gold, color: C.bg,
                  fontFamily: MONO, fontSize: 14, fontWeight: 800, letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                GO TO DASHBOARD →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
