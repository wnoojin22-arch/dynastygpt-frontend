"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, UserButton } from "@/lib/clerk-stub";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { syncLeague } from "@/lib/api";

const C = {
  bg: "#06080d", card: "#10131d", elevated: "#171b28", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)", green: "#7dd3a0", red: "#e47272",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  settings: { type: number };
  roster_positions: string[];
  avatar: string | null;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { setLeague, setOwner, savedLeagues } = useLeagueStore();

  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const sleeperUsername = user?.unsafeMetadata?.sleeper_username as string | undefined;
  const sleeperId = user?.unsafeMetadata?.sleeper_user_id as string | undefined;

  // Redirect to onboarding if no Sleeper username
  useEffect(() => {
    if (isLoaded && !sleeperUsername) {
      router.push("/onboarding");
    }
  }, [isLoaded, sleeperUsername, router]);

  // Fetch leagues from Sleeper
  useEffect(() => {
    if (!sleeperId) return;
    setLoading(true);
    fetch(`https://api.sleeper.app/v1/user/${sleeperId}/leagues/nfl/2025`)
      .then((r) => r.json())
      .then((data) => {
        const dynasty = (data || []).filter(
          (l: SleeperLeague) => l.settings?.type === 2
        );
        setLeagues(dynasty);
      })
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false));
  }, [sleeperId]);

  // Sync + navigate to a league
  const handleLeagueClick = useCallback(async (league: SleeperLeague) => {
    setSyncing(league.league_id);
    try {
      const res = await syncLeague(league.league_id);
      const slug = league.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setLeague(league.league_id, slug, league.name);

      // Try to find the user's team name in this league
      if (sleeperId) {
        try {
          const usersRes = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`);
          const users = await usersRes.json();
          const me = users?.find((u: Record<string, unknown>) => u.user_id === sleeperId);
          if (me) {
            const teamName = (me.metadata as Record<string, unknown>)?.team_name || me.display_name;
            if (teamName) setOwner(teamName as string);
          }
        } catch { /* non-critical */ }
      }

      router.push(`/l/${slug}`);
    } catch {
      setSyncing(null);
    }
  }, [setLeague, setOwner, sleeperId, router]);

  // Manual league ID entry
  const handleManualSync = useCallback(async () => {
    const id = manualId.trim();
    if (!id) return;
    setManualError(null);
    setSyncing(id);
    try {
      const res = await syncLeague(id);
      const slug = (res.name || id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setLeague(id, slug, res.name || id);
      router.push(`/l/${slug}`);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to sync");
      setSyncing(null);
    }
  }, [manualId, setLeague, router]);

  if (!isLoaded) return null;

  const isSF = (l: SleeperLeague) => (l.roster_positions || []).includes("SUPER_FLEX");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 900, fontStyle: "italic", color: C.goldBright, margin: 0 }}>
              Your Leagues
            </h1>
            <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, marginTop: 4 }}>
              {sleeperUsername} · {leagues.length} dynasty league{leagues.length !== 1 ? "s" : ""}
            </p>
          </div>
          <UserButton
            appearance={{
              elements: { avatarBox: { width: 36, height: 36 } },
            }}
          />
        </div>

        {/* League grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING LEAGUES...</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340, 1fr))", gap: 12 }}>
            {leagues.map((l) => (
              <div
                key={l.league_id}
                onClick={() => !syncing && handleLeagueClick(l)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "16px 20px", cursor: syncing ? "wait" : "pointer",
                  transition: "all 0.15s",
                  borderLeft: `4px solid ${C.gold}`,
                  opacity: syncing && syncing !== l.league_id ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!syncing) e.currentTarget.style.background = C.elevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.card; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {l.name}
                  </div>
                  {syncing === l.league_id && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, letterSpacing: "0.08em" }}>SYNCING...</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, padding: "2px 6px", borderRadius: 3, background: C.elevated }}>
                    {l.total_rosters}T
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: isSF(l) ? C.gold : C.dim, padding: "2px 6px", borderRadius: 3, background: C.elevated }}>
                    {isSF(l) ? "SF" : "1QB"}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, padding: "2px 6px", borderRadius: 3, background: C.elevated }}>
                    {l.season}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual league ID entry */}
        <div style={{
          marginTop: 24, padding: "16px 20px", background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 8,
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginBottom: 8 }}>
            ADD LEAGUE BY ID
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSync()}
              placeholder="Paste Sleeper league ID"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 6,
                background: C.bg, border: `1px solid ${C.border}`,
                color: C.primary, fontFamily: MONO, fontSize: 13, outline: "none",
              }}
            />
            <button
              onClick={handleManualSync}
              disabled={!!syncing || !manualId.trim()}
              style={{
                padding: "10px 20px", borderRadius: 6, border: "none",
                background: syncing ? C.dim : C.gold, color: C.bg,
                fontFamily: MONO, fontSize: 12, fontWeight: 800,
                cursor: syncing ? "wait" : "pointer",
              }}
            >
              SYNC
            </button>
          </div>
          {manualError && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.red, marginTop: 8 }}>{manualError}</div>
          )}
        </div>

        {/* Previously synced leagues */}
        {savedLeagues.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.dim, marginBottom: 8 }}>
              RECENTLY VIEWED
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {savedLeagues.map((l) => (
                <div
                  key={l.id}
                  onClick={() => {
                    setLeague(l.id, l.slug, l.name);
                    if (l.owner) setOwner(l.owner);
                    router.push(`/l/${l.slug}`);
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 4,
                    border: `1px solid ${C.goldBorder}`, background: C.goldDim,
                    color: C.gold, fontFamily: SANS, fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {l.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
