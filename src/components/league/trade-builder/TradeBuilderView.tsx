"use client";

/**
 * TRADE BUILDER — Orchestrator
 * Desktop: original 3-column builder (TradeBuilderDesktop)
 * Mobile: new unified builder (TradeBuilderUnified) with search, owner grid, suggest
 */
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTradeBuilder } from "@/hooks/useTradeBuilder";
import TradeBuilderDesktop from "./TradeBuilderDesktop";
import TradeBuilderProvider from "./TradeBuilderProvider";
import TradeBuilderUnified from "./TradeBuilderUnified";

export default function TradeBuilderView({
  leagueId,
  owner,
  ownerId,
}: {
  leagueId: string;
  owner: string;
  ownerId?: string | null;
}) {
  const isMobile = useIsMobile();
  const tb = useTradeBuilder({ leagueId, owner, ownerId });

  if (isMobile) {
    return (
      <TradeBuilderProvider leagueId={leagueId} owner={owner} ownerId={ownerId}>
        <TradeBuilderUnified />
      </TradeBuilderProvider>
    );
  }

  return <TradeBuilderDesktop tb={tb} leagueId={leagueId} owner={owner} />;
}
