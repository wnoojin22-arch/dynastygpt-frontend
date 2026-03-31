"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getPlayerCard, getPlayerValueHistory, getPlayerPpg,
  getPlayerHistory, getTradesByPlayer, getPlayerPriceHistory,
} from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import type { PlayerCard, SeasonStat, ValueHistoryPoint } from "@/lib/types";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "./tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   PLAYER CARD MODAL
   Mobile: full-screen sheet sliding up from bottom
   Desktop: centered modal with max-width
   ═══════════════════════════════════════════════════════════════════════════ */

type Tab = "overview" | "trades" | "value";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "OVERVIEW" },
  { key: "trades", label: "TRADES" },
  { key: "value", label: "VALUE" },
];

export default function PlayerCardModal() {
  const { isOpen, playerName, closePlayerCard } = usePlayerCardStore();
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const [tab, setTab] = useState<Tab>("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset on new player
  useEffect(() => { setTab("overview"); if (contentRef.current) contentRef.current.scrollTop = 0; }, [playerName]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closePlayerCard(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closePlayerCard]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) { document.body.style.overflow = "hidden"; }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Headshot image error state
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [playerName]);

  // ── Data fetching ──
  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ["player-card", leagueId, playerName],
    queryFn: () => getPlayerCard(leagueId, playerName),
    enabled: isOpen && !!playerName && !!leagueId,
    staleTime: 300_000,
  });
  const { data: valueHistory } = useQuery({
    queryKey: ["player-value-history", leagueId, playerName],
    queryFn: () => getPlayerValueHistory(leagueId, playerName, 180),
    enabled: isOpen && !!playerName && !!leagueId,
    staleTime: 600_000,
  });
  const { data: ppgData } = useQuery({
    queryKey: ["player-ppg", leagueId, playerName],
    queryFn: () => getPlayerPpg(leagueId, playerName),
    enabled: isOpen && !!playerName && !!leagueId,
    staleTime: 600_000,
  });
  const { data: tradeHistory } = useQuery({
    queryKey: ["player-trades", leagueId, playerName],
    queryFn: () => getTradesByPlayer(leagueId, playerName),
    enabled: isOpen && !!playerName && !!leagueId && tab === "trades",
    staleTime: 300_000,
  });
  const { data: playerHistory } = useQuery({
    queryKey: ["player-history", leagueId, playerName],
    queryFn: () => getPlayerHistory(leagueId, playerName),
    enabled: isOpen && !!playerName && !!leagueId && tab === "trades",
    staleTime: 300_000,
  });
  const { data: priceData } = useQuery({
    queryKey: ["player-price-history", playerName],
    queryFn: () => getPlayerPriceHistory(playerName),
    enabled: isOpen && !!playerName && tab === "value",
    staleTime: 600_000,
  });

  const pc = card as PlayerCard | undefined;
  const history = (valueHistory as { history: ValueHistoryPoint[] } | undefined)?.history || [];
  const seasons = (ppgData as { seasons: SeasonStat[] } | undefined)?.seasons || [];
  const trades = (tradeHistory as { trades: Array<Record<string, unknown>> } | undefined)?.trades || [];
  const timeline = (playerHistory as { timeline: Array<Record<string, unknown>> } | undefined)?.timeline || [];

  // ── Swipe handling for mobile tabs ──
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 60) return;
    const idx = TABS.findIndex((t) => t.key === tab);
    if (delta < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].key);
    if (delta > 0 && idx > 0) setTab(TABS[idx - 1].key);
  }, [tab]);

  if (!isOpen) return null;

  const posCol = pc ? posColor(pc.position) : C.dim;
  const initials = pc ? pc.player.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePlayerCard}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 9998 }}
          />

          {/* Modal — sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="player-card-modal"
            style={{ position: "fixed", zIndex: 9999, display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.border}`, overflow: "hidden" }}
          >
            <style>{`
              .player-card-modal {
                bottom: 0; left: 0; right: 0; max-height: 92vh; border-radius: 16px 16px 0 0;
              }
              @media (min-width: 640px) {
                .player-card-modal {
                  bottom: auto; left: 50%; right: auto; top: 50%;
                  transform: translate(-50%, -50%) !important;
                  width: 520px; max-height: 85vh; border-radius: 12px;
                }
              }
              @keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}}
            `}</style>

            {/* ── Drag handle (mobile) ── */}
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}
              className="sm:hidden">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.borderLt }} />
            </div>

            {/* ── Header — Sleeper headshot + bio ── */}
            <div style={{ padding: "12px 20px 16px", display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${C.border}` }}>
              {/* Headshot from Sleeper CDN, falls back to initials */}
              <div style={{
                width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                overflow: "hidden", position: "relative",
                background: `${posCol}15`, border: `3px solid ${posCol}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {pc?.sleeper_id && !imgError ? (
                  <img
                    src={`https://sleepercdn.com/content/nfl/players/thumb/${pc.sleeper_id}.jpg`}
                    alt={pc.player}
                    onError={() => setImgError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontFamily: DISPLAY, fontSize: 22, color: posCol, letterSpacing: "0.02em" }}>
                    {initials}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: C.primary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pc?.player || playerName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                  {pc && (
                    <>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: posCol, background: `${posCol}18`, padding: "3px 8px", borderRadius: 4 }}>{pc.position}</span>
                      <span style={{ fontFamily: SANS, fontSize: 14, color: C.secondary }}>{pc.team || "FA"}</span>
                      {pc.age != null && <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>Age {pc.age}</span>}
                    </>
                  )}
                </div>
                {/* Bio line — college, height/weight, NFL draft year */}
                {pc && (pc.college || pc.height || pc.rookie_year) && (
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 3 }}>
                    {[
                      pc.college,
                      pc.height && pc.weight ? `${pc.height}" · ${pc.weight} lbs` : null,
                      pc.rookie_year ? `NFL ${pc.rookie_year}` : null,
                      pc.years_exp != null ? `${pc.years_exp} yrs` : null,
                    ].filter(Boolean).join(" · ")}
                  </div>
                )}
                {/* Value inline */}
                {pc && (
                  <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.gold, marginTop: 3 }}>
                    {fmt(pc.sha_value)} <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim, fontWeight: 400 }}>{pc.sha_pos_rank}</span>
                  </div>
                )}
              </div>
              {/* Close */}
              <button onClick={closePlayerCard}
                style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "8px 10px", color: C.dim, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>

            {/* ── Tabs — touch-friendly ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
              {TABS.map((t) => (
                <div key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: "12px 0", textAlign: "center",
                  fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
                  color: tab === t.key ? C.gold : C.dim,
                  borderBottom: tab === t.key ? `3px solid ${C.gold}` : "3px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{t.label}</div>
              ))}
            </div>

            {/* ── Content — scrollable, swipeable ── */}
            <div ref={contentRef}
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
              style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", padding: "16px 20px" }}>
              {cardLoading ? <Skeleton /> : tab === "overview" ? (
                <OverviewTab pc={pc} seasons={seasons} history={history} />
              ) : tab === "trades" ? (
                <TradesTab trades={trades} timeline={timeline} playerName={playerName} pc={pc} />
              ) : (
                <ValueTab history={history} priceHistory={priceData as Record<string, unknown> | undefined} />
              )}
            </div>
            {/* Branding bar */}
            <div style={{ padding: "6px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: `${C.gold}50`, letterSpacing: "0.02em" }}>dynastygpt.com</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function OverviewTab({ pc, seasons, history }: { pc?: PlayerCard; seasons: SeasonStat[]; history: ValueHistoryPoint[] }) {
  if (!pc) return <EmptyState text="Player not found in current values." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Value cards — stack on mobile, row on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <ValueCard label="LEAGUE VALUE" value={fmt(pc.sha_value)} sub={pc.sha_pos_rank} color={C.gold} />
        <ValueCard label="DYNASTY" value={pc.dynasty_value ? fmt(pc.dynasty_value) : "—"} sub={pc.dynasty_rank ? `#${pc.dynasty_rank}` : ""} color="#6bb8e0" />
        <ValueCard label="WIN-NOW" value={pc.redraft_value ? fmt(pc.redraft_value) : "—"} sub={pc.redraft_rank ? `#${pc.redraft_rank}` : ""} color="#7dd3a0" />
      </div>

      {/* Owner + acquisition with full detail */}
      {pc.current_owner && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.08em" }}>OWNED BY</div>
              <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: C.primary, marginTop: 2 }}>{pc.current_owner}</div>
            </div>
            {pc.acquisition && (
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                color: pc.acquisition.method === "draft" ? C.gold : pc.acquisition.method === "trade" ? "#6bb8e0" : C.dim,
                background: pc.acquisition.method === "draft" ? `${C.gold}15` : pc.acquisition.method === "trade" ? "rgba(107,184,224,0.12)" : C.elevated,
              }}>{pc.acquisition.method === "draft" ? "DRAFTED" : pc.acquisition.method === "trade" ? "TRADED" : "FREE AGENT"}</span>
            )}
          </div>
          {/* Acquisition detail line */}
          {pc.acquisition && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.secondary, marginTop: 6 }}>
              {pc.acquisition.method === "draft" && pc.acquisition.round
                ? `Round ${pc.acquisition.round}, Pick ${pc.acquisition.pick || "?"} (${pc.acquisition.year || "?"})`
                : pc.acquisition.method === "trade" && pc.acquisition.from
                ? `From ${pc.acquisition.from}${pc.acquisition.date ? ` — ${pc.acquisition.date.substring(0, 10)}` : ""}`
                : pc.acquisition.method === "trade" && pc.acquisition.date
                ? `Acquired ${pc.acquisition.date.substring(0, 10)}`
                : null}
            </div>
          )}
        </div>
      )}

      {/* PPG by season — rank-colored bars like Shadynasty */}
      {seasons.length > 0 && (() => {
        const maxPPG = Math.max(...seasons.map(ss => ss.ppg), 1);
        // Career stats
        const qualified = seasons.filter(s => s.games_played >= 4);
        const careerPPG = qualified.length > 0 ? qualified.reduce((s, q) => s + q.ppg, 0) / qualified.length : null;
        const avgGP = qualified.length > 0 ? Math.round(qualified.reduce((s, q) => s + q.games_played, 0) / qualified.length) : null;

        return (
          <div>
            <SectionLabel text="PRODUCTION BY SEASON" />
            {/* Career summary line */}
            {careerPPG != null && (
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontFamily: MONO, fontSize: 12 }}>
                <span style={{ color: C.dim }}>Career PPG: <span style={{ color: C.gold, fontWeight: 700 }}>{careerPPG.toFixed(1)}</span></span>
                {avgGP != null && <span style={{ color: C.dim }}>Avg GP: <span style={{ color: C.primary, fontWeight: 700 }}>{avgGP}</span></span>}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {seasons.map((s) => {
                const pct = (s.ppg / maxPPG) * 100;
                // Color by PPG tier relative to position expectations (Shadynasty-style)
                const barColor = s.ppg >= 20 ? C.gold : s.ppg >= 15 ? "#7dd3a0" : s.ppg >= 10 ? "#6bb8e0" : "#3a3d4e";
                return (
                  <div key={s.season} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim, width: 40, flexShrink: 0 }}>{s.season}</span>
                    <div style={{ flex: 1, height: 22, background: C.elevated, borderRadius: 5, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%", background: barColor,
                        borderRadius: 5, transition: "width 0.5s ease",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6,
                      }}>
                        {pct >= 30 && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#000" }}>{s.ppg.toFixed(1)}</span>}
                      </div>
                    </div>
                    {pct < 30 && <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary, width: 40, textAlign: "right", flexShrink: 0 }}>{s.ppg.toFixed(1)}</span>}
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim, width: 30, textAlign: "right", flexShrink: 0 }}>{s.games_played}g</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Value trend — Recharts AreaChart with gold gradient (Shadynasty style) */}
      {history.length > 3 && (() => {
        const latest = history[history.length - 1];
        const first = history[0];
        const delta = (latest.sha_value || 0) - (first.sha_value || 0);
        const pctChange = first.sha_value ? ((delta / first.sha_value) * 100) : 0;

        return (
          <div>
            <SectionLabel text="VALUE TREND" />
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 10px 10px" }}>
              {/* Delta summary */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, padding: "0 6px", fontFamily: MONO, fontSize: 12 }}>
                <span style={{ color: C.dim }}>{first.date}</span>
                <span style={{ fontWeight: 700, color: delta >= 0 ? "#7dd3a0" : "#e47272" }}>
                  {delta >= 0 ? "+" : ""}{fmt(delta)} ({pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%)
                </span>
                <span style={{ color: C.dim }}>{latest.date}</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="goldGradFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.gold} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />
                  <RTooltip
                    contentStyle={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: MONO, fontSize: 12 }}
                    labelStyle={{ color: C.dim }}
                    formatter={((value: number) => [fmt(value), ""]) as any}
                    labelFormatter={((label: string) => label) as any}
                    cursor={{ stroke: C.gold, strokeDasharray: "3 3", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone" dataKey="sha_value"
                    stroke={C.gold} strokeWidth={2} fill="url(#goldGradFill)"
                    dot={false} activeDot={{ r: 4, fill: C.gold, stroke: C.panel, strokeWidth: 2 }}
                  />
                  {/* End marker */}
                  <ReferenceDot
                    x={latest.date} y={latest.sha_value || 0}
                    r={5} fill={C.gold} stroke={C.panel} strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* Current consensus value label */}
              <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold, marginTop: 4, paddingRight: 6 }}>
                Value: {fmt(latest.sha_value || 0)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRADES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function TradesTab({ trades, timeline, playerName, pc }: { trades: Array<Record<string, unknown>>; timeline: Array<Record<string, unknown>>; playerName: string; pc?: PlayerCard }) {
  const seen = new Set<string>();
  const uniqueTrades = trades.filter(t => { const id = String(t.trade_id || ""); if (seen.has(id)) return false; seen.add(id); return true; });

  // Gap 8: "Still on original roster" empty state
  if (!uniqueTrades.length && !timeline.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px" }}>
        <div style={{ fontSize: 32, opacity: 0.5 }}>📋</div>
        <div style={{ fontFamily: SANS, fontSize: 15, color: C.primary, textAlign: "center" }}>
          {playerName} has never been traded in this league
        </div>
        {pc?.current_owner && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, textAlign: "center" }}>
            Still on {pc.current_owner}&apos;s roster
            {pc.acquisition?.method === "draft" ? " — original draft pick" : ""}
          </div>
        )}
      </div>
    );
  }

  // Pick detection helper
  const isPick = (name: string) => /\d{4}\s+(Round\s+)?\d/.test(name) || /\d+(st|nd|rd|th)/i.test(name) || name.toLowerCase().includes("round");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <SectionLabel text="OWNERSHIP TIMELINE" />
          <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 8 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 16, position: "relative" }}>
                {i < timeline.length - 1 && <div style={{ position: "absolute", left: 3, top: 12, bottom: 0, width: 1, background: C.border }} />}
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: C.gold, marginTop: 5, flexShrink: 0,
                  position: "relative", zIndex: 1, border: `2px solid ${C.panel}`, boxShadow: `0 0 0 1px ${C.gold}44`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: C.primary, fontWeight: 600 }}>{String(t.owner || t.to || "")}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, marginTop: 2 }}>{String(t.method || t.type || "")} — {String(t.date || "")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade cards with pick badges */}
      {uniqueTrades.length > 0 && (
        <div>
          <SectionLabel text={`TRADES IN THIS LEAGUE (${uniqueTrades.length})`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {uniqueTrades.map((t, i) => {
              const pSent = (t.players_sent || []) as string[];
              const pRecv = (t.players_received || []) as string[];
              const pkSent = (t.picks_sent || []) as string[];
              const pkRecv = (t.picks_received || []) as string[];
              const plower = playerName.toLowerCase();

              const renderAsset = (name: string, isSubject: boolean, pick: boolean) => (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  {pick && (
                    <span style={{
                      fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.dim,
                      background: C.elevated, padding: "1px 4px", borderRadius: 2,
                    }}>PICK</span>
                  )}
                  <span style={{
                    fontFamily: SANS, fontSize: 13,
                    color: isSubject ? C.gold : pick ? C.dim : C.secondary,
                    fontWeight: isSubject ? 700 : 400,
                  }}>
                    {name.replace(/\s*\([^)]*\)/g, "")}
                  </span>
                </div>
              );

              const verdict = String(t.verdict || "");
              const grade = String(t.grade || "");
              const bal = Number(t.sha_balance || 0);
              const verdictColor = verdict === "Won" ? "#7dd3a0" : verdict === "Lost" ? "#e47272" : C.dim;

              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary }}>{String(t.owner || "")} <span style={{ color: C.gold }}>↔</span> {String(t.counter_party || "")}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {verdict && (
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: verdictColor, background: `${verdictColor}15`, padding: "2px 6px", borderRadius: 4 }}>
                          {verdict}{grade ? ` (${grade})` : ""}
                        </span>
                      )}
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{String(t.trade_date || "").substring(0, 10)}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#e47272", marginBottom: 6, letterSpacing: "0.06em" }}>SENT</div>
                      {pSent.map((p, j) => <React.Fragment key={j}>{renderAsset(p, p.toLowerCase() === plower, false)}</React.Fragment>)}
                      {pkSent.map((p, j) => <React.Fragment key={`pk${j}`}>{renderAsset(p, false, true)}</React.Fragment>)}
                    </div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#7dd3a0", marginBottom: 6, letterSpacing: "0.06em" }}>RECEIVED</div>
                      {pRecv.map((p, j) => <React.Fragment key={j}>{renderAsset(p, p.toLowerCase() === plower, false)}</React.Fragment>)}
                      {pkRecv.map((p, j) => <React.Fragment key={`pk${j}`}>{renderAsset(p, false, true)}</React.Fragment>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALUE CHART TAB — touch-friendly, no hover tooltips
   ═══════════════════════════════════════════════════════════════════════════ */

function ValueTab({ history, priceHistory }: { history: ValueHistoryPoint[]; priceHistory?: Record<string, unknown> }) {
  if (history.length < 3) return <EmptyState text="Insufficient value history data." />;

  const latest = history[history.length - 1];
  const earliest = history[0];
  const delta = (latest.sha_value || 0) - (earliest.sha_value || 0);
  const pctChange = earliest.sha_value ? ((delta / earliest.sha_value) * 100) : 0;

  // Market price data
  const ph = priceHistory;
  const cvObj = (ph?.current_value || {}) as Record<string, unknown>;
  const marketValue = typeof cvObj.market_price === "number" ? cvObj.market_price : null;
  const lowVolume = typeof cvObj.low_confidence === "boolean" ? cvObj.low_confidence : true;
  const volObj = (ph?.volume || {}) as Record<string, unknown>;
  const totalVolume = typeof volObj.all_time === "number" ? volObj.all_time : 0;
  const trendObj = (ph?.trend || {}) as Record<string, unknown>;
  const signal = typeof trendObj.signal === "string" ? trendObj.signal.toUpperCase() : null;
  const formatLabel = typeof (ph as Record<string, unknown>)?.format === "string" ? (ph as Record<string, unknown>).format as string : null;

  // Valuation comparison
  const currentSha = latest.sha_value || 0;
  let valuationPct = 0;
  let valuationLabel = "";
  let valuationColor: string = C.dim;
  if (marketValue && currentSha > 0) {
    valuationPct = Math.round(((currentSha - marketValue) / marketValue) * 100);
    if (valuationPct > 5) {
      valuationLabel = `${valuationPct}% OVERVALUED`;
      valuationColor = "#e47272";
    } else if (valuationPct < -5) {
      valuationLabel = `${Math.abs(valuationPct)}% UNDERVALUED`;
      valuationColor = "#7dd3a0";
    } else {
      valuationLabel = "FAIR VALUE";
      valuationColor = C.gold;
    }
  }

  // Bar widths — longer bar = 100%, shorter bar is proportional
  const barMax = Math.max(currentSha, marketValue || 0, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <ValueCard label="CONSENSUS" value={fmt(currentSha)} sub={latest.sha_pos_rank || ""} color={C.gold} />
        {marketValue ? (
          <ValueCard label="MARKET PRICE" value={fmt(marketValue)} sub={`${totalVolume} trades`} color="#6bb8e0" />
        ) : (
          <ValueCard label="6 MO AGO" value={fmt(earliest.sha_value || 0)} sub="" color={C.dim} />
        )}
        {valuationLabel ? (
          <ValueCard label="VS MARKET" value={valuationLabel} sub={lowVolume ? "Low volume" : ""} color={valuationColor} />
        ) : (
          <ValueCard label="CHANGE" value={`${delta >= 0 ? "+" : ""}${fmt(delta)}`} sub={`${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`}
            color={delta >= 0 ? "#7dd3a0" : "#e47272"} />
        )}
      </div>

      {/* Horizontal bar comparison */}
      {marketValue ? (
        <div>
          <SectionLabel text="CONSENSUS vs TRADE MARKET" />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 14px" }}>
            {/* Consensus bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.04em" }}>CONSENSUS</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.gold }}>{fmt(currentSha)}</span>
              </div>
              <div style={{ height: 28, background: C.elevated, borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  width: `${(currentSha / barMax) * 100}%`, height: "100%",
                  background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})`,
                  borderRadius: 6, transition: "width 0.5s ease",
                }} />
              </div>
            </div>
            {/* Trade Market bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#6bb8e0", letterSpacing: "0.04em" }}>TRADE MARKET</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#6bb8e0" }}>{fmt(marketValue)}</span>
              </div>
              <div style={{ height: 28, background: C.elevated, borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  width: `${(marketValue / barMax) * 100}%`, height: "100%",
                  background: "linear-gradient(90deg, #3a6d8a, #6bb8e0)",
                  borderRadius: 6, transition: "width 0.5s ease",
                  opacity: lowVolume ? 0.6 : 1,
                }} />
              </div>
            </div>

            {/* Valuation badge */}
            {valuationLabel && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <span style={{
                  fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em",
                  color: valuationColor, background: `${valuationColor}15`,
                  padding: "5px 14px", borderRadius: 6, border: `1px solid ${valuationColor}30`,
                }}>
                  {valuationLabel}
                </span>
              </div>
            )}

            {/* Stats row */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap",
              fontFamily: MONO, fontSize: 11, color: C.dim,
              borderTop: `1px solid ${C.border}`, paddingTop: 10,
            }}>
              <span>{totalVolume.toLocaleString()} trades</span>
              {signal && (
                <>
                  <span style={{ color: C.border }}>·</span>
                  <span>30-day trend: <span style={{
                    fontWeight: 700,
                    color: signal === "BUY" ? "#7dd3a0" : signal === "SELL" ? "#e47272" : C.dim,
                  }}>{signal}</span></span>
                </>
              )}
              {formatLabel && (
                <>
                  <span style={{ color: C.border }}>·</span>
                  <span>{formatLabel}</span>
                </>
              )}
              {lowVolume && (
                <>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ color: "#e4727280" }}>Low volume</span>
                </>
              )}
            </div>

            {/* Watermark */}
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <span style={{ fontFamily: SANS, fontSize: 9, color: `${C.gold}40`, fontWeight: 600 }}>dynastygpt.com</span>
            </div>
          </div>
        </div>
      ) : (
        /* No market data — show value change instead */
        <div>
          <SectionLabel text="VALUE CHANGE" />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: delta >= 0 ? "#7dd3a0" : "#e47272" }}>
              {delta >= 0 ? "+" : ""}{fmt(delta)}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, marginTop: 4 }}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}% over {history.length} days
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
              No trade market data available — insufficient trade volume
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function ValueCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", borderTop: `2px solid ${color}30` }}>
      <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 13, color: C.secondary, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.08em", marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${C.gold}40` }}>{text}</div>
  );
}

function TouchSparkline({ data }: { data: ValueHistoryPoint[] }) {
  const vals = data.filter(d => d.sha_value != null).map(d => d.sha_value as number);
  if (vals.length < 3) return null;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const h = 52;
  const latest = vals[vals.length - 1];
  const first = vals[0];
  const delta = latest - first;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
      <svg width="100%" viewBox={`0 0 ${vals.length} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <polyline points={vals.map((v, i) => `${i},${h - 4 - (((v - min) / range) * (h - 8))}`).join(" ")}
          fill="none" stroke={delta >= 0 ? "#7dd3a0" : "#e47272"} strokeWidth="2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>{data[0]?.date}</span>
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: delta >= 0 ? "#7dd3a0" : "#e47272" }}>
          {delta >= 0 ? "+" : ""}{fmt(delta)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ fontFamily: SANS, fontSize: 15, color: C.dim, padding: 24, textAlign: "center" }}>{text}</div>;
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 8 }}>
      {[140, 64, 90, 110].map((w, i) => (
        <div key={i} style={{ height: 18, width: `${w}px`, maxWidth: "100%", background: C.elevated, borderRadius: 4, animation: "pulse-gold 1.5s ease infinite" }} />
      ))}
    </div>
  );
}
