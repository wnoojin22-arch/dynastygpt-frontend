"use client";

/**
 * TAP-TO-BUILD — full mobile trade customization screen.
 * Arrives pre-loaded from a swipe suggestion or empty from partner select.
 * Feels like a live negotiation — balance, acceptance, and chips animate in real-time.
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getRoster, getPicks } from "@/lib/api";
import { useAcceptancePreview } from "@/hooks/useTradeBuilder";
import type { SuggestedPackage, RosterPlayer } from "./types";

/* ── helpers ── */
function posColor(pos: string) {
  if (pos === "QB") return "#e47272";
  if (pos === "RB") return "#6bb8e0";
  if (pos === "WR") return "#7dd3a0";
  if (pos === "TE") return "#e09c6b";
  if (pos === "PICK") return "#d4a532";
  return "#9596a5";
}
function acceptColor(s: number) {
  if (s >= 70) return "#7dd3a0";
  if (s >= 50) return "#d4a532";
  if (s >= 30) return "#e09c6b";
  return "#e47272";
}
function windowColor(w: string | undefined) {
  if (!w) return { label: "BALANCED", color: "#d4a532" };
  const u = w.toUpperCase();
  if (u.includes("CONTEND") || u.includes("WIN")) return { label: "WIN-NOW", color: "#e47272" };
  if (u.includes("REBUILD")) return { label: "REBUILDER", color: "#6bb8e0" };
  return { label: "BALANCED", color: "#d4a532" };
}
function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildRoster(data: unknown, picksData?: unknown): RosterPlayer[] {
  const all: RosterPlayer[] = [];
  if (data) {
    const d = data as Record<string, unknown>;
    const bp = d.by_position as Record<string, Array<Record<string, unknown>>> | undefined;
    if (bp) {
      for (const pos of ["QB", "RB", "WR", "TE"] as const) {
        for (const p of bp[pos] || []) {
          all.push({
            name: String(p.name || ""),
            name_clean: String(p.name_clean || ""),
            position: pos,
            sha_value: Number(p.sha_value || 0),
            sha_pos_rank: String(p.sha_pos_rank || ""),
            age: p.age ? Number(p.age) : null,
          });
        }
      }
    }
  }
  if (picksData) {
    const pd = picksData as Record<string, unknown>;
    const picks = (pd.picks || []) as Array<Record<string, unknown>>;
    for (const pk of picks) {
      const slotStr = pk.slot_label ? String(pk.slot_label) : `R${pk.round}`;
      const label = `${pk.season} ${slotStr}`;
      all.push({
        name: label,
        name_clean: String(pk.season) + "_" + String(pk.round),
        position: "PICK",
        sha_value: Number(pk.sha_value || 0),
        sha_pos_rank: "",
        age: null,
      });
    }
  }
  return all;
}

const FILTERS = ["ALL", "QB", "RB", "WR", "TE", "PICK"] as const;

/* ── Animated chip (appears in SEND/GET rows) ── */
function TradeChip({ name, position, value, onRemove }: {
  name: string; position: string; value: number; onRemove: () => void;
}) {
  const pc = posColor(position);
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, x: -20 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md shrink-0"
      style={{ background: `${pc}0a`, border: `1px solid ${pc}20` }}
    >
      <span className="font-mono text-[8px] font-black px-1 rounded" style={{ color: pc, background: `${pc}18` }}>{position}</span>
      <span className="font-sans text-[11px] font-semibold text-[#eeeef2] whitespace-nowrap">{name}</span>
      <span className="font-mono text-[9px] font-bold text-[#d4a532]">{fmt(value)}</span>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-0.5 text-[#9596a560] active:text-[#e47272] transition-colors">
        <X size={10} />
      </button>
    </motion.div>
  );
}

/* ── Player row ── */
function PlayerRow({ player, isSelected, onToggle }: {
  player: RosterPlayer; isSelected: boolean; onToggle: () => void;
}) {
  const pc = posColor(player.position);
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-3 text-left transition-all active:bg-[#171b28]"
      style={{
        minHeight: 44, padding: "10px 12px",
        background: isSelected ? "#d4a53208" : "transparent",
        borderLeft: isSelected ? `3px solid #d4a532` : "3px solid transparent",
        borderBottom: "1px solid #ffffff08",
      }}
    >
      <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
        style={{ color: pc, background: `${pc}15` }}>{player.position}</span>
      <span className="font-sans text-[13px] font-medium text-[#eeeef2] flex-1 truncate">{player.name}</span>
      <span className="font-mono text-[11px] font-bold text-[#d4a532] shrink-0">
        {player.sha_value > 0 ? fmt(player.sha_value) : "—"}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */
export default function TapToBuild({
  pkg,
  leagueId,
  owner,
  ownerId,
  ownerRoster: ownerRosterProp,
  partnerWindow,
  mode,
  myWindow,
  theirWindow,
  onSave,
  onSuggest,
  onAnalyze,
  onBack,
}: {
  pkg: SuggestedPackage;
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  ownerRoster: RosterPlayer[];
  partnerWindow?: string;
  mode: string;
  myWindow: string | null;
  theirWindow: string | null;
  onSave: (giveNames: string[], receiveNames: string[], partnerName: string) => void;
  onSuggest?: () => void;
  onAnalyze?: () => void;
  onBack: () => void;
}) {
  const partnerName = pkg.partner || "";
  const win = windowColor(partnerWindow);

  const { data: partnerRosterData } = useQuery({
    queryKey: ["roster", leagueId, partnerName],
    queryFn: () => getRoster(leagueId, partnerName),
    enabled: !!partnerName,
    staleTime: 300000,
  });
  const { data: partnerPicksData } = useQuery({
    queryKey: ["picks", leagueId, partnerName],
    queryFn: () => getPicks(leagueId, partnerName),
    enabled: !!partnerName,
    staleTime: 300000,
  });

  const partnerRoster = useMemo(
    () => buildRoster(partnerRosterData, partnerPicksData),
    [partnerRosterData, partnerPicksData],
  );

  const [giveNames, setGiveNames] = useState<string[]>(
    () => (pkg.i_give_names || []).filter(Boolean),
  );
  const [receiveNames, setReceiveNames] = useState<string[]>(
    () => (pkg.i_receive_names || []).filter(Boolean),
  );
  const [activeTab, setActiveTab] = useState<"yours" | "theirs">("yours");
  const [posFilter, setPosFilter] = useState<string>("ALL");

  const giveSet = useMemo(() => new Set(giveNames.map((n) => n.toLowerCase())), [giveNames]);
  const receiveSet = useMemo(() => new Set(receiveNames.map((n) => n.toLowerCase())), [receiveNames]);

  const filteredRoster = useMemo(() => {
    const roster = activeTab === "yours" ? ownerRosterProp : partnerRoster;
    let list = roster.filter((p) => p.sha_value > 0 || p.position === "PICK");
    if (posFilter !== "ALL") list = list.filter((p) => p.position === posFilter);
    return list.sort((a, b) => b.sha_value - a.sha_value);
  }, [activeTab, ownerRosterProp, partnerRoster, posFilter]);

  const getVal = useCallback(
    (name: string, roster: RosterPlayer[]) => roster.find((r) => r.name.toLowerCase() === name.toLowerCase())?.sha_value || 0,
    [],
  );

  const giveTotal = useMemo(() => giveNames.reduce((s, n) => s + getVal(n, ownerRosterProp), 0), [giveNames, ownerRosterProp, getVal]);
  const recvTotal = useMemo(() => receiveNames.reduce((s, n) => s + getVal(n, partnerRoster), 0), [receiveNames, partnerRoster, getVal]);

  const maxBar = Math.max(giveTotal, recvTotal, 1);
  const gapPct = giveTotal > 0 ? ((recvTotal - giveTotal) / giveTotal) * 100 : 0;
  const barColor = recvTotal > giveTotal ? "#7dd3a0" : recvTotal < giveTotal ? "#e47272" : "#d4a532";

  const acceptanceP = useAcceptancePreview({
    leagueId,
    owner,
    ownerId,
    partner: partnerName,
    giveNames,
    receiveNames,
    mode,
    myWindow,
    theirWindow,
  });
  const acceptance = acceptanceP.value;
  const accClr = acceptance != null ? acceptColor(acceptance) : "#9596a580";

  const toggleAsset = useCallback((name: string) => {
    if (activeTab === "yours") {
      setGiveNames((p) => p.some((n) => n.toLowerCase() === name.toLowerCase())
        ? p.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...p, name]);
    } else {
      setReceiveNames((p) => p.some((n) => n.toLowerCase() === name.toLowerCase())
        ? p.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...p, name]);
    }
  }, [activeTab]);

  const canAnalyze = giveNames.length > 0 && receiveNames.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#06080d]">

      {/* ═══ FIXED TOP ═══ */}
      <div className="shrink-0 border-b border-[#1a1e30] bg-[#0a0d15]">

        {/* Partner header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="text-[#9596a5] active:text-[#eeeef2] transition-colors shrink-0 p-1 -ml-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div className="min-w-0">
              <h2 className="font-['Archivo_Black'] text-[17px] text-[#eeeef2] tracking-wide truncate leading-tight">{partnerName}</h2>
            </div>
            <span className="font-mono text-[8px] font-bold tracking-widest px-2 py-0.5 rounded shrink-0"
              style={{ color: win.color, background: `${win.color}12`, border: `1px solid ${win.color}25` }}>
              {win.label}
            </span>
          </div>
          {/* Acceptance */}
          <div className="text-right shrink-0 ml-2">
            <motion.span
              key={acceptance ?? "loading"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-xl font-black block leading-none"
              style={{ color: accClr }}
            >
              {acceptance != null ? `${acceptance}%` : "—%"}
            </motion.span>
            <span className="font-mono text-[7px] font-bold text-[#9596a580] tracking-wide">LIKELY TO ACCEPT</span>
          </div>
        </div>

        {/* SEND row */}
        <div className="px-4 pt-1 pb-0.5">
          <div className="flex items-start gap-2">
            <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532] mt-1.5 shrink-0 w-9">SEND</span>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex gap-1.5 pb-1">
                <AnimatePresence mode="popLayout">
                  {giveNames.length > 0 ? giveNames.map((name) => {
                    const p = ownerRosterProp.find((r) => r.name.toLowerCase() === name.toLowerCase());
                    return (
                      <TradeChip key={name} name={name} position={p?.position || "?"} value={p?.sha_value || 0}
                        onRemove={() => setGiveNames((prev) => prev.filter((n) => n.toLowerCase() !== name.toLowerCase()))} />
                    );
                  }) : (
                    <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="font-sans text-[11px] text-[#d4a53250] py-1">Tap your players below ↓</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Balance bar — single bar showing direction */}
        {(giveTotal > 0 || recvTotal > 0) && (
          <div className="px-4 py-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold text-[#e47272]">{fmt(giveTotal)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#171b28] overflow-hidden relative">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 rounded-full"
                  style={{ background: barColor }}
                  animate={{ width: `${(Math.max(giveTotal, recvTotal) / maxBar) * 100}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                />
              </div>
              <span className="font-mono text-[9px] font-bold text-[#7dd3a0]">{fmt(recvTotal)}</span>
              <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded"
                style={{ color: barColor, background: `${barColor}15` }}>
                {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* GET row */}
        <div className="px-4 pt-0.5 pb-2">
          <div className="flex items-start gap-2">
            <span className="font-mono text-[9px] font-black tracking-widest text-[#7dd3a0] mt-1.5 shrink-0 w-9">GET</span>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex gap-1.5 pb-1">
                <AnimatePresence mode="popLayout">
                  {receiveNames.length > 0 ? receiveNames.map((name) => {
                    const p = partnerRoster.find((r) => r.name.toLowerCase() === name.toLowerCase());
                    return (
                      <TradeChip key={name} name={name} position={p?.position || "?"} value={p?.sha_value || 0}
                        onRemove={() => setReceiveNames((prev) => prev.filter((n) => n.toLowerCase() !== name.toLowerCase()))} />
                    );
                  }) : (
                    <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="font-sans text-[11px] text-[#7dd3a050] py-1">Tap their players →</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SCROLLABLE ROSTER ═══ */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab bar */}
        <div className="flex border-b border-[#1a1e30] shrink-0">
          {(["yours", "theirs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPosFilter("ALL"); }}
              className={`flex-1 py-2.5 font-mono text-[11px] font-bold tracking-wider text-center transition-colors border-b-2 ${
                activeTab === tab ? "text-[#d4a532] border-[#d4a532]" : "text-[#9596a5] border-transparent"
              }`}
            >
              {tab === "yours" ? "YOUR ROSTER" : partnerName.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Position filters */}
        <div className="flex gap-1.5 px-3 py-1.5 shrink-0 overflow-x-auto">
          {FILTERS.map((f) => {
            const isActive = posFilter === f;
            return (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className="font-mono text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-md transition-colors shrink-0"
                style={{
                  color: isActive ? "#d4a532" : "#9596a5",
                  background: isActive ? "#d4a53218" : "#10131d",
                  border: `1px solid ${isActive ? "#d4a53230" : "#1a1e30"}`,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Player list — open, no collapsing */}
        <div className="flex-1 overflow-y-auto">
          {filteredRoster.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-[#9596a5]">
              {partnerRoster.length === 0 && activeTab === "theirs" ? "Loading roster..." : "No players at this position"}
            </div>
          ) : (
            filteredRoster.map((player) => {
              const selectedSet = activeTab === "yours" ? giveSet : receiveSet;
              return (
                <PlayerRow
                  key={player.name}
                  player={player}
                  isSelected={selectedSet.has(player.name.toLowerCase())}
                  onToggle={() => toggleAsset(player.name)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ═══ FIXED BOTTOM BAR ═══ */}
      <div className="shrink-0 border-t border-[#1a1e30] bg-[#06080d]"
        style={{ padding: "8px 12px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center gap-2">
          {/* SUGGEST */}
          {onSuggest && (
            <button
              onClick={onSuggest}
              className="flex-1 py-3 rounded-xl font-mono text-[11px] font-black tracking-wider text-[#06080d] active:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
            >
              SUGGEST
            </button>
          )}
          {/* Gap label */}
          {(giveTotal > 0 || recvTotal > 0) && (
            <span className="font-mono text-[10px] font-black shrink-0" style={{ color: barColor }}>
              {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(0)}%
            </span>
          )}
          {/* ANALYZE */}
          <button
            onClick={() => canAnalyze && onAnalyze?.()}
            disabled={!canAnalyze}
            className="flex-1 py-3 rounded-xl font-mono text-[11px] font-black tracking-wider transition-all"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
              color: canAnalyze ? "#eeeef2" : "#9596a5",
              opacity: canAnalyze ? 1 : 0.4,
            }}
          >
            🔍 ANALYZE
          </button>
        </div>
      </div>
    </div>
  );
}
