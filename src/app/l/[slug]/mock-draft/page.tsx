"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import { getMockDraftPreDraft, simulateMockDraft } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import MockDraftBoard from "@/components/league/mock-draft/MockDraftBoard";
import { C, MONO, SANS, DISPLAY, posColor } from "@/components/league/tokens";

const POS_COLORS: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };
const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: C.red, bg: "rgba(228,114,114,0.12)" },
  WEAK: { color: "#e09c6b", bg: "rgba(224,156,107,0.12)" },
  AVERAGE: { color: C.secondary, bg: "rgba(176,178,200,0.08)" },
  STRONG: { color: C.green, bg: "rgba(125,211,160,0.12)" },
  ELITE: { color: C.gold, bg: "rgba(212,165,50,0.12)" },
};

type Phase = "landing" | "simulating" | "draft";

export default function MockDraftPage() {
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const owner = useLeagueStore((s) => s.currentOwner) || "";
  const ownerId = useLeagueStore((s) => s.currentOwnerId) || "";
  const mobile = useIsMobile();

  const [phase, setPhase] = useState<Phase>("landing");
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});

  // Pre-draft data (lightweight, instant)
  const { data: preDraft, isLoading: loadingPreDraft } = useQuery({
    queryKey: ["mock-draft-pre", leagueId, owner],
    queryFn: () => getMockDraftPreDraft(leagueId, owner, ownerId),
    enabled: !!leagueId,
    staleTime: 300000,
  });

  const pd = preDraft as Record<string, unknown> | undefined;

  const handleSimulate = useCallback(async () => {
    setPhase("simulating");
    setSimError(null);
    try {
      const data = await simulateMockDraft(leagueId, { user_owner: owner, user_owner_id: ownerId });
      setSimulation(data as Record<string, unknown>);
      setPhase("draft");
    } catch (e) {
      setSimError(e instanceof Error ? e.message : "Simulation failed");
      setPhase("landing");
    }
  }, [leagueId, owner, ownerId]);

  const handleUserPick = useCallback((slot: string, prospectName: string) => {
    setUserPicks((prev) => ({ ...prev, [slot]: prospectName }));
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SIMULATING PHASE — loading animation
  // ═══════════════════════════════════════════════════════════
  if (phase === "simulating") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "70vh", gap: 20, padding: 20,
      }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 24, color: C.gold, letterSpacing: "0.10em" }}>
          SIMULATING DRAFT
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, textAlign: "center" }}>
          Running 100 Monte Carlo simulations across {(pd?.num_teams as number) || 12} owners...
        </div>
        <div style={{ width: 240, height: 5, background: C.elevated, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})`,
            animation: "sim-bar 2s ease-in-out infinite",
          }} />
        </div>
        <style>{`@keyframes sim-bar{0%{width:10%}50%{width:85%}100%{width:10%}}`}</style>
        {simError && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.red, marginTop: 8 }}>{simError}</div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DRAFT PHASE — board + interactive picking
  // ═══════════════════════════════════════════════════════════
  if (phase === "draft" && simulation) {
    const rounds = (simulation.rounds as number) || 4;
    const format = (simulation.format as string) || "SF";
    const tep = (simulation.te_premium as boolean) || false;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div style={{
          padding: mobile ? "10px 14px" : "12px 24px",
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(135deg, ${C.gold}06, transparent 60%)`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: mobile ? 14 : 18, color: C.gold, letterSpacing: "0.08em" }}>
              MOCK DRAFT 2026
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
              background: `${C.gold}15`, border: `1px solid ${C.gold}30`, color: C.gold,
            }}>
              {format}{tep ? " TEP" : ""}
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10,
            background: "rgba(212,165,50,0.06)", border: "1px solid rgba(212,165,50,0.22)",
          }}>
            <span style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, color: "#d4a532" }}>powered by</span>
            <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 900, color: "#eeeef2" }}>
              DynastyGPT<span style={{ color: "#d4a532" }}>.com</span>
            </span>
          </div>
        </div>

        {/* Round tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0 }}>
          {Array.from({ length: rounds }, (_, i) => i + 1).map((rd) => (
            <button key={rd} onClick={() => setCurrentRound(rd)} style={{
              flex: 1, padding: mobile ? "9px 0" : "11px 0", border: "none", cursor: "pointer",
              background: currentRound === rd ? `${C.gold}12` : "transparent",
              borderBottom: currentRound === rd ? `2px solid ${C.gold}` : "2px solid transparent",
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              color: currentRound === rd ? C.gold : C.dim, transition: "all 0.15s",
            }}>
              R{rd}
            </button>
          ))}
        </div>

        {/* Board */}
        <MockDraftBoard
          simulation={simulation}
          currentRound={currentRound}
          userPicks={userPicks}
          onUserPick={handleUserPick}
          userOwner={owner}
          mobile={mobile}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING PHASE — pre-draft overview
  // ═══════════════════════════════════════════════════════════
  if (loadingPreDraft) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>Loading draft intel...</span>
      </div>
    );
  }

  const grades = (pd?.positional_grades || {}) as Record<string, string>;
  const needs = (pd?.needs || []) as string[];
  const myPicks = (pd?.user_picks || []) as Array<{ slot: string; round: number; picks_before: number }>;
  const topProspects = (pd?.top_prospects || []) as Array<{
    name: string; position: string; rank: number; tier: number; boom_bust: string; fills_need: boolean;
  }>;
  const format = (pd?.format as string) || "SF";
  const tep = (pd?.te_premium as boolean) || false;
  const leagueName = (pd?.league_name as string) || "";

  return (
    <div style={{ padding: mobile ? "16px 14px" : "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 10,
          background: "rgba(212,165,50,0.06)", border: "1px solid rgba(212,165,50,0.22)", marginBottom: 12,
        }}>
          <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: "#d4a532" }}>powered by</span>
          <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, color: "#eeeef2" }}>
            DynastyGPT<span style={{ color: "#d4a532" }}>.com</span>
          </span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: mobile ? 22 : 28, color: C.gold, letterSpacing: "0.08em" }}>
          MOCK DRAFT 2026
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, marginTop: 4 }}>
          {leagueName}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4,
            background: `${C.gold}15`, border: `1px solid ${C.gold}30`, color: C.gold,
          }}>
            {format}{tep ? " TEP" : ""}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4,
            background: C.elevated, border: `1px solid ${C.border}`, color: C.primary,
          }}>
            {pd?.owner as string}
          </span>
        </div>
      </div>

      {/* Your Draft Position */}
      <div style={{
        background: C.card, border: `1px solid ${C.gold}25`, borderRadius: 10,
        padding: mobile ? "14px 14px" : "16px 20px", marginBottom: 16,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.10em", marginBottom: 10 }}>
          YOUR PICKS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {myPicks.map((p) => (
            <div key={p.slot} style={{
              padding: "8px 12px", borderRadius: 6,
              background: `${C.gold}08`, border: `1px solid ${C.gold}30`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, color: C.gold }}>{p.slot}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
                {p.picks_before} pick{p.picks_before !== 1 ? "s" : ""} before
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Roster Needs */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: mobile ? "14px 14px" : "16px 20px", marginBottom: 16,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, letterSpacing: "0.10em", marginBottom: 10 }}>
          YOUR ROSTER NEEDS
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
            const grade = grades[pos] || "AVERAGE";
            const gc = GRADE_COLORS[grade] || GRADE_COLORS.AVERAGE;
            return (
              <div key={pos} style={{
                flex: 1, minWidth: 70, padding: "8px 10px", borderRadius: 6,
                background: gc.bg, border: `1px solid ${gc.color}30`,
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 900,
                  color: POS_COLORS[pos] || C.dim, marginBottom: 2,
                }}>
                  {pos}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: gc.color }}>
                  {grade}
                </div>
              </div>
            );
          })}
        </div>
        {needs.length > 0 && (
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, marginTop: 8, lineHeight: 1.4 }}>
            You need <strong style={{ color: C.primary }}>{needs.join(" and ")}</strong> most.
            The simulation will recommend prospects that fill these gaps.
          </div>
        )}
        {needs.length === 0 && (
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginTop: 8 }}>
            Your roster has no critical needs. Focus on BPA or trading back for value.
          </div>
        )}
      </div>

      {/* Top Prospects Preview */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: mobile ? "14px 14px" : "16px 20px", marginBottom: 24,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, letterSpacing: "0.10em", marginBottom: 10 }}>
          TOP PROSPECTS
        </div>
        {topProspects.map((p, i) => {
          const pc = POS_COLORS[p.position] || C.dim;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0",
              borderBottom: i < topProspects.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim, width: 24 }}>
                #{p.rank}
              </span>
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 900, color: pc,
                background: `${pc}18`, padding: "2px 5px", borderRadius: 3, minWidth: 26, textAlign: "center",
              }}>
                {p.position}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>
                {p.name}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
                Tier {p.tier}
              </span>
              {p.fills_need && (
                <span style={{
                  fontFamily: MONO, fontSize: 8, fontWeight: 800, color: C.green,
                  background: C.greenDim, padding: "2px 5px", borderRadius: 3,
                }}>
                  NEED
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* SIMULATE BUTTON */}
      <button
        onClick={handleSimulate}
        style={{
          width: "100%", padding: "18px 0", borderRadius: 12, border: "2px solid rgba(212,165,50,0.4)",
          background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
          fontFamily: MONO, fontSize: 15, fontWeight: 900, letterSpacing: "0.12em",
          color: C.bg, cursor: "pointer",
          boxShadow: "0 4px 24px rgba(212,165,50,0.3), 0 0 40px rgba(212,165,50,0.1)",
          transition: "transform 0.1s, box-shadow 0.1s",
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        SIMULATE DRAFT
      </button>
    </div>
  );
}
