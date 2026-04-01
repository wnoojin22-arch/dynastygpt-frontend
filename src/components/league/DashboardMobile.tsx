"use client";

import { useState, useRef, useCallback } from "react";
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
import { Plus, FileText, ChevronRight, Activity, Share2, Search } from "lucide-react";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import MarketIntelSection from "@/components/league/MarketIntelSection";

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

/* ══════════════════════════════════════════════════════════════
   MANAGER CARD — the hero shareable card with flip animation
   ══════════════════════════════════════════════════════════════ */
function ManagerCard({
  myScore, leagueName, owner, leagueRank, globalRank, topPct, globalManagers, bullets,
}: {
  myScore: DynastyScoreResponse;
  leagueName: string;
  owner: string;
  leagueRank: number | null;
  globalRank: number | null;
  topPct: number | null;
  globalManagers: number | null;
  bullets: { type: string; text: string }[];
}) {
  const [flipped, setFlipped] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const tierColor = TIER_COLORS[myScore.tier.label] || C.dim;

  const handleShare = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;
      // Make sure front face is showing for the screenshot
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#06080d",
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setShareImage(dataUrl);
      canvas.toBlob((blob: Blob | null) => {
        if (blob) setShareBlob(blob);
      });
      setShareModal(true);
    } catch { /* ignore */ }
  }, []);

  const doNativeShare = useCallback(async () => {
    if (!shareBlob) return;
    try {
      const file = new File([shareBlob], "dynastygpt-card.png", { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ files: [file], title: "My DynastyGPT Manager Card" });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": shareBlob })]);
      }
    } catch { /* user cancelled */ }
    setShareModal(false);
  }, [shareBlob]);

  const onTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      handleShare();
    }, 500);
  };
  const onTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const onCardClick = () => {
    if (!didLongPress.current) setFlipped(!flipped);
  };

  const COMPONENT_LABELS: Record<string, string> = {
    trade_win_rate: "Trade Win Rate", value_extraction: "Value Extraction",
    roster_construction: "Roster Build", draft_capital: "Draft Capital",
    behavioral_intelligence: "Behavioral IQ", activity: "Activity",
  };

  return (
    <div
      style={{ perspective: 1000, margin: "0 12px" }}
      onClick={onCardClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        ref={cardRef}
        style={{
          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
          position: "relative",
        }}
      >
        {/* ── FRONT ── */}
        <div style={{
          backfaceVisibility: "hidden",
          borderRadius: 12, overflow: "hidden",
          background: "linear-gradient(165deg, #0d1117 0%, #0f1520 60%, #131924 100%)",
          border: `1px solid ${C.goldBorder}`,
          borderTop: `2px solid ${C.goldDark}`,
          boxShadow: `0 0 30px ${C.goldDim}, inset 0 1px 0 rgba(212,165,50,0.08)`,
          padding: "10px 14px 8px",
        }}>
          {/* Top row: label + share icon */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: C.gold, textTransform: "uppercase" }}>
              DynastyGPT Manager Card
            </span>
            <Share2 size={12} style={{ color: C.dim, opacity: 0.5 }} />
          </div>

          {/* Owner info + score circle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, color: C.primary, lineHeight: 1.1 }}>{owner}</div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2 }}>{leagueName}</div>
            </div>
            {/* Score circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                border: `2px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `radial-gradient(circle, ${C.goldDim} 0%, transparent 70%)`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.gold }}>{myScore.score}</span>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                padding: "2px 6px", borderRadius: 3,
                color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}30`,
                textTransform: "uppercase",
              }}>{myScore.tier.label}</span>
            </div>
          </div>

          {/* Three stat boxes */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {[
              { label: "LEAGUE", value: `#${leagueRank || "—"}` },
              { label: "GLOBAL", value: `#${globalRank?.toLocaleString() || "—"}` },
              { label: "PERCENTILE", value: `Top ${topPct ?? "—"}%` },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1, textAlign: "center", padding: "4px 4px",
                borderRadius: 5, background: C.elevated, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, textTransform: "uppercase", marginBottom: 1 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* One-line insight */}
          {bullets.length > 0 && (
            <div style={{ fontFamily: SANS, fontSize: 10, color: C.secondary, lineHeight: 1.3, marginBottom: 6 }}>
              {bullets.slice(0, 2).map((b, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  <span style={{ color: b.type === "strength" || b.type === "highlight" ? C.green : C.red }}>
                    {b.type === "strength" || b.type === "highlight" ? "▲" : "▼"}
                  </span>{" "}{b.text}
                </span>
              ))}
            </div>
          )}

          {/* Hint text */}
          <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 7, color: `${C.dim}80`, letterSpacing: "0.08em", marginTop: 4 }}>
            TAP TO FLIP · HOLD TO SHARE
          </div>
        </div>

        {/* ── BACK (report) ── */}
        <div style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          position: "absolute", top: 0, left: 0, right: 0,
          borderRadius: 12, overflow: "hidden",
          background: "linear-gradient(165deg, #0d1117 0%, #0f1520 100%)",
          border: `1px solid ${C.goldBorder}`,
          borderTop: `2px solid ${C.goldDark}`,
          padding: "14px 16px 10px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: C.gold, textTransform: "uppercase", marginBottom: 10 }}>
            Full Report — {owner}
          </div>

          {/* Component bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(myScore.components).map(([key, comp]) => {
              const pct = comp.max > 0 ? (comp.score / comp.max) * 100 : 0;
              const barColor = pct >= 75 ? C.green : pct >= 50 ? C.gold : pct >= 30 ? C.orange : C.red;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: C.primary }}>{COMPONENT_LABELS[key] || key}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.secondary }}>{comp.score}/{comp.max}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: C.elevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bullets */}
          {bullets.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {bullets.slice(0, 4).map((b, i) => {
                const isGood = b.type === "strength" || b.type === "highlight";
                return (
                  <span key={i} style={{ fontFamily: SANS, fontSize: 9, color: isGood ? C.green : C.red, lineHeight: 1.2 }}>
                    {isGood ? "▲" : "▼"} {b.text}
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 7, color: `${C.dim}80`, letterSpacing: "0.08em", marginTop: 8 }}>
            TAP TO FLIP BACK
          </div>
        </div>
      </div>

      {/* ── SHARE MODAL ── */}
      {shareModal && (
        <div
          onClick={() => setShareModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.90)", backdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 24, gap: 20,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 360 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.gold, textTransform: "uppercase" }}>
              Share Your Dynasty Score
            </span>
            {shareImage && (
              <img src={shareImage} alt="Manager Card" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.goldBorder}` }} />
            )}
            <span style={{ fontFamily: SANS, fontSize: 10, color: `${C.gold}60`, fontWeight: 700 }}>dynastygpt.com</span>
            <button
              onClick={doNativeShare}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12,
                fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: "0.10em",
                color: "#06080d", background: "linear-gradient(135deg, #8b6914, #d4a532)",
                border: "none", cursor: "pointer",
              }}
            >
              SHARE
            </button>
            <button
              onClick={() => setShareModal(false)}
              style={{
                fontFamily: MONO, fontSize: 10, color: C.dim, background: "none",
                border: "none", cursor: "pointer", letterSpacing: "0.08em",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <ManagerCard
          myScore={myScore}
          leagueName={leagueName}
          owner={owner}
          leagueRank={leagueRank}
          globalRank={globalRank}
          topPct={topPct}
          globalManagers={globalManagers}
          bullets={bullets}
        />
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
