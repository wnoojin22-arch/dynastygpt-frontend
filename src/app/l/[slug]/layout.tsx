"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useWarRoomStore } from "@/lib/stores/war-room-store";
import { useQuery } from "@tanstack/react-query";
import { getOwners, getOverview, getRankings } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS (mirrors Shadynasty exactly)
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
   SVG NAV ICONS (copied from Shadynasty IconSidebar)
   ═══════════════════════════════════════════════════════════════ */
function SvgIcon({ id, color }: { id: string; color: string }) {
  const s = 22;
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "home") return (
    <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
  );
  if (id === "war-room") return (
    <svg {...p}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 7.5l4-4 4 4-4 4"/>
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5"/><path d="M7 17l-4 4"/><path d="M17 17l4 4"/>
    </svg>
  );
  if (id === "trade-analyzer") return (
    <svg {...p}>
      <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3"/><path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3"/>
      <path d="M7 12h10"/><path d="M10 9l-3 3 3 3"/><path d="M14 9l3 3-3 3"/>
    </svg>
  );
  if (id === "trades") return (
    <svg {...p}>
      <path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/>
    </svg>
  );
  if (id === "rankings") return (
    <svg {...p}>
      <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
    </svg>
  );
  if (id === "intel") return (
    <svg {...p}>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  );
  if (id === "draft") return (
    <svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   NAV ITEMS — 6 items, matching Shadynasty structure
   ═══════════════════════════════════════════════════════════════ */
const NAV_ITEMS: { id: string; label: string; path: string }[] = [
  { id: "home",            label: "Home",             path: "" },
  { id: "war-room",        label: "War\nRoom",        path: "/war-room" },
  { id: "trade-analyzer",  label: "Trade\nAnalyzer",  path: "/trade-analyzer" },
  { id: "trades",          label: "League\nTrades",   path: "/trades" },
  { id: "rankings",        label: "Rankings",           path: "/rankings" },
  { id: "intel",           label: "Scouting\nReport",  path: "/intel" },
  { id: "draft",           label: "Draft",            path: "/draft" },
];

/* ═══════════════════════════════════════════════════════════════
   ICON SIDEBAR (copied from Shadynasty)
   ═══════════════════════════════════════════════════════════════ */
function IconSidebar({ basePath, pathname }: { basePath: string; pathname: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      width: 64, height: "100%", background: "#000",
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 14, gap: 2, flexShrink: 0,
    }}>
      <div style={{ cursor: "pointer", marginBottom: 18 }} onClick={() => router.push("/")}>
        <ShieldLogo size={32} />
      </div>
      {NAV_ITEMS.map((item) => {
        const href = `${basePath}${item.path}`;
        const isActive = item.path === ""
          ? pathname === basePath || pathname === basePath + "/"
          : pathname.startsWith(href);
        const isHov = hovered === item.id;
        const iconColor = isActive ? C.gold : (isHov ? C.primary : C.dim);
        return (
          <div key={item.id}
            onClick={() => router.push(href)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 54, padding: "10px 0", borderRadius: 6,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer", transition: "all 0.15s",
              background: isActive ? C.elevated : (isHov ? `${C.elevated}80` : "transparent"),
              borderLeft: isActive ? `2px solid ${C.gold}` : "2px solid transparent",
            }}>
            <SvgIcon id={item.id} color={iconColor} />
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.03em", textAlign: "center",
              lineHeight: 1.2, whiteSpace: "pre-line", fontFamily: SANS,
              color: isActive || isHov ? C.primary : C.dim,
            }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEADER BAR (copied from Shadynasty War Room)
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
      {/* League Name — branded like DynastyGPT wordmark */}
      <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1, flexShrink: 0 }}>
        {(() => {
          const name = leagueName || "DynastyGPT";
          // Extract words, find "Dynasty" or use last word as gold
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
          // No "Dynasty" in name — first word white, rest gold
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
        {owners.map((o) => (
          <option key={o.name} value={o.name} style={{ background: C.card }}>{o.name}</option>
        ))}
      </select>

      {/* Spacer */}
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
   WAR ROOM SUB-NAV (Secondary Sidebar)
   ═══════════════════════════════════════════════════════════════ */
const WAR_ROOM_VIEWS = [
  { header: "MY TEAM", items: [
    { id: "dashboard", label: "Dashboard", icon: "◎" },
    { id: "franchise-intel", label: "Franchise Intel", icon: "⌘" },
    { id: "history", label: "My Trades", icon: "◷" },
    { id: "builder", label: "Trade Builder", icon: "⚡" },
  ]},
  { header: "INTEL", items: [
    { id: "rivals", label: "Rivals", icon: "⚔" },
  ]},
];

function WarRoomSubNav({ activeView, onViewChange, owner, shaRank }: {
  activeView: string; onViewChange: (v: string) => void;
  owner: string | null; shaRank: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const windowLabel = shaRank <= 4 ? "CONTENDER" : shaRank <= 8 ? "MID PACK" : "REBUILDING";
  const windowColor = shaRank <= 4 ? C.green : shaRank <= 8 ? C.gold : C.red;

  return (
    <div style={{
      width: 200, height: "100%", background: C.panel,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", padding: "16px 0", flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Owner Badge */}
      <div style={{ padding: "0 16px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.3em", color: `${C.gold}80`, marginBottom: 6 }}>WAR ROOM</div>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 900, fontStyle: "italic", color: C.goldBright, lineHeight: 1 }}>
          {owner || "Select Owner"}
        </div>
        {owner && shaRank > 0 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4, letterSpacing: "0.05em" }}>
            <span style={{ color: windowColor }}>{windowLabel}</span> · #{shaRank}
          </div>
        )}
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {WAR_ROOM_VIEWS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 8 }}>
            {group.header && (
              <div style={{
                padding: "8px 16px 4px", fontFamily: MONO, fontSize: 9,
                fontWeight: 800, letterSpacing: "0.2em", color: `${C.dim}80`,
              }}>
                {group.header}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = activeView === item.id;
              const isHov = hovered === item.id;
              return (
                <div key={item.id}
                  onClick={() => onViewChange(item.id)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 16px", cursor: "pointer", transition: "all 0.12s",
                    borderLeft: isActive ? `2px solid ${C.gold}` : "2px solid transparent",
                    background: isActive ? C.goldGlow : isHov ? `${C.elevated}80` : "transparent",
                  }}
                >
                  <span style={{ fontSize: 13, color: isActive ? C.gold : C.dim, transition: "color 0.12s", width: 18, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.secondary, transition: "color 0.12s", flex: 1 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Status */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: C.green,
            boxShadow: `0 0 6px ${C.green}60`,
            animation: "pulse-gold 2s ease infinite",
          }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>ALL SYSTEMS ONLINE</span>
        </div>
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
  const { activeView: warRoomView, setActiveView: setWarRoomView } = useWarRoomStore();

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
  const isWarRoom = pathname.includes("/war-room");
  const myRank = rankings?.rankings?.find((r) => r.owner.toLowerCase() === (currentOwner || "").toLowerCase());

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, color: C.primary, fontFamily: SANS,
    }}>
      {/* ── Icon Sidebar ── */}
      <IconSidebar basePath={basePath} pathname={pathname} />

      {/* ── War Room Sub-Nav (conditional) ── */}
      {isWarRoom && (
        <WarRoomSubNav
          activeView={warRoomView}
          onViewChange={setWarRoomView}
          owner={currentOwner}
          shaRank={myRank?.rank || 0}
        />
      )}

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
    </div>
  );
}
