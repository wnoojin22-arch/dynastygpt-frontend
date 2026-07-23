"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import WaiversView from "@/components/league/WaiversView";

export default function WaiversPage() {
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId: ownerId, savedLeagues } =
    useLeagueStore();
  const leagueName = savedLeagues.find((l) => l.id === lid)?.name ?? "";

  if (!lid) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-sans text-sm text-dim">No league loaded</p>
    </div>
  );
  if (!owner) return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="text-center">
        <div className="font-serif text-2xl font-black italic text-gold-bright mb-2">Select Your Team</div>
        <p className="font-sans text-xs text-dim">Choose an owner from the header dropdown to view waiver-wire recommendations.</p>
      </div>
    </div>
  );

  return <WaiversView lid={lid} owner={owner} ownerId={ownerId} leagueName={leagueName} />;
}
