"use client";

/**
 * TRADE BUILDER DESKTOP — ported pixel-for-pixel from Shadynasty's TradeBuilderView.tsx
 * Three-state adaptive workspace:
 *   State 1: No partner — exploration (sell player, find position)
 *   State 2: Partner selected — two rosters + suggest
 *   State 3: Tray populated — build & analyze
 *
 * Now uses the shared useTradeBuilder hook for all state/API logic.
 */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor } from "../tokens";
import RosterColumn from "./RosterColumn";
import TradeTray from "./TradeTray";
import AnalysisModal from "./AnalysisModal";
import SuggestLoadingModal from "./SuggestLoadingModal";
import ChatPanel from "./ChatPanel";
import PlayerName from "../PlayerName";
import { getAllRosters } from "@/lib/api";
import type { SuggestedPackage, NegotiationInsight } from "./types";
import type { UseTradeBuilderReturn } from "@/hooks/useTradeBuilder";
import { HowItWorksButton } from "./HowItWorksModal";
import { useTrack } from "@/hooks/useTrack";

const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
const WINDOWS = ["REBUILDER", "BALANCED", "WIN-NOW"] as const;
const MODES = ["conservative", "balanced", "aggressive"] as const;
const MODE_COLORS: Record<string, string> = { conservative: C.green, balanced: C.gold, aggressive: C.red };
const toBackend = (w: string) => (w === "WIN-NOW" ? "CONTENDER" : w);
const toDisplay = (w: string) => (w === "CONTENDER" ? "WIN-NOW" : w);

function gradeColor(g: string) { if (g?.startsWith("A")) return C.green; if (g?.startsWith("B")) return C.blue; if (g?.startsWith("C")) return C.gold; if (g?.startsWith("D")) return C.orange; return C.red; }
function likelihoodColor(s: number) { if (s >= 75) return C.green; if (s >= 50) return "#b8d44a"; if (s >= 30) return C.orange; return C.red; }

/* ═══ SMALL COMPONENTS — matching Shadynasty exactly ═══ */

function WindowToggle({ label, value, computed, onChange }: { label: string; value: string | null; computed: string; onChange: (v: string | null) => void }) {
  const active = value || toDisplay(computed);
  return (
    <div>
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.12em" }}>{label}</span>
      <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginTop: 3 }}>
        {WINDOWS.map((w) => { const isA = active === w; const isD = !value && w === toDisplay(computed); return (
          <button key={w} onClick={() => onChange(w === toDisplay(computed) ? null : w)} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "4px 8px", border: "none", cursor: "pointer", background: isA ? `${C.gold}20` : "transparent", color: isA ? C.gold : C.dim, borderRight: w !== "WIN-NOW" ? `1px solid ${C.border}` : "none", transition: "all 0.15s", position: "relative" }}>
            {w}{isD && <span style={{ position: "absolute", top: 0, right: 2, fontSize: 8, color: C.goldDark }}>*</span>}
          </button>); })}
      </div>
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.12em" }}>TRADE STYLE</span>
      <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginTop: 3 }}>
        {MODES.map((m) => { const isA = value === m; const mc = MODE_COLORS[m]; return (
          <button key={m} onClick={() => onChange(m)} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "4px 8px", border: "none", cursor: "pointer", background: isA ? `${mc}20` : "transparent", color: isA ? mc : C.dim, borderRight: m !== "aggressive" ? `1px solid ${C.border}` : "none", transition: "all 0.15s", textTransform: "uppercase" }}>
            {m}
          </button>); })}
      </div>
    </div>
  );
}

function PackageCard({ pkg, onBuild }: { pkg: SuggestedPackage; onBuild: () => void }) {
  const g = pkg.owner_trade_grade || { grade: "?", score: 0, verdict: "?" };
  const color = gradeColor(g.grade || "?");
  const accColor = likelihoodColor(pkg.acceptance_likelihood || 0);
  const tierColor = pkg.tier === "exploit" ? C.green : pkg.tier === "above_market" ? C.gold : C.dim;
  const tierLabel = pkg.tier === "exploit" ? "EXPLOIT" : pkg.tier === "above_market" ? "ABOVE MARKET" : pkg.tier === "fair_value" ? "FAIR VALUE" : "";
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10, transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldBorder; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}>
      {/* Header: partner + tier + grade + acceptance */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${color}18`, border: `2px solid ${color}`, flexShrink: 0 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 16, color }}>{g.grade}</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary }}>{pkg.partner}</span>
            {tierLabel && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 6px", borderRadius: 3, background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}25` }}>{tierLabel}</span>}
          </div>
          {pkg.market_comparison && <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{pkg.market_comparison}</div>}
        </div>
        {/* Acceptance score — disabled, will revisit */}
      </div>

      {/* Narrative — the AI's league-first explanation */}
      {pkg.narrative && (
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, padding: "10px 12px", background: C.elevated, borderRadius: 6, borderLeft: `3px solid ${C.gold}50`, marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {pkg.narrative.split(/\n|(?= • )/).map((s: string) => s.trim()).filter(Boolean).map((line: string, i: number) => (
            <div key={i} style={{ lineHeight: 1.55 }}>{line}</div>
          ))}
        </div>
      )}

      {/* Send / Receive */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 13, fontFamily: SANS }}>
        <div style={{ flex: 1 }}><span style={{ fontFamily: MONO, fontSize: 10, color: C.red, fontWeight: 700, letterSpacing: "0.08em" }}>SEND</span>
          {(pkg.i_give_names || []).map((n, i) => <div key={i} style={{ color: C.secondary, marginTop: 2 }}><PlayerName name={n} style={{ color: C.secondary }} /></div>)}</div>
        <div style={{ color: C.dim, alignSelf: "center", fontSize: 16 }}>→</div>
        <div style={{ flex: 1 }}><span style={{ fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: "0.08em" }}>GET</span>
          {(pkg.i_receive_names || []).map((n, i) => <div key={i} style={{ color: C.secondary, marginTop: 2 }}><PlayerName name={n} style={{ color: C.secondary }} /></div>)}</div>
      </div>

      {/* Fallback: negotiation insight if no narrative */}
      {!pkg.narrative && (pkg.negotiation_insights as NegotiationInsight[])?.[0] && <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, padding: "6px 8px", background: C.elevated, borderRadius: 4, borderLeft: `2px solid ${C.gold}40`, marginBottom: 10 }}>{(pkg.negotiation_insights as NegotiationInsight[])[0].insight}</div>}

      {/* Roster warnings — advisories, not kills */}
      {pkg.roster_warnings && pkg.roster_warnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {pkg.roster_warnings.map((w, i) => {
            const isCornerstone = w.includes("cornerstone");
            const color = isCornerstone ? "#e09c6b" : "#d4a017";
            const label = isCornerstone ? "CORNERSTONE TARGET" : "ROSTER WARNING";
            return (
              <div key={i} style={{ fontFamily: MONO, fontSize: 10, color, padding: "6px 8px", background: `${color}12`, borderRadius: 4, borderLeft: `2px solid ${color}`, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 800, letterSpacing: "0.06em", marginBottom: 2 }}>⚠ {label}</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, fontWeight: 400 }}>{w}</div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onBuild} style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: DISPLAY, fontSize: 13, letterSpacing: "0.08em", background: `linear-gradient(135deg,${C.goldDark},${C.gold})`, color: "#000", transition: "opacity 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>BUILD THIS TRADE</button>
    </div>
  );
}

// ── PLAYER SEARCH BAR ─────────────────────────────────────────────────────
type SearchHit = { name: string; position: string; ownerName: string; sha_value: number };

function PlayerSearchBar({ leagueId, owner, onSelectMyPlayer, onSelectTheirPlayer }: {
  leagueId: string;
  owner: string;
  onSelectMyPlayer: (name: string) => void;
  onSelectTheirPlayer: (ownerName: string, name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["all-rosters-search", leagueId],
    queryFn: () => getAllRosters(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });

  const index = useMemo<SearchHit[]>(() => {
    const out: SearchHit[] = [];
    for (const r of data?.rosters || []) {
      for (const p of r.players) {
        out.push({ name: p.name, position: p.position, ownerName: r.owner, sha_value: p.sha_value });
      }
    }
    return out;
  }, [data]);

  const results = useMemo(() => {
    if (!q || q.length < 2) return [];
    const ql = q.toLowerCase();
    const matches = index.filter((h) => h.name.toLowerCase().includes(ql));
    matches.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(ql) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(ql) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (b.sha_value || 0) - (a.sha_value || 0);
    });
    return matches.slice(0, 10);
  }, [q, index]);

  const handleSelect = (hit: SearchHit) => {
    setQ("");
    setFocused(false);
    if (hit.ownerName.toLowerCase() === owner.toLowerCase()) {
      onSelectMyPlayer(hit.name);
    } else {
      onSelectTheirPlayer(hit.ownerName, hit.name);
    }
  };

  return (
    <div style={{ flex: "0 0 320px", position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search any player..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        style={{
          width: "100%", padding: "9px 14px", borderRadius: 6,
          background: C.card, border: `1px solid ${focused ? C.gold : C.border}`,
          color: C.primary, fontFamily: SANS, fontSize: 14, outline: "none",
          transition: "border-color 0.15s",
        }}
      />
      {q && (
        <button onClick={() => setQ("")} style={{
          position: "absolute", right: 10, top: 8, background: "none", border: "none",
          color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1,
        }}>×</button>
      )}
      {focused && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 100,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          maxHeight: 320, overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {results.map((hit, i) => {
            const isMine = hit.ownerName.toLowerCase() === owner.toLowerCase();
            const pc = posColor(hit.position);
            return (
              <div key={`${hit.ownerName}-${hit.name}-${i}`}
                onClick={() => handleSelect(hit)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.elevated; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  cursor: "pointer", borderBottom: `1px solid ${C.white08}`,
                  transition: "background 0.1s",
                }}>
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 800, color: pc,
                  background: `${pc}18`, padding: "2px 6px", borderRadius: 3,
                  minWidth: 26, textAlign: "center",
                }}>{hit.position}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>{hit.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{hit.ownerName}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: isMine ? C.gold : C.green }}>{fmt(hit.sha_value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ packages, loading, elapsedSec, query, onBuild, onBack }: { packages: SuggestedPackage[]; loading: boolean; elapsedSec: number; query: string; onBuild: (pkg: SuggestedPackage) => void; onBack: () => void }) {
  // Backend typically takes ~45s with single-pass validation. Cap progress bar at 80s.
  const ETA_SEC = 80;
  const pct = Math.min(100, Math.round((elapsedSec / ETA_SEC) * 100));
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.primary }}>SUGGESTED TRADES</span>
          {query && <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2 }}>{query}</div>}</div>
        <button onClick={onBack} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.white08; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>BACK</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold, letterSpacing: "0.04em", marginBottom: 14 }}>
              FINDING THE BEST TRADES…
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginBottom: 16 }}>
              {elapsedSec}s elapsed
            </div>
            <div style={{ width: "100%", maxWidth: 240, margin: "0 auto", height: 4, background: C.elevated, borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright})`,
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginTop: 14, lineHeight: 1.5 }}>
              Scanning your roster, your league&apos;s tendencies, and millions of comparable trades.
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim }}>No viable trades found at this aggression level.</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.gold, marginTop: 8 }}>Try AGGRESSIVE mode for more options.</div>
          </div>
        ) : (
          packages.map((p, i) => <PackageCard key={i} pkg={p} onBuild={() => onBuild(p)} />)
        )}
      </div>
    </div>
  );
}

export default function TradeBuilderDesktop({
  tb,
  leagueId,
  owner,
}: {
  tb: UseTradeBuilderReturn;
  leagueId: string;
  owner: string;
}) {
  const {
    partner, setPartner, myWindow, setMyWindow, theirWindow, setTheirWindow,
    mode, setMode, myRoster, theirRoster, otherOwners, myGrades, theirGrades,
    computedOW, computedPW, giveNames, receiveNames, evaluation, analyzing,
    suggestedPkgs, suggestLoading, suggestElapsedSec, suggestQuery, activeSellAsset, error, setError,
    showModal, setShowModal, chatCollapsed, setChatCollapsed, chatInjection,
    hasTray, showResults,
    toggleGive, toggleReceive, handleAnalyze, handleSellAsset, handleFindPosition,
    handleSuggestWithPartner, handleTargetPlayer, buildPackage, handleClear,
    setGiveNames, setReceiveNames, setEvaluation,
  } = tb;

  const track = useTrack();
  const trackedSuggest = () => {
    track("trade_suggest_clicked", { league_id: leagueId, partner: partner || null, mode });
    handleSuggestWithPartner();
  };
  const trackedAnalyze = () => {
    track("trade_evaluated", { league_id: leagueId, partner: partner || null, give: giveNames, receive: receiveNames });
    handleAnalyze();
  };

  // Auto-collapse chat panel when window is too narrow for it
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 1100 && !chatCollapsed) setChatCollapsed(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [chatCollapsed, setChatCollapsed]);

  if (!owner) return <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Select an owner to use the Trade Builder.</div>;

  return (
    <div style={{ display: "flex", flex: 1, height: "100%", minHeight: 0, background: C.bg }}>
      <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* ── WORKSPACE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* ROW 1: Partner selection */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 18, color: C.primary, letterSpacing: "0.05em", flexShrink: 0 }}>TRADE BUILDER</span>
          <div style={{ flex: "0 0 300px", position: "relative" }}>
            <select value={partner} onChange={(e) => { track("trade_partner_selected", { league_id: leagueId, partner: e.target.value }); setPartner(e.target.value); }}
              style={{ width: "100%", padding: "9px 14px", borderRadius: 6, background: C.card, border: `1px solid ${partner ? C.gold : C.border}`, color: partner ? C.primary : C.dim, fontFamily: SANS, fontSize: 15, cursor: "pointer", outline: "none" }}>
              <option value="">Select trade partner...</option>
              {otherOwners.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
            </select>
            {partner && <button onClick={() => { setPartner(""); handleClear(); }} style={{ position: "absolute", right: 10, top: 8, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>}
          </div>
          <PlayerSearchBar
            leagueId={leagueId}
            owner={owner}
            onSelectMyPlayer={(name) => toggleGive(name)}
            onSelectTheirPlayer={(ownerName, name) => {
              if (partner !== ownerName) setPartner(ownerName);
              setTimeout(() => toggleReceive(name), 50);
            }}
          />
          {activeSellAsset && <span style={{ fontFamily: MONO, fontSize: 12, color: C.orange, padding: "2px 8px", borderRadius: 3, background: `${C.orange}15`, border: `1px solid ${C.orange}30` }}>Selling: {activeSellAsset}</span>}
        </div>

        {/* ROW 2: Command bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.panel }}>
          <div style={{ display: "flex", gap: 6 }}>
            {POSITIONS.map((pos) => {
              const pc = posColor(pos);
              return (
              <button key={pos} onClick={() => { track("find_position_clicked", { league_id: leagueId, position: pos }); handleFindPosition(pos); }}
                style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
                  padding: "8px 18px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s ease",
                  background: `linear-gradient(135deg, ${pc}18, ${pc}08)`,
                  border: `1px solid ${pc}35`,
                  color: pc,
                  boxShadow: `0 1px 4px ${pc}15, inset 0 1px 0 ${pc}10`,
                  position: "relative" as const, overflow: "hidden" as const,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${pc}30, ${pc}15)`;
                  e.currentTarget.style.borderColor = `${pc}70`;
                  e.currentTarget.style.boxShadow = `0 2px 12px ${pc}25, inset 0 1px 0 ${pc}20`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${pc}18, ${pc}08)`;
                  e.currentTarget.style.borderColor = `${pc}35`;
                  e.currentTarget.style.boxShadow = `0 1px 4px ${pc}15, inset 0 1px 0 ${pc}10`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}>
                FIND {pos}
              </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <HowItWorksButton />
          <button onClick={trackedSuggest}
            style={{ fontFamily: DISPLAY, fontSize: 13, letterSpacing: "0.08em", padding: "8px 18px", borderRadius: 6, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.goldDark},${C.gold})`, color: "#000", transition: "opacity 0.15s", flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            {partner ? `SUGGEST WITH ${partner.toUpperCase()}` : "SUGGEST TRADES"}
          </button>
          {(showResults || hasTray || activeSellAsset) && (
            <button onClick={handleClear}
              style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", transition: "all 0.12s", flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.white08; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              CLEAR
            </button>
          )}
          <ModeToggle value={mode} onChange={(v) => { track("trade_style_changed", { league_id: leagueId, from: mode, to: v }); setMode(v); }} />
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ margin: "6px 20px", padding: "8px 16px", borderRadius: 6, background: `${C.red}12`, border: `1px solid ${C.red}40`, fontFamily: SANS, fontSize: 13, color: C.red, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14 }}>×</button>
          </div>
        )}

        {/* MAIN AREA */}
        <div style={{ flex: 1, display: "flex", gap: 12, padding: "12px 20px", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT: Owner roster */}
          <RosterColumn title={owner} roster={myRoster} selectedNames={giveNames}
            onToggle={toggleGive} side="give" posGrades={myGrades}
            windowToggle={<WindowToggle label="MY MODE" value={myWindow} computed={computedOW} onChange={setMyWindow} />} />

          {/* CENTER: Tray or empty */}
          {partner && (hasTray || !showResults) && (
            <TradeTray giveNames={giveNames} receiveNames={receiveNames} giveRoster={myRoster} receiveRoster={theirRoster}
              evaluation={evaluation} analyzing={analyzing}
              onRemoveGive={(n) => { setGiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onRemoveReceive={(n) => { setReceiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onAnalyze={trackedAnalyze} onClear={() => { setGiveNames([]); setReceiveNames([]); setEvaluation(null); }} />
          )}

          {/* RIGHT: Partner roster or Results or Explore */}
          {partner ? (
            <RosterColumn title={partner} roster={theirRoster} selectedNames={receiveNames}
              onToggle={toggleReceive} side="receive" posGrades={theirGrades}
              windowToggle={<WindowToggle label="THEIR LENS" value={theirWindow} computed={computedPW} onChange={setTheirWindow} />} />
          ) : showResults ? (
            <ResultsPanel packages={suggestedPkgs} loading={suggestLoading} elapsedSec={suggestElapsedSec} query={suggestQuery} onBuild={(pkg) => { track("build_trade_clicked", { league_id: leagueId, partner: pkg.partner }); buildPackage(pkg); }} onBack={() => handleClear()} />
          ) : (
            <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ textAlign: "center", maxWidth: 320 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: C.gold, marginBottom: 8 }}>GET STARTED</div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.6 }}>Click a player on your roster, use the FIND buttons above, or select a trade partner to begin.</div>
              </div>
            </div>
          )}

          {/* Floating results when partner selected but no tray */}
          {showResults && partner && !hasTray && (
            <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={(ev) => { if (ev.target === ev.currentTarget) { handleClear(); } }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
                onClick={() => { handleClear(); }} />
              <div style={{ position: "relative", width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", background: C.panel, border: `1px solid ${C.gold}30`, borderRadius: 12, animation: "fadeUp 0.3s ease", margin: "0 20px" }}>
                <ResultsPanel packages={suggestedPkgs} loading={suggestLoading} elapsedSec={suggestElapsedSec} query={suggestQuery} onBuild={(pkg) => { track("build_trade_clicked", { league_id: leagueId, partner: pkg.partner }); buildPackage(pkg); }} onBack={() => handleClear()} />
              </div>
            </div>
          )}
        </div>

        {showModal && evaluation && <AnalysisModal evaluation={evaluation} owner={owner} partner={partner} onClose={() => setShowModal(false)} />}
        {suggestLoading && <SuggestLoadingModal elapsedSec={suggestElapsedSec} query={suggestQuery} />}
      </div>

      {/* ── CHAT PANEL ── */}
      <ChatPanel leagueId={leagueId} owner={owner} activeTrade={evaluation} suggestedPackages={suggestedPkgs.length > 0 ? suggestedPkgs : null} partner={partner} collapsed={chatCollapsed} onToggle={() => setChatCollapsed((c) => !c)} injectedMessage={chatInjection} />
    </div>
  );
}
