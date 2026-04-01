"use client";

/**
 * TRADE BUILDER — Orchestrator
 * Detects mobile vs desktop and renders the appropriate experience.
 * All shared state/logic lives in useTradeBuilder hook.
 */
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTradeBuilder } from "@/hooks/useTradeBuilder";
import TradeBuilderDesktop from "./TradeBuilderDesktop";
import TradeBuilderMobile from "./TradeBuilderMobile";

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
    return <TradeBuilderMobile tb={tb} leagueId={leagueId} owner={owner} ownerId={ownerId} />;
  }

  return <TradeBuilderDesktop tb={tb} leagueId={leagueId} owner={owner} />;
}
