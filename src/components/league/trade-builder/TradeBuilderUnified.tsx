"use client";

/**
 * TRADE BUILDER UNIFIED — One component, responsive, all entry points converge here.
 *
 * Phase 1: Skeleton with entry screen + analyze modal test
 * Phase 3+: Full builder with search, owner grid, roster browser, action bar
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTradeBuilderContext } from "./TradeBuilderProvider";
import { useLeagueStore } from "@/lib/stores/league-store";
import { getAllRosters } from "@/lib/api";
import AnalyzeModal from "./AnalyzeModal";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "../tokens";

// ── Position badge ───────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: string }) {
  const pc = posColor(pos);
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 800, color: pc,
      background: `${pc}18`, padding: "2px 6px", borderRadius: 3,
      minWidth: 26, textAlign: "center", display: "inline-block",
    }}>
      {pos}
    </span>
  );
}

// ── Owner pill for grid ──────────────────────────────────────────────────

function OwnerPill({ name, window: win, selected, onClick }: {
  name: string; window: string; selected: boolean; onClick: () => void;
}) {
  const winColor = win === "CONTENDER" ? C.green : win === "REBUILDER" ? C.red : C.gold;
  return (
    <div onClick={onClick} style={{
      padding: "10px 6px", borderRadius: 8, cursor: "pointer",
      background: selected ? `${C.gold}15` : C.elevated,
      border: `1px solid ${selected ? C.gold : C.border}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      transition: "all 0.15s",
      WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
        {name.length > 14 ? name.slice(0, 14) + "…" : name}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: winColor, letterSpacing: "0.06em" }}>
        {win === "CONTENDER" ? "WIN-NOW" : win}
      </span>
    </div>
  );
}

// ── Player row for roster browser ────────────────────────────────────────

function PlayerRow({ name, position, age, value, rank, selected, onTap }: {
  name: string; position: string; age: number | null; value: number;
  rank: string; selected: boolean; onTap: () => void;
}) {
  return (
    <div onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      background: selected ? `${C.gold}08` : "transparent",
      borderLeft: selected ? `3px solid ${C.gold}` : "3px solid transparent",
      borderBottom: `1px solid ${C.white08}`,
      cursor: "pointer", transition: "all 0.12s",
      opacity: selected ? 0.6 : 1,
    }}>
      <PosBadge pos={position} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? "✓ " : ""}{name}
        </div>
      </div>
      {age && <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{age}</span>}
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{rank}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold }}>{fmt(value)}</span>
    </div>
  );
}

// ── Asset chip (in builder panel) ────────────────────────────────────────

function AssetChipSmall({ name, position, value, onRemove }: {
  name: string; position: string; value: number; onRemove: () => void;
}) {
  const pc = posColor(position);
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0, x: -20 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
        background: `${pc}08`, border: `1px solid ${pc}25`, borderRadius: 6,
      }}
    >
      <PosBadge pos={position} />
      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: C.primary, flex: 1 }}>{name}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{fmt(value)}</span>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{
        background: "none", border: "none", cursor: "pointer", color: C.dim,
        fontSize: 14, lineHeight: 1, padding: "2px 4px",
      }}>✕</button>
    </motion.div>
  );
}

// ── Search Result type ───────────────────────────────────────────────────

interface SearchResult {
  type: "player" | "owner";
  name: string;
  ownerName: string;
  position?: string;
  value?: number;
}

// ── Main Component ───────────────────────────────────────────────────────

export default function TradeBuilderUnified() {
  const ctx = useTradeBuilderContext();
  const { tb, ui, dispatch, sendTotal, getTotal, balance, balancePct, canAnalyze, suggestContext } = ctx;
  const [activeTab, setActiveTab] = useState<"yours" | "theirs">("yours");
  const [posFilter, setPosFilter] = useState<string>("ALL");

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── "What Would It Take?" state ──
  const [wwitLoading, setWwitLoading] = useState(false);

  const owners = tb.otherOwners || [];
  const hasPartner = !!tb.partner;
  const hasAssets = tb.giveNames.length > 0 || tb.receiveNames.length > 0;
  const showBuilder = hasPartner || hasAssets;
  const currentOwner = useLeagueStore.getState().currentOwner || "";
  const leagueId = useLeagueStore.getState().currentLeagueId || "";

  // Build owner window map from league intel
  const ownerWindows: Record<string, string> = {};
  if (tb.leagueIntel) {
    const intel = tb.leagueIntel as { owners?: Array<{ owner: string; window: string }> };
    for (const o of intel.owners || []) {
      ownerWindows[o.owner] = o.window || "BALANCED";
    }
  }

  // ── All-league rosters (every player on every team) ──
  const { data: allRostersData } = useQuery({
    queryKey: ["all-rosters", leagueId],
    queryFn: () => getAllRosters(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });

  // ── Search index (ALL players across ALL owners) ──
  const searchIndex = useMemo(() => {
    const items: SearchResult[] = [];
    // Add owners
    for (const o of owners) {
      items.push({ type: "owner", name: o.name, ownerName: o.name });
    }
    // Add every player from every roster
    const rosters = allRostersData?.rosters || [];
    for (const r of rosters) {
      for (const p of r.players) {
        items.push({
          type: "player",
          name: p.name,
          ownerName: r.owner,
          position: p.position,
          value: p.sha_value,
        });
      }
    }
    return items;
  }, [owners, allRostersData]);

  // ── Debounced search (150ms) ──
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const matches = searchIndex
        .filter((i) => i.name.toLowerCase().includes(q))
        .slice(0, 10);
      matches.sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        return (b.value || 0) - (a.value || 0);
      });
      setSearchResults(matches);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, searchIndex]);

  // ── Handle search result tap ──
  const handleSearchSelect = useCallback((result: SearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    if (result.type === "owner") {
      ctx.selectPartner(result.name);
    } else if (result.ownerName === currentOwner) {
      // Own player → add to send side
      tb.toggleGive(result.name);
      if (!hasPartner && !hasAssets) {
        // stay on entry, user needs to pick partner too
      }
    } else {
      // Their player → set partner + add to get side
      if (tb.partner !== result.ownerName) {
        ctx.selectPartner(result.ownerName);
      }
      setTimeout(() => tb.toggleReceive(result.name), 50);
    }
  }, [ctx, tb, currentOwner, hasPartner, hasAssets]);

  // ── "What Would It Take?" handler ──
  const handleWhatWouldItTake = useCallback(async () => {
    if (!tb.partner || tb.receiveNames.length === 0) return;
    setWwitLoading(true);
    try {
      await tb.fireSuggest(
        { partner: tb.partner, i_receive: tb.receiveNames, target_asset: tb.receiveNames[0] },
        `What would it take for ${tb.receiveNames[0]}`,
      );
    } finally {
      setWwitLoading(false);
    }
  }, [tb]);

  // Current roster to display
  const roster = activeTab === "yours" ? tb.myRoster : tb.theirRoster;
  const filtered = posFilter === "ALL"
    ? roster
    : roster.filter((p) => p.position === posFilter);
  const selectedNames = activeTab === "yours" ? tb.giveNames : tb.receiveNames;
  const toggleFn = activeTab === "yours" ? tb.toggleGive : tb.toggleReceive;

  // Give/Get assets for display
  const giveAssets = tb.myRoster.filter((p) => tb.giveNames.includes(p.name));
  const getAssets = tb.theirRoster.filter((p) => tb.receiveNames.includes(p.name));

  // Balance bar color
  const balanceColor = balancePct > 5 ? C.green : balancePct < -5 ? C.red : C.gold;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>

      {/* ══════════════════════════════════════════════════════════
          ENTRY LAYER — shown when no partner/assets selected
          ══════════════════════════════════════════════════════════ */}
      {!showBuilder && (
        <div style={{ flex: 1, padding: "20px 16px", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
              color: C.gold, marginBottom: 6, display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 16, height: 1, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
              TRADE BUILDER
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.primary, letterSpacing: "-0.01em" }}>
              Build Your Next Move
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search player or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 10,
                background: C.elevated, border: `1px solid ${searchFocused ? C.gold + "60" : C.border}`,
                fontFamily: SANS, fontSize: 13, color: C.primary, outline: "none",
                transition: "border-color 0.2s",
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16,
              }}>✕</button>
            )}
            {/* Search results dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                marginTop: 4, maxHeight: 280, overflowY: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                {searchResults.map((r, i) => (
                  <div
                    key={`${r.type}-${r.name}-${i}`}
                    onClick={() => handleSearchSelect(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      cursor: "pointer", borderBottom: `1px solid ${C.white08}`,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.elevated; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {r.type === "owner" ? (
                      <>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, background: C.goldDim, padding: "2px 6px", borderRadius: 3 }}>OWNER</span>
                        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary }}>{r.name}</span>
                      </>
                    ) : (
                      <>
                        <PosBadge pos={r.position || "?"} />
                        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, flex: 1 }}>{r.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{r.ownerName}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{fmt(r.value || 0)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUGGEST TRADES button */}
          <button
            onClick={() => {
              tb.fireSuggest({}, "Coach mode");
              dispatch({ type: "TOGGLE_SWIPE", open: true });
            }}
            disabled={tb.suggestLoading}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
              fontFamily: MONO, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em",
              color: C.bg, cursor: tb.suggestLoading ? "wait" : "pointer",
              marginBottom: 20, minHeight: 52,
              boxShadow: `0 0 20px rgba(212,165,50,0.15)`,
            }}
          >
            {tb.suggestLoading ? "SCANNING..." : "⚡ SUGGEST TRADES"}
          </button>

          {/* Error display */}
          {tb.error && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, marginBottom: 12,
              background: C.redDim, border: `1px solid ${C.red}30`,
              fontFamily: MONO, fontSize: 11, color: C.red,
            }}>
              {tb.error}
            </div>
          )}

          {/* Owner grid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.08em", marginBottom: 8 }}>
              TRADE WITH
            </div>
            <style>{`.owner-grid-3col { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; }`}</style>
            <div className="owner-grid-3col">
              {owners.map((o) => (
                <OwnerPill
                  key={o.name}
                  name={o.name}
                  window={ownerWindows[o.name] || "BALANCED"}
                  selected={tb.partner === o.name}
                  onClick={() => ctx.selectPartner(o.name)}
                />
              ))}
            </div>
          </div>

          {/* Suggestion results */}
          {tb.suggestedPkgs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.08em", marginBottom: 8 }}>
                AI SUGGESTIONS ({tb.suggestedPkgs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tb.suggestedPkgs.map((pkg, i) => {
                  const giveNames = pkg.i_give_names || pkg.i_give?.map((a: { name: string }) => a.name) || [];
                  const recvNames = pkg.i_receive_names || pkg.i_receive?.map((a: { name: string }) => a.name) || [];
                  const accPct = pkg.acceptance_likelihood || 0;
                  const accCol = accPct >= 70 ? C.green : accPct >= 50 ? C.gold : accPct >= 30 ? C.orange : C.red;
                  return (
                    <button
                      key={i}
                      onClick={() => ctx.loadPackage(pkg)}
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        background: C.card, border: `1px solid ${C.border}`,
                        textAlign: "left", transition: "border-color 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary }}>
                          {pkg.partner}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: accCol }}>
                          {accPct}%
                        </span>
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: 12, color: C.red, marginBottom: 2 }}>
                        Send: {giveNames.slice(0, 3).join(", ")}
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: 12, color: C.green, marginBottom: 6 }}>
                        Get: {recvNames.slice(0, 3).join(", ")}
                      </div>
                      <div style={{
                        fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: C.gold, background: C.goldDim, padding: "3px 8px", borderRadius: 4,
                        display: "inline-block",
                      }}>
                        TAP TO BUILD →
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BUILDER LAYER — shown when partner or assets exist
          ══════════════════════════════════════════════════════════ */}
      {showBuilder && (
        <>
          {/* ── Fixed top: Builder Panel ── */}
          <div style={{
            flexShrink: 0, padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`, background: C.panel,
          }}>
            {/* Partner selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.06em" }}>
                TRADE WITH
              </span>
              <select
                value={tb.partner}
                onChange={(e) => ctx.selectPartner(e.target.value)}
                style={{
                  background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.primary, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                  padding: "4px 8px", cursor: "pointer",
                }}
              >
                <option value="">Select partner...</option>
                {owners.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
              </select>
            </div>

            {/* Send / Get panels */}
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              {/* SEND */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.red, letterSpacing: "0.06em", marginBottom: 4 }}>
                  YOU SEND
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 36 }}>
                  {giveAssets.length === 0 && (
                    <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "8px 0" }}>Tap players below</div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {giveAssets.map((p) => (
                      <AssetChipSmall key={p.name} name={p.name} position={p.position} value={p.sha_value} onRemove={() => tb.toggleGive(p.name)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              {/* GET */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: "0.06em", marginBottom: 4 }}>
                  YOU GET
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 36 }}>
                  {getAssets.length === 0 && (
                    <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "8px 0" }}>Tap from their roster</div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {getAssets.map((p) => (
                      <AssetChipSmall key={p.name} name={p.name} position={p.position} value={p.sha_value} onRemove={() => tb.toggleReceive(p.name)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* "What Would It Take?" button — shows when GET has assets but SEND is empty */}
            {getAssets.length > 0 && giveAssets.length === 0 && hasPartner && (
              <button
                onClick={handleWhatWouldItTake}
                disabled={wwitLoading}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, marginBottom: 8,
                  background: "none", border: `1px dashed ${C.gold}40`,
                  fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                  color: C.gold, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {wwitLoading ? "COMPUTING..." : "💡 WHAT WOULD IT TAKE?"}
              </button>
            )}

            {/* Roster impact preview */}
            {giveAssets.length > 0 && getAssets.length > 0 && (() => {
              const positionsInvolved = new Set([
                ...giveAssets.map((p) => p.position),
                ...getAssets.map((p) => p.position),
              ].filter((p) => p !== "PICK"));
              if (positionsInvolved.size === 0) return null;
              return (
                <div style={{
                  display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8,
                  padding: "6px 8px", borderRadius: 6,
                  background: C.elevated, border: `1px solid ${C.border}`,
                }}>
                  {Array.from(positionsInvolved).map((pos) => {
                    const losing = giveAssets.filter((p) => p.position === pos).reduce((s, p) => s + p.sha_value, 0);
                    const gaining = getAssets.filter((p) => p.position === pos).reduce((s, p) => s + p.sha_value, 0);
                    const net = gaining - losing;
                    const arrow = net > 0 ? "↑" : net < 0 ? "↓" : "→";
                    const color = net > 0 ? C.green : net < 0 ? C.red : C.dim;
                    return (
                      <span key={pos} style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 700,
                        color, display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <span style={{ color: posColor(pos) }}>{pos}</span>
                        {arrow}
                        {net !== 0 && <span>{net > 0 ? "+" : ""}{fmt(net)}</span>}
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* Balance bar */}
            {(sendTotal > 0 || getTotal > 0) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 6,
                background: C.elevated, border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.red, fontWeight: 700 }}>{fmt(sendTotal)}</span>
                <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, (sendTotal / Math.max(sendTotal + getTotal, 1)) * 100)}%`,
                    background: C.red, borderRadius: 2,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: balanceColor }}>
                  {balance >= 0 ? "+" : ""}{fmt(balance)}
                </span>
                <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, (getTotal / Math.max(sendTotal + getTotal, 1)) * 100)}%`,
                    background: C.green, borderRadius: 2,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.green, fontWeight: 700 }}>{fmt(getTotal)}</span>
              </div>
            )}
          </div>

          {/* ── Scrollable middle: Roster Browser ── */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
              {(["yours", "theirs"] as const).map((tab) => (
                <div key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: "10px 0", textAlign: "center",
                  fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  color: activeTab === tab ? C.gold : C.dim,
                  borderBottom: activeTab === tab ? `2px solid ${C.gold}` : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {tab === "yours" ? "YOUR ROSTER" : `${tb.partner || "THEIR"} ROSTER`}
                </div>
              ))}
            </div>

            {/* Position filters */}
            <div style={{ display: "flex", gap: 4, padding: "8px 12px", overflowX: "auto" }}>
              {["ALL", "QB", "RB", "WR", "TE", "PICK"].map((pos) => (
                <button key={pos} onClick={() => setPosFilter(pos)} style={{
                  padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: posFilter === pos ? `${C.gold}20` : C.elevated,
                  color: posFilter === pos ? C.gold : C.dim,
                  fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                  transition: "all 0.12s",
                }}>
                  {pos}
                </button>
              ))}
            </div>

            {/* Player list — grouped by position */}
            <div>
              {posFilter === "ALL" ? (
                // Grouped view: QB → RB → WR → TE → PICK sections
                (["QB", "RB", "WR", "TE", "PICK"] as const).map((pos) => {
                  const group = roster.filter((p) => p.position === pos).sort((a, b) => b.sha_value - a.sha_value);
                  if (!group.length) return null;
                  return (
                    <div key={pos}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 12px", background: C.elevated,
                        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                      }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: posColor(pos), letterSpacing: "0.08em" }}>{pos}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{group.length}</span>
                      </div>
                      {group.map((p) => (
                        <PlayerRow
                          key={p.name}
                          name={p.name}
                          position={p.position}
                          age={p.age}
                          value={p.sha_value}
                          rank={p.sha_pos_rank}
                          selected={selectedNames.includes(p.name)}
                          onTap={() => toggleFn(p.name)}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                // Filtered view: single position, sorted by value
                filtered.sort((a, b) => b.sha_value - a.sha_value).map((p) => (
                  <PlayerRow
                    key={p.name}
                    name={p.name}
                    position={p.position}
                    age={p.age}
                    value={p.sha_value}
                    rank={p.sha_pos_rank}
                    selected={selectedNames.includes(p.name)}
                    onTap={() => toggleFn(p.name)}
                  />
                ))
              )}
              {filtered.length === 0 && posFilter !== "ALL" && (
                <div style={{ padding: 24, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>
                  {activeTab === "theirs" && !tb.partner ? "Select a trade partner first" : "No players at this position"}
                </div>
              )}
              {roster.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>
                  {activeTab === "theirs" && !tb.partner ? "Select a trade partner first" : "No roster data"}
                </div>
              )}
            </div>
          </div>

          {/* ── Fixed bottom: Action Bar ── */}
          <div style={{
            flexShrink: 0, display: "flex", gap: 8,
            padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            background: "rgba(6,8,13,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid rgba(212,165,50,0.15)`,
          }}>
            {/* SUGGEST */}
            <button
              onClick={() => {
                const body: Record<string, unknown> = {};
                if (tb.partner) body.partner = tb.partner;
                if (tb.giveNames.length) body.sell_asset = tb.giveNames[0];
                if (tb.receiveNames.length) body.i_receive = tb.receiveNames;
                tb.fireSuggest(body, suggestContext);
              }}
              disabled={tb.suggestLoading}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                color: C.bg, cursor: "pointer", minHeight: 48,
                boxShadow: "0 0 16px rgba(212,165,50,0.12)",
              }}
            >
              ⚡ SUGGEST
            </button>

            {/* ANALYZE */}
            <button
              onClick={async () => {
                await tb.handleAnalyze();
                ctx.openAnalyze();
              }}
              disabled={!canAnalyze}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.12)`,
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                color: canAnalyze ? C.primary : C.dim, cursor: canAnalyze ? "pointer" : "default",
                minHeight: 48, opacity: canAnalyze ? 1 : 0.4,
                transition: "all 0.15s",
              }}
            >
              {tb.analyzing ? "..." : "🔍 ANALYZE"}
            </button>

            {/* SHARE */}
            <button
              disabled={!tb.evaluation}
              onClick={() => {
                if (tb.evaluation) ctx.openAnalyze();
              }}
              style={{
                flex: 0.7, padding: "14px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.12)`,
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                color: tb.evaluation ? C.primary : C.dim, cursor: tb.evaluation ? "pointer" : "default",
                minHeight: 48, opacity: tb.evaluation ? 1 : 0.4,
              }}
            >
              ↗ SHARE
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ANALYZE MODAL — portal, THE screenshot moment
          ══════════════════════════════════════════════════════════ */}
      <AnalyzeModal
        isOpen={ui.showAnalyzeModal}
        onClose={ctx.closeAnalyze}
        evaluation={tb.evaluation}
        partner={tb.partner}
        owner={currentOwner}
        onCounter={() => {
          // Flip the trade — swap send and get, keep partner
          const oldGive = [...tb.giveNames];
          const oldReceive = [...tb.receiveNames];
          tb.handleClear();
          // Set partner (stays the same)
          if (tb.partner) ctx.selectPartner(tb.partner);
          // Flip: what they sent becomes what we send, and vice versa
          setTimeout(() => {
            for (const n of oldReceive) tb.toggleGive(n);
            for (const n of oldGive) tb.toggleReceive(n);
          }, 50);
          ctx.closeAnalyze();
          tb.setEvaluation(null);
        }}
      />
    </div>
  );
}
