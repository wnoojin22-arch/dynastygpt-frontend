"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getRoster, getOwnerRecord, getChampionships,
  getRankings, getLeagueIntel, getOverview,
  getDynastyScore, getAllDynastyScores,
  getMarketFeed, getCoachesCorner, getRosterValueChange,
} from "@/lib/api";
import type { DynastyScoreResponse } from "@/lib/api";
import { Plus, FileText, ChevronRight, ChevronDown, Activity, Search, X, BarChart3, Users } from "lucide-react";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { motion, AnimatePresence } from "framer-motion";
import ManagerCardMobile from "@/components/league/ManagerCardMobile";
import ManagerCardModal from "@/components/league/ManagerCardModal";
import PlayerHeadshot from "@/components/league/PlayerHeadshot";
import { getOwnerTendencies } from "@/lib/api";

/* ── Design tokens (shared with desktop) ── */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": "#7dd3a0", "Sharp": "#6bb8e0", "Solid": C.gold,
  "Average": C.primary, "Needs Work": "#e09c6b", "Taco": "#e47272",
};

function fmt(n: number | null | undefined, d = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Position color system ── */
const POS_COLORS: Record<string, string> = {
  QB: "#dc2626", RB: "#16a34a", WR: "#d4a017", TE: "#0891b2", PICK: "#6b7280",
};
const POS_GRAD: Record<string, string> = {
  QB: "linear-gradient(135deg, #dc2626, #991b1b)",
  RB: "linear-gradient(135deg, #16a34a, #166534)",
  WR: "linear-gradient(135deg, #d4a017, #92700c)",
  TE: "linear-gradient(135deg, #0891b2, #155e75)",
  PICK: "linear-gradient(135deg, #6b7280, #374151)",
};
function posColor(p: string) { return POS_COLORS[p] || C.dim; }

const springTransition = { type: "spring" as const, stiffness: 300, damping: 30 };

/** Format a trade asset label — handles picks and players cleanly. */
function formatAssetLabel(a: any): string {
  if (a.is_pick) {
    const raw = String(a.name || "");
    // New enriched format: "2026 Early 1st" — pass through
    if (/\d{4}\s+(Early|Mid|Late)\s+\d/.test(raw)) return raw;
    // Old format: "2026 Round 1 (jwahl1032)" → "2026 1st"
    const yearMatch = raw.match(/(\d{4})/)
    const roundMatch = raw.match(/round\s*(\d+)/i) || raw.match(/(\d+)\.\d+/);
    if (yearMatch && roundMatch) {
      const year = yearMatch[1];
      const rd = parseInt(roundMatch[1]);
      const suffix = rd === 1 ? "1st" : rd === 2 ? "2nd" : rd === 3 ? "3rd" : `${rd}th`;
      return `${year} ${suffix}`;
    }
    // Strip parenthesized owner name as fallback
    return raw.replace(/\s*\([^)]*\)\s*$/, "");
  }
  // Player — only show pos_rank if it actually has content
  const rank = a.pos_rank || "";
  return rank ? `${a.name} (${rank})` : a.name;
}

function PosCircle({ pos, size = 24 }: { pos: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: POS_GRAD[pos] || POS_GRAD.PICK,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontFamily: MONO, fontSize: size * 0.38, fontWeight: 900, color: "#fff" }}>{pos}</span>
    </div>
  );
}

/* ── Bottom Sheet Modal ── */
function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springTransition}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.panel, borderRadius: "20px 20px 0 0",
              maxHeight: "88vh", overflow: "auto",
              borderTop: `1px solid ${C.borderLt}`,
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.borderLt }} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Stat Box (for modals) ── */
function StatBox({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      flex: 1, textAlign: "center", padding: "8px 6px",
      borderRadius: 8, background: C.elevated, border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono ? MONO : SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>{value}</div>
    </div>
  );
}

/* Old ManagerCard removed — replaced by ManagerCardMobile + ManagerCardModal.
   Keeping stub to avoid breaking any stale imports. */
function _ManagerCardOld_unused() { return null; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __keep_old = _ManagerCardOld_unused;
/* DEAD CODE REMOVED — old flip card was here (260 lines deleted) */

/* ══════════════════════════════════════════════════════════════
   DASHBOARD MOBILE — Command Center
   ══════════════════════════════════════════════════════════════ */
export default function DashboardMobile({ lid, owner, ownerId }: { lid: string; owner: string; ownerId?: string | null }) {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();
  const nav = (path: string) => router.push(`/l/${currentLeagueSlug}/${path}`);
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  /* ── Data hooks (shared with desktop) ── */
  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid), enabled: !!lid, staleTime: 3600000 });
  const { data: roster } = useQuery({ queryKey: ["roster", lid, owner], queryFn: () => getRoster(lid, owner, ownerId), enabled: !!lid && !!owner });
  const { data: record } = useQuery({ queryKey: ["record", lid, owner], queryFn: () => getOwnerRecord(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: champs } = useQuery({ queryKey: ["champs", lid, owner], queryFn: () => getChampionships(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 3600000 });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid), enabled: !!lid });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid), enabled: !!lid, staleTime: 600000 });
  const { data: myScore } = useQuery({ queryKey: ["dynasty-score", lid, owner], queryFn: () => getDynastyScore(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: allScores } = useQuery({
    queryKey: ["dynasty-scores-all", lid],
    queryFn: async () => { const d = await getAllDynastyScores(lid); return d.scores; },
    enabled: !!lid, staleTime: 1800000,
  });
  const { data: marketFeed, isLoading: loadingMarket } = useQuery({ queryKey: ["market-feed", lid, owner], queryFn: () => getMarketFeed(lid, owner, ownerId, 120), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: coachesCorner } = useQuery({ queryKey: ["coaches-corner", lid, owner], queryFn: () => getCoachesCorner(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 600000 });
  const { data: rosterValueChange } = useQuery({ queryKey: ["roster-value-change", lid, owner], queryFn: () => getRosterValueChange(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 1800000 });
  const { data: tendencies } = useQuery({ queryKey: ["tendencies", lid, owner], queryFn: () => getOwnerTendencies(lid, owner, ownerId), enabled: !!lid && !!owner, staleTime: 600000 });
  const [showCardModal, setShowCardModal] = useState(false);

  /* ── Derived data ── */
  // Build name → sleeper_id map from roster for headshots
  const sleeperIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (roster) {
      const bp = (roster as any)?.by_position as Record<string, any[]> | undefined;
      if (bp) {
        for (const players of Object.values(bp)) {
          for (const p of players || []) {
            if (p.sleeper_id && p.name) map[p.name] = p.sleeper_id;
          }
        }
      }
    }
    return map;
  }, [roster]);

  const leagueName = overview?.name || "";
  const _findOwner = (list: any[] | undefined, key = "owner") =>
    list?.find((r: any) => r[key]?.toLowerCase() === owner.toLowerCase())
    || list?.find((r: any) => r[key]?.toLowerCase().replace(/\s*\(#\d+\)/, "") === owner.toLowerCase());
  const myRank = _findOwner(rankings?.rankings);
  const myIntel = _findOwner(leagueIntel?.owners);

  const leagueRank = allScores
    ? (() => {
        const ol = owner.toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").trim();
        const idx = allScores.findIndex((s: any) => s.owner.toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").trim() === ol);
        return idx >= 0 ? idx + 1 : null;
      })()
    : null;
  const percentile = myScore?.percentile;
  const topPct = percentile != null ? Math.max(1, 100 - percentile) : null;
  const globalManagers = percentile != null ? Math.round(myScore!.score > 0 ? 92847 : 0) : null;
  const globalRank = topPct != null && globalManagers ? Math.max(1, Math.round((topPct / 100) * globalManagers)) : null;
  const bullets = (myScore?.bullets || []).slice(0, 4);

  function tierBadge(rank: number | undefined) {
    if (!rank) return { label: "—", color: C.dim };
    if (rank <= 3) return { label: "TOP DOG", color: C.green };
    if (rank <= 6) return { label: "CONTENDER", color: C.gold };
    if (rank <= 9) return { label: "FEISTY", color: C.orange };
    return { label: "BASEMENT", color: C.red };
  }
  const tier = tierBadge(myRank?.rank);

  const seasons: any[] = (record as any)?.seasons || [];
  const currentYear = new Date().getFullYear();
  const currentSeason = seasons.find((s: any) => Number(s.season) === currentYear && (s.wins > 0 || s.losses > 0));
  const lastPlayed = [...seasons].reverse().find((s: any) => s.wins > 0 || s.losses > 0);
  const latestSeason = currentSeason || lastPlayed || null;
  const isOffseason = !currentSeason && lastPlayed && Number(lastPlayed.season) < currentYear;

  // Market feed stats
  const marketItems = (marketFeed?.market_feed || []) as any[];
  const marketTradeCount = marketItems.reduce((s: number, i: any) => s + (i.recent_trades || 0), 0);

  // Coaches corner stats
  const cc = coachesCorner as Record<string, unknown> | undefined;
  const sellCount = ((cc?.sell_high || []) as any[]).length;
  const holdCount = ((cc?.hold || cc?.move_now || []) as any[]).length;

  /* ── Stats for ticker — two fixed lines ── */
  type TickerItem = { label: string; value: string; color?: string; badge?: boolean };
  const tickerLine1: TickerItem[] = [];
  const tickerLine2: TickerItem[] = [];

  // Line 1: ranks + status
  tickerLine1.push({ label: tier.label, value: "", color: tier.color, badge: true });
  if (isOffseason) {
    tickerLine1.push({ label: `${currentYear} OFFSEASON`, value: "" });
  } else if (latestSeason) {
    tickerLine1.push({ label: String(latestSeason.season), value: `${latestSeason.wins}W-${latestSeason.losses}L` });
  }
  if (myRank) tickerLine1.push({ label: "OVERALL", value: `#${myRank.rank}`, color: C.gold });
  if (myIntel?.dynasty_rank) tickerLine1.push({ label: "DYNASTY", value: `#${myIntel.dynasty_rank}`, color: C.blue });
  if (myIntel?.win_now_rank) tickerLine1.push({ label: "WIN-NOW", value: `#${myIntel.win_now_rank}`, color: C.green });

  // Line 2: history
  if (record) {
    const winPct = record.win_pct != null ? ` .${Math.round(record.win_pct * 1000).toString().padStart(3, "0")}` : "";
    tickerLine2.push({ label: "ALL-TIME", value: `${record.all_time_wins}W-${record.all_time_losses}L${winPct}` });
  }
  if (champs) {
    tickerLine2.push({ label: "PLAYOFFS", value: `${champs.playoff_appearances}/${(record as any)?.seasons_played ?? "—"}` });
    tickerLine2.push({ label: "TITLES", value: String(champs.championships), color: champs.championships > 0 ? C.gold : undefined });
  }


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0 80px", background: C.bg }}>

      {/* ── 1. STATS TICKER — two fixed lines ── */}
      <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {[tickerLine1, tickerLine2].map((line, lineIdx) => (
          <div key={lineIdx} style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", justifyContent: "center", overflow: "hidden" }}>
            {line.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 0", flexShrink: 0 }}>
                {i > 0 && <div style={{ width: 1, height: 10, background: C.borderLt, margin: "0 5px" }} />}
                {t.badge ? (
                  <span style={{
                    fontFamily: MONO, fontSize: 8, fontWeight: 900, letterSpacing: "0.08em",
                    padding: "2px 5px", borderRadius: 3,
                    color: t.color || C.dim, background: `${t.color || C.dim}18`,
                    border: `1px solid ${t.color || C.dim}40`,
                  }}>{t.label}</span>
                ) : t.label && !t.value ? (
                  <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold, letterSpacing: "0.04em" }}>{t.label}</span>
                ) : (
                  <>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.04em" }}>{t.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: t.color || C.primary }}>{t.value}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── 2. MANAGER CARD ── */}
      {myScore && (
        <>
          <ManagerCardMobile
            myScore={myScore}
            leagueName={leagueName}
            owner={owner}
            leagueRank={leagueRank}
            globalRank={globalRank}
            topPct={topPct}
            bullets={bullets}
            onTap={() => setShowCardModal(true)}
            onLongPress={() => setShowCardModal(true)}
          />
          {showCardModal && (
            <ManagerCardModal
              myScore={myScore}
              leagueName={leagueName}
              owner={owner}
              leagueRank={leagueRank}
              globalRank={globalRank}
              topPct={topPct}
              bullets={bullets}
              record={(record as any) || null}
              champs={(champs as any) || null}
              badges={(tendencies as any)?.badges || []}
              onClose={() => setShowCardModal(false)}
            />
          )}
        </>
      )}

      {/* ── 3. ACTION GRID — 3x2 ── */}
      <div className="grid grid-cols-3 gap-2 px-3">
        {[
          { label: "BUILD TRADE", sub: "Find your next move", icon: Plus, color: C.gold, route: "trades" },
          { label: "FRANCHISE", sub: "Where you stand", icon: Activity, color: C.green, route: "intel?tab=my-franchise" },
          { label: "SCOUTING", sub: "Scout opponents", icon: Search, color: C.blue, route: "intel?tab=opponents" },
          { label: "DRAFT ROOM", sub: "Picks & grades", icon: FileText, color: "#b39ddb", route: "draft" },
          { label: "RANKINGS", sub: "Full league", icon: BarChart3, color: C.orange, route: "rankings" },
          { label: "YOUR ROSTER", sub: "Players & values", icon: Users, color: C.blue, route: "__roster" },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              onClick={() => btn.route === "__roster" ? document.getElementById("mobile-roster")?.scrollIntoView({ behavior: "smooth" }) : nav(btn.route)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl active:scale-95 transition-transform"
              style={{
                background: C.card,
                border: `1px solid ${btn.color}25`,
                borderTop: `2px solid ${btn.color}60`,
              }}
            >
              <Icon size={14} style={{ color: btn.color }} />
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: btn.color }}>{btn.label}</span>
              <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim }}>{btn.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. REAL TRADES · YOUR PLAYERS — pill ── */}
      <RealTradesPill marketFeed={marketFeed} loading={loadingMarket} nav={nav} sleeperIdMap={sleeperIdMap} />

      {/* ── 5. YOUR MOVES — pill ── */}
      <MovesPill coachesCorner={coachesCorner} nav={nav} sleeperIdMap={sleeperIdMap} />

      {/* ── 6. ROSTER — full roster with values ── */}
      <div id="mobile-roster" style={{ padding: "0 12px" }}>
        <div style={{
          borderRadius: 12, overflow: "hidden",
          background: C.card, border: `1px solid ${C.border}`,
        }}>
          {/* Header */}
          <div style={{
            padding: "8px 12px", borderBottom: `1px solid ${C.border}`,
            background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>ROSTER & ASSETS</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
              {roster ? Object.values((roster as any)?.by_position || {}).reduce((s: number, arr: any) => s + (arr?.length || 0), 0) : 0} players
            </span>
          </div>

          {/* Position groups */}
          {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
            const players: any[] = (roster as any)?.by_position?.[pos] || [];
            if (!players.length) return null;
            const pc = pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : "#e09c6b";
            return (
              <div key={pos}>
                {/* Position header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", background: C.elevated,
                  borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 900, color: pc, letterSpacing: "0.08em" }}>{pos}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{players.length}</span>
                </div>
                {/* Player rows */}
                {players.map((p: any, idx: number) => {
                  const isTop = idx === 0;
                  const t30 = p.trend_30d;
                  const trendColor = t30?.direction === "up" ? C.green : t30?.direction === "down" ? C.red : C.dim;
                  const trendVal = t30?.delta ? `${t30.delta > 0 ? "▲" : "▼"}${Math.abs(t30.delta)}` : "";
                  const mkt = p.mkt_vs_pct;
                  const mktColor = mkt == null ? C.dim : mkt > 0 ? C.green : mkt < 0 ? C.red : C.dim;
                  const mktLabel = mkt == null ? "—" : `${mkt > 0 ? "+" : ""}${Math.round(mkt)}%`;
                  return (
                    <div key={p.name_clean || idx}
                      onClick={() => openPlayerCard(p.name)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                        borderLeft: isTop ? `3px solid ${C.gold}` : "3px solid transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                      }}
                    >
                      <PlayerHeadshot name={p.name} position={pos} size={24} sleeperIdMap={sleeperIdMap} />
                      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: isTop ? 700 : 500, color: isTop ? C.primary : C.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          {p.age && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, flexShrink: 0 }}>{p.age}</span>}
                        </div>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0, width: 42, textAlign: "right" }}>{fmt(Math.round(p.sha_value || 0))}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: pc, flexShrink: 0, width: 38, textAlign: "right" }}>{p.sha_pos_rank || ""}</span>
                      <span style={{ fontFamily: MONO, fontSize: 8, flexShrink: 0, width: 32, textAlign: "right", color: trendColor }}>{trendVal || "—"}</span>
                      <span style={{ fontFamily: MONO, fontSize: 8, flexShrink: 0, width: 36, textAlign: "right", color: mktColor, fontWeight: mkt != null ? 700 : 400 }}>{mktLabel}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   REAL TRADES · YOUR PLAYERS — Expandable pill
   ══════════════════════════════════════════════════════════════ */
function RealTradesPill({ marketFeed, loading, nav, sleeperIdMap }: { marketFeed: any; loading: boolean; nav: (p: string) => void; sleeperIdMap: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const setIntent = useTradeBuilderStore.getState().setIntent;

  const items: any[] = useMemo(() => {
    const feed = (marketFeed?.market_feed || []) as any[];
    return feed
      .filter((p: any) => (p.recent_trades || p.trades_90d || 0) >= 3)
      .sort((a: any, b: any) => (b.recent_trades || b.trades_90d || 0) - (a.recent_trades || a.trades_90d || 0))
      .slice(0, 12);
  }, [marketFeed]);

  const totalTrades = items.reduce((s: number, i: any) => s + (i.recent_trades || i.trades_90d || 0), 0);
  if (loading || !items.length) return null;

  return (
    <div style={{ padding: "0 12px" }}>
      {/* Pill */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: 12,
          background: C.card, border: `1px solid ${C.goldBorder}`,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.gold }}>
            REAL TRADES · YOUR PLAYERS
          </div>
          <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2 }}>
            {totalTrades} trades across matching leagues
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} style={{ color: C.gold }} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springTransition}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 4, borderRadius: 12, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
              {items.map((item: any, i: number) => {
                const name = item.player || "";
                const pos = item.position || "";
                const rank = item.pos_rank || item.sha_pos_rank || "";
                const value = Math.round(item.sha_value || 0);
                const tradeCount = item.recent_trades || item.trades_90d || 0;
                return (
                  <motion.button
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => setSelected(item)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", textAlign: "left", cursor: "pointer",
                      borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none",
                      background: "transparent",
                    }}
                  >
                    <PlayerHeadshot name={name} position={pos} size={28} sleeperIdMap={sleeperIdMap} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{rank} · {fmt(value)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: tradeCount >= 10 ? C.green : tradeCount >= 5 ? C.gold : C.dim }}>{tradeCount}</span>
                      <ChevronRight size={14} style={{ color: C.dim }} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player trade modal */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (() => {
          const pos = selected.position || "";
          const vsDynasty = selected.vs_dynasty_pct || 0;
          const isOver = vsDynasty > 0;
          const consensus = Math.round(selected.sha_value || 0);
          const market = Math.round(selected.market_price || 0);
          // Dedup trades by trade_id
          const seen = new Set<string>();
          const trades = (selected.trades || []).filter((t: any) => {
            if (!t.trade_id || seen.has(t.trade_id)) return false;
            seen.add(t.trade_id);
            return true;
          }).slice(0, 5);
          return (
            <div style={{ padding: "0 16px 24px" }}>
              {/* Hero */}
              <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${C.border}` }}>
                <PlayerHeadshot name={selected.player || ""} position={pos} size={52} sleeperIdMap={sleeperIdMap} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={() => { setSelected(null); openPlayerCard(selected.player); }}
                    style={{ fontFamily: SANS, fontSize: 20, fontWeight: 800, color: C.primary, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                  >{selected.player}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: posColor(pos) }}>{selected.pos_rank || selected.sha_pos_rank}</span>
                    {vsDynasty !== 0 && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5,
                        color: isOver ? C.red : C.green,
                        background: isOver ? `${C.red}18` : `${C.green}18`,
                        border: `1.5px solid ${isOver ? C.red : C.green}35`,
                      }}>{isOver ? "+" : ""}{vsDynasty.toFixed(0)}% {isOver ? "OVER" : "UNDER"}</span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4 }}>
                    {fmt(consensus)} consensus · {fmt(market)} market
                  </div>
                </div>
              </div>

              {/* Stat boxes */}
              <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                <StatBox label="CONSENSUS" value={fmt(consensus)} />
                <StatBox label="TRADE MKT" value={fmt(market)} />
                <StatBox label="TRADES" value={String(selected.recent_trades || selected.trades_90d || 0)} />
              </div>

              {/* Build trade button */}
              <button
                onClick={() => { setSelected(null); setIntent({ type: "sell", value: selected.player }); nav("trades"); }}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12, marginBottom: 16,
                  fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  color: "#06080d", background: "linear-gradient(135deg, #8b6914, #d4a532, #f5e6a3)",
                  border: "none", cursor: "pointer",
                }}
              >BUILD TRADE WITH {(selected.player || "").split(" ").pop()?.toUpperCase()}</button>

              {/* Recent trades */}
              {trades.length > 0 && (
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: C.dim }}>RECENT TRADES ACROSS THE PLATFORM</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {trades.map((t: any, i: number) => (
                      <div key={t.trade_id || i} style={{ padding: "10px 12px", borderRadius: 8, background: C.elevated, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{t.format || ""} · {t.days_ago ?? "?"}d ago</span>
                          {t.grade && (
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: t.grade.startsWith("A") ? C.green : t.grade.startsWith("B") ? C.blue : t.grade.startsWith("C") ? C.gold : C.red }}>{t.grade}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, borderLeft: `2px solid ${C.red}40`, paddingLeft: 8 }}>
                            {(t.gave || []).map((a: any, j: number) => (
                              <div key={j} style={{ fontFamily: SANS, color: C.red, lineHeight: 1.5, fontSize: 11 }}>{formatAssetLabel(a)}</div>
                            ))}
                          </div>
                          <div style={{ flex: 1, borderLeft: `2px solid ${C.green}40`, paddingLeft: 8 }}>
                            {(t.got || []).map((a: any, j: number) => (
                              <div key={j} style={{ fontFamily: SANS, color: C.green, lineHeight: 1.5, fontSize: 11 }}>{formatAssetLabel(a)}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   YOUR MOVES — Expandable pill (sell high / buy low)
   ══════════════════════════════════════════════════════════════ */
function MovesPill({ coachesCorner, nav, sleeperIdMap }: { coachesCorner: any; nav: (p: string) => void; sleeperIdMap: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const setIntent = useTradeBuilderStore.getState().setIntent;

  const cc = coachesCorner as Record<string, unknown> | undefined;
  const sells: any[] = useMemo(() => ((cc?.move_now || cc?.sell_high || []) as any[]).slice(0, 5), [cc]);
  const buys: any[] = useMemo(() => ((cc?.buy_low || []) as any[]).slice(0, 4), [cc]);
  const allMoves = useMemo(() => [
    ...sells.map((s) => ({ ...s, _action: "SELL" as const })),
    ...buys.map((b) => ({ ...b, _action: "BUY" as const })),
  ], [sells, buys]);

  if (!allMoves.length) return null;

  return (
    <div style={{ padding: "0 12px" }}>
      {/* Pill */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: 12,
          background: C.card, border: `1px solid ${C.border}`,
          borderLeft: `2px solid ${C.red}`, borderRight: `2px solid ${C.green}`,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: C.primary }}>YOUR MOVES</div>
          <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2 }}>{allMoves.length} action{allMoves.length !== 1 ? "s" : ""} recommended</div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} style={{ color: C.primary }} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springTransition}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 4, borderRadius: 12, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
              {allMoves.map((item, i) => {
                const name = String(item.name || item.player || "");
                const pos = String(item.position || "");
                const isSell = item._action === "SELL";
                const accent = isSell ? C.red : C.green;
                const vsPct = item.vs_dynasty_pct || item.pct_of_ath;
                return (
                  <motion.button
                    key={`${item._action}-${name}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => setSelected(item)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", textAlign: "left", cursor: "pointer",
                      borderBottom: i < allMoves.length - 1 ? `1px solid ${C.border}` : "none",
                      background: "transparent",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <PlayerHeadshot name={name} position={pos} size={28} sleeperIdMap={sleeperIdMap} />
                      <span style={{
                        position: "absolute", bottom: -2, right: -4,
                        fontFamily: MONO, fontSize: 6, fontWeight: 900, color: "#fff",
                        background: accent, padding: "1px 3px", borderRadius: 3,
                        lineHeight: 1,
                      }}>{item._action}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>{name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: posColor(pos) }}>{pos}</span>
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                        {String(item.signal || item.reason || "").slice(0, 50)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {vsPct != null && (
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: accent }}>
                          {isSell ? "+" : ""}{typeof vsPct === "number" ? vsPct.toFixed(0) : vsPct}%
                        </span>
                      )}
                      <ChevronRight size={14} style={{ color: C.dim }} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action modal */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (() => {
          const pos = selected.position || "";
          const isSell = selected._action === "SELL";
          const accent = isSell ? C.red : C.green;
          const name = selected.name || selected.player || "";
          const reasons: string[] = [];
          if (selected.reason) reasons.push(selected.reason);
          if (selected.signal && selected.signal !== selected.reason) reasons.push(selected.signal);
          if (selected.target) reasons.push(selected.target);

          return (
            <div style={{ padding: "0 16px 24px" }}>
              {/* Hero */}
              <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${C.border}` }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: `${posColor(pos)}20`, border: `2px solid ${posColor(pos)}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: SANS, fontSize: 18, fontWeight: 900, color: posColor(pos) }}>
                    {name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 900, letterSpacing: "0.08em",
                    padding: "3px 8px", borderRadius: 4,
                    color: accent, background: `${accent}18`, border: `1px solid ${accent}40`,
                  }}>{isSell ? "SELL HIGH" : "BUY LOW"}</span>
                  <button
                    onClick={() => { setSelected(null); openPlayerCard(name); }}
                    style={{ fontFamily: SANS, fontSize: 20, fontWeight: 800, color: C.primary, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "block", marginTop: 4 }}
                  >{name}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: posColor(pos) }}>{selected.sha_pos_rank}</span>
                    {selected.age && <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Age {selected.age}</span>}
                  </div>
                </div>
              </div>

              {/* Stat boxes */}
              <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                <StatBox label="CONSENSUS" value={fmt(Math.round(selected.sha_value || 0))} />
                <StatBox label={selected.market_price ? "TRADE MKT" : "DEPTH"} value={selected.market_price ? fmt(Math.round(selected.market_price)) : (selected.position_depth || "—")} />
              </div>

              {/* Why section */}
              {reasons.length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 16, background: `${accent}08`, border: `1px solid ${accent}20` }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: accent, marginBottom: 8 }}>WHY {isSell ? "SELL" : "BUY"}</div>
                  {reasons.map((r, i) => (
                    <div key={i} style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.5, paddingLeft: 10, borderLeft: `2px solid ${accent}40`, marginBottom: i < reasons.length - 1 ? 8 : 0 }}>{r}</div>
                  ))}
                </div>
              )}

              {/* Build trade button */}
              <button
                onClick={() => { setSelected(null); setIntent({ type: isSell ? "sell" : "buy", value: name }); nav("trades"); }}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12,
                  fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  color: "#06080d", background: "linear-gradient(135deg, #8b6914, #d4a532, #f5e6a3)",
                  border: "none", cursor: "pointer",
                }}
              >BUILD TRADE</button>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
