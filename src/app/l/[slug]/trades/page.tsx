"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import LeagueTradesView from "@/components/league/LeagueTradesView";

export default function TradesPage() {
  const { currentLeagueId: lid } = useLeagueStore();

  if (!lid) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#9596a5" }}>No league loaded</p>
    </div>
  );

  return <LeagueTradesView leagueId={lid} />;
}
