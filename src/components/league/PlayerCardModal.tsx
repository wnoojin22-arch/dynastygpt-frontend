"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getPlayerCard, getPlayerValueHistory, getPlayerPpg,
  getPlayerHistory, getPriceCheck, getPlayerPriceHistory,
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

type Tab = "overview" | "trades" | "market" | "value";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "OVERVIEW" },
  { key: "trades", label: "TRADES" },
  { key: "value", label: "VALUE" },
];

export default function PlayerCardModal() {
  const { isOpen, playerName, defaultTab, closePlayerCard } = usePlayerCardStore();
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const [tab, setTab] = useState<Tab>("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset on new player — use defaultTab if provided
  useEffect(() => { setTab((defaultTab as Tab) || "overview"); if (contentRef.current) contentRef.current.scrollTop = 0; }, [playerName, defaultTab]);

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
    queryFn: () => getPlayerValueHistory(leagueId, playerName, 2000),
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
    queryFn: () => getPriceCheck(leagueId, playerName),
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
    enabled: isOpen && !!playerName && (tab === "value" || tab === "market"),
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
                bottom: 16px; left: 16px; right: 16px; max-height: 85vh; border-radius: 16px;
              }
              @media (min-width: 640px) {
                .player-card-modal {
                  bottom: auto; left: 50%; right: auto; top: 50%;
                  transform: translate(-50%, -50%) !important;
                  width: 480px; max-height: 85vh; border-radius: 16px;
                }
              }
              @keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}}
            `}</style>

            {/* ── Top bar — branding + close (STICKY, doesn't scroll away) ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", flexShrink: 0, position: "sticky", top: 0,
              background: C.panel, zIndex: 10, borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.goldBorder}`, background: C.goldGlow }}>
                <span style={{ fontSize: 7, fontWeight: 600, color: C.gold, fontFamily: SANS, fontStyle: "italic" }}>powered by</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: C.primary, fontFamily: SANS }}>DynastyGPT<span style={{ color: C.gold }}>.com</span></span>
              </div>
              <button onClick={closePlayerCard}
                style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "6px 8px", color: C.dim, fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>

            {/* ── Header — Sleeper headshot + bio (compact on mobile) ── */}
            <div style={{ padding: "8px 16px 10px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
              {/* Headshot from Sleeper CDN, falls back to initials */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                overflow: "hidden", position: "relative",
                background: `${posCol}15`, border: `2px solid ${posCol}40`,
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
                  <span style={{ fontFamily: DISPLAY, fontSize: 18, color: posCol, letterSpacing: "0.02em" }}>
                    {initials}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>
                  {pc?.player || playerName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                  {pc && (
                    <>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: posCol, background: `${posCol}18`, padding: "2px 6px", borderRadius: 3 }}>{pc.position}</span>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>{pc.team || "FA"}</span>
                      {pc.age != null && <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>Age {pc.age}</span>}
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
      {/* Value cards — 2-col on mobile, 3-col on desktop */}
      <div className="grid grid-cols-3 gap-1.5">
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
        // Normalize: use "value" field (blended KTC+SHA), fall back to sha_value
        const pts = history.map(h => ({ ...h, value: h.value ?? h.sha_value ?? 0 }));
        const latest = pts[pts.length - 1];
        const first = pts[0];
        const delta = (latest.value || 0) - (first.value || 0);
        const pctChange = first.value ? ((delta / first.value) * 100) : 0;

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
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={pts} margin={{ top: 8, right: 48, bottom: 0, left: 4 }}>
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
                    formatter={((v: number) => [fmt(v), "Value"]) as any}
                    labelFormatter={((label: string) => label) as any}
                    cursor={{ stroke: C.gold, strokeDasharray: "3 3", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone" dataKey="value"
                    stroke={C.gold} strokeWidth={2} fill="url(#goldGradFill)"
                    dot={false} activeDot={{ r: 4, fill: C.gold, stroke: C.panel, strokeWidth: 2 }}
                  />
                  <ReferenceDot
                    x={latest.date} y={latest.value || 0}
                    r={5} fill={C.gold} stroke={C.panel} strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold, marginTop: 4, paddingRight: 6 }}>
                Value: {fmt(latest.value || 0)}
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
          No trade comps found for {playerName}
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

      {/* Trade comps — cross-league recent trades */}
      {uniqueTrades.length > 0 && (
        <div>
          <SectionLabel text={`RECENT TRADES (${uniqueTrades.length})`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uniqueTrades.map((t, i) => {
              // Handle both price-check shape (gave/got) and enriched_trades shape (players_sent/players_received)
              const gaveRaw = (t.gave || t.players_sent || []) as Array<string | Record<string, unknown>>;
              const gotRaw = (t.got || t.players_received || []) as Array<string | Record<string, unknown>>;
              const gave = gaveRaw.map(a => typeof a === "string" ? a : String((a as Record<string, unknown>).name || ""));
              const got = gotRaw.map(a => typeof a === "string" ? a : String((a as Record<string, unknown>).name || ""));
              const plower = playerName.toLowerCase();
              const wasSold = t.was_sold;
              const tradeDate = String(t.date || t.trade_date || "").substring(0, 10);
              const format = String(t.format || "");
              const grade = String(t.grade || "");
              const overall = String(t.overall || t.verdict || "");

              const renderAsset = (name: string, isSubject: boolean) => {
                const pick = isPick(name);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    {pick && <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color: C.dim, background: C.elevated, padding: "1px 3px", borderRadius: 2 }}>PICK</span>}
                    <span style={{ fontFamily: SANS, fontSize: 12, color: isSubject ? C.gold : pick ? C.dim : C.secondary, fontWeight: isSubject ? 700 : 400 }}>
                      {name.replace(/\s*\([^)]*\)/g, "")}
                    </span>
                  </div>
                );
              };

              const verdictColor = overall.includes("Won") || overall.includes("ROBBERY") ? "#7dd3a0" : overall.includes("Lost") || overall.includes("Victim") ? "#e47272" : C.dim;

              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  {/* Header: date + format + verdict */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{tradeDate}</span>
                      {format && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, background: C.elevated, padding: "1px 5px", borderRadius: 3 }}>{format}</span>}
                    </div>
                    {(overall || grade) && (
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: verdictColor, background: `${verdictColor}15`, padding: "2px 5px", borderRadius: 3 }}>
                        {grade || overall}
                      </span>
                    )}
                  </div>
                  {/* Two columns: gave / got */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#e47272", marginBottom: 4, letterSpacing: "0.06em" }}>{wasSold ? "SOLD" : "GAVE"}</div>
                      {gave.map((p, j) => <React.Fragment key={j}>{renderAsset(p, p.toLowerCase() === plower)}</React.Fragment>)}
                    </div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#7dd3a0", marginBottom: 4, letterSpacing: "0.06em" }}>{wasSold ? "FOR" : "GOT"}</div>
                      {got.map((p, j) => <React.Fragment key={j}>{renderAsset(p, p.toLowerCase() === plower)}</React.Fragment>)}
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
   MARKET TAB — real trade data across all leagues
   ═══════════════════════════════════════════════════════════════════════════ */

function MarketTab({ priceHistory, pc }: { priceHistory?: Record<string, unknown>; pc?: PlayerCard }) {
  if (!priceHistory) return <EmptyState text="No trade market data available for this player." />;

  const ph = priceHistory;
  const cvObj = (ph.current_value || {}) as Record<string, unknown>;
  const marketPrice = typeof cvObj.market_price === "number" ? cvObj.market_price : null;
  const basedOn = typeof cvObj.based_on_trades === "number" ? cvObj.based_on_trades : 0;
  const lowConf = typeof cvObj.low_confidence === "boolean" ? cvObj.low_confidence : true;
  const shaValue = pc?.sha_value || (typeof cvObj.sha_value === "number" ? cvObj.sha_value : null);

  const sigObj = (ph.signal || {}) as Record<string, unknown>;
  const signal = typeof sigObj.indicator === "string" ? sigObj.indicator.toUpperCase() : "HOLD";
  const signalPct = typeof sigObj.strength_pct === "number" ? sigObj.strength_pct : 0;
  const med30 = typeof sigObj.median_30d === "number" ? sigObj.median_30d : null;
  const med90 = typeof sigObj.median_90d === "number" ? sigObj.median_90d : null;

  const volObj = (ph.volume || {}) as Record<string, unknown>;
  const vol30 = typeof volObj.last_30d === "number" ? volObj.last_30d : 0;
  const vol90 = typeof volObj.last_90d === "number" ? volObj.last_90d : 0;
  const volAll = typeof volObj.all_time === "number" ? volObj.all_time : 0;

  const trendObj = (ph.trend || {}) as Record<string, unknown>;
  const trendDir = typeof trendObj.direction === "string" ? trendObj.direction : "stable";
  const monthly = Array.isArray(trendObj.monthly) ? trendObj.monthly as Array<Record<string, unknown>> : [];

  const packages = Array.isArray(ph.common_packages) ? ph.common_packages as Array<Record<string, unknown>> : [];
  const comparables = Array.isArray(ph.comparable_players) ? ph.comparable_players as Array<Record<string, unknown>> : [];

  const signalColor = signal === "BUY" ? "#7dd3a0" : signal === "SELL" ? "#e47272" : C.gold;
  const trendColor = trendDir === "rising" ? "#7dd3a0" : trendDir === "falling" ? "#e47272" : C.dim;

  // vs consensus
  let vsPct = 0;
  if (marketPrice && shaValue && shaValue > 0) {
    vsPct = Math.round(((marketPrice - shaValue) / shaValue) * 100);
  }
  const vsColor = vsPct > 10 ? "#7dd3a0" : vsPct < -10 ? "#e47272" : C.gold;
  const vsLabel = vsPct > 10 ? "SELL WINDOW" : vsPct < -10 ? "BUY WINDOW" : "FAIR VALUE";

  const posRank = pc?.sha_pos_rank || "";

  return (
    <div className="flex flex-col gap-1.5">

      {/* ── ROW 1: Consensus + Market Price ── */}
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-lg p-2 border-l-[3px]" style={{ background: C.card, borderColor: C.gold, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>CONSENSUS</div>
          <div className="text-[20px] font-extrabold leading-none mt-1" style={{ color: C.gold, fontFamily: SANS }}>{shaValue ? fmt(shaValue) : "—"}</div>
          <div className="text-[9px] mt-0.5" style={{ color: C.dim }}>{posRank || "—"}</div>
        </div>
        <div className="flex-1 rounded-lg p-2 border-l-[3px]" style={{ background: C.card, borderColor: "#6bb8e0", borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>MARKET PRICE</div>
          <div className="text-[20px] font-extrabold leading-none mt-1" style={{ color: "#6bb8e0", fontFamily: SANS }}>{marketPrice ? fmt(marketPrice) : "—"}</div>
          <div className="text-[9px] mt-0.5" style={{ color: C.dim }}>{basedOn} trades{lowConf ? " · low" : ""}</div>
        </div>
      </div>

      {/* ── ROW 2: Over/Under + Momentum ── */}
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-lg p-2 border-l-[3px]" style={{ background: C.card, borderColor: vsColor, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>OVER / UNDER</div>
          <div className="text-[20px] font-extrabold leading-none mt-1" style={{ color: vsColor, fontFamily: SANS }}>{vsPct > 0 ? "+" : ""}{vsPct}%</div>
          <div className="text-[9px] font-bold mt-0.5" style={{ color: vsColor }}>{vsLabel}</div>
        </div>
        <div className="flex-1 rounded-lg p-2 border-l-[3px]" style={{ background: C.card, borderColor: signalColor, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>30D MOMENTUM</div>
          <div className="text-[20px] font-extrabold leading-none mt-1" style={{ color: signalColor, fontFamily: SANS }}>{signal}</div>
          <div className="text-[9px] mt-0.5" style={{ color: C.dim }}>{signalPct > 0 ? "+" : ""}{signalPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* ── TREND + VOLUME — two compact inline rows ── */}
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-lg p-2 flex items-center justify-between" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <span className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>TREND</span>
          <div className="flex items-center gap-1.5">
            {med30 && med90 ? (
              <span className="text-[11px] font-bold" style={{ color: C.secondary }}>{fmt(med90)}→{fmt(med30)}</span>
            ) : null}
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ color: trendColor, background: `${trendColor}15` }}>{trendDir === "rising" ? "▲ Rising" : trendDir === "falling" ? "▼ Falling" : "— Stable"}</span>
          </div>
        </div>
        <div className="flex-1 rounded-lg p-2 flex items-center justify-between" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <span className="text-[8px] font-bold tracking-widest" style={{ color: C.dim }}>VOL</span>
          <div className="flex gap-2">
            {[{ l: "30d", v: vol30 }, { l: "90d", v: vol90 }, { l: "all", v: volAll }].map(x => (
              <span key={x.l} className="text-[11px]" style={{ color: C.secondary }}>
                <span className="font-extrabold">{x.v}</span>
                <span className="text-[8px] ml-0.5" style={{ color: C.dim }}>{x.l}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SPARKLINE ── */}
      {monthly.length >= 3 && (
        <div className="rounded-lg px-3 py-1.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-end gap-px" style={{ height: 28 }}>
            {(() => {
              const prices = monthly.map(m => typeof m.median_price === "number" ? m.median_price : 0);
              const max = Math.max(...prices, 1);
              return monthly.map((m, i) => {
                const p = typeof m.median_price === "number" ? m.median_price : 0;
                const h = Math.max(2, (p / max) * 24);
                const isLast = i === monthly.length - 1;
                return <div key={i} className="flex-1" style={{ height: h, borderRadius: 1, background: isLast ? "#6bb8e0" : "#6bb8e030" }} />;
              });
            })()}
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[7px]" style={{ color: C.dim }}>{String(monthly[0]?.month || "")}</span>
            <span className="text-[7px]" style={{ color: C.dim }}>{String(monthly[monthly.length - 1]?.month || "")}</span>
          </div>
        </div>
      )}

      {/* ── SIMILAR VALUE — horizontal scroll ── */}
      {comparables.length > 0 && (
        <div>
          <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: C.dim }}>SIMILAR VALUE</div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ WebkitOverflowScrolling: "touch" }}>
            {comparables.slice(0, 8).map((comp, i) => {
              const pc2 = posColor(String(comp.position || ""));
              return (
                <div key={i} className="shrink-0 rounded px-2 py-1 flex items-center gap-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <span className="text-[8px] font-extrabold" style={{ color: pc2 }}>{String(comp.position || "")}</span>
                  <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: C.secondary }}>{String(comp.name || "")}</span>
                  <span className="text-[9px] font-extrabold" style={{ color: C.gold }}>{fmt(typeof comp.sha_value === "number" ? comp.sha_value : 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PACKAGES — 2 across ── */}
      {packages.length > 0 && (
        <div>
          <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: C.dim }}>TRADED AS</div>
          <div className="flex gap-1.5 flex-wrap">
            {packages.slice(0, 4).map((pkg, i) => {
              const pct = typeof pkg.percentage === "number" ? pkg.percentage : 0;
              const count = typeof pkg.count === "number" ? pkg.count : 0;
              return (
                <div key={i} className="rounded px-2 py-1" style={{ background: C.card, border: `1px solid ${C.border}`, width: "calc(50% - 3px)" }}>
                  <div className="text-[10px] font-bold leading-tight" style={{ color: C.secondary }}>{String(pkg.structure || "")}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: C.dim }}>{pct}% · {count}x</div>
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
  const latestVal = latest.value ?? latest.sha_value ?? 0;
  const earliestVal = earliest.value ?? earliest.sha_value ?? 0;
  const delta = latestVal - earliestVal;
  const pctChange = earliestVal ? ((delta / earliestVal) * 100) : 0;

  // Market price data
  const ph = priceHistory;
  const cvObj = (ph?.current_value || {}) as Record<string, unknown>;
  const marketValue = typeof cvObj.market_price === "number" ? cvObj.market_price : null;
  const lowVolume = typeof cvObj.low_confidence === "boolean" ? cvObj.low_confidence : true;
  const volObj = (ph?.volume || {}) as Record<string, unknown>;
  const totalVolume = typeof volObj.all_time === "number" ? volObj.all_time : 0;
  const vol90d = typeof volObj.last_90d === "number" ? volObj.last_90d : 0;
  const trendObj = (ph?.trend || {}) as Record<string, unknown>;
  const signal = typeof trendObj.signal === "string" ? trendObj.signal.toUpperCase() : null;
  const formatLabel = typeof (ph as Record<string, unknown>)?.format === "string" ? (ph as Record<string, unknown>).format as string : null;

  // Valuation comparison: market > consensus = OVERVALUED, market < consensus = UNDERVALUED
  const currentSha = latestVal;
  let valuationPct = 0;
  let valuationLabel = "";
  let valuationColor: string = C.dim;
  if (marketValue && currentSha > 0) {
    valuationPct = Math.round(((marketValue - currentSha) / currentSha) * 100);
    if (valuationPct > 10) {
      valuationLabel = `${valuationPct}% OVERVALUED`;
      valuationColor = "#e47272";
    } else if (valuationPct < -10) {
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
          <ValueCard label="MARKET PRICE" value={fmt(marketValue)} sub={vol90d > 0 ? `${vol90d} · 120d · ${totalVolume.toLocaleString()} all` : `${totalVolume.toLocaleString()} trades`} color="#6bb8e0" />
        ) : (
          <ValueCard label="6 MO AGO" value={fmt(earliestVal)} sub="" color={C.dim} />
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
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px 10px" }}>
            {/* Consensus bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>CONSENSUS</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.gold }}>{fmt(currentSha)}</span>
              </div>
              <div style={{ height: 20, background: C.elevated, borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  width: `${(currentSha / barMax) * 100}%`, height: "100%",
                  background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})`,
                  borderRadius: 5, boxShadow: `0 0 8px ${C.gold}25`,
                }} />
              </div>
            </div>
            {/* Trade Market bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: "#6bb8e0", letterSpacing: "0.08em" }}>TRADE MARKET</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: "#6bb8e0" }}>{fmt(marketValue)}</span>
              </div>
              <div style={{ height: 20, background: C.elevated, borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  width: `${(marketValue / barMax) * 100}%`, height: "100%",
                  background: "linear-gradient(90deg, #3a6d8a, #6bb8e0)",
                  borderRadius: 5, boxShadow: "0 0 8px rgba(107,184,224,0.2)",
                  opacity: lowVolume ? 0.6 : 1,
                }} />
              </div>
            </div>

            {/* Valuation badge */}
            {valuationLabel && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                  color: valuationColor, background: `${valuationColor}12`,
                  padding: "3px 12px", borderRadius: 4, border: `1px solid ${valuationColor}25`,
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
              <span>{vol90d > 0 && `${vol90d} trades · 120d`}{vol90d > 0 && totalVolume > 0 && " · "}{totalVolume > 0 && `${totalVolume.toLocaleString()} all time`}</span>
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

      {/* Similar Value players — ported from Market tab */}
      {(() => {
        const comps = Array.isArray((ph as any)?.comparable_players) ? (ph as any).comparable_players as Array<Record<string, unknown>> : [];
        if (!comps.length) return null;
        return (
          <div>
            <SectionLabel text="SIMILAR VALUE" />
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" as const }}>
              {comps.slice(0, 8).map((comp, i) => {
                const pc2 = posColor(String(comp.position || ""));
                return (
                  <div key={i} style={{ flexShrink: 0, borderRadius: 4, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4, background: C.card, border: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: pc2 }}>{String(comp.position || "")}</span>
                    <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: C.secondary, whiteSpace: "nowrap" }}>{String(comp.name || "")}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold }}>{fmt(typeof comp.sha_value === "number" ? comp.sha_value : 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Consensus explainer */}
      <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, lineHeight: 1.5, padding: "8px 0 4px", borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontWeight: 700, color: C.gold }}>Consensus</span> is the blended expert valuation from dynasty rankings sources. <span style={{ fontWeight: 700, color: "#6bb8e0" }}>Trade Market</span> is the actual price players are moving for in real trades across 1.5M+ dynasty transactions.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function ValueCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", borderTop: `2px solid ${color}30` }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.08em", marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${C.gold}40` }}>{text}</div>
  );
}

function TouchSparkline({ data }: { data: ValueHistoryPoint[] }) {
  const vals = data.filter(d => (d.value ?? d.sha_value) != null).map(d => (d.value ?? d.sha_value) as number);
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
