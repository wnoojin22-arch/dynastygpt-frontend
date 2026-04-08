"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DEV_BYPASS_ACTIVE, DEV_USER_METADATA } from "@/hooks/useDevUser";
import { authHeaders } from "@/lib/api";

const C = {
  bg: "#06080d", card: "#10131d", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)", green: "#7dd3a0", red: "#e47272",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

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

      // 4. Enforce one Sleeper account per DynastyGPT account
      const hdrs = await authHeaders();
      const linkRes = await fetch("/api/user/link-sleeper", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          sleeper_user_id: sleeperId,
          clerk_user_id: user.id,
          sleeper_username: displayName,
        }),
      });
      if (linkRes.status === 409) {
        const linkData = await linkRes.json();
        setError(linkData.detail || "This Sleeper account is already connected to another DynastyGPT account. Please use the correct login.");
        setLoading(false);
        return;
      }

      // 5. Auto-approve: check if user is in an approved league
      try {
        const approveRes = await fetch("/api/user/approve", {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({
            sleeper_user_id: sleeperId,
            clerk_user_id: user.id,
          }),
        });
        const approveData = await approveRes.json();
        if (approveRes.ok && approveData.approved) {
          router.push(`/dashboard?league_id=${approveData.league_id}`);
          return;
        }
      } catch { /* non-critical — fall through to league list */ }

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
      <div style={{ maxWidth: 460, width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: SANS, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px",
            color: C.primary, margin: 0,
          }}>
            Connect your Sleeper account<span style={{ color: C.gold }}>.</span>
          </div>
          <p style={{ fontFamily: SANS, fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
            Enter your Sleeper username so we can find your league.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "28px 28px",
        }}>
          {!leagues ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.12em", color: C.dim,
                  display: "block", marginBottom: 8,
                }}>
                  SLEEPER USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                  placeholder="e.g. moranimals34"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 6,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.primary, fontFamily: SANS, fontSize: 15,
                    outline: "none", transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = C.gold}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.border}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{
                  fontFamily: SANS, fontSize: 13, color: C.red,
                  padding: "10px 12px", borderRadius: 6, background: "rgba(228,114,114,0.08)",
                  border: "1px solid rgba(228,114,114,0.15)", marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLink}
                disabled={loading || !username.trim()}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 6, border: "none",
                  background: loading ? C.dim : C.gold, color: "#06080d",
                  fontFamily: SANS, fontSize: 14, fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {loading ? "Searching..." : "Connect Account"}
              </button>

              <p style={{
                fontFamily: SANS, fontSize: 12, color: "#4a4b5a",
                textAlign: "center", marginTop: 16, lineHeight: 1.5,
              }}>
                We only read public league data. Nothing is modified.
              </p>
            </>
          ) : (
            <>
              {/* Linked state */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.12em", color: C.green, marginBottom: 6,
                }}>
                  ACCOUNT LINKED
                </div>
                <div style={{ fontFamily: SANS, fontSize: 14, color: C.secondary }}>
                  Found <strong style={{ color: C.gold }}>{leagues.length}</strong> dynasty league{leagues.length !== 1 ? "s" : ""} on Sleeper
                </div>
              </div>

              <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 20 }}>
                {leagues.map((l) => (
                  <div key={l.league_id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {l.name}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{l.season}</div>
                    </div>
                  </div>
                ))}
                {leagues.length === 0 && (
                  <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim, textAlign: "center", padding: 20 }}>
                    No dynasty leagues found for this season.
                  </div>
                )}
              </div>

              <button
                onClick={handleContinue}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 6, border: "none",
                  background: C.gold, color: "#06080d",
                  fontFamily: SANS, fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 24,
          fontFamily: MONO, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.1em", color: "#4a4b5a",
        }}>
          DYNASTYGPT
        </div>
      </div>
    </div>
  );
}
