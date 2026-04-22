"use client";

/**
 * TradeUpPanel — inline-expanded list of picks AHEAD of the user's current
 * slot. Ordered by pick number (nearest to user first) because a jump of
 * one slot costs less than four. 24-pick cap with "Show more" for
 * deeper-round picks. Each row has the partner's grade pills + willingness
 * badge; willingness is loaded in a single /likely-buyers?direction=up call
 * on expansion.
 *
 * The panel is purely presentational — the parent decides when it's open,
 * passes in simId/leagueId/userOwner, and receives onExplore(direction,
 * target_slot, partner_owner) when the user clicks Explore on a row.
 *
 * NOTE: The "Likely Buyers" strip is intentionally NOT rendered here —
 * that UI element is unique to TradeBackPanel. Both panels consume the
 * same /likely-buyers endpoint but only one surfaces the top-3 strip.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { C } from "@/components/league/tokens";
import { mockDraftLikelyBuyers } from "@/lib/api";
import type {
  LikelyBuyer,
  LikelyBuyersResponse,
} from "@/lib/stores/mock-draft-store";
import type { ChalkPick } from "./contracts";
import { PanelError, SlotRow } from "./TradePanelShared";
import { picksAheadOfSlot } from "./trade-panel-rows";

const VISIBLE_CAP = 24;

export interface TradeUpPanelProps {
  open: boolean;
  chalk: ChalkPick[];
  currentSlot: string;
  numTeams: number;
  leagueId: string;
  simId: string | null;
  userOwner: string;
  userOwnerId: string | null;
  onExplore: (direction: "up", targetSlot: string, partnerOwner: string) => void;
}

type FetchState = "idle" | "loading" | "ready" | "error";

export default function TradeUpPanel({
  open,
  chalk,
  currentSlot,
  numTeams,
  leagueId,
  simId,
  userOwner,
  userOwnerId,
  onExplore,
}: TradeUpPanelProps) {
  const [buyersByOwner, setBuyersByOwner] = useState<Record<string, LikelyBuyer>>({});
  const [status, setStatus] = useState<FetchState>("idle");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(
    () => picksAheadOfSlot(chalk, currentSlot, numTeams, userOwner),
    [chalk, currentSlot, numTeams, userOwner],
  );

  const visible = useMemo(
    () => (showAll ? rows : rows.slice(0, VISIBLE_CAP)),
    [rows, showAll],
  );

  const fetchWillingness = useCallback(async () => {
    if (!simId) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const raw = await mockDraftLikelyBuyers(leagueId, {
        sim_id: simId,
        slot: currentSlot,
        direction: "up",
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
        limit: 32,                   // cover every partner
      }) as LikelyBuyersResponse;
      const map: Record<string, LikelyBuyer> = {};
      for (const b of raw.buyers ?? []) map[b.partner_owner] = b;
      setBuyersByOwner(map);
      setStatus("ready");
    } catch (e) {
      console.warn("[trade-up] /likely-buyers failed", e);
      setStatus("error");
    }
  }, [leagueId, simId, currentSlot, userOwner, userOwnerId]);

  // Fire the bulk fetch once when the panel opens; refire on sim change.
  useEffect(() => {
    if (!open) return;
    if (status === "idle") fetchWillingness();
  }, [open, status, fetchWillingness]);

  // If sim flips underneath us, reset + refetch.
  useEffect(() => {
    setBuyersByOwner({});
    setStatus("idle");
  }, [simId, currentSlot]);

  if (!open) return null;

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{
        background: "rgba(10,13,21,0.65)",
        border: `1px solid rgba(255,255,255,0.05)`,
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
      `}</style>

      <header
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{ color: C.gold }}
          >
            Trade up
          </span>
          <span className="text-[10px]" style={{ color: C.dim }}>
            {rows.length} pick{rows.length === 1 ? "" : "s"} ahead of {currentSlot}
          </span>
        </div>
        <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>
          Nearest first
        </span>
      </header>

      {status === "error" && (
        <PanelError
          msg="Couldn't load willingness — partners unavailable."
          onRetry={fetchWillingness}
        />
      )}

      {rows.length === 0 && status !== "error" && (
        <div className="px-3 py-4 text-[12px]" style={{ color: C.dim }}>
          You're on the clock — no picks ahead of you.
        </div>
      )}

      {visible.map((c) => (
        <SlotRow
          key={c.slot}
          slot={c.slot}
          owner={c.owner}
          buyer={buyersByOwner[c.owner]}
          onExplore={() => onExplore("up", c.slot, c.owner)}
          disabled={buyersByOwner[c.owner]?.willingness.band === "UNLIKELY"}
        />
      ))}

      {rows.length > VISIBLE_CAP && (
        <div className="px-3 py-2" style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: C.secondary }}
          >
            {showAll
              ? `Show fewer`
              : `Show ${rows.length - VISIBLE_CAP} more →`}
          </button>
        </div>
      )}
    </section>
  );
}
