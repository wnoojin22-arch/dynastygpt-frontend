"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import TradeBuilderProvider from "@/components/league/trade-builder/TradeBuilderProvider";
import TradeBuilderUnified from "@/components/league/trade-builder/TradeBuilderUnified";

export default function TradeAnalyzerPage() {
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId: ownerId } = useLeagueStore();

  if (!lid) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-sans text-sm text-dim">No league loaded</p>
    </div>
  );

  if (!owner) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="text-center">
        <div className="font-serif text-2xl font-black italic text-gold-bright mb-2">Select Your Team</div>
        <p className="font-sans text-xs text-dim">Choose an owner from the header dropdown to access the trade builder.</p>
      </div>
    </div>
  );

  return (
    <TradeBuilderProvider leagueId={lid} owner={owner} ownerId={ownerId}>
      <TradeBuilderUnified />
    </TradeBuilderProvider>
  );
}
