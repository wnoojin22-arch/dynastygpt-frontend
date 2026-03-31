"use client";

/**
 * TRADE BUILDER — ported pixel-for-pixel from Shadynasty's TradeBuilderView.tsx
 * Three-state adaptive workspace:
 *   State 1: No partner — exploration (sell player, find position)
 *   State 2: Partner selected — two rosters + suggest
 *   State 3: Tray populated — build & analyze
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoster, getLeagueIntel, getOwners, getPicks } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor } from "../tokens";
import RosterColumn from "./RosterColumn";
import TradeTray from "./TradeTray";
import AnalysisModal from "./AnalysisModal";
import ChatPanel from "./ChatPanel";
import PlayerName from "../PlayerName";
import type { RosterPlayer, TradeEvaluation, SuggestedPackage, NegotiationInsight } from "./types";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";

const API = "";
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
        <div style={{ textAlign: "right", flexShrink: 0 }}><span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: accColor }}>{pkg.acceptance_likelihood}</span>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>acceptance</div></div>
      </div>

      {/* Narrative — the AI's league-first explanation */}
      {pkg.narrative && (
        <div style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.55, color: C.secondary, padding: "10px 12px", background: C.elevated, borderRadius: 6, borderLeft: `3px solid ${C.gold}50`, marginBottom: 10 }}>
          {pkg.narrative}
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

      <button onClick={onBuild} style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: DISPLAY, fontSize: 13, letterSpacing: "0.08em", background: `linear-gradient(135deg,${C.goldDark},${C.gold})`, color: "#000", transition: "opacity 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>BUILD THIS TRADE</button>
    </div>
  );
}

function ResultsPanel({ packages, loading, query, onBuild, onBack }: { packages: SuggestedPackage[]; loading: boolean; query: string; onBuild: (pkg: SuggestedPackage) => void; onBack: () => void }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.primary }}>SUGGESTED TRADES</span>
          {query && <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2 }}>{query}</div>}</div>
        <button onClick={onBack} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.white08; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>BACK</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontFamily: MONO, fontSize: 13, color: C.gold, animation: "pulse-gold 1.5s ease infinite" }}>Generating packages...</div></div>
          : packages.length === 0 ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontFamily: SANS, fontSize: 14, color: C.dim }}>No viable trades found at this aggression level.</div><div style={{ fontFamily: MONO, fontSize: 12, color: C.gold, marginTop: 8 }}>Try AGGRESSIVE mode for more options.</div></div>
          : packages.map((p, i) => <PackageCard key={i} pkg={p} onBuild={() => onBuild(p)} />)}
      </div>
    </div>
  );
}

// ChatPanel imported from ./ChatPanel.tsx (full Shadynasty port with streaming, auto-injection)

/* ═══════════════════════════════════════════════════════════════
   MAIN VIEW — Three-state adaptive workspace (Shadynasty exact port)
   ═══════════════════════════════════════════════════════════════ */
export default function TradeBuilderView({ leagueId, owner, ownerId }: { leagueId: string; owner: string; ownerId?: string | null }) {
  const [partner, setPartner] = useState("");
  const [myWindow, setMyWindow] = useState<string | null>(null);
  const [theirWindow, setTheirWindow] = useState<string | null>(null);
  const [mode, setMode] = useState("balanced");
  const [giveNames, setGiveNames] = useState<string[]>([]);
  const [receiveNames, setReceiveNames] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<TradeEvaluation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedPkgs, setSuggestedPkgs] = useState<SuggestedPackage[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [activeSellAsset, setActiveSellAsset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatInjection, setChatInjection] = useState<string | null>(null);
  const buildingRef = useRef(false);

  // Data
  const { data: ownersData } = useQuery({ queryKey: ["owners", leagueId], queryFn: () => getOwners(leagueId), enabled: !!leagueId, staleTime: 600000 });
  const { data: ownerRoster } = useQuery({ queryKey: ["roster", leagueId, owner], queryFn: () => getRoster(leagueId, owner, ownerId), enabled: !!owner });
  const { data: partnerRoster } = useQuery({ queryKey: ["roster", leagueId, partner], queryFn: () => getRoster(leagueId, partner), enabled: !!partner });
  const { data: ownerPicks } = useQuery({ queryKey: ["picks", leagueId, owner], queryFn: () => getPicks(leagueId, owner, ownerId), enabled: !!owner, staleTime: 300000 });
  const { data: partnerPicks } = useQuery({ queryKey: ["picks", leagueId, partner], queryFn: () => getPicks(leagueId, partner), enabled: !!partner, staleTime: 300000 });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", leagueId], queryFn: () => getLeagueIntel(leagueId), enabled: !!leagueId, staleTime: 600000 });

  const buildRoster = (data: unknown, picksData?: unknown): RosterPlayer[] => {
    const all: RosterPlayer[] = [];
    if (data) {
      const d = data as Record<string, unknown>;
      const bp = d.by_position as Record<string, Array<Record<string, unknown>>> | undefined;
      if (bp) {
        for (const pos of ["QB", "RB", "WR", "TE"] as const) {
          for (const p of (bp[pos] || [])) {
            all.push({ name: String(p.name || ""), name_clean: String(p.name_clean || ""), position: pos, sha_value: Number(p.sha_value || 0), sha_pos_rank: String(p.sha_pos_rank || ""), age: p.age ? Number(p.age) : null });
          }
        }
      }
    }
    // Merge picks as PICK-position roster entries
    if (picksData) {
      const pd = picksData as Record<string, unknown>;
      const picks = (pd.picks || []) as Array<Record<string, unknown>>;
      for (const pk of picks) {
        const label = `${pk.season} Rd ${pk.round}${pk.is_own_pick ? "" : ` (${pk.original_owner})`}`;
        all.push({ name: label, name_clean: String(pk.season) + "_" + String(pk.round), position: "PICK", sha_value: Number(pk.sha_value || 0), sha_pos_rank: "", age: null });
      }
    }
    return all;
  };

  const myRoster = useMemo(() => buildRoster(ownerRoster, ownerPicks), [ownerRoster, ownerPicks]);
  const theirRoster = useMemo(() => buildRoster(partnerRoster, partnerPicks), [partnerRoster, partnerPicks]);
  const otherOwners = useMemo(() => (ownersData?.owners || []).filter((o: { name: string }) => o.name.toLowerCase() !== owner.toLowerCase()), [ownersData, owner]);
  const myIntel = useMemo(() => leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === owner.toLowerCase()), [leagueIntel, owner]);
  const theirIntel = useMemo(() => leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === partner.toLowerCase()), [leagueIntel, partner]);
  const myGrades = useMemo(() => (myIntel?.positional_grades || {}) as Record<string, string>, [myIntel]);
  const theirGrades = useMemo(() => (theirIntel?.positional_grades || {}) as Record<string, string>, [theirIntel]);
  const computedOW = toDisplay(String(myIntel?.window || "BALANCED"));
  const computedPW = toDisplay(String(theirIntel?.window || "BALANCED"));

  // Clear on partner change (unless building from package)
  useEffect(() => {
    if (buildingRef.current) { buildingRef.current = false; return; }
    setGiveNames([]); setReceiveNames([]); setEvaluation(null); setShowModal(false); setSuggestedPkgs([]); setSuggestQuery(""); setError(null);
  }, [partner]);

  // Toggle
  const toggleGive = useCallback((n: string) => { setGiveNames((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]); setEvaluation(null); setShowModal(false); setSuggestedPkgs([]); }, []);
  const toggleReceive = useCallback((n: string) => { setReceiveNames((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]); setEvaluation(null); setShowModal(false); }, []);

  // Analyze
  const handleAnalyze = useCallback(async () => {
    if (!partner || !giveNames.length || !receiveNames.length) return;
    setAnalyzing(true); setError(null);
    try {
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/evaluate`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, partner, i_give: giveNames, i_receive: receiveNames, mode, window_override: myWindow ? toBackend(myWindow) : null, partner_window_override: theirWindow ? toBackend(theirWindow) : null, user_id: ownerId || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); } else {
        const ev = data as TradeEvaluation;
        setEvaluation(ev); setShowModal(true);
        // Auto-inject analysis summary into chat
        const g = ev.owner_grade;
        const acc = ev.acceptance?.acceptance_likelihood;
        if (g) {
          const injection = `${giveNames.join(", ")} to ${partner} for ${receiveNames.join(", ")}\nGrade: ${g.grade} (${g.score}) — ${g.verdict}${acc ? `. ${acc}% acceptance likelihood` : ""}${g.reasons?.[0] ? `\n${g.reasons[0]}` : ""}\n${Date.now()}`;
          setChatInjection(injection);
        }
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); } finally { setAnalyzing(false); }
  }, [owner, partner, giveNames, receiveNames, mode, myWindow, theirWindow, leagueId, ownerId]);

  // Suggest — calls the V2 trade engine with intent-mode detection
  const fireSuggest = useCallback(async (body: Record<string, unknown>, query: string) => {
    setSuggestLoading(true); setSuggestedPkgs([]); setSuggestQuery(query); setError(null);
    try {
      // Separate sell-side asset from acquire-side target
      const sellAsset = (body.sell_asset as string) || undefined;
      const targetAsset = (body.i_receive as string[])?.[0] || undefined;
      const findPosition = (body.find_position as string) || undefined;

      const res = await fetch(`${API}/api/league/${leagueId}/v2/trade-engine/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          asset: sellAsset || undefined,
          target_asset: targetAsset || undefined,
          mode,
          partner: (body.partner as string) || undefined,
          find_position: findPosition || undefined,
          user_id: ownerId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.detail || "Failed"); setSuggestLoading(false); return; }

      // Map V2 response to SuggestedPackage format
      const packages: SuggestedPackage[] = (data.packages || []).map((p: Record<string, unknown>) => {
        const give = (p.give || []) as Array<Record<string, unknown>>;
        const receive = (p.receive || []) as Array<Record<string, unknown>>;
        const balance = (p.sha_balance || {}) as Record<string, unknown>;
        const confidence = (p.confidence as number) || 0;
        return {
          partner: p.partner as string,
          i_give: give,
          i_receive: receive,
          i_give_names: give.map((a) => a.name as string),
          i_receive_names: receive.map((a) => a.name as string),
          sha_balance: balance,
          acceptance_likelihood: confidence,
          owner_trade_grade: { grade: confidence >= 70 ? "A" : confidence >= 50 ? "B" : confidence >= 30 ? "C" : "D", score: confidence, verdict: "" },
          negotiation_insights: [],
          combined_score: confidence,
          pitch: (p.rationale as string) || "",
          narrative: (p.rationale as string) || "",
          tier: "",
          market_comparison: "",
        } as unknown as SuggestedPackage;
      });
      setSuggestedPkgs(packages);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSuggestLoading(false); }
  }, [owner, mode, leagueId, ownerId]);

  const handleSellAsset = useCallback((name: string) => { setActiveSellAsset(name); fireSuggest({ sell_asset: name }, `Selling ${name}`); }, [fireSuggest]);
  const handleFindPosition = useCallback((pos: string) => {
    // Works with OR without a player selected
    fireSuggest(
      { sell_asset: activeSellAsset || undefined, find_position: pos, partner: partner || undefined },
      activeSellAsset ? `Trading ${activeSellAsset} for a ${pos}` : `Finding ${pos} upgrades`,
    );
  }, [fireSuggest, partner, activeSellAsset]);
  const handleSuggestWithPartner = useCallback(() => {
    // Works with OR without a player selected — backend auto-picks if needed
    fireSuggest(
      { sell_asset: activeSellAsset || undefined, partner: partner || undefined },
      activeSellAsset
        ? (partner ? `Best trades with ${partner} for ${activeSellAsset}` : `Exploring trades for ${activeSellAsset}`)
        : (partner ? `Best trades with ${partner}` : `Best available trades`),
    );
  }, [fireSuggest, partner, activeSellAsset]);
  const handleTargetPlayer = useCallback((name: string) => { if (!partner) return; setActiveSellAsset(null); fireSuggest({ i_receive: [name], partner }, `Targeting ${name} from ${partner}`); }, [fireSuggest, partner]);
  const buildPackage = useCallback((pkg: SuggestedPackage) => {
    if (!partner && pkg.partner) { buildingRef.current = true; setPartner(pkg.partner); }
    setGiveNames(pkg.i_give_names || []); setReceiveNames(pkg.i_receive_names || []); setSuggestedPkgs([]); setSuggestQuery("");
  }, [partner]);
  const handleClear = useCallback(() => { setSuggestedPkgs([]); setSuggestQuery(""); setGiveNames([]); setReceiveNames([]); setEvaluation(null); setShowModal(false); setActiveSellAsset(null); setError(null); }, []);

  // Consume cross-page intent (from Dashboard "Your Move" cards)
  const intentConsumed = useRef(false);
  useEffect(() => {
    if (intentConsumed.current) return;
    const intent = useTradeBuilderStore.getState().consumeIntent();
    if (!intent) return;
    intentConsumed.current = true;
    if (intent.type === "sell") {
      handleSellAsset(intent.value);
    } else if (intent.type === "buy") {
      fireSuggest({ i_receive: [intent.value] }, `Targeting ${intent.value}`);
    } else if (intent.type === "position") {
      fireSuggest({ find_position: intent.value }, `Finding ${intent.value} upgrades`);
    }
  }, [handleSellAsset, fireSuggest]);

  const hasTray = giveNames.length > 0 || receiveNames.length > 0;
  const showResults = suggestedPkgs.length > 0 || suggestLoading;

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
            <select value={partner} onChange={(e) => { setPartner(e.target.value); setSuggestedPkgs([]); setSuggestQuery(""); }}
              style={{ width: "100%", padding: "9px 14px", borderRadius: 6, background: C.card, border: `1px solid ${partner ? C.gold : C.border}`, color: partner ? C.primary : C.dim, fontFamily: SANS, fontSize: 15, cursor: "pointer", outline: "none" }}>
              <option value="">Select trade partner...</option>
              {otherOwners.map((o: { name: string }) => <option key={o.name} value={o.name}>{o.name}</option>)}
            </select>
            {partner && <button onClick={() => { setPartner(""); handleClear(); }} style={{ position: "absolute", right: 10, top: 8, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>}
          </div>
          {activeSellAsset && <span style={{ fontFamily: MONO, fontSize: 12, color: C.orange, padding: "2px 8px", borderRadius: 3, background: `${C.orange}15`, border: `1px solid ${C.orange}30` }}>Selling: {activeSellAsset}</span>}
        </div>

        {/* ROW 2: Command bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.panel }}>
          <div style={{ display: "flex", gap: 6 }}>
            {POSITIONS.map((pos) => (
              <button key={pos} onClick={() => handleFindPosition(pos)}
                style={{ fontFamily: DISPLAY, fontSize: 13, letterSpacing: "0.05em", padding: "8px 16px", borderRadius: 6, border: `1px solid ${posColor(pos)}40`, background: `${posColor(pos)}10`, color: posColor(pos), cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${posColor(pos)}25`; e.currentTarget.style.borderColor = posColor(pos); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${posColor(pos)}10`; e.currentTarget.style.borderColor = `${posColor(pos)}40`; }}>
                FIND {pos}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={handleSuggestWithPartner}
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
          <ModeToggle value={mode} onChange={setMode} />
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
            onToggle={partner || hasTray ? toggleGive : handleSellAsset} side="give" posGrades={myGrades}
            windowToggle={<WindowToggle label="MY MODE" value={myWindow} computed={computedOW} onChange={setMyWindow} />} />

          {/* CENTER: Tray or empty */}
          {partner && (hasTray || !showResults) && (
            <TradeTray giveNames={giveNames} receiveNames={receiveNames} giveRoster={myRoster} receiveRoster={theirRoster}
              evaluation={evaluation} analyzing={analyzing}
              onRemoveGive={(n) => { setGiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onRemoveReceive={(n) => { setReceiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onAnalyze={handleAnalyze} onClear={() => { setGiveNames([]); setReceiveNames([]); setEvaluation(null); }} />
          )}

          {/* RIGHT: Partner roster or Results or Explore */}
          {partner ? (
            <RosterColumn title={partner} roster={theirRoster} selectedNames={receiveNames}
              onToggle={hasTray ? toggleReceive : handleTargetPlayer} side="receive" posGrades={theirGrades}
              windowToggle={<WindowToggle label="THEIR LENS" value={theirWindow} computed={computedPW} onChange={setTheirWindow} />} />
          ) : showResults ? (
            <ResultsPanel packages={suggestedPkgs} loading={suggestLoading} query={suggestQuery} onBuild={buildPackage} onBack={() => { setSuggestedPkgs([]); setSuggestQuery(""); }} />
          ) : (
            <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ textAlign: "center", maxWidth: 280 }}>
                <div style={{ fontFamily: SERIF, fontSize: 20, fontStyle: "italic", color: C.goldBright, marginBottom: 8 }}>Explore Trades</div>
                <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim, lineHeight: 1.5 }}>Click a player on your roster to explore trade options, use the FIND buttons above, or select a trade partner.</div>
              </div>
            </div>
          )}

          {/* Floating results when partner selected but no tray */}
          {showResults && partner && !hasTray && (
            <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={(ev) => { if (ev.target === ev.currentTarget) { setSuggestedPkgs([]); setSuggestQuery(""); } }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
                onClick={() => { setSuggestedPkgs([]); setSuggestQuery(""); }} />
              <div style={{ position: "relative", width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", background: C.panel, border: `1px solid ${C.gold}30`, borderRadius: 12, animation: "fadeUp 0.3s ease", margin: "0 20px" }}>
                <ResultsPanel packages={suggestedPkgs} loading={suggestLoading} query={suggestQuery} onBuild={buildPackage} onBack={() => { setSuggestedPkgs([]); setSuggestQuery(""); }} />
              </div>
            </div>
          )}
        </div>

        {showModal && evaluation && <AnalysisModal evaluation={evaluation} owner={owner} partner={partner} onClose={() => setShowModal(false)} />}
      </div>

      {/* ── CHAT PANEL ── */}
      <ChatPanel leagueId={leagueId} owner={owner} activeTrade={evaluation} suggestedPackages={suggestedPkgs.length > 0 ? suggestedPkgs : null} partner={partner} collapsed={chatCollapsed} onToggle={() => setChatCollapsed((c) => !c)} injectedMessage={chatInjection} />
    </div>
  );
}
