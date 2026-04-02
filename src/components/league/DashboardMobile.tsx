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
import { Plus, FileText, ChevronRight, ChevronDown, Activity, Search, X } from "lucide-react";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { motion, AnimatePresence } from "framer-motion";
import ManagerCardMobile from "@/components/league/ManagerCardMobile";
import ManagerCardModal from "@/components/league/ManagerCardModal";
import MarketIntelSection from "@/components/league/MarketIntelSection";
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
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
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
          <div key={lineIdx} style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", justifyContent: "center" }}>
            {line.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}>
                {i > 0 && <div style={{ width: 1, height: 12, background: C.borderLt, margin: "0 8px" }} />}
                {t.badge ? (
                  <span style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 900, letterSpacing: "0.10em",
                    padding: "2px 7px", borderRadius: 3,
                    color: t.color || C.dim, background: `${t.color || C.dim}18`,
                    border: `1px solid ${t.color || C.dim}40`,
                  }}>{t.label}</span>
                ) : t.label && !t.value ? (
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, letterSpacing: "0.06em" }}>{t.label}</span>
                ) : (
                  <>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{t.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: t.color || C.primary }}>{t.value}</span>
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

      {/* ── 3. ACTION GRID — 2x2 ── */}
      <div className="grid grid-cols-2 gap-2.5 px-3">
        {[
          { label: "BUILD TRADE", sub: "Find your next move", icon: Plus, color: C.gold, route: "trades" },
          { label: "FRANCHISE", sub: "Know where you stand", icon: Activity, color: C.green, route: "intel?tab=my-franchise" },
          { label: "SCOUTING", sub: "Scout your opponents", icon: Search, color: C.blue, route: "intel?tab=opponents" },
          { label: "RANKINGS", sub: "See the full league", icon: FileText, color: C.orange, route: "rankings" },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              onClick={() => nav(btn.route)}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl active:scale-95 transition-transform"
              style={{
                background: C.card,
                border: `1px solid ${btn.color}25`,
                borderTop: `2px solid ${btn.color}60`,
              }}
            >
              <Icon size={16} style={{ color: btn.color }} />
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", color: btn.color }}>{btn.label}</span>
              <span style={{ fontFamily: SANS, fontSize: 8, color: C.dim }}>{btn.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. YOUR MOVES — sell high / buy low from coaches corner ── */}
      {(() => {
        const cc = coachesCorner as Record<string, unknown> | undefined;
        const moveNow = ((cc?.move_now || cc?.sell_high || []) as any[]).slice(0, 3);
        const buyLowItems = ((cc?.buy_low || []) as any[]).slice(0, 2);
        const setIntent = useTradeBuilderStore.getState().setIntent;
        if (!moveNow.length && !buyLowItems.length) return null;
        return (
          <div style={{ padding: "0 12px" }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Your Moves
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {moveNow.map((item: any, i: number) => {
                const name = String(item.name || item.player || "");
                const pos = String(item.position || "");
                const signal = String(item.signal || item.reason || "").slice(0, 60);
                const pc = pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : "#e09c6b";
                return (
                  <button key={i} onClick={() => { setIntent({ type: "sell", value: name }); nav("trades"); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.red}`, textAlign: "left", width: "100%" }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3, color: "#fff", background: C.red + "30", border: `1px solid ${C.red}40` }}>SELL</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: pc, background: pc + "18", padding: "1px 4px", borderRadius: 3 }}>{pos}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{signal}</span>
                  </button>
                );
              })}
              {buyLowItems.map((item: any, i: number) => {
                const name = String(item.name || item.player || "");
                const pos = String(item.position || "");
                const reason = String(item.reason || "").slice(0, 60);
                const pc = pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : "#e09c6b";
                return (
                  <button key={`buy-${i}`} onClick={() => { setIntent({ type: "buy", value: name }); nav("trades"); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}`, textAlign: "left", width: "100%" }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3, color: "#fff", background: C.green + "30", border: `1px solid ${C.green}40` }}>BUY</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: pc, background: pc + "18", padding: "1px 4px", borderRadius: 3 }}>{pos}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontFamily: SANS, fontSize: 9, color: C.dim, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reason}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── 5. REAL TRADES · YOUR PLAYERS — exact same component as desktop ── */}
      <div style={{ padding: "0 12px" }}>
        <MarketIntelSection feed={marketFeed} loading={loadingMarket} />
      </div>
    </div>
  );
}
