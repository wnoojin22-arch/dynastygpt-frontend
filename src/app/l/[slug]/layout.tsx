"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useWarRoomStore } from "@/lib/stores/war-room-store";
import { useQuery } from "@tanstack/react-query";
import { getOwners, getOverview, getRankings } from "@/lib/api";

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
const SERIF = "'Playfair Display', Georgia, serif";

/* ═══════════════════════════════════════════════════════════════
   SHIELD LOGO
   ═══════════════════════════════════════════════════════════════ */
function ShieldLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(212,165,50,0.3))" }}>
      <defs>
        <linearGradient id="sgs1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914" /><stop offset="30%" stopColor="#d4a532" />
          <stop offset="50%" stopColor="#f5e6a3" /><stop offset="70%" stopColor="#d4a532" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="sgs2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3" /><stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#sgs1)" strokeWidth="2.5" />
      <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#sgs1)" opacity="0.08" />
      <text x="26" y="40" textAnchor="middle" fontFamily={SERIF} fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#sgs2)">D</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG NAV ICONS
   ═══════════════════════════════════════════════════════════════ */
function NavIcon({ id, color }: { id: string; color: string }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "home") return <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>;
  if (id === "war-room") return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  if (id === "trades") return <svg {...p}><polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  if (id === "intel") return <svg {...p}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>;
  if (id === "draft") return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   NAV ITEMS
   ═══════════════════════════════════════════════════════════════ */
const NAV = [
  { id: "home", label: "Home", path: "" },
  { id: "war-room", label: "War Room", path: "/war-room" },
  { id: "trades", label: "Trades", path: "/trades" },
  { id: "intel", label: "Intel", path: "/intel" },
  { id: "draft", label: "Draft", path: "/draft" },
];

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
    }}>
      {/* Owner Badge */}
      <div style={{ padding: "0 16px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.3em", color: `${C.gold}80`, marginBottom: 6 }}>WAR ROOM</div>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 900, fontStyle: "italic", color: C.goldBright, lineHeight: 1 }}>{owner || "Select Owner"}</div>
        {owner && shaRank > 0 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4, letterSpacing: "0.05em" }}>
            <span style={{ color: windowColor }}>{windowLabel}</span> · #{shaRank} SHA
          </div>
        )}
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {WAR_ROOM_VIEWS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 8 }}>
            {group.header && (
              <div style={{ padding: "8px 16px 4px", fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", color: `${C.dim}80` }}>
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
                  }}>
                  <span style={{ fontSize: 13, color: isActive ? C.gold : C.dim, width: 18, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.secondary }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}60` }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>ALL SYSTEMS ONLINE</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE LAYOUT
   ═══════════════════════════════════════════════════════════════ */
export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentLeagueId, currentOwner, setOwner } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";
  const [hovered, setHovered] = useState<string | null>(null);
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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg, color: C.primary, fontFamily: SANS }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,900&display=swap" rel="stylesheet" />

      {/* ── Icon Sidebar ── */}
      <div style={{
        width: 64, height: "100%", background: "#000",
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 14, gap: 2, flexShrink: 0,
      }}>
        <div style={{ cursor: "pointer", marginBottom: 18 }} onClick={() => router.push(basePath)}>
          <ShieldLogo size={28} />
        </div>
        {NAV.map((item) => {
          const href = `${basePath}${item.path}`;
          const isActive = item.path === ""
            ? pathname === basePath || pathname === basePath + "/"
            : pathname.startsWith(href);
          const isHov = hovered === item.id;
          const iconColor = isActive ? C.gold : isHov ? C.primary : C.dim;
          return (
            <div key={item.id}
              onClick={() => router.push(href)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 54, padding: "10px 0", borderRadius: 6,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                cursor: "pointer", transition: "all 0.15s",
                background: isActive ? C.elevated : isHov ? `${C.elevated}80` : "transparent",
                borderLeft: isActive ? `2px solid ${C.gold}` : "2px solid transparent",
              }}>
              <NavIcon id={item.id} color={iconColor} />
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.03em", textAlign: "center",
                lineHeight: 1.2, fontFamily: SANS,
                color: isActive || isHov ? C.primary : C.dim,
              }}>{item.label}</span>
            </div>
          );
        })}

        {/* Owner Selector at bottom */}
        <div style={{ marginTop: "auto", padding: "12px 4px", width: "100%", borderTop: `1px solid ${C.border}` }}>
          <select
            value={currentOwner || ""}
            onChange={(e) => setOwner(e.target.value)}
            style={{
              width: "100%", fontSize: 7, fontFamily: MONO, padding: "4px 2px",
              background: C.card, border: `1px solid ${C.border}`, color: currentOwner ? C.primary : C.dim,
              borderRadius: 4, cursor: "pointer", appearance: "none" as const, textAlign: "center",
            }}>
            <option value="">TEAM</option>
            {owners.map((o) => (
              <option key={o.name} value={o.name}>{o.name.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── War Room Sub-Nav (only on War Room) ── */}
      {isWarRoom && (
        <WarRoomSubNav
          activeView={warRoomView}
          onViewChange={setWarRoomView}
          owner={currentOwner}
          shaRank={myRank?.rank || 0}
        />
      )}

      {/* ── Main Content ── */}
      <main style={{ flex: 1, overflowY: "auto", background: C.bg, minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
