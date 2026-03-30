"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import PlayerCardModal from "@/components/league/PlayerCardModal";
import { useQuery } from "@tanstack/react-query";
import { getOwners, getOverview, getRankings } from "@/lib/api";
import { Home, LayoutGrid, Search, Zap, BarChart3 } from "lucide-react";

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
  { id: "intel",     label: "Intel",     path: "/intel",     icon: <Search size={20} /> },
  { id: "trades",    label: "Trades",    path: "/trades",    icon: <Zap size={20} /> },
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
    <div className="flex flex-col items-center shrink-0 w-16 h-full bg-black border-r border-border pt-3.5 gap-0.5">
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

      {/* Bottom status */}
      <div className="w-full px-2 py-3 border-t border-border flex items-center justify-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" style={{ boxShadow: `0 0 6px ${C.green}60` }} />
        <span className="font-sans text-[7px] text-dim tracking-wider hidden">ONLINE</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEADER BAR
   ═══════════════════════════════════════════════════════════════ */
function HeaderBar({ owner, owners, onOwnerChange, leagueName }: {
  owner: string | null; owners: { name: string }[];
  onOwnerChange: (v: string) => void; leagueName: string;
}) {
  return (
    <div style={{
      height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", padding: "0 20px", gap: 14, flexShrink: 0,
    }}>
      {/* League Name */}
      <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1, flexShrink: 0 }}>
        {(() => {
          const name = leagueName || "DynastyGPT";
          const words = name.replace(/\s+League$/i, "").split(/\s+/);
          const dynIdx = words.findIndex((w) => w.toLowerCase() === "dynasty");
          if (dynIdx >= 0) {
            const before = words.slice(0, dynIdx).join(" ");
            return (
              <>
                {before && <span style={{ fontFamily: DISPLAY, fontSize: 18, color: "#fff", letterSpacing: "-0.5px", marginRight: 4 }}>{before.toUpperCase()}</span>}
                <span style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: "-0.5px", background: "linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DYNASTY</span>
              </>
            );
          }
          const first = words[0] || "";
          const rest = words.slice(1).join(" ");
          return (
            <>
              <span style={{ fontFamily: DISPLAY, fontSize: 18, color: "#fff", letterSpacing: "-0.5px", marginRight: rest ? 4 : 0 }}>{first.toUpperCase()}</span>
              {rest && <span style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: "-0.5px", background: "linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{rest.toUpperCase()}</span>}
            </>
          );
        })()}
      </div>

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* Owner Select */}
      <select
        value={owner || ""}
        onChange={(e) => onOwnerChange(e.target.value)}
        style={{
          padding: "5px 10px", borderRadius: 4,
          border: `1px solid ${owner ? C.goldBorder : C.border}`,
          background: owner ? C.goldDim : C.card,
          color: C.primary, fontSize: 12, fontFamily: SANS,
          fontWeight: 600, outline: "none", cursor: "pointer",
        }}
      >
        <option value="" style={{ background: C.card }}>Select Owner</option>
        {owners.map((o: Record<string, unknown>, i: number) => (
          <option key={String(o.platform_user_id || o.slot || i)} value={String(o.name)} style={{ background: C.card }}>{String(o.name)}</option>
        ))}
      </select>

      <div style={{ flex: 1 }} />

      {/* Powered-by badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
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
  const { currentLeagueId, currentOwner, setOwner } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";

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

  const owners = ownersData?.owners || [];
  const basePath = `/l/${slug}`;
  const myRank = rankings?.rankings?.find((r) => r.owner.toLowerCase() === (currentOwner || "").toLowerCase());

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, color: C.primary, fontFamily: SANS,
    }}>
      <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {/* ── Icon Sidebar ── */}
      <IconSidebar basePath={basePath} pathname={pathname} owner={currentOwner} shaRank={myRank?.rank || 0} />

      {/* ── Main Area (Header + Content) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <HeaderBar
          owner={currentOwner}
          owners={owners}
          onOwnerChange={setOwner}
          leagueName={overview?.name || ""}
        />
        <main style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {children}
        </main>
      </div>
      <PlayerCardModal />
    </div>
  );
}
