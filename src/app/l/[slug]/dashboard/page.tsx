"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/lib/api";
import DashboardView from "@/components/league/DashboardView";

export default function DashboardPage() {
  const { currentLeagueId: lid, currentOwner: owner } = useLeagueStore();

  if (!lid) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-sans text-sm text-dim">No league loaded</p>
    </div>
  );

  if (!owner) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="text-center">
        <div className="font-serif text-2xl font-black italic text-gold-bright mb-2">Select Your Team</div>
        <p className="font-sans text-xs text-dim">Choose an owner from the header dropdown to access your dashboard.</p>
      </div>
    </div>
  );

  return <DashboardView lid={lid} owner={owner} />;
}
