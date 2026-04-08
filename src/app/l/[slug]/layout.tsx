"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { DEV_BYPASS_ACTIVE, DEV_USER_METADATA } from "@/hooks/useDevUser";
import PlayerCardModal from "@/components/league/PlayerCardModal";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOwners, getOverview, getRankings, syncLeague, getLeagueBySlug } from "@/lib/api";
import { Home, LayoutGrid, Search, Zap, BarChart3, RefreshCw } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  goldGlow: "rgba(212,165,50,0.06)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

/* ═══════════════════════════════════════════════════════════════
   SHIELD LOGO
   ═══════════════════════════════════════════════════════════════ */
function ShieldLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(212,165,50,0.3))" }}>
      <defs>
        <linearGradient id="nav-gs1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914"/><stop offset="30%" stopColor="#d4a532"/>
          <stop offset="50%" stopColor="#f5e6a3"/><stop offset="70%" stopColor="#d4a532"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
        <linearGradient id="nav-gs2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3"/><stop offset="100%" stopColor="#b8860b"/>
        </linearGradient>
      </defs>
      <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#nav-gs1)" strokeWidth="2.5"/>
      <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#nav-gs1)" opacity="0.08"/>
      <text x="26" y="40" textAnchor="middle" fontFamily={SERIF} fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#nav-gs2)">D</text>
      <g transform="translate(14, 3)">
        <path d="M0,10 L4,2 L8,7 L12,0 L16,7 L20,2 L24,10" fill="none" stroke="#f5e6a3" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="4" cy="2" r="1.5" fill="#f5e6a3"/><circle cx="12" cy="0" r="1.8" fill="#f5e6a3"/><circle cx="20" cy="2" r="1.5" fill="#f5e6a3"/>
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV ITEMS — 5 items, no sub-nav
   ═══════════════════════════════════════════════════════════════ */
const NAV_ITEMS: { id: string; label: string; path: string; icon: React.ReactNode }[] = [
  { id: "home",      label: "Home",      path: "",           icon: <Home size={20} /> },
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: <LayoutGrid size={20} /> },
  { id: "trades",    label: "Trades",    path: "/trades",    icon: <Zap size={20} /> },
  { id: "intel",     label: "Intel",     path: "/intel",     icon: <Search size={20} /> },
  { id: "rankings",  label: "Rankings",  path: "/rankings",  icon: <BarChart3 size={20} /> },
];

/* ═══════════════════════════════════════════════════════════════
   ICON SIDEBAR — 5 items, 64px, lucide-react icons
   ═══════════════════════════════════════════════════════════════ */
function IconSidebar({ basePath, pathname, owner, shaRank }: {
  basePath: string; pathname: string; owner: string | null; shaRank: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const windowLabel = shaRank <= 4 ? "CONTENDER" : shaRank <= 8 ? "MID PACK" : "REBUILDING";
  const windowColor = shaRank <= 4 ? C.green : shaRank <= 8 ? C.gold : C.red;

  return (
    <div className="hidden sm:flex flex-col items-center shrink-0 w-16 h-full bg-black border-r border-border pt-3.5 gap-0.5">
      {/* Logo */}
      <div className="cursor-pointer mb-4" onClick={() => router.push("/")}>
        <ShieldLogo size={32} />
      </div>

      {/* Owner identity */}
      {owner && (
        <div className="w-full px-2 pb-2 mb-1 border-b border-border text-center">
          <div className="font-sans text-[8px] font-bold text-primary truncate leading-tight">{owner}</div>
          {shaRank > 0 && (
            <div className="font-sans text-[8px] mt-0.5" style={{ color: windowColor }}>
              #{shaRank} {windowLabel}
            </div>
          )}
        </div>
      )}

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const href = `${basePath}${item.path}`;
        const isActive = item.path === ""
          ? pathname === basePath || pathname === basePath + "/"
          : pathname.startsWith(href);
        const isHov = hovered === item.id;

        return (
          <div key={item.id}
            onClick={() => router.push(href)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className={`flex flex-col items-center gap-1 w-[54px] py-2.5 rounded-md cursor-pointer transition-all
              ${isActive ? "bg-elevated border-l-2 border-gold" : isHov ? "bg-elevated/80 border-l-2 border-transparent" : "border-l-2 border-transparent"}`}
          >
            <span className={`transition-colors ${isActive ? "text-gold" : isHov ? "text-primary" : "text-dim"}`}>
              {item.icon}
            </span>
            <span className={`font-sans text-[8px] font-bold tracking-wide text-center leading-tight
              ${isActive || isHov ? "text-primary" : "text-dim"}`}>
              {item.label}
            </span>
          </div>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sign Out */}
      <SignOutButton redirectUrl="/sign-in">
        <button
          onClick={() => localStorage.removeItem("approved_league_id")}
          className="w-full px-2 py-2 text-center cursor-pointer hover:bg-elevated transition-colors"
        >
          <span className="font-sans text-[8px] font-bold tracking-wide text-dim hover:text-primary">SIGN OUT</span>
        </button>
      </SignOutButton>

      {/* Bottom status */}
      <div className="w-full px-2 py-3 border-t border-border flex items-center justify-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" style={{ boxShadow: `0 0 6px ${C.green}60` }} />
        <span className="font-sans text-[7px] text-dim tracking-wider hidden">ONLINE</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOTTOM TAB BAR — Mobile only, premium glass nav
   ═══════════════════════════════════════════════════════════════ */
function BottomTabBar({ basePath, pathname }: { basePath: string; pathname: string }) {
  const router = useRouter();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-black/95 backdrop-blur-md border-t border-border sm:hidden pb-safe flex items-center justify-around px-2 animate-[slideUp_0.35s_ease-out_both]"
      style={{ boxShadow: "0 -2px 20px rgba(0,0,0,0.5)" }}
    >
      {NAV_ITEMS.map((item, i) => {
        const href = `${basePath}${item.path}`;
        const isActive = item.path === ""
          ? pathname === basePath || pathname === basePath + "/"
          : pathname.startsWith(href);

        return (
          <button
            key={item.id}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 animate-[fadeUp_0.3s_ease-out_both] ${isActive ? "scale-105" : ""}`}
            style={{ animationDelay: `${i * 50 + 100}ms` }}
          >
            {/* Active pill indicator */}
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-[3px] rounded-full bg-gold"
                style={{ boxShadow: "0 2px 8px rgba(212,165,50,0.4)" }}
              />
            )}
            <span
              className={`transition-all duration-200 ${isActive ? "text-gold scale-110" : "text-dim"}`}
              style={{ lineHeight: 0 }}
            >
              {isActive
                ? (() => {
                    const Icon = { home: Home, dashboard: LayoutGrid, trades: Zap, intel: Search, rankings: BarChart3 }[item.id]!;
                    return <Icon size={22} />;
                  })()
                : item.icon
              }
            </span>
            <span
              className={`font-sans font-bold tracking-wide text-center leading-tight ${isActive ? "text-gold" : "text-dim"}`}
              style={{ fontSize: 9 }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                className="absolute -inset-x-1 -top-1 bottom-0 rounded-t-md pointer-events-none"
                style={{ boxShadow: "0 -4px 12px rgba(212,165,50,0.15)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEADER BAR — with Resync button
   ═══════════════════════════════════════════════════════════════ */
function HeaderBar({ owner, owners, onOwnerChange, leagueName, syncing, onResync }: {
  owner: string | null; owners: Record<string, unknown>[];
  onOwnerChange: (name: string, userId?: string | null) => void; leagueName: string;
  syncing: boolean; onResync: () => void;
}) {
  return (
    <div style={{
      height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
    }}
      className="px-3 sm:px-5"
    >
      {/* Shield logo — mobile only (sidebar hidden) */}
      <div className="sm:hidden shrink-0">
        <ShieldLogo size={22} />
      </div>

      {/* League Name */}
      <div className="flex items-baseline leading-none shrink-0">
        {(() => {
          const name = leagueName || "DynastyGPT";
          const words = name.replace(/\s+League$/i, "").split(/\s+/);
          const dynIdx = words.findIndex((w) => w.toLowerCase() === "dynasty");
          if (dynIdx >= 0) {
            const before = words.slice(0, dynIdx).join(" ");
            return (
              <>
                {before && <span className="text-sm sm:text-lg" style={{ fontFamily: DISPLAY, color: "#fff", letterSpacing: "-0.5px", marginRight: 4 }}>{before.toUpperCase()}</span>}
                <span className="text-sm sm:text-lg" style={{ fontFamily: DISPLAY, letterSpacing: "-0.5px", background: "linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DYNASTY</span>
              </>
            );
          }
          const first = words[0] || "";
          const rest = words.slice(1).join(" ");
          return (
            <>
              <span className="text-sm sm:text-lg" style={{ fontFamily: DISPLAY, color: "#fff", letterSpacing: "-0.5px", marginRight: rest ? 4 : 0 }}>{first.toUpperCase()}</span>
              {rest && <span className="text-sm sm:text-lg" style={{ fontFamily: DISPLAY, letterSpacing: "-0.5px", background: "linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{rest.toUpperCase()}</span>}
            </>
          );
        })()}
      </div>

      {owner && (
        <>
          <div className="hidden sm:block" style={{ width: 1, height: 24, background: C.border }} />
          <div style={{
            padding: "5px 10px", borderRadius: 4,
            border: `1px solid ${C.goldBorder}`,
            background: C.goldDim,
            color: C.primary, fontSize: 12, fontFamily: SANS,
            fontWeight: 600,
          }}>
            {owner}
          </div>
        </>
      )}

      {/* Resync Button */}
      <button
        onClick={onResync}
        disabled={syncing}
        title={syncing ? "Syncing..." : "Resync league data"}
        className="shrink-0"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 4,
          border: `1px solid ${syncing ? C.gold : C.border}`,
          background: syncing ? `${C.gold}12` : "transparent",
          color: syncing ? C.gold : C.dim,
          fontSize: 11, fontFamily: MONO, fontWeight: 700,
          letterSpacing: "0.05em", cursor: syncing ? "wait" : "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { if (!syncing) { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; } }}
        onMouseLeave={(e) => { if (!syncing) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; } }}
      >
        <RefreshCw size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
        <span className="hidden sm:inline">{syncing ? "SYNCING" : "RESYNC"}</span>
      </button>

      <div style={{ flex: 1 }} />

      {/* Powered-by badge — hidden on mobile */}
      <div className="hidden sm:flex" style={{
        alignItems: "center", gap: 6, padding: "4px 12px",
        borderRadius: 20, border: `1px solid ${C.goldBorder}`, background: C.goldGlow, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.gold, fontFamily: SANS, fontStyle: "italic" }}>powered by</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: C.primary, fontFamily: SANS }}>
          DynastyGPT<span style={{ color: C.gold }}>.com</span>
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE LAYOUT — Icon Sidebar + Header Bar + Content
   ═══════════════════════════════════════════════════════════════ */
export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const { currentLeagueId, currentLeagueSlug, currentOwner, setLeague, setOwner, savedLeagues } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";
  const [syncing, setSyncing] = useState(false);
  const hydrating = useRef(false);

  // ── Auth gate ──
  const searchParams = useSearchParams();
  const gateMetadata = DEV_BYPASS_ACTIVE
    ? DEV_USER_METADATA
    : (user?.unsafeMetadata ?? {});
  const gateSleeperUserId = gateMetadata.sleeper_user_id as string | undefined;
  const urlLeagueId = searchParams.get("league_id");
  const gateApprovedLeagueId = urlLeagueId
    || (gateMetadata.approved_league_id as string | undefined)
    || (typeof window !== "undefined" ? localStorage.getItem("approved_league_id") : null)
    || undefined;
  if (gateApprovedLeagueId && typeof window !== "undefined") {
    localStorage.setItem("approved_league_id", gateApprovedLeagueId);
  }
  const [gateChecked, setGateChecked] = useState(false);

  // ── Hydrate store from URL params or slug API ──
  // No persist, no localStorage — store is in-memory only.
  // URL params (?lid=...&owner=...&oid=...) are the primary source.
  // Slug API resolution is the fallback for clean URLs.
  useEffect(() => {
    if (currentLeagueId) return; // already loaded
    if (hydrating.current) return;

    // Try URL params first
    const params = new URLSearchParams(window.location.search);
    const lid = params.get("lid");
    if (lid) {
      setLeague(lid, slug, "");
      const ownerP = params.get("owner");
      const oidP = params.get("oid");
      if (ownerP) setOwner(decodeURIComponent(ownerP), oidP || null);
      return;
    }

    // Fallback: resolve slug via API
    if (!slug) return;
    hydrating.current = true;
    getLeagueBySlug(slug)
      .then((data) => {
        setLeague(data.league_id, slug, data.name);
        // Owner auto-select is handled by the dedicated useEffect below
        // that matches gateSleeperUserId against platform_user_id
      })
      .catch(() => {})
      .finally(() => { hydrating.current = false; });
  }, [slug, currentLeagueId, setLeague, setOwner, currentOwner]);

  // ── Gate: redirect if user lacks access ──
  useEffect(() => {
    if (gateChecked) return; // gate already passed, don't re-evaluate
    if (!isLoaded && !DEV_BYPASS_ACTIVE) return; // wait for Clerk session
    if (DEV_BYPASS_ACTIVE) { setGateChecked(true); return; }
    if (!currentLeagueId) return; // wait for hydration
    if (!gateSleeperUserId) { router.replace("/onboarding"); return; }
    if (!gateApprovedLeagueId) { router.replace("/dashboard"); return; }
    if (gateApprovedLeagueId !== currentLeagueId) { router.replace("/dashboard"); return; }
    setGateChecked(true);
  }, [isLoaded, currentLeagueId, gateSleeperUserId, gateApprovedLeagueId, router]);

  const { data: overview } = useQuery({
    queryKey: ["overview", currentLeagueId],
    queryFn: () => getOverview(currentLeagueId!),
    enabled: !!currentLeagueId,
    staleTime: 60 * 60 * 1000,
  });
  const { data: ownersData } = useQuery({
    queryKey: ["owners", currentLeagueId],
    queryFn: () => getOwners(currentLeagueId!),
    enabled: !!currentLeagueId,
    staleTime: 60 * 60 * 1000,
  });
  const { data: rankings } = useQuery({
    queryKey: ["rankings", currentLeagueId],
    queryFn: () => getRankings(currentLeagueId!),
    enabled: !!currentLeagueId,
    staleTime: 10 * 60 * 1000,
  });

  // ── Manual sync only — no auto-sync ──
  const doSync = useCallback(async () => {
    if (!currentLeagueId || syncing) return;
    setSyncing(true);
    try {
      await syncLeague(currentLeagueId);
      queryClient.invalidateQueries({ queryKey: ["overview", currentLeagueId] });
      queryClient.invalidateQueries({ queryKey: ["owners", currentLeagueId] });
      queryClient.invalidateQueries({ queryKey: ["rankings", currentLeagueId] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["picks"] });
      queryClient.invalidateQueries({ queryKey: ["league-intel", currentLeagueId] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    } catch {
      // Silent failure — never block the UI
    } finally {
      setSyncing(false);
    }
  }, [currentLeagueId, syncing, queryClient]);

  const owners = ownersData?.owners || [];
  const basePath = `/l/${slug}`;

  // Auto-select the logged-in user's team by matching platform_user_id
  useEffect(() => {
    if (!owners.length || !gateSleeperUserId) return;
    const myOwner = owners.find((o: any) => o.platform_user_id === gateSleeperUserId || o.user_id === gateSleeperUserId);
    if (myOwner) {
      setOwner((myOwner as any).name, gateSleeperUserId);
    }
  }, [owners, gateSleeperUserId, setOwner]);

  const myRank = rankings?.rankings?.find((r) => r.owner.toLowerCase() === (currentOwner || "").toLowerCase());

  // Don't render league content until gate passes (skip in dev bypass)
  if (!DEV_BYPASS_ACTIVE && !gateChecked) return null;

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, color: C.primary, fontFamily: SANS,
    }}>
      <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Icon Sidebar ── */}
      <IconSidebar basePath={basePath} pathname={pathname} owner={currentOwner} shaRank={myRank?.rank || 0} />

      {/* ── Main Area (Header + Content) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <HeaderBar
          owner={currentOwner}
          owners={owners as unknown as Record<string, unknown>[]}
          onOwnerChange={(name) => {
            const match = (owners as any[])?.find((o: any) => o.name === name);
            setOwner(name, match?.user_id || match?.platform_user_id || null);
          }}
          leagueName={overview?.name || ""}
          syncing={syncing}
          onResync={doSync}
        />

        <main className="pb-16 sm:pb-0" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {children}
        </main>
      </div>

      {/* ── Bottom Tab Bar (mobile only) ── */}
      <BottomTabBar basePath={basePath} pathname={pathname} />

      <PlayerCardModal />
      <FeedbackWidget />
    </div>
  );
}
