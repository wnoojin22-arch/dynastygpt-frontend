"use client";

import { Suspense, useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import {
  getPortfolio,
  getCrossLeagueProfile,
  getMarketPulse,
  type Portfolio,
  type PortfolioCard,
  type CrossLeagueProfile,
} from "@/lib/api";
import { useLeagueStore } from "@/lib/stores/league-store";
import { Home, Database, Users, BarChart3, Trophy } from "lucide-react";

// Current NFL dynasty season — mirrors the hard-coded 2026 boundary used
// elsewhere in the codebase.
const CURRENT_NFL_SEASON = "2026";

// 2026 NFL kickoff — first Thursday after Labor Day (Sep 7). Used for the
// offseason "DAYS TO KICKOFF" tile until any of the user's leagues shows
// games played, at which point the tile flips to TRADES · 30D.
const NFL_KICKOFF_2026_MS = new Date("2026-09-10T00:00:00Z").getTime();

// External destinations on the marketing site — same convention as the
// league sidebar's TradeDB entry (see l/[slug]/layout.tsx NAV_ITEMS).
const TRADEDB_URL  = "https://dynastygpt.com/tradedb";
const PLAYERS_URL  = "https://dynastygpt.com/players";
const RANKINGS_URL = "https://dynastygpt.com/rankings";

// Position pill classes — mirrors DashboardView.tsx / page.tsx site convention.
function posPillClasses(pos: string): string {
  return pos === "QB" ? "bg-accent-red/10 text-accent-red"
       : pos === "RB" ? "bg-accent-blue/10 text-accent-blue"
       : pos === "WR" ? "bg-accent-green/10 text-accent-green"
       : pos === "TE" ? "bg-accent-orange/10 text-accent-orange"
       : "bg-elevated text-dim";
}

// ── D-Shield logo (portable — same shape as l/[slug]/layout.tsx:37) ─
function ShieldLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.12}
      viewBox="0 0 52 58"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_12px_rgba(212,165,50,0.3)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dgpt-shield-outer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="30%" stopColor="#d4a532" />
          <stop offset="50%" stopColor="#f5e6a3" />
          <stop offset="70%" stopColor="#d4a532" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="dgpt-shield-letter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path
        d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z"
        fill="none"
        stroke="url(#dgpt-shield-outer)"
        strokeWidth="2.5"
      />
      <path
        d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z"
        fill="url(#dgpt-shield-outer)"
        opacity="0.08"
      />
      <text
        x="26"
        y="40"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="32"
        fill="url(#dgpt-shield-letter)"
      >
        D
      </text>
      <g transform="translate(14, 3)">
        <path
          d="M0,10 L4,2 L8,7 L12,0 L16,7 L20,2 L24,10"
          fill="none"
          stroke="#f5e6a3"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="2" r="1.5" fill="#f5e6a3" />
        <circle cx="12" cy="0" r="1.8" fill="#f5e6a3" />
        <circle cx="20" cy="2" r="1.5" fill="#f5e6a3" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingShell label="LOADING PORTFOLIO..." />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { setLeague } = useLeagueStore();

  const metadata = user?.unsafeMetadata ?? {};
  const sleeperUsername = metadata.sleeper_username as string | undefined;
  const sleeperId = metadata.sleeper_user_id as string | undefined;
  const clerkApprovedLeagueId = metadata.approved_league_id as string | undefined;

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [xleague, setXleague] = useState<CrossLeagueProfile | null>(null);
  const [marketPulse, setMarketPulse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalPending, setApprovalPending] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!sleeperId) router.replace("/onboarding");
  }, [isLoaded, sleeperId, router]);

  useEffect(() => {
    if (!sleeperId) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, x] = await Promise.allSettled([
          getPortfolio(sleeperId),
          getCrossLeagueProfile(sleeperId),
        ]);
        if (cancelled) return;

        if (p.status === "fulfilled") {
          setPortfolio(p.value);
        } else {
          const msg = p.reason instanceof Error ? p.reason.message : String(p.reason);
          if (msg.includes("404")) setApprovalPending(true);
          else setError(msg);
        }
        if (x.status === "fulfilled") setXleague(x.value);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load portfolio");
      }
    })();
    return () => { cancelled = true; };
  }, [sleeperId]);

  useEffect(() => {
    if (!portfolio || portfolio.leagues.length === 0) return;
    const primary =
      portfolio.leagues.find(c => c.league_id === clerkApprovedLeagueId) ??
      portfolio.leagues[0];
    let cancelled = false;
    getMarketPulse(primary.league_id)
      .then((mp) => { if (!cancelled) setMarketPulse(mp); })
      .catch(() => { /* silent — market panel just doesn't render */ });
    return () => { cancelled = true; };
  }, [portfolio, clerkApprovedLeagueId]);

  if (!isLoaded) return <LoadingShell label="LOADING..." />;
  if (!sleeperId) return <LoadingShell label="REDIRECTING..." />;
  if (approvalPending || (portfolio && portfolio.leagues.length === 0)) {
    return <ApprovalPending username={sleeperUsername ?? ""} />;
  }
  if (error) return <ErrorState message={error} />;
  if (!portfolio) return <LoadingShell label="LOADING PORTFOLIO..." />;

  const openLeague = (card: PortfolioCard) => {
    setLeague(card.league_id, card.slug, card.league_name);
    router.push(`/l/${card.slug}?league_id=${card.league_id}`);
  };

  const headline = sleeperUsername ?? portfolio.display_name ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-primary font-sans">
      <PortfolioSidebar pathname={pathname ?? "/dashboard"} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <BrandHeader owner={headline} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 sm:pb-0">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">
            <HeroPanel
              headline={headline}
              xleague={xleague}
              inSeasonAny={portfolio.leagues.some(
                (c) => (c.record?.wins ?? 0) + (c.record?.losses ?? 0) + (c.record?.ties ?? 0) > 0
                     && c.season != null && String(c.season) === CURRENT_NFL_SEASON,
              )}
            />

            <section>
              <SectionLabel title="YOUR LEAGUES" badge={`${portfolio.leagues.length}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {portfolio.leagues.map((card) => (
                  <CompactLeagueCard
                    key={card.league_id}
                    card={card}
                    onOpen={() => openLeague(card)}
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionLabel title="LIVE TRADE MARKET" badge="FLEET-WIDE" />
              <MarketPanels data={marketPulse} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Portfolio sidebar — same visual language as l/[slug]/layout.tsx
// IconSidebar (64px, D-shield at top, icon+label items, gold active
// state, SignOut at bottom, pulsing status dot). Nav items scoped to
// GLOBAL surfaces only — no league-scoped tabs. When the user clicks
// into a league, the /l/[slug] layout takes over with its per-league
// sidebar.
function PortfolioSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const NAV: {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    external?: boolean;
    isNew?: boolean;
  }[] = [
    { id: "home",     label: "Home",     icon: <Home size={20} />,       href: "/dashboard" },
    { id: "tradedb",  label: "TradeDB",  icon: <Database size={20} />,   href: TRADEDB_URL,  external: true, isNew: true },
    { id: "players",  label: "Players",  icon: <Users size={20} />,      href: PLAYERS_URL,  external: true },
    { id: "rankings", label: "Rankings", icon: <BarChart3 size={20} />,  href: RANKINGS_URL, external: true },
  ];

  return (
    <div className="hidden sm:flex flex-col items-center shrink-0 w-16 h-full bg-black border-r border-border pt-3.5 gap-0.5">
      {/* D-shield */}
      <button
        onClick={() => router.push("/")}
        className="cursor-pointer mb-4 focus:outline-none"
        aria-label="Home"
      >
        <ShieldLogo size={32} />
      </button>

      {/* Nav items */}
      {NAV.map((item) => {
        const isActive = !item.external && pathname === item.href;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.external) window.location.href = item.href;
              else router.push(item.href);
            }}
            className={`
              group relative flex flex-col items-center gap-1 w-[54px] py-2.5 rounded-md cursor-pointer
              border-l-2 transition-all
              ${isActive
                ? "bg-elevated border-gold"
                : "border-transparent hover:bg-elevated/80"}
            `}
          >
            {item.isNew && (
              <span className="absolute top-1 right-1 px-1 rounded-[3px] font-mono text-[7px] font-black tracking-wider text-bg bg-gold leading-[11px] shadow-[0_0_8px_rgba(212,165,50,0.55)]">
                NEW
              </span>
            )}
            <span className={`transition-colors ${isActive ? "text-gold" : "text-dim group-hover:text-primary"}`}>
              {item.icon}
            </span>
            <span className={`font-sans text-[8px] font-bold tracking-wide text-center leading-tight ${isActive ? "text-primary" : "text-dim group-hover:text-primary"}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sign Out */}
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
          <span className="font-sans text-[8px] font-bold tracking-wide text-dim hover:text-primary">
            SIGN OUT
          </span>
        </button>
      </SignOutButton>

      {/* Bottom status dot */}
      <div className="w-full px-2 py-3 border-t border-border flex items-center justify-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse shadow-[0_0_6px_rgba(125,211,160,0.60)]" />
      </div>
    </div>
  );
}

// ── Brand header — full DGPT wordmark (D-shield on mobile, gradient
// DYNASTYGPT wordmark, owner handle, powered-by badge). Same idiom
// as l/[slug]/layout.tsx HeaderBar.
function BrandHeader({ owner }: { owner: string }) {
  return (
    <div className="h-12 bg-panel border-b border-border shrink-0 flex items-center gap-4 px-3 sm:px-5">
      {/* Shield — mobile only (sidebar hidden below sm) */}
      <div className="sm:hidden shrink-0">
        <ShieldLogo size={22} />
      </div>

      {/* Wordmark — same "white + gradient" split treatment as the league
          header, but for the DGPT name not a specific league. */}
      <div className="flex items-baseline leading-none shrink-0">
        <span className="font-display text-sm sm:text-lg text-primary -tracking-[0.5px] mr-1">
          DYNASTY
        </span>
        <span
          className="font-display text-sm sm:text-lg -tracking-[0.5px] bg-gradient-to-b from-gold-bright via-gold to-gold-dark bg-clip-text text-transparent"
        >
          GPT
        </span>
      </div>

      {owner && (
        <span className="hidden sm:inline font-display text-xs sm:text-sm text-secondary -tracking-[0.3px] truncate">
          @{owner}
        </span>
      )}

      <div className="flex-1" />

      {/* Powered-by badge — mirrors league header */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold-border bg-gold-glow shrink-0">
        <span className="font-sans italic text-[9px] font-semibold text-gold">
          powered by
        </span>
        <span className="font-sans text-[12px] font-black text-primary">
          DynastyGPT<span className="text-gold">.com</span>
        </span>
      </div>
    </div>
  );
}

// ── Hero panel — Dynasty Identity ─────────────────────────────
// V6: font + padding + stat-bar density all copied from measured
// sources. Headline follows the landing HeroRow's "Know your league"
// treatment (dynastygpt-landing/app/components/home/HeroRow.tsx:34-37)
// — bold sans, clamp(38px, 4.6vw, 54px), leading-[0.95], tracking-
// [-0.035em] — swapped from `var(--font-pf)` (Geist Sans on landing)
// to `font-display` (Archivo Black) which is DGPT-frontend's native
// display face already used at DashboardView.tsx:378 for MANAGER RANKS
// numerics. Panel padding compressed from the earlier V5 values to
// match the league dashboard's DCard body padding (DashboardView.tsx:
// 105-113 `padding: 12` and 355-374 header 5px 12px). Continuous stat
// bar uses the top-strip idiom verbatim from DashboardView.tsx:727-773
// (label + value on the same baseline, w-px h-4 bg-border-lt mx-3
// divider between). Championships gets a gold trophy glyph and
// text-gold value per line 757's `champs.championships > 0 ? C.gold`.
function HeroPanel({
  headline,
  xleague,
  inSeasonAny,
}: {
  headline: string;
  xleague: CrossLeagueProfile | null;
  inSeasonAny: boolean;
}) {
  const totals = xleague?.totals;
  const record = xleague?.record;
  const cadence = xleague?.cadence;
  const tilt = xleague?.positional_tilt;
  const windows = xleague?.windows;

  const seasons = record?.seasons_counted ?? record?.seasons_on_record ?? 0;

  // Season-aware TRADES · 30D tile. Offseason (no league has games) →
  // DAYS TO KICKOFF against NFL_KICKOFF_2026_MS. In-season → trades·30d.
  const nowMs = typeof window !== "undefined" ? Date.now() : 0;
  const daysToKickoff = nowMs
    ? Math.max(0, Math.ceil((NFL_KICKOFF_2026_MS - nowMs) / (1000 * 60 * 60 * 24)))
    : 0;
  const showDaysToKickoff = !inSeasonAny && daysToKickoff > 0;

  return (
    <div
      className="
        relative rounded-lg overflow-hidden
        bg-card
        border border-gold-border border-t-2 border-t-gold-dark
        shadow-[0_4px_28px_rgba(212,165,50,0.06)]
        bg-[radial-gradient(ellipse_700px_500px_at_25%_45%,rgba(212,165,50,0.10),transparent_65%)]
      "
    >
      {/* Gold-dim header strip — DashboardView.tsx:365 `padding: "5px 12px"`. */}
      <div className="relative px-3 py-1.5 border-b border-border bg-gold-dim text-center">
        <span className="font-mono text-[10px] font-black tracking-[0.14em] text-gold">
          DYNASTY IDENTITY
        </span>
      </div>

      {/* Two-column body at lg; stack below with a horizontal divider. */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* LEFT — identity + continuous stat bar.
            Padding copied from feature-card DashboardView.tsx:830-846
            `padding: "12px 16px"` at the compact end, opened to 20px on
            desktop for headline breathing room. */}
        <div className="px-5 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col gap-3 min-w-0">
          {/* Eyebrow — pulsing gold dot mirrors ticker dot at page.tsx:356. */}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,165,50,0.55)] animate-pulse" />
            <span className="font-mono text-[10px] font-black tracking-[0.20em] text-gold">
              SLEEPER MANAGER · FLEET-WIDE
            </span>
          </div>

          {/* Headline — landing HeroRow.tsx:33-42 exact classes; Playfair
              swapped for font-display (Archivo Black). */}
          <h1 className="font-display text-[clamp(38px,4.6vw,54px)] font-bold leading-[0.95] tracking-[-0.035em] text-primary truncate">
            {headline}
          </h1>

          {/* Continuous stat bar — same-line label+value pairs, hairline
              dividers between. Idiom lifted from DashboardView.tsx:723-773. */}
          <div className="mt-1 pt-3 border-t border-border flex flex-wrap items-center gap-y-2">
            <LineStat label="LEAGUES" value={String(totals?.leagues ?? "—")} />
            <LineDiv />
            <LineStat
              label="GRADED TRADES"
              value={String(totals?.decided_verdicts ?? "—")}
              sub={totals ? `of ${totals.trades}` : undefined}
            />
            <LineDiv />
            <LineStat
              label="ALL-TIME"
              value={record ? `${record.wins}-${record.losses}` : "—"}
              sub={seasons > 0 ? `${seasons} seasons` : undefined}
            />
            <LineDiv />
            <LineStat
              label="CHAMPIONSHIPS"
              value={record ? `${record.championships}×` : "—"}
              accent={record && record.championships > 0 ? "gold" : "dim"}
              icon={
                <Trophy
                  size={13}
                  className={
                    record && record.championships > 0
                      ? "text-gold-bright"
                      : "text-dim"
                  }
                  strokeWidth={2.5}
                />
              }
            />
            <LineDiv />
            {showDaysToKickoff ? (
              <LineStat
                label="DAYS TO KICKOFF"
                value={String(daysToKickoff)}
                sub="NFL 2026"
                accent="gold"
              />
            ) : (
              <LineStat
                label="TRADES · 30D"
                value={String(cadence?.trades_last_30d ?? "—")}
                sub={
                  cadence && cadence.active_leagues_last_30d > 0
                    ? `${cadence.active_leagues_last_30d} active`
                    : undefined
                }
              />
            )}
          </div>
        </div>

        {/* RIGHT — behavioral viz. */}
        <div
          className="
            px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 min-w-0
            bg-[radial-gradient(ellipse_500px_400px_at_70%_50%,rgba(212,165,50,0.05),transparent_65%)]
          "
        >
          <TiltBarViz tilt={tilt} />
          <WindowsSegmentBar windows={windows} />
        </div>
      </div>
    </div>
  );
}

// ── LineStat — top-strip idiom pair, label + value on same baseline.
// Copied verbatim from the league-dashboard top strip at
// DashboardView.tsx:727-733:
//   <span mono 10px dim tracking-[0.06em]>LABEL</span>
//   <span mono 12px font-bold text-primary>VALUE</span>
// Sub renders inline in a smaller dim style after the value, mirroring
// the same file's line 819 (fontSize 9, color: dim).
function LineStat({
  label,
  value,
  sub,
  accent = "primary",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "gold" | "green" | "red" | "dim";
  icon?: React.ReactNode;
}) {
  const valueColor =
    accent === "gold" ? "text-gold"
    : accent === "green" ? "text-accent-green"
    : accent === "red" ? "text-accent-red"
    : accent === "dim" ? "text-dim"
    : "text-primary";
  return (
    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
      {icon && <span className="shrink-0 self-center">{icon}</span>}
      <span className="font-mono text-[10px] text-dim tracking-[0.06em]">
        {label}
      </span>
      <span className={`font-mono text-[12px] font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[9px] text-dim">
          {sub}
        </span>
      )}
    </div>
  );
}

// LineDiv — DashboardView.tsx:735 exact: `width: 1, height: 16, background:
// border-lt, margin: "0 12px"`. Hidden below sm so the stat bar wraps
// cleanly on mobile.
function LineDiv() {
  return (
    <div
      aria-hidden="true"
      className="hidden sm:block w-px h-4 bg-border-lt mx-3"
    />
  );
}

// ── Positional tilt — horizontal buys/sells bars per position ────
// Left half = BOUGHT (position color, full opacity), right half = SOLD
// (same color, dimmer). Widths normalized against the largest count
// across the four positions. Matches the league dashboard's "bar
// language" idiom (fairness index at page.tsx:490-513, component bars
// in DashboardView.tsx:479-484).
function TiltBarViz({
  tilt,
}: {
  tilt: CrossLeagueProfile["positional_tilt"] | undefined;
}) {
  const POSITIONS: {
    pos: "QB" | "RB" | "WR" | "TE";
    bar: string;
    text: string;
  }[] = [
    { pos: "QB", bar: "bg-accent-red",    text: "text-accent-red" },
    { pos: "RB", bar: "bg-accent-blue",   text: "text-accent-blue" },
    { pos: "WR", bar: "bg-accent-green",  text: "text-accent-green" },
    { pos: "TE", bar: "bg-accent-orange", text: "text-accent-orange" },
  ];

  const maxCount = tilt
    ? Math.max(
        1,
        ...POSITIONS.flatMap((p) => [
          tilt.counts?.bought?.[p.pos] ?? 0,
          tilt.counts?.sold?.[p.pos] ?? 0,
        ]),
      )
    : 0;
  const hasAny = maxCount > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-black tracking-[0.14em] text-gold">
          POSITIONAL TILT
        </span>
        <span className="font-mono text-[9px] text-dim tracking-[0.10em]">
          BOUGHT · SOLD
        </span>
      </div>
      {!hasAny ? (
        <div className="font-mono text-[10px] text-dim py-2">
          No positional signal yet — trade more to reveal your tilt.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {POSITIONS.map(({ pos, bar, text }) => {
            const b = tilt!.counts?.bought?.[pos] ?? 0;
            const s = tilt!.counts?.sold?.[pos] ?? 0;
            const bPct = b > 0 ? Math.max(6, (b / maxCount) * 100) : 0;
            const sPct = s > 0 ? Math.max(6, (s / maxCount) * 100) : 0;
            return (
              <div key={pos} className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] font-black tracking-[0.10em] w-6 shrink-0 ${text}`}
                >
                  {pos}
                </span>
                {/* Bought (left) */}
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    {/* Data-driven width — same convention as
                        league-dashboard fairness bars. */}
                    <div
                      className={`h-full rounded-full ${b > 0 ? bar : ""}`}
                      style={{ width: `${bPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-primary w-4 text-right shrink-0">
                    {b}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-dim shrink-0">·</span>
                {/* Sold (right) */}
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s > 0 ? `${bar} opacity-50` : ""}`}
                      style={{ width: `${sPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-primary w-4 text-right shrink-0">
                    {s}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Competitive windows — single stacked segment bar. Data comes from
// the shared classifier (BE `competitive_window.classify_window` on the
// odds path). `active_leagues` is the sum of the three bins — leagues
// without active-season odds are excluded (completed seasons, unsupported
// configs) and DO NOT appear in the count. Legend shows only segments
// that fired.
function WindowsSegmentBar({
  windows,
}: {
  windows: CrossLeagueProfile["windows"] | undefined;
}) {
  const active = windows?.active_leagues ?? 0;
  if (!windows || active === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-black tracking-[0.14em] text-gold">
            COMPETITIVE WINDOWS
          </span>
        </div>
        <div className="font-mono text-[10px] text-dim py-2">
          Awaiting championship odds…
        </div>
      </div>
    );
  }

  const segments: {
    key: string;
    label: string;
    count: number;
    bar: string;
    text: string;
  }[] = [
    { key: "contender", label: "CONTENDER", count: windows.contender,
      bar: "bg-accent-green", text: "text-accent-green" },
    { key: "balanced",  label: "BALANCED",  count: windows.balanced,
      bar: "bg-gold",         text: "text-gold-bright" },
    { key: "rebuilder", label: "REBUILDER", count: windows.rebuilder,
      bar: "bg-accent-orange", text: "text-accent-orange" },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-black tracking-[0.14em] text-gold">
          COMPETITIVE WINDOWS
        </span>
        <span className="font-mono text-[9px] text-dim tracking-[0.10em]">
          {active} ACTIVE LEAGUE{active === 1 ? "" : "S"}
        </span>
      </div>

      {/* Stacked segment bar. Data-driven segment widths — same
          convention as league-dashboard fairness bars at page.tsx:507. */}
      <div className="h-3 rounded-full overflow-hidden flex bg-border shadow-[inset_0_0_0_1px_rgba(212,165,50,0.06)]">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`h-full ${s.bar}`}
            style={{ width: `${(s.count / active) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${s.bar}`} />
            <span
              className={`font-mono text-[9px] font-black tracking-[0.10em] ${s.text}`}
            >
              {s.label}
            </span>
            <span className="font-mono text-[11px] font-bold tabular-nums text-primary leading-none">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compact league card — whole surface clickable ────────────────
function CompactLeagueCard({
  card,
  onOpen,
}: {
  card: PortfolioCard;
  onOpen: () => void;
}) {
  const gamesPlayed =
    (card.record?.wins ?? 0) +
    (card.record?.losses ?? 0) +
    (card.record?.ties ?? 0);
  const isCompletedSeason =
    card.season != null && String(card.season) !== CURRENT_NFL_SEASON;
  const inSeason = !isCompletedSeason && gamesPlayed > 0;
  const state = isCompletedSeason ? "FINAL" : inSeason ? "RANK" : "PROJECTED";
  const statePillClass =
    state === "FINAL"
      ? "bg-elevated text-dim border-border-lt"
      : state === "RANK"
        ? "bg-accent-green/10 text-accent-green border-accent-green/25"
        : "bg-gold-dim text-gold border-gold-border";

  const formatChips = card.format.label
    .split(" ")
    .flatMap((seg) => (seg.includes("+") ? seg.split(/(?=\+)/g) : [seg]))
    .filter(Boolean);

  const showRecord = gamesPlayed > 0 && card.record;
  const oddsAwaiting = card.odds.awaiting_projections;
  const oddsMode: "live" | "final" | "awaiting" =
    !oddsAwaiting ? "live" : isCompletedSeason ? "final" : "awaiting";

  return (
    <button
      onClick={onOpen}
      className="
        group text-left rounded-lg overflow-hidden w-full
        bg-gradient-to-br from-card via-card to-gold-glow
        border border-gold-border border-t-2 border-t-gold
        shadow-[0_2px_16px_rgba(212,165,50,0.05)]
        hover:border-gold hover:shadow-[0_4px_22px_rgba(212,165,50,0.12)]
        hover:scale-[1.01] transition-all duration-200
        p-4 flex flex-col gap-3
      "
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2">
          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0 shadow-[0_0_6px_rgba(212,165,50,0.6)]" />
          <div className="min-w-0">
            <div className="font-display text-[14px] text-primary truncate tracking-tight leading-tight">
              {card.league_name}
            </div>
            <div className="mt-0.5 font-sans text-[11px] text-secondary truncate">
              {card.team_name ?? "—"}
            </div>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-gold-bright opacity-60 group-hover:opacity-100 transition-opacity">
          →
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {formatChips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="rounded px-1.5 py-0.5 bg-elevated border border-border-lt font-mono text-[9px] font-bold tracking-[0.06em] text-secondary"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border font-mono text-[9px] font-black tracking-[0.14em] ${statePillClass}`}
        >
          {state}
        </span>
        <span className="font-mono text-[22px] font-black text-primary leading-none">
          #{card.rank.dynasty_rank ?? "—"}
        </span>
        {card.rank.of_teams != null && (
          <span className="font-mono text-[10px] text-dim">
            of {card.rank.of_teams}
          </span>
        )}
      </div>

      {oddsMode === "live" && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
          <MiniOdds label="PLAYOFF" value={card.odds.playoff_pct} />
          <MiniOdds label="TITLE" value={card.odds.title_pct} />
        </div>
      )}
      {oddsMode === "awaiting" && (
        <div className="pt-1 border-t border-border font-mono text-[10px] text-dim tracking-[0.06em]">
          <span className="text-gold-bright">CHAMPIONSHIP ODDS</span> · projecting…
        </div>
      )}
      {oddsMode === "final" && (
        <div className="pt-1 border-t border-border font-mono text-[10px] text-dim tracking-[0.06em]">
          <span className="text-dim">SEASON COMPLETE</span> · no active odds
        </div>
      )}

      {showRecord && card.record && (
        <div className="font-mono text-[11px] text-secondary">
          {isCompletedSeason && (
            <span className="text-dim">{card.season} · Final: </span>
          )}
          <span className="text-primary font-bold">
            {card.record.wins}-{card.record.losses}
            {card.record.ties > 0 && `-${card.record.ties}`}
          </span>
          <span className="text-dim"> · </span>
          <span>{card.record.points_for.toFixed(1)} PF</span>
        </div>
      )}
    </button>
  );
}

function MiniOdds({ label, value }: { label: string; value: number | null }) {
  const hasValue = value != null;
  return (
    <div>
      <div className="font-mono text-[9px] font-black tracking-[0.12em] text-dim">
        {label}
      </div>
      <div className={`font-mono text-[16px] font-black leading-none ${hasValue ? "text-gold-bright" : "text-dim"}`}>
        {hasValue ? `${Math.round(value)}%` : "—"}
      </div>
    </div>
  );
}

// ── Market panels — fleet-wide market_pulse ──────────────────────
function MarketPanels({ data }: { data: any | null }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 font-mono text-[11px] text-dim tracking-[0.10em]">
        LOADING MARKET DATA…
      </div>
    );
  }
  const most = (data.most_traded || []).slice(0, 8) as Array<{
    player: string; position: string; trade_count: number; sha_value: number;
  }>;
  const above = (data.above_market || []).slice(0, 5) as Array<{
    player: string; position: string; pct_diff: number; sha_value: number; market_price: number;
  }>;
  const below = (data.below_market || []).slice(0, 5) as Array<{
    player: string; position: string; pct_diff: number; sha_value: number; market_price: number;
  }>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <MarketCard title="MOST TRADED" subtitle="last 120 days · fleet-wide" dotClass="bg-gold">
        <ul className="flex flex-col divide-y divide-border">
          {most.map((p, i) => (
            <li key={p.player} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              <span className="font-mono text-[10px] text-dim w-4 text-right">
                {i + 1}
              </span>
              <span className={`font-mono text-[9px] font-black tracking-[0.06em] rounded px-1.5 py-0.5 ${posPillClasses(p.position)}`}>
                {p.position}
              </span>
              <span className="flex-1 min-w-0 font-sans text-[12px] text-primary font-semibold truncate">
                {p.player}
              </span>
              <span className="font-mono text-[10px] font-black text-gold-bright shrink-0">
                {(p.trade_count / 1000).toFixed(1)}k
              </span>
            </li>
          ))}
        </ul>
      </MarketCard>

      <MarketCard title="SELLING ABOVE CONSENSUS" subtitle="market pays a premium" dotClass="bg-accent-green">
        <ul className="flex flex-col divide-y divide-border">
          {above.map((p) => (
            <li key={p.player} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              <span className={`font-mono text-[9px] font-black tracking-[0.06em] rounded px-1.5 py-0.5 ${posPillClasses(p.position)}`}>
                {p.position}
              </span>
              <span className="flex-1 min-w-0 font-sans text-[12px] text-primary font-semibold truncate">
                {p.player}
              </span>
              <span className="font-mono text-[10px] font-black text-accent-green shrink-0">
                +{p.pct_diff.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </MarketCard>

      <MarketCard title="TRADING BELOW CONSENSUS" subtitle="market discount vs value" dotClass="bg-accent-red">
        <ul className="flex flex-col divide-y divide-border">
          {below.map((p) => (
            <li key={p.player} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              <span className={`font-mono text-[9px] font-black tracking-[0.06em] rounded px-1.5 py-0.5 ${posPillClasses(p.position)}`}>
                {p.position}
              </span>
              <span className="flex-1 min-w-0 font-sans text-[12px] text-primary font-semibold truncate">
                {p.player}
              </span>
              <span className="font-mono text-[10px] font-black text-accent-red shrink-0">
                {p.pct_diff.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </MarketCard>
    </div>
  );
}

function MarketCard({
  title,
  subtitle,
  dotClass,
  children,
}: {
  title: string;
  subtitle?: string;
  dotClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden bg-card border border-border">
      <div className="px-4 py-2 border-b border-border bg-elevated/50 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="font-mono text-[10px] font-black tracking-[0.12em] text-gold flex-1">
          {title}
        </span>
        {subtitle && (
          <span className="font-mono text-[9px] text-dim tracking-[0.04em]">
            {subtitle}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Section label ────────────────────────────────────────────────
function SectionLabel({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-sans text-[11px] font-black tracking-[0.16em] text-primary uppercase">
          {title}
        </h2>
        {badge && (
          <span className="font-mono text-[8px] font-black tracking-[0.14em] px-2 py-0.5 rounded-full bg-gold-dim text-gold border border-gold-border">
            {badge}
          </span>
        )}
      </div>
      <div className="h-px bg-gold/30" />
    </div>
  );
}

// ── Loading / error / waitlist shells ─────────────────────────────
function LoadingShell({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <span className="font-mono text-[11px] font-black tracking-[0.14em] text-gold animate-pulse">
        {label}
      </span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-[11px] font-black tracking-[0.14em] text-accent-red">
          PORTFOLIO ERROR
        </div>
        <div className="mt-2 text-[13px] text-secondary">{message}</div>
      </div>
    </div>
  );
}

function ApprovalPending({ username }: { username: string }) {
  return (
    <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="font-serif text-[28px] text-primary">
          Welcome, {username}
        </div>
        <div className="mt-3 text-[13px] text-secondary leading-relaxed">
          Your Sleeper account is linked but none of your leagues are enrolled
          in the beta yet. When one of your leagues gets access, this page will
          fill in automatically.
        </div>
      </div>
    </div>
  );
}
