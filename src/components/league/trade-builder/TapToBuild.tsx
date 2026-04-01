"use client";

/**
 * TAP-TO-BUILD — full mobile trade customization screen.
 * Arrives pre-loaded from a swipe suggestion. User can add/remove
 * assets from either roster to tweak the package.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown } from "lucide-react";
import { getRoster, getPicks } from "@/lib/api";
import type { SuggestedPackage, TradeAsset, RosterPlayer } from "./types";

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
function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Build a RosterPlayer[] from the raw API response + picks */
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
      const label = `${pk.season} Rd ${pk.round}${pk.is_own_pick ? "" : ` (${pk.original_owner})`}`;
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

/**
 * Client-side acceptance estimate. NOT the full server model — just a
 * quick approximation so the gauge moves in real-time.
 * Based on value gap, consolidation, and asset count.
 */
function estimateAcceptance(giveTotal: number, recvTotal: number, giveCount: number, recvCount: number): number {
  if (giveTotal <= 0 || recvTotal <= 0) return 25;
  // Base: value fairness (0-50 pts)
  const gapPct = Math.abs(recvTotal - giveTotal) / Math.max(giveTotal, recvTotal) * 100;
  let fairness = 50;
  if (gapPct > 40) fairness = 10;
  else if (gapPct > 25) fairness = 20;
  else if (gapPct > 15) fairness = 30;
  else if (gapPct > 5) fairness = 40;
  // Bonus if owner overpays (partner gets more value)
  if (giveTotal > recvTotal) fairness = Math.min(fairness + 10, 50);
  // Consolidation penalty (3-for-1 to partner = hard sell)
  let consolPenalty = 0;
  if (giveCount >= 3 && recvCount === 1) consolPenalty = 15;
  else if (giveCount >= 2 && recvCount === 1) consolPenalty = 8;
  // Simple sum capped at 10-90
  return Math.max(10, Math.min(90, fairness - consolPenalty + 20));
}

const FILTER_ALL = "ALL" as const;
const FILTERS = [FILTER_ALL, "QB", "RB", "WR", "TE", "PICK"] as const;
type PosFilter = (typeof FILTERS)[number];

/* ══════════════════════════════════════════════════
   ASSET CHIP — removable item in the trade tray
   ══════════════════════════════════════════════════ */
function AssetChip({
  name,
  position,
  value,
  onRemove,
  side,
}: {
  name: string;
  position: string;
  value: number;
  onRemove: () => void;
  side: "give" | "receive";
}) {
  const pc = posColor(position);
  const borderColor = side === "give" ? "#e4727230" : "#7dd3a030";
  return (
    <div className="flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-lg bg-[#10131d] border" style={{ borderColor }}>
      <span className="font-mono text-[8px] font-black px-1 rounded shrink-0" style={{ color: pc, background: `${pc}18` }}>
        {position}
      </span>
      <span className="font-sans text-[12px] font-semibold text-[#eeeef2] truncate flex-1">{name}</span>
      {value > 0 && (
        <span className="font-mono text-[10px] font-bold text-[#d4a532] shrink-0">{fmt(value)}</span>
      )}
      <button onClick={onRemove} className="p-0.5 rounded text-[#9596a5] active:text-[#e47272] transition-colors shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ROSTER ROW — tappable player in the asset picker
   ══════════════════════════════════════════════════ */
function RosterRow({
  player,
  isSelected,
  onToggle,
}: {
  player: RosterPlayer;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const pc = posColor(player.position);
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors active:bg-[#171b28] ${isSelected ? "opacity-50" : ""}`}
    >
      {isSelected ? (
        <div className="w-5 h-5 rounded-full bg-[#d4a53225] flex items-center justify-center shrink-0">
          <Check size={12} className="text-[#d4a532]" />
        </div>
      ) : (
        <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ color: pc, background: `${pc}15` }}>
          {player.position}
        </span>
      )}
      <span className="font-sans text-[13px] font-medium text-[#eeeef2] flex-1 truncate">{player.name}</span>
      {player.age && (
        <span className="font-mono text-[10px] text-[#9596a5] shrink-0">{player.age}</span>
      )}
      <span className="font-mono text-[11px] font-bold text-[#d4a532] shrink-0 w-12 text-right">
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
  onSave,
  onBack,
}: {
  pkg: SuggestedPackage;
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  ownerRoster: RosterPlayer[];
  onSave: (giveNames: string[], receiveNames: string[], partnerName: string) => void;
  onBack: () => void;
}) {
  const partnerName = pkg.partner || "";

  // Fetch partner roster + picks
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

  // Trade state — initialized from the suggestion
  const [giveNames, setGiveNames] = useState<string[]>(
    () => (pkg.i_give_names || []).filter(Boolean),
  );
  const [receiveNames, setReceiveNames] = useState<string[]>(
    () => (pkg.i_receive_names || []).filter(Boolean),
  );

  // Asset picker state
  const [activeTab, setActiveTab] = useState<"yours" | "theirs">("yours");
  const [posFilter, setPosFilter] = useState<PosFilter>(FILTER_ALL);

  // Selected name sets for quick lookup
  const giveSet = useMemo(() => new Set(giveNames.map((n) => n.toLowerCase())), [giveNames]);
  const receiveSet = useMemo(() => new Set(receiveNames.map((n) => n.toLowerCase())), [receiveNames]);

  // Filtered roster for picker
  const filteredRoster = useMemo(() => {
    const roster = activeTab === "yours" ? ownerRosterProp : partnerRoster;
    let filtered = roster.filter((p) => p.sha_value > 0 || p.position === "PICK");
    if (posFilter !== FILTER_ALL) {
      filtered = filtered.filter((p) => p.position === posFilter);
    }
    return filtered.sort((a, b) => b.sha_value - a.sha_value);
  }, [activeTab, ownerRosterProp, partnerRoster, posFilter]);

  // Value calculations
  const getVal = useCallback(
    (name: string, roster: RosterPlayer[]) => {
      const p = roster.find((r) => r.name.toLowerCase() === name.toLowerCase());
      return p?.sha_value || 0;
    },
    [],
  );

  const giveTotal = useMemo(
    () => giveNames.reduce((s, n) => s + getVal(n, ownerRosterProp), 0),
    [giveNames, ownerRosterProp, getVal],
  );
  const recvTotal = useMemo(
    () => receiveNames.reduce((s, n) => s + getVal(n, partnerRoster), 0),
    [receiveNames, partnerRoster, getVal],
  );

  const maxVal = Math.max(giveTotal, recvTotal, 1);
  const gapPct = giveTotal > 0 ? ((recvTotal - giveTotal) / giveTotal) * 100 : 0;
  const gapColor = Math.abs(gapPct) <= 5 ? "#7dd3a0" : Math.abs(gapPct) <= 15 ? "#d4a532" : "#e47272";

  const acceptance = useMemo(
    () => estimateAcceptance(giveTotal, recvTotal, giveNames.length, receiveNames.length),
    [giveTotal, recvTotal, giveNames.length, receiveNames.length],
  );
  const accClr = acceptColor(acceptance);

  // Low acceptance pulse
  const [accPulse, setAccPulse] = useState<"red" | "green" | null>(null);
  const prevAcc = useMemo(() => acceptance, []); // initial only
  useEffect(() => {
    if (acceptance < 30) setAccPulse("red");
    else if (acceptance > 70) setAccPulse("green");
    else setAccPulse(null);
    const t = setTimeout(() => setAccPulse(null), 600);
    return () => clearTimeout(t);
  }, [acceptance]);

  // Toggle asset in trade
  const toggleAsset = useCallback(
    (name: string) => {
      if (activeTab === "yours") {
        setGiveNames((prev) =>
          prev.some((n) => n.toLowerCase() === name.toLowerCase())
            ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
            : [...prev, name],
        );
      } else {
        setReceiveNames((prev) =>
          prev.some((n) => n.toLowerCase() === name.toLowerCase())
            ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
            : [...prev, name],
        );
      }
    },
    [activeTab],
  );

  const removeGive = useCallback((name: string) => {
    setGiveNames((prev) => prev.filter((n) => n.toLowerCase() !== name.toLowerCase()));
  }, []);

  const removeReceive = useCallback((name: string) => {
    setReceiveNames((prev) => prev.filter((n) => n.toLowerCase() !== name.toLowerCase()));
  }, []);

  const canSave = giveNames.length > 0 && receiveNames.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#06080d]">
      {/* ══ TOP: Trade tray (fixed) ══ */}
      <div className="shrink-0 border-b border-[#1a1e30] bg-[#0a0d15]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="min-w-0">
            <span className="font-mono text-[8px] font-bold tracking-widest text-[#9596a5]">TRADE WITH</span>
            <h2 className="font-['Archivo_Black'] text-sm text-[#eeeef2] tracking-wide truncate">{partnerName}</h2>
          </div>
          {/* Acceptance gauge */}
          <div
            className="text-right transition-all duration-300"
            style={{
              filter: accPulse === "red" ? "drop-shadow(0 0 8px #e47272)" : accPulse === "green" ? "drop-shadow(0 0 8px #7dd3a0)" : "none",
            }}
          >
            <span className="font-mono text-xl font-black transition-colors duration-300" style={{ color: accClr }}>
              {acceptance}%
            </span>
            <div className="font-mono text-[8px] font-bold text-[#9596a5] tracking-wide">ACCEPTANCE</div>
          </div>
        </div>

        {/* Send / Get chips */}
        <div className="flex gap-2 px-4 pb-2">
          {/* SEND column */}
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[8px] font-black tracking-widest text-[#e47272] block mb-1">YOU SEND</span>
            <div className="space-y-1">
              {giveNames.length > 0 ? (
                giveNames.map((name) => {
                  const p = ownerRosterProp.find((r) => r.name.toLowerCase() === name.toLowerCase());
                  return (
                    <AssetChip
                      key={name}
                      name={name}
                      position={p?.position || "?"}
                      value={p?.sha_value || 0}
                      onRemove={() => removeGive(name)}
                      side="give"
                    />
                  );
                })
              ) : (
                <div className="py-2 text-center font-mono text-[9px] text-[#9596a540]">TAP YOUR ASSETS</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-[#1a1e30] self-stretch mx-0.5" />

          {/* GET column */}
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[8px] font-black tracking-widest text-[#7dd3a0] block mb-1">YOU GET</span>
            <div className="space-y-1">
              {receiveNames.length > 0 ? (
                receiveNames.map((name) => {
                  const p = partnerRoster.find((r) => r.name.toLowerCase() === name.toLowerCase());
                  return (
                    <AssetChip
                      key={name}
                      name={name}
                      position={p?.position || "?"}
                      value={p?.sha_value || 0}
                      onRemove={() => removeReceive(name)}
                      side="receive"
                    />
                  );
                })
              ) : (
                <div className="py-2 text-center font-mono text-[9px] text-[#9596a540]">TAP THEIR ASSETS</div>
              )}
            </div>
          </div>
        </div>

        {/* Balance bar */}
        {(giveNames.length > 0 || receiveNames.length > 0) && (
          <div className="px-4 pb-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[7px] font-black tracking-wide text-[#e47272] w-7">SEND</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#171b28] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#e47272]"
                  animate={{ width: `${(giveTotal / maxVal) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="font-mono text-[9px] font-bold text-[#e47272] w-10 text-right">{fmt(giveTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[7px] font-black tracking-wide text-[#7dd3a0] w-7">GET</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#171b28] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#7dd3a0]"
                  animate={{ width: `${(recvTotal / maxVal) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="font-mono text-[9px] font-bold text-[#7dd3a0] w-10 text-right">{fmt(recvTotal)}</span>
            </div>
            <div className="text-center">
              <span className="font-mono text-[10px] font-black" style={{ color: gapColor }}>
                {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══ BOTTOM: Asset picker (scrollable) ══ */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab bar */}
        <div className="flex border-b border-[#1a1e30] shrink-0">
          <button
            onClick={() => { setActiveTab("yours"); setPosFilter(FILTER_ALL); }}
            className={`flex-1 py-2.5 font-mono text-[11px] font-bold tracking-wider text-center transition-colors border-b-2 ${
              activeTab === "yours" ? "text-[#e47272] border-[#e47272]" : "text-[#9596a5] border-transparent"
            }`}
          >
            YOUR ASSETS
          </button>
          <button
            onClick={() => { setActiveTab("theirs"); setPosFilter(FILTER_ALL); }}
            className={`flex-1 py-2.5 font-mono text-[11px] font-bold tracking-wider text-center transition-colors border-b-2 ${
              activeTab === "theirs" ? "text-[#7dd3a0] border-[#7dd3a0]" : "text-[#9596a5] border-transparent"
            }`}
          >
            THEIR ASSETS
          </button>
        </div>

        {/* Position filters */}
        <div className="flex gap-1.5 px-3 py-2 shrink-0 overflow-x-auto">
          {FILTERS.map((f) => {
            const isActive = posFilter === f;
            const pc = f === FILTER_ALL ? "#d4a532" : posColor(f);
            return (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg border transition-colors shrink-0"
                style={{
                  color: isActive ? pc : "#9596a5",
                  borderColor: isActive ? `${pc}40` : "#1a1e30",
                  background: isActive ? `${pc}10` : "transparent",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1a1e3050]">
          {filteredRoster.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-[#9596a5]">
              {partnerRoster.length === 0 && activeTab === "theirs" ? "Loading roster..." : "No players at this position"}
            </div>
          ) : (
            filteredRoster.map((player) => {
              const selectedSet = activeTab === "yours" ? giveSet : receiveSet;
              const isSelected = selectedSet.has(player.name.toLowerCase());
              return (
                <RosterRow
                  key={player.name}
                  player={player}
                  isSelected={isSelected}
                  onToggle={() => toggleAsset(player.name)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ══ FIXED BOTTOM BUTTONS ══ */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[#1a1e30] bg-[#06080d] space-y-2">
        <button
          onClick={() => canSave && onSave(giveNames, receiveNames, partnerName)}
          disabled={!canSave}
          className="w-full py-3 rounded-xl font-['Archivo_Black'] text-sm tracking-wider text-[#06080d] active:opacity-80 transition-opacity disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
        >
          SAVE TO QUEUE
        </button>
        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl border border-[#1a1e30] font-mono text-[11px] font-bold tracking-wider text-[#9596a5] active:bg-[#171b28] transition-colors"
        >
          BACK TO SUGGESTIONS
        </button>
      </div>
    </div>
  );
}
