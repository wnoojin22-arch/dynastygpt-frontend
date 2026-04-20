"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { simulateMockDraft } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import MockDraftBoard from "@/components/league/mock-draft/MockDraftBoard";
import { C, MONO, SANS, DISPLAY } from "@/components/league/tokens";

export default function MockDraftPage() {
  const leagueId = useLeagueStore((s) => s.currentLeagueId) || "";
  const owner = useLeagueStore((s) => s.currentOwner) || "";
  const ownerId = useLeagueStore((s) => s.currentOwnerId) || "";
  const mobile = useIsMobile();

  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});

  // Initial simulation
  useEffect(() => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);
    simulateMockDraft(leagueId, { user_owner: owner, user_owner_id: ownerId })
      .then((data) => {
        setSimulation(data as Record<string, unknown>);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to simulate");
        setLoading(false);
      });
  }, [leagueId, owner, ownerId]);

  const handleUserPick = useCallback((slot: string, prospectName: string) => {
    setUserPicks((prev) => ({ ...prev, [slot]: prospectName }));
  }, []);

  const rounds = (simulation?.rounds as number) || 4;
  const format = (simulation?.format as string) || "SF";
  const numTeams = (simulation?.num_teams as number) || 12;
  const tep = (simulation?.te_premium as boolean) || false;

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 16,
      }}>
        <div style={{
          fontFamily: DISPLAY, fontSize: 22, color: C.gold,
          letterSpacing: "0.10em",
        }}>
          SIMULATING DRAFT
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>
          Running 100 simulations across {numTeams} owners...
        </div>
        <div style={{
          width: 200, height: 4, background: C.elevated, borderRadius: 2,
          overflow: "hidden", marginTop: 8,
        }}>
          <div style={{
            width: "60%", height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})`,
            animation: "loading-pulse 1.5s ease-in-out infinite",
          }} />
        </div>
        <style>{`@keyframes loading-pulse{0%,100%{width:30%}50%{width:80%}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: C.red }}>{error}</div>
      </div>
    );
  }

  if (!simulation) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: mobile ? "12px 16px" : "14px 24px",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, ${C.gold}06, transparent 60%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: DISPLAY, fontSize: mobile ? 16 : 20,
            color: C.gold, letterSpacing: "0.08em",
          }}>
            MOCK DRAFT 2026
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800,
            padding: "3px 8px", borderRadius: 4,
            background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
            color: C.gold, letterSpacing: "0.08em",
          }}>
            {format}{tep ? " TEP" : ""}
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 10px", borderRadius: 12,
          background: "rgba(212,165,50,0.06)", border: "1px solid rgba(212,165,50,0.22)",
        }}>
          <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, color: "#d4a532" }}>powered by</span>
          <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, color: "#eeeef2" }}>
            DynastyGPT<span style={{ color: "#d4a532" }}>.com</span>
          </span>
        </div>
      </div>

      {/* Round tabs */}
      <div style={{
        display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`,
        background: C.panel, flexShrink: 0,
      }}>
        {Array.from({ length: rounds }, (_, i) => i + 1).map((rd) => (
          <button
            key={rd}
            onClick={() => setCurrentRound(rd)}
            style={{
              flex: 1, padding: mobile ? "10px 0" : "12px 0",
              background: currentRound === rd ? `${C.gold}12` : "transparent",
              borderBottom: currentRound === rd ? `2px solid ${C.gold}` : "2px solid transparent",
              border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: mobile ? 11 : 12,
              fontWeight: 800, letterSpacing: "0.08em",
              color: currentRound === rd ? C.gold : C.dim,
              transition: "all 0.15s",
            }}
          >
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

      {/* Footer */}
      <div style={{
        padding: "8px 16px", borderTop: `1px solid ${C.border}`,
        textAlign: "center", flexShrink: 0,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
          Powered by {((simulation.consensus_board as unknown[]) || []).length} prospect rankings
          {" "} {simulation.simulations_run} simulations
        </span>
      </div>
    </div>
  );
}
