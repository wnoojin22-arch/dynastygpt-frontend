"use client";

import React, { useState, useCallback, useEffect, useRef, useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { DEV_BYPASS_ACTIVE, DEV_USER_METADATA } from "@/hooks/useDevUser";
import { useTrack } from "@/hooks/useTrack";
import PlayerCardModal from "@/components/league/PlayerCardModal";
import OwnerQuickViewModal from "@/components/league/OwnerQuickViewModal";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import LeagueSwitcher from "@/components/league/LeagueSwitcher";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOwners, getOverview, getRankings, syncLeague, getLeagueBySlug, getUserLeagues } from "@/lib/api";
import { Home, LayoutGrid, Search, Zap, BarChart3, Database, MessageSquare } from "lucide-react";

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
const SERIF = "'Playfair Display', Georgia, serif";

/* ═══════════════════════════════════════════════════════════════
   SHIELD LOGO
   ═══════════════════════════════════════════════════════════════ */
function ShieldLogo({ size = 28 }: { size?: number }) {
  // useId() gives us a unique gradient-id prefix per React instance so
  // two ShieldLogo mounts on the same page (desktop sidebar + mobile
  // header) don't share `<linearGradient id="...">` and can each
  // resolve their own `url(#…)` references. The old hardcoded
  // `nav-gs1`/`nav-gs2` collided across the two mounts — the desktop
  // sidebar renders first with `hidden sm:flex` (still in the DOM,
  // just display:none on mobile), which won the ID race for the URL
  // lookups and left the mobile shape with no resolvable gradient.
  // Result: only the crown squiggle rendered (its stroke is a plain
  // hex, not a url ref); the shield outline and letter never appeared.
  const uid = useId().replace(/[:]/g, "");
  const outerId = `shield-outer-${uid}`;
  const letterId = `shield-letter-${uid}`;
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(212,165,50,0.3))" }}>
      <defs>
        <linearGradient id={outerId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914"/><stop offset="30%" stopColor="#d4a532"/>
          <stop offset="50%" stopColor="#f5e6a3"/><stop offset="70%" stopColor="#d4a532"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
        <linearGradient id={letterId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3"/><stop offset="100%" stopColor="#b8860b"/>
        </linearGradient>
      </defs>
      <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke={`url(#${outerId})`} strokeWidth="2.5"/>
      <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill={`url(#${outerId})`} opacity="0.08"/>
      <text x="26" y="40" textAnchor="middle" fontFamily={SERIF} fontWeight="900" fontStyle="italic" fontSize="32" fill={`url(#${letterId})`}>D</text>
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
const NAV_ITEMS: {
  id: string; label: string; path: string; icon: React.ReactNode;
  external?: boolean; isNew?: boolean;
  // `promoted` marks the primary-nav entries (MY TEAM · LEAGUE HOME).
  // They render taller, with a larger icon + label and a more emphatic
  // active state so the user always knows which page they're on. See
  // IconSidebar / BottomTabBar below for the visual treatment.
  promoted?: boolean;
  // `mobileLabel` is the shortened label used by the mobile bottom
  // tab bar so "LEAGUE HOME" doesn't wrap or truncate at a 6-item /
  // ~390px viewport. Falls back to `label` when unset.
  mobileLabel?: string;
}[] = [
  // Top-of-stack primary nav. `path: "/team"` renders `/l/[slug]/team`;
  // the sidebar's initial route landing after portfolio-card click and
  // LeagueSwitcher navigation. `path: "/home"` renders League Home.
  { id: "team",     label: "MY TEAM",     mobileLabel: "TEAM",   path: "/team",     icon: <LayoutGrid size={24} />, promoted: true },
  { id: "home",     label: "LEAGUE HOME", mobileLabel: "LEAGUE", path: "/home",     icon: <Home       size={24} />, promoted: true },
  // Secondary nav.
  { id: "trades",   label: "Trades",      path: "/trades",   icon: <Zap size={20} /> },
  { id: "intel",    label: "Intel",       path: "/intel",    icon: <Search size={20} /> },
  { id: "rankings", label: "Rankings",    path: "/rankings", icon: <BarChart3 size={20} /> },
  { id: "tradedb",  label: "TradeDB",     path: "https://dynastygpt.com/tradedb",
    icon: <Database size={20} />, external: true },
];

/* ═══════════════════════════════════════════════════════════════
   ICON SIDEBAR — 5 items, 64px, lucide-react icons
   ═══════════════════════════════════════════════════════════════ */
function IconSidebar({ basePath, pathname, owner, shaRank }: {
  basePath: string; pathname: string; owner: string | null; shaRank: number;
}) {
  const router = useRouter();
  const track = useTrack();
  const { currentLeagueId } = useLeagueStore();
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

      {/* Nav items. Promoted items (MY TEAM · LEAGUE HOME) render at
          the top of the stack with heavier weight — larger icons, a
          two-line label, and a dramatic active state that borrows from
          the feature-card treatment in DashboardView.tsx:830-846
          (`bg-gradient-to-br from-card via-card to-gold-glow`, gold left
          rail, gold-bright text, shadow). A hairline separator sits
          between the promoted pair and the secondary nav so the primary
          choice reads unmistakably at a glance. */}
      {NAV_ITEMS.map((item, i) => {
        const href = item.external ? item.path : `${basePath}${item.path}`;
        const isActive = item.external
          ? false
          : item.path === ""
            ? pathname === basePath || pathname === basePath + "/"
            : pathname.startsWith(href);
        const isHov = hovered === item.id;
        const isPromoted = !!item.promoted;

        // Section separator between promoted and secondary nav. Fires
        // exactly once — before the first non-promoted item after any
        // promoted ones.
        const prev = i > 0 ? NAV_ITEMS[i - 1] : null;
        const showSeparator = !isPromoted && prev?.promoted;

        // Promoted active/inactive treatments — feature-card style.
        const promotedShell = isActive
          ? "bg-gradient-to-br from-elevated via-elevated to-gold-glow border-l-[3px] border-l-gold shadow-[0_0_16px_rgba(212,165,50,0.16)]"
          : isHov
            ? "bg-elevated/80 border-l-[3px] border-l-transparent"
            : "bg-transparent border-l-[3px] border-l-transparent";

        const regularShell = isActive
          ? "bg-elevated border-l-2 border-gold"
          : isHov
            ? "bg-elevated/80 border-l-2 border-transparent"
            : "border-l-2 border-transparent";

        return (
          <React.Fragment key={item.id}>
            {showSeparator && (
              <div
                aria-hidden="true"
                className="w-9 h-px my-1.5 bg-border-lt"
              />
            )}
            <div
              onClick={() => {
                if (item.external) {
                  if (item.id === "tradedb") {
                    track("tradedb_nav_clicked", {
                      league_id: currentLeagueId,
                      owner_name: owner,
                      surface: "desktop_sidebar",
                    });
                  }
                  window.location.href = href;
                } else {
                  router.push(href);
                }
              }}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex flex-col items-center gap-1 cursor-pointer rounded-md transition-all
                ${isPromoted
                  ? `w-[60px] py-3 gap-1.5 ${promotedShell}`
                  : `w-[54px] py-2.5 ${regularShell}`}`}
            >
              {item.isNew && (
                <span
                  className="absolute top-1 right-1 px-1 rounded-[3px] font-mono text-[7px] font-black tracking-wider text-bg bg-gold leading-[11px]"
                  style={{ boxShadow: "0 0 8px rgba(212,165,50,0.55)" }}
                >
                  NEW
                </span>
              )}
              <span
                className={`transition-colors ${
                  isPromoted
                    ? isActive ? "text-gold-bright" : isHov ? "text-primary" : "text-dim"
                    : isActive ? "text-gold" : isHov ? "text-primary" : "text-dim"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`font-sans text-center leading-tight transition-colors
                  ${isPromoted
                    ? `text-[9px] font-black tracking-[0.06em] ${isActive ? "text-gold-bright" : isHov ? "text-primary" : "text-secondary"}`
                    : `text-[8px] font-bold tracking-wide ${isActive || isHov ? "text-primary" : "text-dim"}`}`}
              >
                {item.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sign Out — also wipes any stale approved_league_id from older builds
          and the persisted react-query cache so the next user starts clean. */}
      <SignOutButton redirectUrl="/sign-in">
        <button
          onClick={() => {
            try {
              localStorage.removeItem("approved_league_id");
              localStorage.removeItem("dgpt-cache");
            } catch {}
          }}
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
  const track = useTrack();
  const { currentLeagueId, currentOwner } = useLeagueStore();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-black/95 backdrop-blur-md border-t border-border sm:hidden pb-safe flex items-center justify-around px-2 animate-[slideUp_0.35s_ease-out_both]"
      style={{ boxShadow: "0 -2px 20px rgba(0,0,0,0.5)" }}
    >
      {NAV_ITEMS.map((item, i) => {
        const href = item.external ? item.path : `${basePath}${item.path}`;
        const isActive = item.external
          ? false
          : item.path === ""
            ? pathname === basePath || pathname === basePath + "/"
            : pathname.startsWith(href);

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.external) {
                if (item.id === "tradedb") {
                  track("tradedb_nav_clicked", {
                    league_id: currentLeagueId,
                    owner_name: currentOwner,
                    surface: "mobile_bottom_tab",
                  });
                }
                window.location.href = href;
              } else {
                router.push(href);
              }
            }}
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
            {item.isNew && (
              <span
                className="absolute top-1 right-2 px-1 rounded-[3px] font-mono text-[7px] font-black tracking-wider text-bg bg-gold leading-[11px]"
                style={{ boxShadow: "0 0 8px rgba(212,165,50,0.55)" }}
              >
                NEW
              </span>
            )}
            <span
              className={`transition-all duration-200 ${isActive ? "text-gold scale-110" : "text-dim"}`}
              style={{ lineHeight: 0 }}
            >
              {isActive
                ? (() => {
                    const Icon = { team: LayoutGrid, home: Home, trades: Zap, intel: Search, rankings: BarChart3, tradedb: Database }[item.id]!;
                    return <Icon size={22} />;
                  })()
                : item.icon
              }
            </span>
            <span
              className={`font-sans font-bold tracking-wide text-center leading-tight ${isActive ? "text-gold" : "text-dim"}`}
              style={{ fontSize: 9 }}
            >
              {item.mobileLabel || item.label}
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
function HeaderBar({ leagueName }: {
  leagueName: string;
}) {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  // Trade-builder pages render a fixed-position cart icon at right:12 on mobile.
  // Shift the Feedback trigger leftward on mobile only when on those routes so
  // the cart sits to its right without overlapping. Desktop has its own layout.
  const isTradeBuilderRoute = /\/l\/[^/]+\/(trades|trade-analyzer)\b/.test(pathname || "");
  useEffect(() => {
    const handler = (e: Event) => setUnread((e as CustomEvent<{ count: number }>).detail.count || 0);
    window.addEventListener("feedback-unread-count", handler);
    return () => window.removeEventListener("feedback-unread-count", handler);
  }, []);
  return (
    // Container treatment copied verbatim from dashboard/page.tsx:405
    // (BrandHeader). That header renders at correct height with all
    // children on one centered line; this one must match.
    <div className="h-12 bg-panel border-b border-border shrink-0 flex items-center gap-4 px-3 sm:px-5">
      {/* League name + switcher — the LeagueSwitcher component now owns
          the name rendering (with the gold DYNASTY gradient), the
          chevron trigger, the "SWITCH LEAGUES" hint, AND the dropdown
          panel. Panel opens directly below the name. Single-active-
          league users get just the plain name (no chevron, no hint).
          The owner/team name span that used to sit here is intentionally
          gone — Billy: "WE DO NOT NEED TEAM NAME IN THE HEADER". */}
      <LeagueSwitcher leagueName={leagueName} />

      <div style={{ flex: 1 }} />

      {/* Feedback trigger — MOBILE. Bare gold glyph, 18px visible, in
          a 40×40 invisible tap target so it satisfies mobile hit-size
          without a visible pill. Tap target is w-10 h-10 which fits
          inside the 48px header with 4px clear above/below when the
          outer container center-aligns it (matches BrandHeader
          treatment at dashboard/page.tsx:405). */}
      <button
        onClick={() => window.dispatchEvent(new Event("open-feedback"))}
        className={`sm:hidden flex items-center justify-center cursor-pointer relative bg-transparent border-0 p-0 w-10 h-10 ${
          isTradeBuilderRoute ? "mr-11" : ""
        }`}
        style={{ background: "transparent", border: "none", padding: 0, flexShrink: 0 }}
        aria-label="Feedback"
      >
        <MessageSquare size={18} style={{ color: C.gold, display: "block" }} />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[12px] h-3 flex items-center justify-center rounded-full text-white text-[8px] font-bold leading-none px-0.5"
            style={{ background: C.red, border: `1px solid ${C.panel}` }}
          >
            {unread}
          </span>
        )}
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event("open-feedback"))}
        className="hidden sm:flex items-center gap-1.5 cursor-pointer relative transition-all px-3 py-1"
        style={{
          borderRadius: 20,
          border: `1px solid ${C.gold}`, background: C.gold,
          flexShrink: 0,
          boxShadow: "0 0 0 1px rgba(212,165,50,0.25), 0 4px 14px rgba(212,165,50,0.30)",
        }}
        aria-label="Feedback"
        onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
      >
        <MessageSquare size={12} style={{ color: "#06080d" }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: "#06080d", fontFamily: SANS, letterSpacing: 0.3 }}>Feedback</span>
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none px-1"
            style={{ background: C.red, border: `1.5px solid ${C.panel}` }}
          >
            {unread}
          </span>
        )}
      </button>

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
  const { currentLeagueId, currentLeagueSlug, currentOwner, setLeague, setOwner, savedLeagues, setSavedLeagues } = useLeagueStore();
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
  // Per-user fields ONLY — never read approved_league_id from localStorage.
  // localStorage is per-browser, not per-Clerk-user, so it leaked state across
  // sign-outs / user deletions. If the gate fails, we redirect to /dashboard
  // which re-fetches from /api/user/approve.
  const gateApprovedLeagueId = urlLeagueId
    || (gateMetadata.approved_league_id as string | undefined)
    || undefined;
  const [gateChecked, setGateChecked] = useState(false);

  // ── Hydrate store from URL params or slug API ──
  // No persist, no localStorage — store is in-memory only.
  // URL params (?lid=...&owner=...&oid=...) are the primary source.
  // Slug API resolution is the fallback for clean URLs.
  useEffect(() => {
    if (currentLeagueId) return; // already loaded
    if (hydrating.current) return;

    // Try URL params first — accept either ?lid= or ?league_id=
    // The league_id URL param is the source of truth; slug is vanity only.
    const params = new URLSearchParams(window.location.search);
    const lid = params.get("lid") || params.get("league_id");
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

  // ── Fetch the full list of leagues this user belongs to.
  // Populates `savedLeagues` in the store so the LeagueSwitcher can render
  // and the gate below can check membership (rather than Clerk metadata match).
  // Fires as soon as we know the Sleeper user id — independent of the URL's
  // currentLeagueId so it's ready before the gate runs.
  const {
    data: userLeaguesData,
    isLoading: userLeaguesLoading,
    isError: userLeaguesError,
  } = useQuery({
    queryKey: ["userLeagues", gateSleeperUserId],
    queryFn: () => getUserLeagues(gateSleeperUserId!),
    enabled: !!gateSleeperUserId && !DEV_BYPASS_ACTIVE,
    staleTime: 5 * 60 * 1000, // 5 min — league membership rarely changes mid-session
    retry: 1,
  });

  useEffect(() => {
    if (!userLeaguesData?.leagues) return;
    const uid = userLeaguesData.user_id;
    const slugify = (n: string) =>
      (n || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setSavedLeagues(
      userLeaguesData.leagues.map((l) => ({
        id: l.league_id,
        slug: slugify(l.league_name),
        name: l.league_name,
        owner: l.display_name || null,
        ownerId: uid || null,
        // Sleeper season string ("2026", "2025"…). Powers the switcher's
        // active-only filter so a wrapped 2025 league doesn't clutter
        // the dropdown alongside live 2026 leagues.
        season: l.season || undefined,
      }))
    );
  }, [userLeaguesData, setSavedLeagues]);

  // ── Gate: redirect if user lacks access ──
  // New behavior (Phase A1 multi-league): allow ANY league the user is an
  // owner in, not just their Clerk-locked `approved_league_id`. Membership
  // is sourced from the `getUserLeagues` fetch above.
  // Fallback: if that fetch fails, fall back to the strict Clerk-metadata
  // match so a URL-hacked league can't slip through during backend outage.
  // See docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md (gap I).
  useEffect(() => {
    if (gateChecked) return; // gate already passed, don't re-evaluate
    if (!isLoaded && !DEV_BYPASS_ACTIVE) return; // wait for Clerk session
    if (DEV_BYPASS_ACTIVE) { setGateChecked(true); return; }
    if (!currentLeagueId) return; // wait for hydration
    if (!gateSleeperUserId) { router.replace("/onboarding"); return; }
    if (!gateApprovedLeagueId) { router.replace("/dashboard"); return; }
    // Wait until the user-leagues fetch resolves. Refusing to gate while it's
    // loading keeps a URL-hacked bad league from rendering even briefly.
    if (userLeaguesLoading) return;
    if (userLeaguesError || !userLeaguesData?.leagues) {
      // Backend outage — fall back to the old strict metadata match.
      if (gateApprovedLeagueId !== currentLeagueId) { router.replace("/dashboard"); return; }
      setGateChecked(true);
      return;
    }
    const isMember = userLeaguesData.leagues.some((l) => l.league_id === currentLeagueId);
    if (!isMember) { router.replace("/dashboard"); return; }
    setGateChecked(true);
  }, [
    isLoaded, currentLeagueId, gateSleeperUserId, gateApprovedLeagueId, router,
    userLeaguesLoading, userLeaguesError, userLeaguesData, gateChecked,
  ]);

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
    <>
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
            leagueName={overview?.name || ""}
          />

          <main className="pb-16 sm:pb-0" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>

      {/* ── Fixed overlays — outside overflow:hidden wrapper ── */}
      <BottomTabBar basePath={basePath} pathname={pathname} />
      <PlayerCardModal />
      <OwnerQuickViewModal />
      <FeedbackWidget />
    </>
  );
}
