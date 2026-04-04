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
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import { getAllRosters } from "@/lib/api";
import AnalyzeModal from "./AnalyzeModal";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "../tokens";
import SwipeStack from "./SwipeStack";

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

function PlayerRow({ name, position, value, selected, onTap }: {
  name: string; position: string; value: number;
  selected: boolean; onTap: () => void;
}) {
  return (
    <div onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
      background: selected ? `${C.gold}08` : "transparent",
      borderLeft: selected ? `3px solid ${posColor(position)}` : "3px solid transparent",
      borderBottom: `1px solid ${C.white08}`,
      cursor: "pointer", transition: "all 0.12s",
      opacity: selected ? 0.6 : 1,
    }}>
      <PosBadge pos={position} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? "✓ " : ""}{name}
        </div>
      </div>
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

// ── Swipe Modal (cards + shopping cart) ──────────────────────────────────

function SwipeModal({ tb, ctx, leagueId }: { tb: ReturnType<typeof useTradeBuilderContext>["tb"]; ctx: ReturnType<typeof useTradeBuilderContext>; leagueId: string }) {
  const [showQueue, setShowQueue] = useState(false);
  const queuedTrades = useTradeBuilderStore((s) => s.queuedTrades);
  const removeFromQueue = useTradeBuilderStore((s) => s.removeFromQueue);
  const clearQueue = useTradeBuilderStore((s) => s.clearQueue);

  // Reset queue view when modal opens with new suggestions
  useEffect(() => {
    if (tb.suggestedPkgs.length > 0) setShowQueue(false);
  }, [tb.suggestedPkgs.length]);

  if (tb.suggestedPkgs.length === 0 && queuedTrades.length === 0) return null;
  // If suggestions cleared but queue has trades, keep modal open on queue
  const showModal = tb.suggestedPkgs.length > 0 || (showQueue && queuedTrades.length > 0);
  if (!showModal) return null;

  const handleClose = () => {
    clearQueue();
    tb.handleClear();
    setShowQueue(false);
  };

  const handleBuildTrade = (pkg: typeof queuedTrades[number], index: number) => {
    removeFromQueue(index);
    ctx.loadPackage(pkg);
    // If that was the last one, close modal
    if (queuedTrades.length <= 1) {
      tb.handleClear();
      setShowQueue(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(6,8,13,0.97)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 8px", flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", color: C.gold }}>
          {showQueue
            ? `${queuedTrades.length} SAVED TRADE${queuedTrades.length !== 1 ? "S" : ""}`
            : `${tb.suggestedPkgs.length} TRADE${tb.suggestedPkgs.length !== 1 ? "S" : ""} FOUND`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 10, border: `1px solid rgba(212,165,50,0.15)`, background: "rgba(212,165,50,0.04)" }}>
            <span style={{ fontSize: 7, fontWeight: 600, color: C.gold, fontFamily: SANS, fontStyle: "italic" }}>powered by</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.primary, fontFamily: SANS }}>DynastyGPT<span style={{ color: C.gold }}>.com</span></span>
          </div>
          {/* Shopping cart button */}
          {!showQueue && queuedTrades.length > 0 && (
            <button onClick={() => setShowQueue(true)} style={{
              position: "relative", background: C.elevated, border: `1px solid ${C.gold}40`,
              borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, lineHeight: 1, color: C.gold,
            }}>
              🛒
              <span style={{
                position: "absolute", top: -6, right: -6,
                background: C.gold, color: C.bg, fontFamily: MONO, fontSize: 10, fontWeight: 900,
                width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {queuedTrades.length}
              </span>
            </button>
          )}
          <button onClick={handleClose} style={{
            background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "6px 10px", cursor: "pointer", fontSize: 14, lineHeight: 1, color: C.dim,
          }}>✕</button>
        </div>
      </div>

      {/* Content: Swipe Stack or Queue */}
      {showQueue ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {queuedTrades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.primary, marginBottom: 8 }}>No trades saved</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>Swipe right on trades to save them here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {queuedTrades.map((pkg, i) => (
                <div key={`${pkg.partner}-${i}`} style={{
                  background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: 14, display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {/* Partner */}
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>
                    TRADE WITH {pkg.partner?.toUpperCase()}
                  </div>
                  {/* Assets */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.red, marginBottom: 4, letterSpacing: "0.06em" }}>YOU SEND</div>
                      {(pkg.i_give || []).map((a) => (
                        <div key={a.name} style={{ fontFamily: SANS, fontSize: 12, color: C.primary, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(a.position), background: `${posColor(a.position)}18`, padding: "1px 4px", borderRadius: 3 }}>{a.position}</span>
                          {a.name}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.green, marginBottom: 4, letterSpacing: "0.06em" }}>YOU GET</div>
                      {(pkg.i_receive || []).map((a) => (
                        <div key={a.name} style={{ fontFamily: SANS, fontSize: 12, color: C.primary, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(a.position), background: `${posColor(a.position)}18`, padding: "1px 4px", borderRadius: 3 }}>{a.position}</span>
                          {a.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleBuildTrade(pkg, i)}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
                        background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                        fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                        color: C.bg, cursor: "pointer",
                      }}
                    >
                      BUILD THIS TRADE
                    </button>
                    <button
                      onClick={() => removeFromQueue(i)}
                      style={{
                        padding: "12px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.elevated, fontFamily: MONO, fontSize: 11, fontWeight: 700,
                        color: C.dim, cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <SwipeStack
          packages={tb.suggestedPkgs}
          leagueId={leagueId}
          owner={tb.partner || ""}
          onSwipeRight={() => {}}
          onSwipeLeft={() => {}}
          onComplete={() => setShowQueue(true)}
        />
      )}
    </div>
  );
}

// ── Builder Layer (mobile trade builder) ─────────────────────────────────

function BuilderLayer({ tb, ctx, owners, giveAssets, getAssets, sendTotal, getTotal, balance, balancePct, balanceColor, canAnalyze, suggestContext, activeTab, setActiveTab, posFilter, setPosFilter, roster, filtered, selectedNames, toggleFn }: {
  tb: ReturnType<typeof useTradeBuilderContext>["tb"];
  ctx: ReturnType<typeof useTradeBuilderContext>;
  owners: Array<{ name: string }>;
  giveAssets: Array<{ name: string; position: string; sha_value: number }>;
  getAssets: Array<{ name: string; position: string; sha_value: number }>;
  sendTotal: number; getTotal: number; balance: number; balancePct: number; balanceColor: string;
  canAnalyze: boolean; suggestContext: string;
  activeTab: "yours" | "theirs"; setActiveTab: (t: "yours" | "theirs") => void;
  posFilter: string; setPosFilter: (p: string) => void;
  roster: Array<{ name: string; position: string; sha_value: number; sha_pos_rank: string; age: number | null }>;
  filtered: Array<{ name: string; position: string; sha_value: number; sha_pos_rank: string; age: number | null }>;
  selectedNames: string[]; toggleFn: (name: string) => void;
}) {
  const [expandedPos, setExpandedPos] = useState<Set<string>>(() => new Set(["QB"]));

  const toggleGroup = (pos: string) => {
    setExpandedPos((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  };

  return (
    <>
      {/* Error display */}
      {tb.error && (
        <div style={{
          padding: "6px 12px", margin: "6px 10px 0", borderRadius: 6,
          background: C.redDim, border: `1px solid ${C.red}30`,
          fontFamily: MONO, fontSize: 11, color: C.red,
        }}>
          {tb.error}
        </div>
      )}

      {/* ── FIXED HEADER ── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.panel }}>
        {/* Partner dropdown — full width */}
        <div style={{ padding: "8px 10px 6px" }}>
          <select
            value={tb.partner}
            onChange={(e) => ctx.selectPartner(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8,
              background: C.elevated, border: `1px solid ${C.border}`,
              color: C.primary, fontFamily: MONO, fontSize: 13, fontWeight: 700,
              cursor: "pointer", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239596a5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            <option value="">Select trade partner...</option>
            {owners.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
          </select>
        </div>

        {/* YOU SEND — horizontal scroll chips */}
        <div style={{ padding: "2px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: C.red, letterSpacing: "0.08em", flexShrink: 0 }}>SEND</span>
            <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1, minWidth: 0, paddingBottom: 2 }}>
              {giveAssets.length === 0 ? (
                <span style={{ fontFamily: SANS, fontSize: 11, color: `${C.dim}60`, whiteSpace: "nowrap" }}>Tap your players</span>
              ) : (
                giveAssets.map((p) => (
                  <span key={p.name} onClick={() => tb.toggleGive(p.name)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 6px",
                    background: `${posColor(p.position)}08`, border: `1px solid ${posColor(p.position)}25`,
                    borderRadius: 5, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: posColor(p.position) }}>{p.position}</span>
                    <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary }}>{p.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.gold }}>{fmt(p.sha_value)}</span>
                    <span style={{ color: C.dim, fontSize: 12, lineHeight: 1, marginLeft: 2 }}>✕</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* YOU GET — horizontal scroll chips */}
        <div style={{ padding: "2px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 900, color: C.green, letterSpacing: "0.08em", flexShrink: 0, width: 32 }}>GET</span>
            <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1, minWidth: 0, paddingBottom: 2 }}>
              {getAssets.length === 0 ? (
                <span style={{ fontFamily: SANS, fontSize: 11, color: `${C.dim}60`, whiteSpace: "nowrap" }}>Tap their players</span>
              ) : (
                getAssets.map((p) => (
                  <span key={p.name} onClick={() => tb.toggleReceive(p.name)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 6px",
                    background: `${posColor(p.position)}08`, border: `1px solid ${posColor(p.position)}25`,
                    borderRadius: 5, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: posColor(p.position) }}>{p.position}</span>
                    <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary }}>{p.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.gold }}>{fmt(p.sha_value)}</span>
                    <span style={{ color: C.dim, fontSize: 12, lineHeight: 1, marginLeft: 2 }}>✕</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Balance row — compact one-liner */}
        {(sendTotal > 0 || getTotal > 0) && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "4px 10px 6px",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.red }}>{fmt(sendTotal)}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>→</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.green }}>{fmt(getTotal)}</span>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 800, color: balanceColor,
              padding: "1px 6px", borderRadius: 4, background: `${balanceColor}15`,
            }}>
              {balance >= 0 ? "+" : ""}{fmt(balance)}
            </span>
            {balancePct !== 0 && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: `${C.dim}80` }}>
                ({balancePct > 0 ? "+" : ""}{balancePct}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── SCROLLABLE ROSTER ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 5, background: C.bg }}>
          {(["yours", "theirs"] as const).map((tab) => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "9px 0", textAlign: "center",
              fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
              color: activeTab === tab ? C.gold : C.dim,
              borderBottom: activeTab === tab ? `2px solid ${C.gold}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {tab === "yours" ? "YOUR ROSTER" : `${(tb.partner || "THEIR").toUpperCase()} ROSTER`}
            </div>
          ))}
        </div>

        {/* Position filters */}
        <div style={{ display: "flex", gap: 3, padding: "6px 10px", overflowX: "auto", position: "sticky", top: 37, zIndex: 4, background: C.bg }}>
          {["ALL", "QB", "RB", "WR", "TE", "PICK"].map((pos) => (
            <button key={pos} onClick={() => setPosFilter(pos)} style={{
              padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer",
              background: posFilter === pos ? `${C.gold}20` : C.elevated,
              color: posFilter === pos ? C.gold : C.dim,
              fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              transition: "all 0.12s", flexShrink: 0,
            }}>
              {pos}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div>
          {posFilter === "ALL" ? (
            (["QB", "RB", "WR", "TE", "PICK"] as const).map((pos, posIdx) => {
              const group = roster.filter((p) => p.position === pos).sort((a, b) => b.sha_value - a.sha_value);
              if (!group.length) return null;
              const isExpanded = expandedPos.has(pos);
              return (
                <div key={pos}>
                  {/* Collapsible group header */}
                  <div
                    onClick={() => toggleGroup(pos)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                      background: C.elevated, cursor: "pointer",
                      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(pos), letterSpacing: "0.08em" }}>{pos}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: `${C.dim}80` }}>({group.length})</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: C.dim, transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                  </div>
                  {/* Players — collapsed or expanded */}
                  {isExpanded && group.map((p) => (
                    <PlayerRow
                      key={p.name}
                      name={p.name}
                      position={p.position}
                      value={p.sha_value}
                      selected={selectedNames.includes(p.name)}
                      onTap={() => toggleFn(p.name)}
                    />
                  ))}
                </div>
              );
            })
          ) : (
            filtered.sort((a, b) => b.sha_value - a.sha_value).map((p) => (
              <PlayerRow
                key={p.name}
                name={p.name}
                position={p.position}
                value={p.sha_value}
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

      {/* ── FIXED BOTTOM BAR ── */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 6,
        padding: "8px 10px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        background: "rgba(6,8,13,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid rgba(212,165,50,0.15)`,
      }}>
        <button
          onClick={async () => {
            try {
              const body: Record<string, unknown> = {};
              if (tb.partner) body.partner = tb.partner;
              if (tb.giveNames.length) body.sell_asset = tb.giveNames[0];
              if (tb.receiveNames.length) body.i_receive = tb.receiveNames;
              await tb.fireSuggest(body, suggestContext);
            } catch (e) {
              tb.setError(e instanceof Error ? e.message : "Suggest failed");
            }
          }}
          disabled={tb.suggestLoading}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
            fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
            color: C.bg, cursor: "pointer", minHeight: 44,
            boxShadow: "0 0 16px rgba(212,165,50,0.12)",
          }}
        >
          {tb.suggestLoading ? "SCANNING..." : "⚡ SUGGEST"}
        </button>
        <button
          onClick={async () => { await tb.handleAnalyze(); ctx.openAnalyze(); }}
          disabled={!canAnalyze}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.12)`,
            fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
            color: canAnalyze ? C.primary : C.dim, cursor: canAnalyze ? "pointer" : "default",
            minHeight: 44, opacity: canAnalyze ? 1 : 0.4,
          }}
        >
          {tb.analyzing ? "..." : "🔍 ANALYZE"}
        </button>
        <button
          disabled={!tb.evaluation}
          onClick={() => { if (tb.evaluation) ctx.openAnalyze(); }}
          style={{
            flex: 0.6, padding: "12px 0", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.12)`,
            fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
            color: tb.evaluation ? C.primary : C.dim, cursor: tb.evaluation ? "pointer" : "default",
            minHeight: 44, opacity: tb.evaluation ? 1 : 0.4,
          }}
        >
          ↗ SHARE
        </button>
      </div>
    </>
  );
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
            onClick={async () => {
              try {
                await tb.fireSuggest({}, "Coach mode");
              } catch (e) {
                tb.setError(e instanceof Error ? e.message : "Suggest failed");
              }
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

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BUILDER LAYER — shown when partner or assets exist
          ══════════════════════════════════════════════════════════ */}
      {showBuilder && (
        <BuilderLayer
          tb={tb} ctx={ctx} owners={owners}
          giveAssets={giveAssets} getAssets={getAssets}
          sendTotal={sendTotal} getTotal={getTotal} balance={balance} balancePct={balancePct} balanceColor={balanceColor}
          canAnalyze={canAnalyze} suggestContext={suggestContext}
          activeTab={activeTab} setActiveTab={setActiveTab}
          posFilter={posFilter} setPosFilter={setPosFilter}
          roster={roster} filtered={filtered}
          selectedNames={selectedNames} toggleFn={toggleFn}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          SWIPE MODAL — suggestion cards + shopping cart
          ══════════════════════════════════════════════════════════ */}
      <SwipeModal tb={tb} ctx={ctx} leagueId={leagueId} />

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
