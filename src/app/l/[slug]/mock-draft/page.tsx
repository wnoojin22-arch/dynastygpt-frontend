"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLeagueStore } from "@/lib/stores/league-store";
import { getMockDraftPreDraft, simulateMockDraft } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import PickDetailSheet from "@/components/league/mock-draft/PickDetailSheet";
import { C, MONO, SANS, DISPLAY } from "@/components/league/tokens";
import { countDraftedAtPosition } from "./aggregator";

/* ═══ WAR ROOM TOKENS ═══ */
const MD = {
  bg: "radial-gradient(ellipse at 50% 0%, rgba(212,165,50,0.06) 0%, rgba(6,8,13,1) 60%)",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.08)",
  cardGlow: "0 0 30px rgba(212,165,50,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
};
const POS_COLOR: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };
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

/* ═══ PICK SPEED: ms between each pick reveal ═══ */
const PICK_SPEED = 800;

export default function MockDraftPage() {
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const owner = useLeagueStore((s) => s.currentOwner) || "";
  const ownerId = useLeagueStore((s) => s.currentOwnerId) || "";
  const mobile = useIsMobile();

  const [phase, setPhase] = useState<Phase>("landing");
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);

  // Live draft state
  const [revealedCount, setRevealedCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [pickSearch, setPickSearch] = useState("");
  const [pickPosFilter, setPickPosFilter] = useState("ALL");
  const [activeDetailSlot, setActiveDetailSlot] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardBottomRef = useRef<HTMLDivElement>(null);
  const userPickRef = useRef<HTMLDivElement>(null);

  // Pre-draft data
  const { data: preDraft } = useQuery({
    queryKey: ["mock-draft-pre", leagueId, owner],
    queryFn: () => getMockDraftPreDraft(leagueId, owner, ownerId),
    enabled: !!leagueId,
    staleTime: 300000,
  });
  const pd = preDraft as Record<string, unknown> | undefined;

  // All chalk picks from simulation
  const chalk = (simulation?.chalk || []) as ChalkPick[];
  const pickProbs = (simulation?.pick_probabilities || {}) as Record<string, Array<{ prospect: string; position: string; pct: number }>>;
  const tradeFlags = (simulation?.trade_flags || []) as Array<Record<string, unknown>>;
  const userAnalysis = (simulation?.user_pick_analysis || []) as Array<Record<string, unknown>>;

  // Pre-draft data (used in both landing AND live draft sections)
  const myPicks = (pd?.user_picks || []) as Array<{ slot: string; round: number; picks_before: number }>;
  const grades = (pd?.positional_grades || {}) as Record<string, string>;
  const needs = (pd?.needs || []) as string[];

  // ── Start draft: load sim then begin live reveal ──
  const handleStart = useCallback(async () => {
    setPhase("loading");
    try {
      const data = await simulateMockDraft(leagueId, { user_owner: owner, user_owner_id: ownerId });
      setSimulation(data as Record<string, unknown>);
      setRevealedCount(0);
      setPaused(false);
      setUserPicks({});
      setPhase("live");
    } catch {
      setPhase("landing");
    }
  }, [leagueId, owner, ownerId]);

  // ── Live reveal timer ──
  useEffect(() => {
    if (phase !== "live" || paused || !chalk.length) return;

    timerRef.current = setInterval(() => {
      setRevealedCount((prev) => {
        const next = prev + 1;
        if (next >= chalk.length) {
          // Draft complete
          if (timerRef.current) clearInterval(timerRef.current);
          return chalk.length;
        }
        // Check if NEXT pick is the user's — pause before revealing
        const nextPick = chalk[next];
        if (nextPick && nextPick.owner.toLowerCase() === owner.toLowerCase() && !userPicks[nextPick.slot]) {
          setPaused(true);
          if (timerRef.current) clearInterval(timerRef.current);
          // Scroll to user pick after a beat
          setTimeout(() => {
            userPickRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 300);
        }
        return next;
      });
    }, PICK_SPEED);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused, chalk, owner, userPicks]);

  // Auto-scroll to latest revealed pick
  useEffect(() => {
    if (phase === "live" && !paused) {
      boardBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [revealedCount, phase, paused]);

  // ── User makes a pick ──
  const handleUserDraft = useCallback((slot: string, prospectName: string) => {
    setUserPicks((prev) => ({ ...prev, [slot]: prospectName }));
    // Resume the draft
    setPaused(false);
    setRevealedCount((prev) => prev + 1);
  }, []);

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
    const isUserTurn = paused && currentPick && currentPick.owner.toLowerCase() === owner.toLowerCase() && !userPicks[currentPick.slot];
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
                  <span className="text-[10px] font-bold flex-shrink-0" style={{ fontFamily: MONO, color: topProb >= 60 ? C.green : topProb >= 35 ? C.gold : C.dim }}>{topProb}%</span>
                  {tf && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ fontFamily: MONO, color: C.gold, background: `${C.gold}12` }}>TRADE</span>}
                  <span className="text-[10px]" style={{ color: C.dim }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {/* Expanded detail — inline below the pick */}
                <AnimatePresence>
                  {isExpanded && !isUser && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-b-xl mb-1.5 px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${pc}30` }}>

                      {/* Owner context */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                          fontFamily: MONO, color: pick.window === "CONTENDER" ? C.green : pick.window === "REBUILDER" ? C.red : C.secondary,
                          background: pick.window === "CONTENDER" ? "rgba(125,211,160,0.12)" : pick.window === "REBUILDER" ? "rgba(228,114,114,0.12)" : "rgba(176,178,200,0.08)",
                        }}>{pick.window}</span>
                        <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }}>Consensus #{pick.board_position}</span>
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
                          <div className="text-[9px] font-bold tracking-widest mb-1" style={{ fontFamily: MONO, color: C.dim }}>WHO ELSE COULD GO HERE</div>
                          {probs.filter((p) => p.prospect !== pick.prospect_name).slice(0, 4).map((p, j) => (
                            <div key={j} className="flex items-center gap-2 py-0.5">
                              <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ fontFamily: MONO, color: POS_COLOR[p.position] || C.dim, background: `${POS_COLOR[p.position] || C.dim}15` }}>{p.position}</span>
                              <span className="text-xs font-semibold flex-1" style={{ fontFamily: SANS, color: j === 0 ? C.primary : C.secondary }}>{p.prospect}</span>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 rounded-full" style={{ width: Math.max(8, p.pct * 0.8), background: j === 0 ? C.gold : C.dim }} />
                                <span className="text-[10px] font-bold w-8 text-right" style={{ fontFamily: MONO, color: j === 0 ? C.gold : C.dim }}>{p.pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Trade intel */}
                      {tf && (
                        <div className="rounded-lg px-3 py-2 mt-1" style={{ background: "rgba(212,165,50,0.04)", border: "1px dashed rgba(212,165,50,0.15)" }}>
                          <div className="text-[9px] font-bold tracking-widest mb-1" style={{ fontFamily: MONO, color: C.gold }}>
                            TRADE CANDIDATE — {(tf as any).trade_probability}%
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

              {/* Recommended picks with reasoning */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.gold }}>RECOMMENDED</div>
                {((currentUserAnalysis?.likely_available || []) as Array<Record<string, unknown>>).slice(0, 5).map((la, i) => {
                  const pc = POS_COLOR[la.position as string] || C.dim;
                  const avail = prospectAvailability[la.prospect as string];
                  const availAtPick = avail?.find((a) => a.slot === currentPick.slot)?.pct_available || 0;
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-1 cursor-pointer transition-all" style={{
                      background: la.fills_need ? "rgba(125,211,160,0.04)" : i === 0 ? "rgba(212,165,50,0.04)" : "rgba(255,255,255,0.02)",
                      border: la.fills_need ? "1px solid rgba(125,211,160,0.15)" : i === 0 ? "1px solid rgba(212,165,50,0.15)" : "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: pc, background: `${pc}18` }}>{la.position as string}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold truncate" style={{ fontFamily: SANS, color: C.primary }}>{la.prospect as string}</span>
                          {la.fills_need && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: C.green, background: "rgba(125,211,160,0.12)" }}>FILLS NEED</span>}
                          {i === 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: C.gold, background: `${C.gold}12` }}>BPA</span>}
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ fontFamily: MONO, color: C.dim }}>
                          #{la.board_position as number} overall · Tier {la.tier as number} · {la.boom_bust as string} · Your {la.position as string}: {la.your_grade_at_position as string} · {availAtPick}% available
                        </div>
                      </div>
                      <button onClick={() => handleUserDraft(currentPick.slot, la.prospect as string)}
                        className="text-[9px] font-black tracking-wider px-3 py-2 rounded-lg flex-shrink-0" style={{
                          fontFamily: MONO, color: "#06080d", background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`, border: "none", cursor: "pointer", minHeight: 36,
                        }}>DRAFT</button>
                    </div>
                  );
                })}
              </div>

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
                    <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.gold }}>
                      {tradeProb >= 50 ? "CONSIDER TRADING BACK" : "TRADE INTEL"}
                    </div>
                    <div className="text-xs leading-relaxed mb-2" style={{ fontFamily: SANS, color: C.secondary }}>
                      {tf.reason as string}
                    </div>
                    {tb && (
                      <div className="rounded-lg px-3 py-2.5 mb-1.5" style={{ background: "rgba(212,165,50,0.04)", border: "1px solid rgba(212,165,50,0.12)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold" style={{ fontFamily: MONO, color: C.gold }}>LIKELY BUYER</span>
                          <span className="text-xs font-bold" style={{ fontFamily: SANS, color: C.primary }}>{tb.name as string}</span>
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{
                            fontFamily: MONO, color: (tb.window as string) === "CONTENDER" ? C.green : (tb.window as string) === "REBUILDER" ? C.red : C.secondary,
                            background: (tb.window as string) === "CONTENDER" ? "rgba(125,211,160,0.12)" : (tb.window as string) === "REBUILDER" ? "rgba(228,114,114,0.12)" : "rgba(176,178,200,0.08)",
                          }}>{tb.window as string}</span>
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
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.dim }}>ALL AVAILABLE PROSPECTS</div>
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
                          <span className="text-[10px] font-bold w-6 text-right" style={{ fontFamily: MONO, color: C.dim }}>#{p.rank}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: pc, background: `${pc}15` }}>{p.position}</span>
                          <span className="text-xs font-semibold flex-1 truncate" style={{ fontFamily: SANS, color: C.primary }}>{p.name}</span>
                          <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }}>T{p.tier}</span>
                          <span className="text-[9px] font-bold" style={{ fontFamily: MONO, color: availHere >= 80 ? C.green : availHere >= 40 ? C.gold : C.red }}>{availHere}%</span>
                          {atRisk && <span className="text-[8px] font-bold" style={{ fontFamily: MONO, color: C.orange }}>{availAtNext}% next</span>}
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

          <div ref={boardBottomRef} />

          {/* ═══ POST-DRAFT RECAP ═══ */}
          {draftComplete && Object.keys(userPicks).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-2xl my-4 overflow-hidden" style={{
                border: "2px solid rgba(212,165,50,0.3)",
                background: "linear-gradient(135deg, rgba(212,165,50,0.04), rgba(6,8,13,0.98))",
                boxShadow: "0 0 60px rgba(212,165,50,0.1)",
              }}>
              {/* Header */}
              <div className="px-5 py-4 border-b text-center" style={{ borderColor: "rgba(212,165,50,0.15)" }}>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="text-[9px] font-semibold" style={{ color: "#d4a532" }}>powered by</span>
                  <span className="text-[10px] font-black" style={{ color: "#eeeef2" }}>DynastyGPT<span style={{ color: "#d4a532" }}>.com</span></span>
                </div>
                <div className="text-xl font-black tracking-wider" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>
                  YOUR DRAFT RECAP
                </div>
                <div className="text-xs mt-1" style={{ fontFamily: SANS, color: C.secondary }}>{owner}</div>
              </div>

              {/* Roster needs before/after */}
              <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.dim }}>ROSTER IMPACT</div>
                <div className="flex flex-col gap-1.5">
                  {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                    const grade = grades[pos] || "AVERAGE";
                    const pc = POS_COLOR[pos] || C.dim;
                    const draftedNames = countDraftedAtPosition(userPicks, consensusBoard, pos);
                    return (
                      <div key={pos} className="flex items-center gap-3">
                        <span className="text-sm font-black w-8" style={{ fontFamily: "'Archivo Black', sans-serif", color: pc }}>{pos}</span>
                        <span className="text-[10px] font-bold w-16" style={{ fontFamily: MONO, color: GRADE_BAR[grade]?.color || C.dim }}>{grade}</span>
                        <span className="text-[10px] flex-1" style={{ fontFamily: SANS, color: C.dim }}>
                          {draftedNames.length > 0
                            ? `+${draftedNames.length} drafted: ${draftedNames.join(", ")}`
                            : "No picks used here"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Each pick graded */}
              <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.gold }}>YOUR PICKS</div>
                {Object.entries(userPicks).map(([slot, prospectName]) => {
                  const prospect = consensusBoard.find((p) => p.name === prospectName);
                  const pos = prospect?.position ?? "?";
                  const pc = POS_COLOR[pos] || C.dim;
                  const rank = prospect?.rank ?? "?";
                  const tier = prospect?.tier ?? "?";
                  const grade_at_pos = grades[pos] || "AVERAGE";
                  const fills = grade_at_pos === "CRITICAL" || grade_at_pos === "WEAK";
                  const pickNum = parseInt(slot.split(".")[0], 10) * 100 + parseInt(slot.split(".")[1], 10);
                  const isReach = typeof rank === "number" && rank > pickNum + 5;

                  return (
                    <div key={slot} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                      <span className="text-xs font-black w-9" style={{ fontFamily: MONO, color: C.gold }}>{slot}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: pc, background: `${pc}18` }}>{pos}</span>
                      <span className="text-sm font-bold flex-1" style={{ fontFamily: SANS, color: C.primary }}>{prospectName}</span>
                      <div className="flex items-center gap-1.5">
                        {fills && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: C.green, background: "rgba(125,211,160,0.12)" }}>NEED</span>}
                        {isReach && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: C.orange, background: "rgba(224,156,107,0.12)" }}>REACH</span>}
                        <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }}>#{rank} · T{tier}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Draft day trade suggestions */}
              {(() => {
                const userSlots = Object.keys(userPicks);
                const userTradeFlags = tradeFlags.filter((t) => userSlots.includes((t as any).slot)) as Array<Record<string, unknown>>;
                if (userTradeFlags.length === 0) return null;
                return (
                  <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="text-[9px] font-bold tracking-widest mb-2" style={{ fontFamily: MONO, color: C.orange }}>DRAFT DAY TRADE IDEAS</div>
                    {userTradeFlags.slice(0, 3).map((tf, i) => {
                      const tb = tf.top_buyer as Record<string, unknown> | undefined;
                      if (!tb) return null;
                      return (
                        <div key={i} className="text-[10px] leading-relaxed mb-2 px-3 py-2 rounded-lg" style={{
                          fontFamily: SANS, color: C.secondary,
                          background: "rgba(224,156,107,0.04)", border: "1px solid rgba(224,156,107,0.12)",
                        }}>
                          <strong style={{ color: C.primary }}>Pick {tf.slot as string}:</strong> {tb.name as string} wants to trade up ({tb.reason as string}).
                          {tb.estimated_cost && <span style={{ color: C.gold, fontFamily: MONO }}> Est. cost: {tb.estimated_cost as string}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Footer branding */}
              <div className="px-5 py-3 text-center">
                <div className="text-[9px] tracking-wider" style={{ fontFamily: MONO, color: C.dim }}>
                  {(simulation?.simulations_run as number) || 100} simulations · {((simulation?.consensus_board as unknown[]) || []).length} prospects analyzed
                </div>
              </div>
            </motion.div>
          )}

          <div ref={boardBottomRef} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING — WAR ROOM HERO
  // ═══════════════════════════════════════════════════════════
  const topProspects = (pd?.top_prospects || []) as Array<{
    name: string; position: string; rank: number; tier: number; boom_bust: string; fills_need: boolean;
  }>;
  const leagueName = (pd?.league_name as string) || "";
  const format = (pd?.format as string) || "SF";
  const tep = (pd?.te_premium as boolean) || false;
  const numTeams = (pd?.num_teams as number) || 12;

  return (
    <div className="min-h-screen" style={{ background: MD.bg }}>
      <style>{`
        @keyframes md-btn-pulse{0%,100%{box-shadow:0 4px 30px rgba(212,165,50,0.25),0 0 60px rgba(212,165,50,0.1)}50%{box-shadow:0 4px 40px rgba(212,165,50,0.4),0 0 80px rgba(212,165,50,0.2)}}
        @keyframes md-border-glow{0%,100%{border-color:rgba(212,165,50,0.15)}50%{border-color:rgba(212,165,50,0.35)}}
        @keyframes md-need-pulse{0%,100%{opacity:0.8}50%{opacity:1}}
        .md-glass{background:${MD.glass};border:1px solid ${MD.glassBorder};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      `}</style>

      {/* ═══ HERO ═══ */}
      <div className="relative flex flex-col items-center justify-center text-center px-6" style={{ minHeight: mobile ? "80vh" : "65vh" }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-[180px] md:text-[280px] font-black leading-none" style={{
            fontFamily: "'Archivo Black', sans-serif", color: "transparent",
            WebkitTextStroke: "1px rgba(212,165,50,0.05)", letterSpacing: "-0.04em",
          }}>2026</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-5 flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: "rgba(212,165,50,0.08)", border: "1px solid rgba(212,165,50,0.25)" }}>
          <span className="text-[9px] font-semibold" style={{ color: "#d4a532" }}>powered by</span>
          <span className="text-[11px] font-black" style={{ color: "#eeeef2" }}>DynastyGPT<span style={{ color: "#d4a532" }}>.com</span></span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-[48px] md:text-[72px] font-black tracking-[-0.03em] leading-[0.9]" style={{
            fontFamily: "'Archivo Black', sans-serif", color: C.gold,
            textShadow: "0 0 60px rgba(212,165,50,0.25), 0 4px 20px rgba(0,0,0,0.5)",
          }}>MOCK DRAFT</motion.h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-semibold" style={{ fontFamily: SANS, color: C.secondary }}>{leagueName}</span>
          <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded" style={{
            fontFamily: MONO, background: `${C.gold}12`, border: `1px solid ${C.gold}30`, color: C.gold,
          }}>{format}{tep ? " · TEP" : ""}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-1 text-xs tracking-widest uppercase" style={{ fontFamily: MONO, color: C.dim }}>
          {pd?.owner as string || owner}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          className="mt-10 w-full max-w-sm rounded-2xl border-2 cursor-pointer"
          style={{
            padding: mobile ? "20px 0" : "22px 0",
            background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
            borderColor: "rgba(212,165,50,0.5)",
            fontFamily: "'Archivo Black', sans-serif", fontSize: mobile ? 16 : 18,
            fontWeight: 900, letterSpacing: "0.14em", color: "#06080d",
            animation: "md-btn-pulse 3s ease-in-out infinite",
          }}>START MOCK DRAFT</motion.button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-4 text-[10px] tracking-wider" style={{ fontFamily: MONO, color: `${C.dim}80` }}>
          100 simulations · {numTeams} owner profiles · {topProspects.length}+ prospects
        </motion.div>
      </div>

      {/* ═══ INTEL CARDS ═══ */}
      <div className={`px-4 md:px-8 pb-12 max-w-4xl mx-auto ${mobile ? "flex flex-col gap-4" : "grid grid-cols-2 gap-5"}`}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="md-glass rounded-2xl p-5" style={{ boxShadow: MD.cardGlow }}>
          <h2 className="text-xs font-black tracking-[0.2em] mb-4" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>
            YOUR DRAFT CAPITAL
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {myPicks.map((p) => (
              <div key={p.slot} className="flex flex-col items-center rounded-xl px-4 py-3"
                style={{ background: "rgba(212,165,50,0.06)", border: "1px solid rgba(212,165,50,0.2)", animation: "md-border-glow 4s ease-in-out infinite" }}>
                <span className="text-xl font-black" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>{p.slot}</span>
                <span className="text-[9px] mt-0.5" style={{ fontFamily: MONO, color: C.dim }}>{p.picks_before} before you</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="md-glass rounded-2xl p-5" style={{ boxShadow: MD.cardGlow }}>
          <h2 className="text-xs font-black tracking-[0.2em] mb-4" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>
            ROSTER NEEDS
          </h2>
          <div className="flex flex-col gap-3">
            {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
              const grade = grades[pos] || "AVERAGE";
              const bar = GRADE_BAR[grade] || GRADE_BAR.AVERAGE;
              return (
                <div key={pos} className="flex items-center gap-3">
                  <span className="text-sm font-black w-8" style={{ fontFamily: "'Archivo Black', sans-serif", color: POS_COLOR[pos] }}>{pos}</span>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: bar.width, background: bar.color, boxShadow: `0 0 12px ${bar.color}40`,
                      animation: bar.pulse ? "md-need-pulse 1.5s ease-in-out infinite" : "none",
                    }} />
                  </div>
                  <span className="text-[10px] font-bold w-16 text-right" style={{ fontFamily: MONO, color: bar.color }}>{grade}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ═══ PROSPECT CAROUSEL ═══ */}
      <div className="px-4 md:px-8 pb-20 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-black tracking-[0.2em]" style={{ fontFamily: "'Archivo Black', sans-serif", color: C.gold }}>TOP PROSPECTS</h2>
          <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{
            fontFamily: MONO, background: `${C.gold}10`, border: `1px solid ${C.gold}20`, color: C.gold,
          }}>{format}</span>
        </div>
        <div className={mobile ? "flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" : "grid grid-cols-2 md:grid-cols-4 gap-3"}>
          {topProspects.slice(0, 8).map((p, i) => {
            const pc = POS_COLOR[p.position] || C.dim;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`md-glass rounded-xl p-4 snap-center ${mobile ? "flex-shrink-0" : ""}`}
                style={{
                  minWidth: mobile ? 150 : undefined,
                  border: p.fills_need ? `1px solid ${pc}30` : `1px solid ${MD.glassBorder}`,
                  boxShadow: p.fills_need ? `0 0 20px ${pc}15` : MD.cardGlow,
                }}>
                <div className="text-3xl font-black leading-none mb-1" style={{
                  fontFamily: "'Archivo Black', sans-serif", color: "rgba(255,255,255,0.06)",
                }}>{p.rank}</div>
                <span className="inline-block text-[10px] font-black tracking-wider px-2 py-0.5 rounded mb-2" style={{
                  fontFamily: MONO, color: pc, background: `${pc}18`, border: `1px solid ${pc}25`,
                }}>{p.position}</span>
                <div className="text-sm font-bold leading-tight" style={{ fontFamily: SANS, color: C.primary }}>{p.name}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px]" style={{ fontFamily: MONO, color: C.dim }}>Tier {p.tier}</span>
                  <span className="text-[9px]" style={{ fontFamily: MONO, color: p.boom_bust === "SAFE" ? C.green : p.boom_bust === "BOOM/BUST" ? C.red : C.dim }}>
                    {p.boom_bust === "SAFE" ? "🛡" : p.boom_bust === "BOOM/BUST" ? "🔥" : "◆"} {p.boom_bust}
                  </span>
                </div>
                {p.fills_need && (
                  <div className="mt-2 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full inline-block" style={{
                    fontFamily: MONO, color: C.green, background: "rgba(125,211,160,0.12)", border: "1px solid rgba(125,211,160,0.25)",
                  }}>FILLS NEED</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
