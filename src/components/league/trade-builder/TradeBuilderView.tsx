"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoster, getLeagueIntel, getOwners } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor } from "../tokens";
import RosterColumn from "./RosterColumn";
import TradeTray from "./TradeTray";
import AnalysisModal from "./AnalysisModal";
import type { RosterPlayer, TradeEvaluation, SuggestedPackage } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
const WINDOWS = ["REBUILDER", "BALANCED", "WIN-NOW"] as const;
const MODES = ["conservative", "balanced", "aggressive"] as const;
const MODE_COLORS: Record<string, string> = { conservative: C.green, balanced: C.gold, aggressive: C.red };

/* ═══════════════════════════════════════════════════════════════
   WINDOW TOGGLE — Rebuilder / Balanced / Win-Now
   ═══════════════════════════════════════════════════════════════ */
function WindowToggle({ label, value, computed, onChange }: {
  label: string; value: string | null; computed: string; onChange: (v: string | null) => void;
}) {
  const active = value || computed;
  return (
    <div>
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.10em" }}>{label}</span>
      <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginTop: 3 }}>
        {WINDOWS.map((w) => {
          const isA = active === w;
          const isDef = !value && w === computed;
          return (
            <button key={w} onClick={() => onChange(w === computed ? null : w)} style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "3px 7px",
              border: "none", cursor: "pointer", position: "relative",
              background: isA ? `${C.gold}20` : "transparent",
              color: isA ? C.gold : C.dim,
              borderRight: w !== "WIN-NOW" ? `1px solid ${C.border}` : "none",
              transition: "all 0.15s",
            }}>
              {w}
              {isDef && <span style={{ position: "absolute", top: 0, right: 2, fontSize: 7, color: C.goldDark }}>*</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODE TOGGLE — Conservative / Balanced / Aggressive
   ═══════════════════════════════════════════════════════════════ */
function ModeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.10em" }}>TRADE STYLE</span>
      <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginTop: 3 }}>
        {MODES.map((m) => {
          const isA = value === m;
          const mc = MODE_COLORS[m];
          return (
            <button key={m} onClick={() => onChange(m)} style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "3px 7px",
              border: "none", cursor: "pointer", textTransform: "uppercase",
              background: isA ? `${mc}20` : "transparent",
              color: isA ? mc : C.dim,
              borderRight: m !== "aggressive" ? `1px solid ${C.border}` : "none",
              transition: "all 0.15s",
            }}>{m}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PACKAGE CARD — suggested trade result
   ═══════════════════════════════════════════════════════════════ */
function PackageCard({ pkg, onBuild }: { pkg: SuggestedPackage; onBuild: () => void }) {
  const g = pkg.owner_trade_grade || { grade: "?", score: 0, verdict: "?" };
  const gc = g.grade?.startsWith("A") ? C.green : g.grade?.startsWith("B") ? C.blue : g.grade?.startsWith("C") ? C.gold : C.red;
  const ac = (pkg.acceptance_likelihood || 0) >= 60 ? C.green : (pkg.acceptance_likelihood || 0) >= 40 ? C.gold : C.red;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8, transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldBorder; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${gc}18`, border: `2px solid ${gc}` }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 14, color: gc }}>{g.grade}</span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary }}>{pkg.partner}</span>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{g.verdict} · {pkg.combined_score} combined</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: ac }}>{pkg.acceptance_likelihood}</span>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>acceptance</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, fontFamily: SANS }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, fontWeight: 700 }}>SEND</span>
          {(pkg.i_give_names || []).map((n, i) => <div key={i} style={{ color: C.secondary, marginTop: 2 }}>{n}</div>)}
        </div>
        <div style={{ color: C.dim, alignSelf: "center", fontSize: 14 }}>→</div>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.green, fontWeight: 700 }}>GET</span>
          {(pkg.i_receive_names || []).map((n, i) => <div key={i} style={{ color: C.secondary, marginTop: 2 }}>{n}</div>)}
        </div>
      </div>
      <button onClick={onBuild} style={{
        width: "100%", padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
        fontFamily: DISPLAY, fontSize: 12, letterSpacing: "0.08em",
        background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, color: "#000",
      }}>BUILD THIS TRADE</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT PANEL — AI Trade Advisor (right side)
   ═══════════════════════════════════════════════════════════════ */
function ChatPanel({ leagueId, owner, partner, collapsed, onToggle }: {
  leagueId: string; owner: string; partner: string; collapsed: boolean; onToggle: () => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = partner
    ? ["Who should I target?", "Best trade I can make?", "What does my partner need?", "How to improve this deal?"]
    : ["Who should I trade with?", "Best trade I can make?", "Who overpays for picks?", "Positions to target?"];

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, message: text, conversation_history: newMessages.slice(-10) }),
      });

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const p = JSON.parse(data);
            if (p.text) {
              fullText += p.text;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: fullText };
                return copy;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Try again." }]);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, leagueId, owner]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (collapsed) {
    return (
      <div onClick={onToggle} style={{
        width: 40, flexShrink: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        background: C.panel, borderLeft: `1px solid ${C.border}`, cursor: "pointer",
      }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, writingMode: "vertical-rl", letterSpacing: "0.1em" }}>AI</span>
        {messages.length > 0 && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />}
      </div>
    );
  }

  return (
    <div style={{
      width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
      background: C.panel, borderLeft: `1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>🧠</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, flex: 1 }}>TRADE ADVISOR</span>
        <button onClick={() => setMessages([])} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontFamily: MONO, fontSize: 9 }}>CLEAR</button>
        <button onClick={onToggle} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14 }}>›</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim, textAlign: "center", padding: "16px 0" }}>
              Ask about trades, player values, or strategy.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {quickPrompts.map((q) => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: "6px 10px", borderRadius: 6,
                  border: `1px solid ${C.goldBorder}`, background: C.goldGlow,
                  color: C.gold, fontFamily: SANS, fontSize: 11, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.goldDim; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.goldGlow; }}>
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%", padding: "8px 12px", borderRadius: 8,
            background: m.role === "user" ? C.goldDim : C.card,
            border: `1px solid ${m.role === "user" ? C.goldBorder : C.border}`,
          }}>
            <span style={{ fontFamily: SANS, fontSize: 12, color: m.role === "user" ? C.gold : C.secondary, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {m.content}
              {streaming && i === messages.length - 1 && <span style={{ color: C.gold, animation: "pulse-gold 1s ease infinite" }}>●</span>}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
        <input
          type="text" value={input} placeholder="Ask about trades..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
          disabled={streaming}
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 6,
            border: `1px solid ${C.borderLt}`, background: C.elevated,
            color: C.primary, fontSize: 12, fontFamily: SANS, outline: "none",
          }}
        />
        <button onClick={() => sendMessage(input)} disabled={streaming || !input.trim()} style={{
          padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
          background: C.gold, color: C.bg, fontFamily: MONO, fontSize: 10, fontWeight: 800,
          opacity: streaming || !input.trim() ? 0.4 : 1,
        }}>SEND</button>
      </div>

      <style>{`@keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE BUILDER VIEW — Full 3-column + chat panel
   ═══════════════════════════════════════════════════════════════ */
export default function TradeBuilderView({ leagueId, owner }: {
  leagueId: string; owner: string;
}) {
  // Core state
  const [partner, setPartner] = useState("");
  const [giveNames, setGiveNames] = useState<string[]>([]);
  const [receiveNames, setReceiveNames] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<TradeEvaluation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // Mode state
  const [myWindow, setMyWindow] = useState<string | null>(null);
  const [theirWindow, setTheirWindow] = useState<string | null>(null);
  const [mode, setMode] = useState("balanced");
  // Suggestion state
  const [suggestedPkgs, setSuggestedPkgs] = useState<SuggestedPackage[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [activeSellAsset, setActiveSellAsset] = useState<string | null>(null);
  // Chat
  const [chatCollapsed, setChatCollapsed] = useState(true);

  // Data
  const { data: ownersData } = useQuery({ queryKey: ["owners", leagueId], queryFn: () => getOwners(leagueId), enabled: !!leagueId, staleTime: 600000 });
  const { data: ownerRoster } = useQuery({ queryKey: ["roster", leagueId, owner], queryFn: () => getRoster(leagueId, owner), enabled: !!owner });
  const { data: partnerRoster } = useQuery({ queryKey: ["roster", leagueId, partner], queryFn: () => getRoster(leagueId, partner), enabled: !!partner });
  const { data: leagueIntel } = useQuery({ queryKey: ["league-intel", leagueId], queryFn: () => getLeagueIntel(leagueId), enabled: !!leagueId, staleTime: 600000 });

  const buildRoster = (data: any): RosterPlayer[] => {
    if (!data) return [];
    const all: RosterPlayer[] = [];
    for (const pos of ["QB", "RB", "WR", "TE"] as const) {
      for (const p of (data.by_position?.[pos] || [])) {
        all.push({ name: p.name, name_clean: p.name_clean, position: pos, sha_value: p.sha_value || 0, sha_pos_rank: p.sha_pos_rank || "", age: p.age || null });
      }
    }
    return all;
  };

  const myRoster = useMemo(() => buildRoster(ownerRoster), [ownerRoster]);
  const theirRoster = useMemo(() => buildRoster(partnerRoster), [partnerRoster]);
  const otherOwners = useMemo(() => (ownersData?.owners || []).filter((o: { name: string }) => o.name.toLowerCase() !== owner.toLowerCase()), [ownersData, owner]);

  const myIntel = useMemo(() => leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === owner.toLowerCase()), [leagueIntel, owner]);
  const theirIntel = useMemo(() => leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === partner.toLowerCase()), [leagueIntel, partner]);

  const myGrades = useMemo(() => (myIntel?.positional_grades || {}) as Record<string, string>, [myIntel]);
  const theirGrades = useMemo(() => (theirIntel?.positional_grades || {}) as Record<string, string>, [theirIntel]);
  const myComputedWindow = myIntel?.window || "BALANCED";
  const theirComputedWindow = theirIntel?.window || "BALANCED";

  // Clear on partner change
  useEffect(() => { setGiveNames([]); setReceiveNames([]); setEvaluation(null); setSuggestedPkgs([]); setActiveSellAsset(null); }, [partner]);

  // Suggestion fire
  const fireSuggest = useCallback(async (entryType: string, extra: Record<string, string> = {}) => {
    setSuggestLoading(true);
    setSuggestedPkgs([]);
    const queryDesc = entryType === "find_position" ? `Find ${extra.target_position || "?"}` : entryType === "sell_asset" ? `Sell ${extra.sell_asset || "?"}` : entryType === "sell_and_need" ? `Sell ${extra.sell_asset || "?"} → Get ${extra.need_position || "?"}` : "Suggest Trades";
    setSuggestQuery(queryDesc);
    try {
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, partner: partner || undefined, mode, entry_type: entryType, ...extra }),
      });
      const data = await res.json();
      setSuggestedPkgs(data.suggested_packages || []);
    } catch { setSuggestedPkgs([]); }
    finally { setSuggestLoading(false); }
  }, [leagueId, owner, partner, mode]);

  // Player click handlers
  const handleSellAsset = useCallback((name: string) => {
    setActiveSellAsset(name);
    fireSuggest("sell_asset", { sell_asset: name });
  }, [fireSuggest]);

  const handleFindPosition = useCallback((pos: string) => {
    if (activeSellAsset) {
      fireSuggest("sell_and_need", { sell_asset: activeSellAsset, need_position: pos });
    } else {
      fireSuggest("find_position", { target_position: pos });
    }
  }, [fireSuggest, activeSellAsset]);

  const handleTargetPlayer = useCallback((name: string) => {
    fireSuggest("target_player", { target_asset: name, partner });
  }, [fireSuggest, partner]);

  const handleSuggestWithPartner = useCallback(() => {
    fireSuggest("suggest_with_partner");
  }, [fireSuggest]);

  const toggleGive = useCallback((name: string) => { setGiveNames((p) => p.includes(name) ? p.filter((n) => n !== name) : [...p, name]); setEvaluation(null); }, []);
  const toggleReceive = useCallback((name: string) => { setReceiveNames((p) => p.includes(name) ? p.filter((n) => n !== name) : [...p, name]); setEvaluation(null); }, []);

  const handleAnalyze = useCallback(async () => {
    if (!giveNames.length || !receiveNames.length) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ i_give: giveNames, i_receive: receiveNames, owner, partner: partner || undefined, mode }),
      });
      setEvaluation(await res.json());
      setShowModal(true);
    } catch { }
    finally { setAnalyzing(false); }
  }, [giveNames, receiveNames, owner, partner, leagueId, mode]);

  const handleClear = useCallback(() => { setGiveNames([]); setReceiveNames([]); setEvaluation(null); setActiveSellAsset(null); setSuggestedPkgs([]); }, []);

  const buildPackage = useCallback((pkg: SuggestedPackage) => {
    if (pkg.partner && !partner) setPartner(pkg.partner);
    setGiveNames(pkg.i_give_names || []);
    setReceiveNames(pkg.i_receive_names || []);
    setSuggestedPkgs([]);
  }, [partner]);

  const hasTray = giveNames.length > 0 || receiveNames.length > 0;
  const showResults = suggestedPkgs.length > 0 || suggestLoading;

  if (!owner) return <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Select an owner to use the Trade Builder.</div>;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── WORKSPACE (everything except chat) ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* ROW 1: Partner + headline */}
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold }}>TRADE BUILDER</span>
          <div style={{ width: 1, height: 18, background: C.border }} />
          <select value={partner} onChange={(e) => setPartner(e.target.value)} style={{
            padding: "4px 8px", borderRadius: 4, border: `1px solid ${partner ? C.goldBorder : C.border}`,
            background: partner ? C.goldDim : C.card, color: C.primary, fontSize: 11, fontFamily: SANS, fontWeight: 600, cursor: "pointer", outline: "none",
          }}>
            <option value="" style={{ background: C.card }}>Select Partner</option>
            {otherOwners.map((o: { name: string }) => <option key={o.name} value={o.name} style={{ background: C.card }}>{o.name}</option>)}
          </select>
          {activeSellAsset && <span style={{ fontFamily: MONO, fontSize: 10, color: C.orange, padding: "2px 8px", borderRadius: 3, background: `${C.orange}15` }}>Selling: {activeSellAsset}</span>}
        </div>

        {/* ROW 2: Command bar */}
        <div style={{ padding: "6px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => handleFindPosition(pos)} style={{
              padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: C.elevated, color: posColor(pos), fontFamily: MONO, fontSize: 10,
              fontWeight: 800, cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = posColor(pos); }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}>
              FIND {pos}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: C.border }} />
          {partner && (
            <button onClick={handleSuggestWithPartner} style={{
              padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.goldBorder}`,
              background: C.goldGlow, color: C.gold, fontFamily: MONO, fontSize: 10,
              fontWeight: 800, cursor: "pointer",
            }}>SUGGEST TRADES</button>
          )}
          {(hasTray || activeSellAsset) && (
            <button onClick={handleClear} style={{
              padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: "transparent", color: C.dim, fontFamily: MONO, fontSize: 10, cursor: "pointer",
            }}>CLEAR</button>
          )}
          <div style={{ flex: 1 }} />
          <ModeToggle value={mode} onChange={setMode} />
        </div>

        {/* MAIN AREA */}
        <div style={{ flex: 1, display: "flex", gap: 6, padding: 6, overflow: "hidden", minHeight: 0 }}>
          {/* LEFT: Your Roster */}
          <RosterColumn
            title={owner.toUpperCase()}
            roster={myRoster}
            selectedNames={giveNames}
            onToggle={hasTray || partner ? toggleGive : handleSellAsset}
            side="give"
            posGrades={myGrades}
            windowToggle={<WindowToggle label="MY MODE" value={myWindow} computed={myComputedWindow} onChange={setMyWindow} />}
          />

          {/* CENTER: Tray or Results or Explore */}
          {hasTray && partner ? (
            <TradeTray
              giveNames={giveNames} receiveNames={receiveNames}
              giveRoster={myRoster} receiveRoster={theirRoster}
              evaluation={evaluation} analyzing={analyzing}
              onRemoveGive={(n) => { setGiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onRemoveReceive={(n) => { setReceiveNames((p) => p.filter((x) => x !== n)); setEvaluation(null); }}
              onAnalyze={handleAnalyze} onClear={handleClear}
            />
          ) : showResults ? (
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontFamily: DISPLAY, fontSize: 13, color: C.primary }}>SUGGESTED TRADES</span>
                  {suggestQuery && <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>{suggestQuery}</div>}
                </div>
                <button onClick={() => { setSuggestedPkgs([]); setActiveSellAsset(null); }} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer" }}>BACK</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                {suggestLoading ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>Generating packages...</span>
                  </div>
                ) : suggestedPkgs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>No viable trades found.</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, marginTop: 6 }}>Try AGGRESSIVE mode.</div>
                  </div>
                ) : suggestedPkgs.map((p, i) => <PackageCard key={i} pkg={p} onBuild={() => buildPackage(p)} />)}
              </div>
            </div>
          ) : !partner ? (
            <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <div style={{ textAlign: "center", maxWidth: 300 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.gold, marginBottom: 8 }}>Explore Trades</div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                  Click a player on your roster to explore their trade value, or select a partner to start building.
                </div>
              </div>
            </div>
          ) : null}

          {/* RIGHT: Partner Roster */}
          {partner && (
            <RosterColumn
              title={partner.toUpperCase()}
              roster={theirRoster}
              selectedNames={receiveNames}
              onToggle={hasTray ? toggleReceive : handleTargetPlayer}
              side="receive"
              posGrades={theirGrades}
              windowToggle={<WindowToggle label="THEIR LENS" value={theirWindow} computed={theirComputedWindow} onChange={setTheirWindow} />}
            />
          )}
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      <ChatPanel leagueId={leagueId} owner={owner} partner={partner} collapsed={chatCollapsed} onToggle={() => setChatCollapsed(!chatCollapsed)} />

      {/* ── ANALYSIS MODAL ── */}
      {showModal && evaluation && (
        <AnalysisModal evaluation={evaluation} owner={owner} partner={partner} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
