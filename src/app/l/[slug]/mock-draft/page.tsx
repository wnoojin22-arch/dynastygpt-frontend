"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getMockDraftPreDraft,
  simulateMockDraft,
  getDraftHitRates,
  getDraftOwnerProfiles,
} from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import PickDetailSheet from "@/components/league/mock-draft/PickDetailSheet";
import { C, MONO, SANS, DISPLAY } from "@/components/league/tokens";
import { countDraftedAtPosition } from "./aggregator";
import WarRoomLanding from "./WarRoomLanding";
import DraftRecap from "./DraftRecap";
import { mockPreDraft, mockHitRates, mockOwnerProfiles, mockSimSnapshot } from "./mocks";
import type {
  ConsensusBoardEntry,
  DraftIdentity,
  HitRatesResponse,
  MissedOpportunity,
  OwnerProfile,
  PostDraftPositionalGrades,
  PreDraftResponse,
  SimulateResponse,
  TradeFlag,
} from "./contracts";

/* ═══ WAR ROOM TOKENS ═══ */
const MD = {
  bg: "radial-gradient(ellipse at 50% 0%, rgba(212,165,50,0.06) 0%, rgba(6,8,13,1) 60%)",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.08)",
  cardGlow: "0 0 30px rgba(212,165,50,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
};
const POS_COLOR: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };
const WINDOW_TOOLTIP: Record<string, string> = {
  REBUILDER: "Rebuilder — targeting future seasons, collecting assets",
  CONTENDER: "Contender — competing now, values immediate impact",
  BALANCED: "Balanced — neither fully rebuilding nor all-in",
};
const BOOMBUST_TOOLTIP: Record<string, string> = {
  SAFE: "Safe pick — reliable floor, low bust risk",
  MODERATE: "Moderate — balanced upside and risk",
  POLARIZING: "Polarizing — analysts disagree, wide range of outcomes",
  "BOOM/BUST": "Boom/Bust — high upside, high bust risk",
};
const GRADE_BAR: Record<string, { color: string; width: string; pulse: boolean }> = {
  CRITICAL: { color: "#e47272", width: "95%", pulse: true },
  WEAK: { color: "#e09c6b", width: "75%", pulse: false },
  AVERAGE: { color: "#d4a532", width: "50%", pulse: false },
  STRONG: { color: "#7dd3a0", width: "30%", pulse: false },
  ELITE: { color: "#6bb8e0", width: "10%", pulse: false },
};

interface ChalkPick {
  slot: string; owner: string; window: string;
  prospect_name: string; prospect_position: string;
  prospect_tier: number; prospect_boom_bust: string;
  board_position: number; confidence?: number;
  reasoning?: string;
}

type Phase = "landing" | "loading" | "live" | "user_pick" | "recap";

/**
 * fastForwardIdx — resolve all picks instantly from `from` up to the next
 * user pick the user hasn't made yet. Returns chalk.length when the draft
 * is complete.
 */
function fastForwardIdx(
  chalk: Array<{ slot: string; owner: string }>,
  owner: string,
  userPicks: Record<string, string>,
  from: number,
): number {
  const lower = owner.toLowerCase();
  for (let i = from; i < chalk.length; i++) {
    const c = chalk[i];
    if (c.owner.toLowerCase() === lower && !userPicks[c.slot]) return i;
  }
  return chalk.length;
}

export default function MockDraftPage() {
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const owner = useLeagueStore((s) => s.currentOwner) || "";
  const ownerId = useLeagueStore((s) => s.currentOwnerId) || "";
  const mobile = useIsMobile();
  const searchParams = useSearchParams();
  const useMocks = searchParams?.get("mock") === "1";

  const [phase, setPhase] = useState<Phase>("landing");
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);

  // Live draft state
  const [revealedCount, setRevealedCount] = useState(0);
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [pickSearch, setPickSearch] = useState("");
  const [pickPosFilter, setPickPosFilter] = useState("ALL");
  const [activeDetailSlot, setActiveDetailSlot] = useState<string | null>(null);
  const userPickRef = useRef<HTMLDivElement>(null);

  // ── Landing data (skip in mock mode) ──────────────────────────────────
  const { data: preDraftData, isLoading: preDraftLoading, error: preDraftError, refetch: refetchPreDraft } = useQuery({
    queryKey: ["mock-draft-pre", leagueId, owner],
    queryFn: () => getMockDraftPreDraft(leagueId, owner, ownerId),
    enabled: !!leagueId && !useMocks,
    staleTime: 300_000,
  });
  const { data: hitRatesData, isLoading: hitRatesLoading, error: hitRatesError, refetch: refetchHitRates } = useQuery({
    queryKey: ["draft-hit-rates", leagueId],
    queryFn: () => getDraftHitRates(leagueId),
    enabled: !!leagueId && !useMocks,
    staleTime: 300_000,
  });
  const { data: ownerProfilesData, isLoading: ownerProfilesLoading, error: ownerProfilesError, refetch: refetchOwnerProfiles } = useQuery({
    queryKey: ["draft-owner-profiles", leagueId],
    queryFn: () => getDraftOwnerProfiles(leagueId),
    enabled: !!leagueId && !useMocks,
    staleTime: 300_000,
  });
  // Prefetch simulate in background once pre-draft + owner resolve, so clicking
  // "Run Simulation" is instant. Cached by sim_id for 1h on the backend (Redis).
  const { data: prefetchedSim, isFetching: simPrefetching, error: simPrefetchError, refetch: refetchSim } = useQuery({
    queryKey: ["mock-draft-sim", leagueId, owner, ownerId],
    queryFn: () => simulateMockDraft(leagueId, { user_owner: owner, user_owner_id: ownerId }),
    enabled: !!leagueId && !!owner && !useMocks,
    staleTime: 60 * 60 * 1000, // backend sim_id TTL
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // Resolve effective data — mocks override when ?mock=1
  const preDraft = (useMocks ? mockPreDraft : preDraftData) as PreDraftResponse | undefined;
  const hitRates = (useMocks ? mockHitRates : hitRatesData) as HitRatesResponse | undefined;
  const ownerProfilesResp = useMocks
    ? mockOwnerProfiles
    : (ownerProfilesData as { profiles: OwnerProfile[] } | undefined);
  const ownerProfiles = useMemo(() => ownerProfilesResp?.profiles ?? [], [ownerProfilesResp]);
  const landingSim = (useMocks
    ? mockSimSnapshot
    : (prefetchedSim ?? simulation ?? undefined)) as SimulateResponse | undefined;

  const landingLoading = !useMocks && (preDraftLoading || hitRatesLoading || ownerProfilesLoading);
  const landingError = !useMocks && (preDraftError || hitRatesError || ownerProfilesError);
  const simReady = !!landingSim;

  const pd = preDraft as unknown as Record<string, unknown> | undefined;

  // All chalk picks from simulation
  const chalk = (simulation?.chalk || []) as ChalkPick[];
  const pickProbs = (simulation?.pick_probabilities || {}) as Record<string, Array<{ prospect: string; position: string; pct: number }>>;
  const tradeFlags = (simulation?.trade_flags || []) as Array<Record<string, unknown>>;
  const userAnalysis = (simulation?.user_pick_analysis || []) as Array<Record<string, unknown>>;

  // Pre-draft data (used in both landing AND live draft sections)
  const myPicks = (pd?.user_picks || []) as Array<{ slot: string; round: number; picks_before: number }>;
  const grades = (pd?.positional_grades || {}) as Record<string, string>;
  const needs = (pd?.needs || []) as string[];

  // ── Start draft: reuse prefetched sim if present, else fetch.
  //    Instant resolution — fast-forward to the user's first pick on mount;
  //    no ticker, no artificial reveal delay. All prior picks render above
  //    as scrollback history.
  const startWith = useCallback(
    (data: Record<string, unknown>) => {
      const nextChalk = ((data.chalk || []) as Array<{ slot: string; owner: string }>);
      setSimulation(data);
      setUserPicks({});
      setRevealedCount(fastForwardIdx(nextChalk, owner, {}, 0));
      setPhase("live");
    },
    [owner],
  );

  const handleStart = useCallback(async () => {
    if (useMocks) {
      startWith(mockSimSnapshot as unknown as Record<string, unknown>);
      return;
    }
    if (prefetchedSim) {
      startWith(prefetchedSim as Record<string, unknown>);
      return;
    }
    setPhase("loading");
    try {
      const data = await simulateMockDraft(leagueId, { user_owner: owner, user_owner_id: ownerId });
      startWith(data as Record<string, unknown>);
    } catch {
      setPhase("landing");
    }
  }, [leagueId, owner, ownerId, prefetchedSim, useMocks, startWith]);

  // Scroll to the user pick card any time a new user-turn is reached.
  useEffect(() => {
    if (phase !== "live") return;
    const t = setTimeout(() => {
      userPickRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [phase, revealedCount]);

  // ── User makes a pick ──
  // Record the pick, then fast-forward past all chalk picks up to the next
  // user pick (or end). No ticker in between.
  const handleUserDraft = useCallback(
    (slot: string, prospectName: string) => {
      const nextUserPicks = { ...userPicks, [slot]: prospectName };
      setUserPicks(nextUserPicks);
      const nextChalk = ((simulation?.chalk || []) as Array<{ slot: string; owner: string }>);
      const slotIdx = nextChalk.findIndex((c) => c.slot === slot);
      const from = slotIdx >= 0 ? slotIdx + 1 : revealedCount + 1;
      setRevealedCount(fastForwardIdx(nextChalk, owner, nextUserPicks, from));
    },
    [userPicks, simulation, owner, revealedCount],
  );

  // ═══════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: MD.bg }}>
        <style>{`@keyframes md-bar{0%{width:5%}50%{width:90%}100%{width:5%}}`}</style>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="text-[40px] md:text-[56px] font-black leading-none" style={{
            fontFamily: "'Archivo Black', sans-serif", color: C.gold,
            textShadow: "0 0 40px rgba(212,165,50,0.3)",
          }}>LOADING DRAFT</div>
          <div className="mt-2 text-xs tracking-widest uppercase" style={{ fontFamily: MONO, color: C.dim }}>
            Analyzing 12 owner profiles...
          </div>
          <div className="mt-8 mx-auto rounded-full overflow-hidden" style={{ width: 240, height: 5, background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{
              background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldDark})`,
              animation: "md-bar 2s ease-in-out infinite",
            }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIVE DRAFT + USER PICK — full intelligence on every pick
  // ═══════════════════════════════════════════════════════════
  if ((phase === "live" || phase === "user_pick") && simulation && chalk.length > 0) {
    const revealed = chalk.slice(0, revealedCount);
    const currentIdx = revealedCount;
    const currentPick = chalk[currentIdx];
    const isUserTurn = !!currentPick && currentPick.owner.toLowerCase() === owner.toLowerCase() && !userPicks[currentPick.slot];
    const draftComplete = revealedCount >= chalk.length;
    const prospectAvailability = (simulation.prospect_availability || {}) as Record<string, Array<{ slot: string; pct_available: number }>>;
    const consensusBoard = (simulation.consensus_board || []) as Array<{ rank: number; name: string; position: string; tier: number; boom_bust: string }>;

    // Find the user_pick_analysis for current user pick slot
    const currentUserAnalysis = isUserTurn && currentPick
      ? (userAnalysis.find((a: any) => a.slot === currentPick.slot) as Record<string, unknown> | undefined)
      : undefined;

    // Trade flag for expanded pick
    const getTradeFlag = (slot: string) => tradeFlags.find((t: any) => t.slot === slot) as Record<string, unknown> | undefined;

    return (
      <div className="flex flex-col h-screen" style={{ background: "#06080d" }}>
        <style>{`
          @keyframes md-on-clock{0%,100%{box-shadow:0 0 20px rgba(212,165,50,0.3)}50%{box-shadow:0 0 40px rgba(212,165,50,0.5)}}
        `}</style>

        {/* Draft header */}
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: C.border, background: `linear-gradient(180deg, rgba(212,165,50,0.04), transparent)` }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-wider" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>MOCK DRAFT</span>
            <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, background: `${C.gold}15`, border: `1px solid ${C.gold}30`, color: C.gold }}>{simulation.format as string}</span>
          </div>
          <div className="flex items-center gap-2">
            {!draftComplete && currentPick && (
              <>
                <span className="text-[9px] font-bold tracking-wider" style={{ fontFamily: MONO, color: isUserTurn ? C.gold : C.dim }}>
                  {isUserTurn ? "YOU'RE ON THE CLOCK" : `PICK ${currentPick.slot}`}
                </span>
                <span className="w-2 h-2 rounded-full" style={{ background: isUserTurn ? C.gold : C.green, animation: isUserTurn ? "md-on-clock 1.5s ease-in-out infinite" : "none" }} />
              </>
            )}
            {draftComplete && <span className="text-[9px] font-bold tracking-wider" style={{ fontFamily: MONO, color: C.green }}>DRAFT COMPLETE</span>}
          </div>
        </div>

        {/* Pick board */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3" style={{ overscrollBehavior: "contain" }}>
          {revealed.map((pick, i) => {
            const isUser = pick.owner.toLowerCase() === owner.toLowerCase();
            const wasUserPick = !!userPicks[pick.slot];
            const userPickedName = wasUserPick ? userPicks[pick.slot] : null;
            const userPickedProspect = userPickedName
              ? consensusBoard.find((c) => c.name === userPickedName)
              : null;
            const displayName = userPickedName ?? pick.prospect_name;
            // Source of truth = consensus_board.position for the player actually drafted.
            // Never fall back to pick.prospect_position when the user overrode — that's the AI's predicted (different) player.
            const displayPos = userPickedName
              ? (userPickedProspect?.position ?? "?")
              : pick.prospect_position;
            const pc = POS_COLOR[displayPos] || C.dim;
            const probs = pickProbs[pick.slot] || [];
            const topProb = probs[0]?.pct || 0;
            const isExpanded = activeDetailSlot === pick.slot;
            const tf = getTradeFlag(pick.slot);

            return (
              <motion.div key={pick.slot} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                {/* Pick row */}
                <div
                  onClick={() => setActiveDetailSlot(isExpanded ? null : pick.slot)}
                  className="flex items-center gap-3 rounded-xl mb-0.5 cursor-pointer transition-all"
                  style={{
                    padding: mobile ? "10px 12px" : "10px 16px", minHeight: mobile ? 60 : 52,
                    background: isUser ? "linear-gradient(135deg, rgba(212,165,50,0.08), rgba(212,165,50,0.03))" : "rgba(255,255,255,0.02)",
                    border: isUser ? "1.5px solid rgba(212,165,50,0.3)" : tf ? "1px dashed rgba(212,165,50,0.2)" : "1px solid rgba(255,255,255,0.04)",
                    opacity: isUser ? 1 : 0.7,
                  }}
                >
                  <span className="text-xs font-black w-9 flex-shrink-0" style={{ fontFamily: MONO, color: isUser ? C.gold : C.dim }}>{pick.slot}</span>
                  <span className={`text-xs font-bold flex-shrink-0 ${mobile ? "w-20" : "w-32"} truncate`} style={{ fontFamily: SANS, color: isUser ? C.gold : C.secondary }}>{pick.owner}</span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: C.dim }}>→</span>
                  <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{ fontFamily: MONO, color: pc, background: `${pc}18`, border: `1px solid ${pc}25` }}>{displayPos}</span>
                  <span className="text-sm font-bold truncate flex-1" style={{ fontFamily: SANS, color: isUser ? C.gold : C.primary }}>{displayName}</span>
                  <span
                    className="text-[10px] font-bold flex-shrink-0"
                    style={{ fontFamily: MONO, color: topProb >= 60 ? C.green : topProb >= 35 ? C.gold : C.dim }}
                    title={`${topProb}% of simulations predicted this exact pick`}
                  >
                    {topProb}% chance
                  </span>
                  {tf && (
                    <span
                      className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                      style={{ fontFamily: MONO, color: C.gold, background: `${C.gold}12`, border: `1px solid ${C.gold}25` }}
                      title={`${(tf as any).trade_probability}% chance an owner offers to trade up for ${pick.slot}`}
                    >
                      {(tf as any).trade_probability}% offer up for {pick.slot}
                    </span>
                  )}
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 22, height: 22, color: isExpanded ? C.gold : C.secondary, transform: `rotate(${isExpanded ? 180 : 0}deg)`, transition: "transform 180ms ease, color 180ms ease" }}
                    aria-label={isExpanded ? "Collapse pick detail" : "Expand pick detail"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>

                {/* Expanded detail — inline below the pick */}
                <AnimatePresence>
                  {isExpanded && !isUser && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-b-xl mb-1.5 px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${pc}30` }}>

                      {/* Owner context */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            fontFamily: MONO, color: pick.window === "CONTENDER" ? C.green : pick.window === "REBUILDER" ? C.red : C.secondary,
                            background: pick.window === "CONTENDER" ? "rgba(125,211,160,0.12)" : pick.window === "REBUILDER" ? "rgba(228,114,114,0.12)" : "rgba(176,178,200,0.08)",
                          }}
                          title={WINDOW_TOOLTIP[pick.window] ?? ""}
                        >
                          {pick.window}
                        </span>
                        <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }} title={`Ranked #${pick.board_position} on the consensus board`}>Consensus rank #{pick.board_position}</span>
                      </div>

                      {/* WHY THIS PICK — narrative from available data */}
                      {(() => {
                        // Use trade flag data for this slot — it has owner_grade_at_bpa
                        const pickTf = tf;
                        const posGrade = pickTf ? (pickTf as any).owner_grade_at_bpa : null;
                        const reasons: string[] = [];

                        // Need-based reason
                        if (posGrade === "CRITICAL") reasons.push(`${pick.owner} has a CRITICAL ${pick.prospect_position} need — this is their biggest roster hole`);
                        else if (posGrade === "WEAK") reasons.push(`${pick.prospect_position} is a WEAK spot on ${pick.owner}'s roster`);
                        else if (posGrade === "ELITE" || posGrade === "STRONG") reasons.push(`${pick.owner} is already ${posGrade} at ${pick.prospect_position} — this is a BPA pick over need`);
                        else if (posGrade) reasons.push(`${pick.prospect_position} is ${posGrade} for ${pick.owner}`);

                        // BPA reason
                        if (pick.board_position <= 3) reasons.push(`Consensus top 3 prospect (#${pick.board_position} overall) — too good to pass up`);
                        else if (pick.board_position <= 8) reasons.push(`Top 8 on the board (#${pick.board_position}) — strong value here`);
                        else if (pick.board_position <= 15) reasons.push(`Ranked #${pick.board_position} on the consensus board`);

                        // Probability
                        if (topProb >= 70) reasons.push(`${topProb}% of simulations predicted this exact pick`);
                        else if (topProb >= 40) reasons.push(`Most likely pick at ${topProb}% — but ${100 - topProb}% chance of going another direction`);
                        else reasons.push(`Only ${topProb}% likely — this pick is unpredictable`);

                        // Window reason
                        if (pick.window === "REBUILDER") reasons.push("Rebuilder prioritizing future upside over win-now production");
                        else if (pick.window === "CONTENDER") reasons.push("Contender looking for an immediate roster contributor");

                        // Tier/boom-bust
                        if (pick.prospect_tier <= 2) reasons.push(`Tier ${pick.prospect_tier} prospect — elite talent level`);
                        if (pick.prospect_boom_bust === "SAFE") reasons.push("High-floor prospect with strong consensus — safe selection");
                        else if (pick.prospect_boom_bust === "BOOM/BUST") reasons.push("Volatile prospect — wide range of expert opinions. High ceiling, low floor.");

                        return (
                          <div className="mb-2 rounded-lg px-3 py-2" style={{ background: "rgba(212,165,50,0.03)", border: "1px solid rgba(212,165,50,0.08)" }}>
                            <div className="text-[9px] font-bold tracking-widest mb-1" style={{ fontFamily: MONO, color: C.gold }}>WHY THIS PICK</div>
                            {reasons.slice(0, 4).map((r, ri) => (
                              <div key={ri} className="text-[10px] leading-relaxed" style={{ fontFamily: SANS, color: C.secondary }}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Probability breakdown */}
                      {probs.length > 1 && (
                        <div className="mb-2">
                          <div className="text-[9px] font-bold tracking-widest mb-1" style={{ fontFamily: MONO, color: C.dim }}>OTHER POSSIBLE PICKS · % CHANCE SELECTED</div>
                          {probs.filter((p) => p.prospect !== pick.prospect_name).slice(0, 4).map((p, j) => (
                            <div key={j} className="flex items-center gap-2 py-0.5">
                              <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ fontFamily: MONO, color: POS_COLOR[p.position] || C.dim, background: `${POS_COLOR[p.position] || C.dim}15` }}>{p.position}</span>
                              <span className="text-xs font-semibold flex-1" style={{ fontFamily: SANS, color: j === 0 ? C.primary : C.secondary }}>{p.prospect}</span>
                              <div className="flex items-center gap-1" title={`${p.pct}% of simulations had ${pick.owner} take ${p.prospect} at ${pick.slot}`}>
                                <div className="h-1.5 rounded-full" style={{ width: Math.max(8, p.pct * 0.8), background: j === 0 ? C.gold : C.dim }} />
                                <span className="text-[10px] font-bold w-12 text-right" style={{ fontFamily: MONO, color: j === 0 ? C.gold : C.dim }}>{p.pct}% chance</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Trade intel */}
                      {tf && (
                        <div className="rounded-lg px-3 py-2 mt-1" style={{ background: "rgba(212,165,50,0.04)", border: "1px dashed rgba(212,165,50,0.15)" }}>
                          <div
                            className="text-[10px] font-semibold tracking-wide mb-1"
                            style={{ fontFamily: SANS, color: C.gold }}
                            title={`${(tf as any).trade_probability}% chance an owner offers to trade up for ${pick.slot}`}
                          >
                            {(tf as any).trade_probability}% chance an owner offers to trade up for {pick.slot}
                          </div>
                          <div className="text-[10px] leading-relaxed" style={{ fontFamily: SANS, color: C.secondary }}>
                            {(tf as any).reason}
                          </div>
                          {(tf as any).top_buyer && (
                            <div className="mt-1.5 text-[10px]" style={{ fontFamily: SANS, color: C.primary }}>
                              <strong>Likely buyer:</strong> {(tf as any).top_buyer.name} — {(tf as any).top_buyer.reason}
                            </div>
                          )}
                          {(tf as any).top_buyer?.estimated_cost && (
                            <div className="text-[9px] mt-0.5" style={{ fontFamily: MONO, color: C.gold }}>
                              Est. cost: {(tf as any).top_buyer.estimated_cost}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* ═══ USER'S PICK — full intelligence ═══ */}
          {isUserTurn && currentPick && (
            <motion.div ref={userPickRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="rounded-2xl my-3 overflow-hidden" style={{
                border: "2px solid rgba(212,165,50,0.4)",
                background: "linear-gradient(135deg, rgba(212,165,50,0.06), rgba(6,8,13,0.95))",
                boxShadow: "0 0 40px rgba(212,165,50,0.15), 0 0 80px rgba(212,165,50,0.05)",
                animation: "md-on-clock 2s ease-in-out infinite",
              }}>

              {/* Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(212,165,50,0.15)" }}>
                <div className="text-lg font-black tracking-wider" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>
                  YOUR PICK — {currentPick.slot}
                </div>
                <div className="text-xs mt-0.5" style={{ fontFamily: SANS, color: C.secondary }}>{owner}</div>
              </div>

              {/* Recommended picks — sort by fit_score DESC.
                  Hero = top fit (1 card, prominent, gold DRAFT button).
                  Other options = next 4 (smaller cards, less visual weight).
                  Availability % intentionally omitted on recommendations —
                  if they're on the board they're available; the fact is
                  tautological. Replaced with need/steal context. */}
              {(() => {
                const la = (currentUserAnalysis?.likely_available || []) as Array<Record<string, unknown>>;
                const sorted = [...la].sort(
                  (a, b) => ((b.fit_score as number | undefined) ?? 0) - ((a.fit_score as number | undefined) ?? 0),
                );
                const hero = sorted[0];
                const others = sorted.slice(1, 5);

                // Pick number for "Steal at 1.12" context on hero fit line.
                const [heroRoundStr, heroSlotStr] = currentPick.slot.split(".");
                const numTeams = (simulation?.num_teams as number | undefined) ?? 12;
                const heroPickNum = (parseInt(heroRoundStr, 10) - 1) * numTeams + parseInt(heroSlotStr, 10);

                const fitContext = (
                  entry: Record<string, unknown>,
                ): string => {
                  const fs = (entry.fit_score as number | undefined) ?? 0;
                  const boardPos = (entry.board_position as number | undefined) ?? heroPickNum;
                  const reasons = (entry.fit_reasons as string[] | undefined) ?? [];
                  const needed = !!entry.fills_need;
                  const grade = entry.your_grade_at_position as string | undefined;
                  if (needed && grade) return `Fills ${entry.position as string} gap — upgrades from ${grade}`;
                  if (reasons[0]) return reasons[0];
                  if (boardPos <= heroPickNum - 5) return `Fit ${fs} · Steal at ${currentPick.slot}`;
                  return `Fit ${fs} · Tier ${entry.tier as number} prospect`;
                };

                if (!hero) return null;
                const heroPc = POS_COLOR[hero.position as string] || C.dim;

                return (
                  <>
                    {/* Hero — RECOMMENDED PICK */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.gold }}>RECOMMENDED PICK</div>
                      <div
                        className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                        style={{
                          background: "linear-gradient(135deg, rgba(212,165,50,0.10), rgba(212,165,50,0.02))",
                          border: "1.5px solid rgba(212,165,50,0.35)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 20px rgba(212,165,50,0.08)",
                        }}
                      >
                        <span
                          className="text-[10px] font-black px-2 py-1 rounded"
                          style={{ fontFamily: MONO, color: heroPc, background: `${heroPc}20`, border: `1px solid ${heroPc}35` }}
                        >
                          {hero.position as string}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold truncate" style={{ fontFamily: SANS, color: C.primary, letterSpacing: "-0.01em" }}>
                              {hero.prospect as string}
                            </span>
                            {!!hero.fills_need && (
                              <span
                                className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                                style={{ fontFamily: MONO, color: C.green, background: "rgba(125,211,160,0.12)" }}
                                title={`Fills your ${hero.position as string} gap — currently ${hero.your_grade_at_position as string}`}
                              >
                                FILLS NEED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ fontFamily: MONO, color: C.dim }}>
                            #{hero.board_position as number} overall · Tier {hero.tier as number} ·{" "}
                            <span title={BOOMBUST_TOOLTIP[hero.boom_bust as string] ?? ""}>{hero.boom_bust as string}</span>
                          </div>
                          <div className="text-[11px] mt-1 leading-snug" style={{ fontFamily: SANS, color: C.secondary }}>
                            {fitContext(hero)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUserDraft(currentPick.slot, hero.prospect as string)}
                          className="text-[11px] font-black tracking-widest px-4 py-2.5 rounded-lg flex-shrink-0 cursor-pointer"
                          style={{
                            fontFamily: MONO,
                            color: "#1a1204",
                            background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
                            border: "none",
                            boxShadow: "0 6px 18px rgba(212,165,50,0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
                            minHeight: 42,
                          }}
                        >
                          DRAFT
                        </button>
                      </div>
                    </div>

                    {/* Other options (4 smaller cards) */}
                    {others.length > 0 && (
                      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.dim }}>OTHER OPTIONS</div>
                        {others.map((o, i) => {
                          const pc = POS_COLOR[o.position as string] || C.dim;
                          return (
                            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 mb-1" style={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: pc, background: `${pc}15` }}>{o.position as string}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] font-semibold truncate" style={{ fontFamily: SANS, color: C.primary }}>{o.prospect as string}</span>
                                  {!!o.fills_need && (
                                    <span
                                      className="text-[8px] font-bold tracking-wider px-1 py-0.5 rounded"
                                      style={{ fontFamily: MONO, color: C.green, background: "rgba(125,211,160,0.12)" }}
                                      title={`Fills your ${o.position as string} gap — currently ${o.your_grade_at_position as string}`}
                                    >
                                      NEED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] mt-0.5" style={{ fontFamily: MONO, color: C.dim }}>
                                  #{o.board_position as number} · Tier {o.tier as number} · {fitContext(o)}
                                </div>
                              </div>
                              <button
                                onClick={() => handleUserDraft(currentPick.slot, o.prospect as string)}
                                className="text-[9px] font-bold tracking-wider px-2.5 py-1.5 rounded-md flex-shrink-0 cursor-pointer"
                                style={{
                                  fontFamily: MONO,
                                  color: C.primary,
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  minHeight: 32,
                                }}
                              >
                                DRAFT
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Trade-up targets */}
              {((currentUserAnalysis?.trade_up_targets || []) as Array<Record<string, unknown>>).length > 0 && (
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.orange }}>TRADE UP OPPORTUNITY</div>
                  {((currentUserAnalysis?.trade_up_targets || []) as Array<Record<string, unknown>>).map((t, i) => (
                    <div key={i} className="text-xs leading-relaxed mb-1" style={{ fontFamily: SANS, color: C.secondary }}>
                      {t.suggestion as string}
                    </div>
                  ))}
                </div>
              )}

              {/* Trade context — show trade back/up intel from trade_flags at this slot */}
              {(() => {
                const tf = tradeFlags.find((t) => (t as any).slot === currentPick.slot) as Record<string, unknown> | undefined;
                if (!tf) return null;
                const tb = tf.top_buyer as Record<string, unknown> | undefined;
                const ab = tf.alt_buyer as Record<string, unknown> | undefined;
                const tradeProb = tf.trade_probability as number;
                return (
                  <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="text-[9px] font-bold tracking-widest mb-1" style={{ fontFamily: MONO, color: C.gold }}>
                      {tradeProb >= 50 ? "CONSIDER TRADING BACK" : "TRADE INTEL"}
                    </div>
                    <div className="text-[12px] font-semibold mb-1.5" style={{ fontFamily: SANS, color: C.primary }}>
                      {tradeProb}% chance an owner offers to trade up for your {currentPick.slot}
                    </div>
                    <div className="text-xs leading-relaxed mb-2" style={{ fontFamily: SANS, color: C.secondary }}>
                      {tf.reason as string}
                    </div>
                    {tb && (
                      <div className="rounded-lg px-3 py-2.5 mb-1.5" style={{ background: "rgba(212,165,50,0.04)", border: "1px solid rgba(212,165,50,0.12)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold" style={{ fontFamily: MONO, color: C.gold }}>LIKELY BUYER</span>
                          <span className="text-xs font-bold" style={{ fontFamily: SANS, color: C.primary }}>{tb.name as string}</span>
                          <span
                            className="text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{
                              fontFamily: MONO, color: (tb.window as string) === "CONTENDER" ? C.green : (tb.window as string) === "REBUILDER" ? C.red : C.secondary,
                              background: (tb.window as string) === "CONTENDER" ? "rgba(125,211,160,0.12)" : (tb.window as string) === "REBUILDER" ? "rgba(228,114,114,0.12)" : "rgba(176,178,200,0.08)",
                            }}
                            title={WINDOW_TOOLTIP[tb.window as string] ?? ""}
                          >
                            {tb.window as string}
                          </span>
                        </div>
                        <div className="text-[10px] leading-relaxed" style={{ fontFamily: SANS, color: C.secondary }}>
                          {tb.reason as string}
                        </div>
                        {tb.estimated_cost && (
                          <div className="text-[9px] mt-1 font-bold" style={{ fontFamily: MONO, color: C.gold }}>
                            Est. cost: {tb.estimated_cost as string}
                          </div>
                        )}
                        <div className="text-[9px] mt-0.5" style={{ fontFamily: MONO, color: C.dim }}>
                          {tb.picks_2026 as number} picks in &apos;26 · {tb.picks_2027 as number} picks in &apos;27{(tb.h2h_trades as number) > 0 ? ` · ${tb.h2h_trades} past trades with you` : ""}
                        </div>
                      </div>
                    )}
                    {ab && (
                      <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold" style={{ fontFamily: MONO, color: C.dim }}>ALT BUYER</span>
                          <span className="text-xs font-semibold" style={{ fontFamily: SANS, color: C.secondary }}>{ab.name as string}</span>
                        </div>
                        <div className="text-[10px]" style={{ fontFamily: SANS, color: C.dim }}>{ab.reason as string}</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Full prospect board */}
              <div className="px-4 py-3">
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.dim }}>ALL AVAILABLE PROSPECTS · % HERE = CHANCE STILL ON THE BOARD</div>
                {/* Search + filter */}
                <div className="flex gap-2 mb-2 sticky top-0 z-10 py-1" style={{ background: "rgba(6,8,13,0.95)" }}>
                  <input type="text" placeholder="Search..." value={pickSearch} onChange={(e) => setPickSearch(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg outline-none" style={{
                      fontFamily: SANS, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.primary,
                    }} />
                  {["ALL", "QB", "RB", "WR", "TE"].map((f) => (
                    <button key={f} onClick={() => setPickPosFilter(f)} className="text-[9px] font-bold px-2 py-1.5 rounded-lg" style={{
                      fontFamily: MONO, cursor: "pointer", border: "none",
                      background: pickPosFilter === f ? `${C.gold}15` : "rgba(255,255,255,0.03)",
                      color: pickPosFilter === f ? C.gold : C.dim,
                    }}>{f}</button>
                  ))}
                </div>
                {/* Prospect list — scrollable container */}
                <div className="overflow-y-auto" style={{ maxHeight: mobile ? "60vh" : "50vh" }}>
                  {consensusBoard
                    .filter((p) => {
                      // Only available prospects (not already picked in revealed picks)
                      const pickedNames = new Set([
                        ...revealed.map((r) => r.prospect_name),
                        ...Object.values(userPicks),
                      ]);
                      if (pickedNames.has(p.name)) return false;
                      if (pickPosFilter !== "ALL" && p.position !== pickPosFilter) return false;
                      if (pickSearch && !p.name.toLowerCase().includes(pickSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((p, i) => {
                      const pc = POS_COLOR[p.position] || C.dim;
                      const avail = prospectAvailability[p.name];
                      const availHere = avail?.find((a) => a.slot === currentPick.slot)?.pct_available ?? 100;
                      // Check if likely gone by next user pick
                      const nextUserPick = myPicks.find((mp) => {
                        const mpRd = parseInt(mp.slot.split(".")[0], 10);
                        const curRd = parseInt(currentPick.slot.split(".")[0], 10);
                        return mpRd > curRd || (mpRd === curRd && parseInt(mp.slot.split(".")[1], 10) > parseInt(currentPick.slot.split(".")[1], 10));
                      });
                      const availAtNext = nextUserPick && avail ? (avail.find((a) => a.slot === nextUserPick.slot)?.pct_available ?? 100) : 100;
                      const atRisk = availAtNext < 50;

                      return (
                        <div key={i} className="flex items-center gap-2 py-2 border-b" style={{
                          borderColor: "rgba(255,255,255,0.03)",
                        }}>
                          <span className="text-[10px] font-bold w-6 text-right" style={{ fontFamily: MONO, color: C.dim }} title={`Consensus rank #${p.rank}`}>#{p.rank}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: pc, background: `${pc}15` }}>{p.position}</span>
                          <span className="text-xs font-semibold flex-1 truncate" style={{ fontFamily: SANS, color: C.primary }}>{p.name}</span>
                          <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }} title={`Tier ${p.tier} prospect`}>Tier {p.tier}</span>
                          <span
                            className="text-[9px] font-bold"
                            style={{ fontFamily: MONO, color: availHere >= 80 ? C.green : availHere >= 40 ? C.gold : C.red }}
                            title={`${availHere}% of simulations have ${p.name} available at your current pick (${currentPick.slot})`}
                          >
                            {availHere}% here
                          </span>
                          {atRisk && (
                            <span
                              className="text-[8px] font-bold"
                              style={{ fontFamily: MONO, color: C.orange }}
                              title={`${availAtNext}% chance ${p.name} is still on the board at your next pick (${nextUserPick?.slot ?? ""})`}
                            >
                              {availAtNext}% at next pick
                            </span>
                          )}
                          <button onClick={() => handleUserDraft(currentPick.slot, p.name)}
                            className="text-[8px] font-black px-2 py-1 rounded" style={{
                              fontFamily: MONO, color: "#06080d", background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, border: "none", cursor: "pointer", minHeight: 28,
                            }}>DRAFT</button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ POST-DRAFT RECAP ═══ */}
          {draftComplete && Object.keys(userPicks).length > 0 && pd && (
            <DraftRecap
              preDraft={pd as unknown as PreDraftResponse}
              consensusBoard={consensusBoard as unknown as ReadonlyArray<ConsensusBoardEntry>}
              userPicks={userPicks}
              tradeFlags={tradeFlags as unknown as ReadonlyArray<TradeFlag>}
              postDraftGrades={(simulation.post_draft_positional_grades as PostDraftPositionalGrades | undefined) ?? null}
              missedOpportunities={(simulation.user_missed_opportunities as ReadonlyArray<MissedOpportunity> | undefined) ?? null}
              identity={(pd.draft_identity as DraftIdentity | undefined) ?? null}
              avatarId={(pd.owner_avatar_id as string | undefined) ?? null}
              alternateSimulateAvailable={!!simulation.sim_id}
              simulationsRun={(simulation.simulations_run as number | undefined) ?? 100}
            />
          )}

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING — WAR ROOM (real endpoints, ?mock=1 falls back to fixtures)
  // ═══════════════════════════════════════════════════════════

  // Full-screen error — pre-draft / hit-rates / owner-profiles failed
  if (landingError) {
    const refetchAll = () => {
      refetchPreDraft();
      refetchHitRates();
      refetchOwnerProfiles();
      refetchSim();
    };
    return <LandingErrorState onRetry={refetchAll} />;
  }

  // Skeleton — waiting on pre-draft / hit-rates / owner-profiles
  if (landingLoading || !preDraft || !hitRates) {
    return <LandingSkeleton />;
  }

  // Simulate prefetch failed (landing core data is fine — fall back to a
  // minimal sim-free landing via the mock sim, so the shell still renders).
  // "Run Simulation" will try again via handleStart.
  const effectiveSim = simReady
    ? landingSim!
    : (mockSimSnapshot as unknown as SimulateResponse);

  return (
    <>
      {simPrefetching && !simReady && <SimPrefetchBanner />}
      {simPrefetchError && !simReady && <SimPrefetchErrorBanner onRetry={() => refetchSim()} />}
      <WarRoomLanding
        preDraft={preDraft}
        hitRates={hitRates}
        ownerProfiles={ownerProfiles}
        simSnapshot={effectiveSim}
        onStartSim={handleStart}
      />
    </>
  );
}

// ─── Landing shell states ────────────────────────────────────────────────

function LandingSkeleton() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,165,50,0.055) 0%, transparent 60%), #07090f",
        fontFamily: SANS,
        color: C.primary,
      }}
    >
      <style>{`
        @keyframes md-shimmer { 0% { background-position: -300px 0 } 100% { background-position: 300px 0 } }
        .md-skel {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%);
          background-size: 600px 100%;
          animation: md-shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* Header strip */}
      <header className="sticky top-0 z-20 backdrop-blur" style={{ borderBottom: `1px solid rgba(255,255,255,0.055)`, background: "rgba(7, 9, 15, 0.82)" }}>
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 md:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="md-skel" style={{ width: 140, height: 12 }} />
            <div className="md-skel" style={{ width: 72, height: 18 }} />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="md-skel" style={{ width: 60, height: 12 }} />
            <div className="md-skel" style={{ width: 90, height: 12 }} />
          </div>
        </div>
      </header>

      {/* Your capital rail */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-5 md:pt-6">
        <div className="flex items-baseline justify-between">
          <div className="md-skel" style={{ width: 180, height: 14 }} />
          <div className="md-skel" style={{ width: 120, height: 10 }} />
        </div>
        <div className="mt-4 flex gap-3 overflow-x-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl p-4 md:p-5"
              style={{ width: 236, border: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.018)" }}
            >
              <div className="md-skel" style={{ width: 72, height: 10 }} />
              <div className="md-skel mt-3" style={{ width: 110, height: 40 }} />
              <div className="mt-4 flex flex-col gap-2" style={{ borderTop: `1px solid rgba(255,255,255,0.055)`, paddingTop: 12 }}>
                <div className="md-skel" style={{ width: "100%", height: 10 }} />
                <div className="md-skel" style={{ width: "86%", height: 10 }} />
                <div className="md-skel" style={{ width: "60%", height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Three-col row */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-7 md:pt-8 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl p-3 md:p-5" style={{ border: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.018)" }}>
            <div className="md-skel" style={{ width: 160, height: 14 }} />
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="md-skel" style={{ width: "100%", height: 28 }} />
              <div className="md-skel" style={{ width: "92%", height: 28 }} />
              <div className="md-skel" style={{ width: "80%", height: 28 }} />
              <div className="md-skel" style={{ width: "70%", height: 28 }} />
            </div>
          </div>
        ))}
      </section>

      <div className="mt-10 mx-auto text-center" style={{ color: C.dim, fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em" }}>
        LOADING WAR ROOM…
      </div>
    </div>
  );
}

function LandingErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,165,50,0.055) 0%, transparent 60%), #07090f",
        fontFamily: SANS,
        color: C.primary,
      }}
    >
      <div
        className="max-w-[420px] w-full text-center rounded-2xl px-6 py-8"
        style={{
          border: `1px solid rgba(255,255,255,0.06)`,
          background: "rgba(255,255,255,0.018)",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.035)`,
        }}
      >
        <div className="text-[9px] font-bold tracking-[0.26em] uppercase" style={{ color: "#e47272" }}>
          War room unavailable
        </div>
        <div className="mt-2 font-semibold" style={{ fontFamily: DISPLAY, fontSize: 22, letterSpacing: "-0.01em" }}>
          Couldn&apos;t load your draft intel
        </div>
        <div className="mt-2 text-[12px] leading-relaxed" style={{ color: C.secondary }}>
          The server didn&apos;t answer. No data is missing — we just need to try again.
        </div>
        <button
          onClick={onRetry}
          className="mt-5 rounded-lg px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] cursor-pointer"
          style={{
            color: "#1a1204",
            background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
            border: "none",
            boxShadow: "0 6px 20px rgba(212,165,50,0.18), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function SimPrefetchBanner() {
  return (
    <div
      className="w-full px-4 py-2 text-center"
      style={{
        background: "rgba(212,165,50,0.06)",
        borderBottom: `1px solid rgba(212,165,50,0.18)`,
        color: C.gold,
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.14em",
      }}
    >
      RUNNING 100 SIMULATIONS · THREAT RADAR + TOP BOARD UPDATING…
    </div>
  );
}

function SimPrefetchErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="w-full px-4 py-2 flex items-center justify-center gap-3"
      style={{
        background: "rgba(228,114,114,0.06)",
        borderBottom: `1px solid rgba(228,114,114,0.18)`,
        color: "#e47272",
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.14em",
      }}
    >
      <span>SIMULATION INTEL UNAVAILABLE · THREATS + BOARD MAY BE STALE</span>
      <button
        onClick={onRetry}
        className="rounded px-2 py-0.5 cursor-pointer"
        style={{ border: `1px solid rgba(228,114,114,0.4)`, color: "#e47272", background: "transparent", fontFamily: MONO, fontSize: 10 }}
      >
        RETRY
      </button>
    </div>
  );
}
