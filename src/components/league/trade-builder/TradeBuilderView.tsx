"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getRoster, getLeagueIntel, getOwners } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "../tokens";
import RosterColumn from "./RosterColumn";
import TradeTray from "./TradeTray";
import AnalysisModal from "./AnalysisModal";
import type { RosterPlayer, TradeEvaluation, SuggestedPackage } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════
   TRADE BUILDER VIEW — 3-column layout: Your Roster | Tray | Their Roster
   ═══════════════════════════════════════════════════════════════ */
export default function TradeBuilderView({ leagueId, owner }: {
  leagueId: string; owner: string;
}) {
  // State
  const [partner, setPartner] = useState<string>("");
  const [giveNames, setGiveNames] = useState<string[]>([]);
  const [receiveNames, setReceiveNames] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<TradeEvaluation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Data queries
  const { data: ownersData } = useQuery({
    queryKey: ["owners", leagueId],
    queryFn: () => getOwners(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });
  const { data: ownerRoster } = useQuery({
    queryKey: ["roster", leagueId, owner],
    queryFn: () => getRoster(leagueId, owner),
    enabled: !!leagueId && !!owner,
  });
  const { data: partnerRoster } = useQuery({
    queryKey: ["roster", leagueId, partner],
    queryFn: () => getRoster(leagueId, partner),
    enabled: !!leagueId && !!partner,
  });
  const { data: leagueIntel } = useQuery({
    queryKey: ["league-intel", leagueId],
    queryFn: () => getLeagueIntel(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });

  // Build roster arrays from API response
  const myRoster: RosterPlayer[] = useMemo(() => {
    if (!ownerRoster) return [];
    const all: RosterPlayer[] = [];
    for (const pos of ["QB", "RB", "WR", "TE"] as const) {
      for (const p of (ownerRoster.by_position?.[pos] || [])) {
        all.push({
          name: p.name, name_clean: p.name_clean, position: pos,
          sha_value: p.sha_value || 0, sha_pos_rank: p.sha_pos_rank || "",
          age: p.age || null,
        });
      }
    }
    return all;
  }, [ownerRoster]);

  const theirRoster: RosterPlayer[] = useMemo(() => {
    if (!partnerRoster) return [];
    const all: RosterPlayer[] = [];
    for (const pos of ["QB", "RB", "WR", "TE"] as const) {
      for (const p of (partnerRoster.by_position?.[pos] || [])) {
        all.push({
          name: p.name, name_clean: p.name_clean, position: pos,
          sha_value: p.sha_value || 0, sha_pos_rank: p.sha_pos_rank || "",
          age: p.age || null,
        });
      }
    }
    return all;
  }, [partnerRoster]);

  // Positional grades from league intel
  const myGrades = useMemo(() => {
    const intel = leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === owner.toLowerCase());
    if (!intel?.positional_grades) return {};
    return intel.positional_grades as Record<string, string>;
  }, [leagueIntel, owner]);

  const theirGrades = useMemo(() => {
    const intel = leagueIntel?.owners?.find((o: { owner: string }) => o.owner.toLowerCase() === partner.toLowerCase());
    if (!intel?.positional_grades) return {};
    return intel.positional_grades as Record<string, string>;
  }, [leagueIntel, partner]);

  // Moveable names for partner (to show lock icons)
  const partnerMoveableNames = useMemo(() => {
    // Simplified: players with SHA > 8000 or young stars are untouchable
    const moveable = new Set<string>();
    for (const p of theirRoster) {
      if (p.sha_value < 8000 || (p.age && p.age >= 28)) {
        moveable.add(p.name_clean);
      }
    }
    return moveable;
  }, [theirRoster]);

  // Other owners for partner dropdown
  const otherOwners = useMemo(() => {
    return (ownersData?.owners || []).filter((o: { name: string }) => o.name.toLowerCase() !== owner.toLowerCase());
  }, [ownersData, owner]);

  // Clear trade when partner changes
  useEffect(() => {
    setGiveNames([]);
    setReceiveNames([]);
    setEvaluation(null);
  }, [partner]);

  // Toggle functions
  const toggleGive = useCallback((name: string) => {
    setGiveNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setEvaluation(null);
  }, []);

  const toggleReceive = useCallback((name: string) => {
    setReceiveNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setEvaluation(null);
  }, []);

  // Analyze trade
  const handleAnalyze = useCallback(async () => {
    if (!giveNames.length || !receiveNames.length) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          i_give: giveNames,
          i_receive: receiveNames,
          owner,
          partner: partner || undefined,
        }),
      });
      const data = await res.json();
      setEvaluation(data as TradeEvaluation);
      setShowModal(true);
    } catch (e) {
      console.error("Analyze failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [giveNames, receiveNames, owner, partner, leagueId]);

  // Clear trade
  const handleClear = useCallback(() => {
    setGiveNames([]);
    setReceiveNames([]);
    setEvaluation(null);
  }, []);

  if (!owner) return (
    <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>
      Select an owner to use the Trade Builder.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── HEADER: Partner selector ── */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 16, color: C.gold }}>TRADE BUILDER</span>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <span style={{ fontFamily: SANS, fontSize: 12, color: C.dim }}>Trade with:</span>
        <select
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
          style={{
            padding: "5px 10px", borderRadius: 4,
            border: `1px solid ${partner ? C.goldBorder : C.border}`,
            background: partner ? C.goldDim : C.card,
            color: C.primary, fontSize: 12, fontFamily: SANS, fontWeight: 600,
            outline: "none", cursor: "pointer",
          }}
        >
          <option value="" style={{ background: C.card }}>Select Partner</option>
          {otherOwners.map((o: { name: string }) => (
            <option key={o.name} value={o.name} style={{ background: C.card }}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div style={{ flex: 1, display: "flex", gap: 8, padding: 8, overflow: "hidden", minHeight: 0 }}>
        {/* LEFT: Your Roster */}
        <RosterColumn
          title={`${owner.toUpperCase()}'S ROSTER`}
          roster={myRoster}
          selectedNames={giveNames}
          onToggle={toggleGive}
          side="give"
          posGrades={myGrades}
        />

        {/* CENTER: Trade Tray (only if partner selected) */}
        {partner && (
          <TradeTray
            giveNames={giveNames}
            receiveNames={receiveNames}
            giveRoster={myRoster}
            receiveRoster={theirRoster}
            evaluation={evaluation}
            analyzing={analyzing}
            onRemoveGive={(n) => { setGiveNames(prev => prev.filter(x => x !== n)); setEvaluation(null); }}
            onRemoveReceive={(n) => { setReceiveNames(prev => prev.filter(x => x !== n)); setEvaluation(null); }}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
          />
        )}

        {/* RIGHT: Partner Roster or placeholder */}
        {partner ? (
          <RosterColumn
            title={`${partner.toUpperCase()}'S ROSTER`}
            roster={theirRoster}
            selectedNames={receiveNames}
            onToggle={toggleReceive}
            side="receive"
            posGrades={theirGrades}
            moveableNames={partnerMoveableNames}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 20, color: C.gold, marginBottom: 8 }}>Select a Trade Partner</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>Choose an owner from the dropdown above to start building a trade.</div>
            </div>
          </div>
        )}
      </div>

      {/* ── ANALYSIS MODAL ── */}
      {showModal && evaluation && (
        <AnalysisModal
          evaluation={evaluation}
          owner={owner}
          partner={partner}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
