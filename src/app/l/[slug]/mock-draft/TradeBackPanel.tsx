"use client";

/**
 * TradeBackPanel — inline-expanded list of picks BEHIND the user's current
 * slot. Ordered nearest-first (shortest slide down costs least). 24-pick
 * cap with Show more.
 *
 * Also renders the "Likely Buyers" strip at the top — top 3 partners from
 * /likely-buyers?direction=back, each with a single-line preview of the
 * slots they own (their potential offer). Strip is purely informational;
 * clicking Explore on a strip card opens the modal against that partner's
 * nearest-owned slot.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { C } from "@/components/league/tokens";
import { mockDraftLikelyBuyers } from "@/lib/api";
import type {
  LikelyBuyer,
  LikelyBuyersResponse,
} from "@/lib/stores/mock-draft-store";
import type { ChalkPick } from "./contracts";
import {
  GradePills, PanelError, SlotRow, WillingnessBadge,
} from "./TradePanelShared";
import { picksBehindSlot, targetSlotForBuyerCard } from "./trade-panel-rows";

const VISIBLE_CAP = 24;
const LIKELY_BUYERS_TOP_N = 3;

export interface TradeBackPanelProps {
  open: boolean;
  chalk: ChalkPick[];
  currentSlot: string;
  numTeams: number;
  leagueId: string;
  simId: string | null;
  userOwner: string;
  userOwnerId: string | null;
  onExplore: (direction: "back", targetSlot: string, partnerOwner: string) => void;
}

type FetchState = "idle" | "loading" | "ready" | "error";

export default function TradeBackPanel({
  open,
  chalk,
  currentSlot,
  numTeams,
  leagueId,
  simId,
  userOwner,
  userOwnerId,
  onExplore,
}: TradeBackPanelProps) {
  const [buyersByOwner, setBuyersByOwner] = useState<Record<string, LikelyBuyer>>({});
  const [topBuyers, setTopBuyers] = useState<LikelyBuyer[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(
    () => picksBehindSlot(chalk, currentSlot, numTeams, userOwner),
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
        direction: "back",
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
        limit: 32,
      }) as LikelyBuyersResponse;
      const all = raw.buyers ?? [];
      const map: Record<string, LikelyBuyer> = {};
      for (const b of all) map[b.partner_owner] = b;
      setBuyersByOwner(map);
      // Top buyers come back score-desc from the API; filter out UNLIKELY
      // so the strip always feels actionable.
      setTopBuyers(
        all.filter((b) => b.willingness.band !== "UNLIKELY").slice(0, LIKELY_BUYERS_TOP_N),
      );
      setStatus("ready");
    } catch (e) {
      console.warn("[trade-back] /likely-buyers failed", e);
      setStatus("error");
    }
  }, [leagueId, simId, currentSlot, userOwner, userOwnerId]);

  useEffect(() => {
    if (!open) return;
    if (status === "idle") fetchWillingness();
  }, [open, status, fetchWillingness]);

  useEffect(() => {
    setBuyersByOwner({});
    setTopBuyers([]);
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
            Trade back
          </span>
          <span className="text-[10px]" style={{ color: C.dim }}>
            {rows.length} pick{rows.length === 1 ? "" : "s"} after {currentSlot}
          </span>
        </div>
        <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>
          Nearest first
        </span>
      </header>

      {/* ── Likely Buyers strip ─────────────────────────────────────────── */}
      {status === "ready" && topBuyers.length > 0 && (
        <div
          className="px-3 py-2.5"
          style={{
            background: "rgba(212,165,50,0.04)",
            borderBottom: `1px solid rgba(212,165,50,0.14)`,
          }}
        >
          <div
            className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2"
            style={{ color: C.gold }}
          >
            Likely buyers · top {topBuyers.length}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {topBuyers.map((b) => {
              const preview = (b.slots_owned ?? []).slice(0, 3).join(" · ") || "—";
              const target = targetSlotForBuyerCard(
                b.slots_owned ?? [], currentSlot, numTeams,
              );
              return (
                <button
                  key={b.partner_owner}
                  type="button"
                  onClick={() => target && onExplore("back", target, b.partner_owner)}
                  disabled={!target}
                  className="text-left rounded p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(10,13,21,0.65)",
                    border: `1px solid rgba(255,255,255,0.06)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-[12px] font-semibold truncate"
                      style={{ color: C.primary }}
                    >
                      {b.partner_owner}
                    </span>
                    <WillingnessBadge
                      band={b.willingness.band}
                      score={b.willingness.score}
                    />
                  </div>
                  <div
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className="text-[10px] tabular-nums truncate"
                      style={{ color: C.dim }}
                      title={(b.slots_owned ?? []).join(" · ")}
                    >
                      Owns {preview}
                    </span>
                    <GradePills grades={b.grades} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {status === "error" && (
        <PanelError
          msg="Couldn't load willingness — partners unavailable."
          onRetry={fetchWillingness}
        />
      )}

      {rows.length === 0 && status !== "error" && (
        <div className="px-3 py-4 text-[12px]" style={{ color: C.dim }}>
          No picks behind your current slot.
        </div>
      )}

      {visible.map((c) => (
        <SlotRow
          key={c.slot}
          slot={c.slot}
          owner={c.owner}
          buyer={buyersByOwner[c.owner]}
          onExplore={() => onExplore("back", c.slot, c.owner)}
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
