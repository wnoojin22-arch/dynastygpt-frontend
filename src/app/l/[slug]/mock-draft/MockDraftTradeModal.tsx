"use client";

/**
 * MockDraftTradeModal — reusable preview→confirm modal for trade-up and
 * trade-back. Fetches a fresh preview on open, shows cost + verdict +
 * likely player at target, then on Confirm applies the ownership swap
 * locally (commitTrade) and fires /simulate-from-state to refresh the
 * board under the new state. Failure paths revert cleanly via the
 * snapshot returned by commitTrade.
 *
 * State machine:
 *   mount → "loading"   (preview fetch)
 *            ↓
 *        "ready"        (cost + verdict rendered)
 *            ↓ confirm
 *        "committing"   (simulate-from-state in flight)
 *            ↓
 *        onCommitted → parent closes
 *
 *   any fetch failure → "error"  (Retry | Cancel trade)
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  mockDraftTradeUpPreview,
  mockDraftTradeBackPreview,
  simulateMockDraftFromState,
} from "@/lib/api";
import {
  useMockDraftStore,
  type TradePreviewResponse,
  type TradeSnapshot,
} from "@/lib/stores/mock-draft-store";
import type { SimulateResponse } from "./contracts";
import { classifyTradeError, type ClassifiedTradeError } from "./trade-errors";

export { classifyTradeError };
export type { ClassifiedTradeError };

// ─── Props ───────────────────────────────────────────────────────────────
export interface MockDraftTradeModalProps {
  open: boolean;
  direction: "up" | "back";
  targetSlot: string;
  currentSlot: string;
  simId: string | null;
  leagueId: string;
  userOwner: string;
  userOwnerId: string | null;
  /** Close without committing (cancel or x-out). */
  onClose: () => void;
  /** Fires after /simulate-from-state lands and store.setSim has been called. */
  onCommitted?: (sim: SimulateResponse) => void;
}

type ModalStatus = "loading" | "ready" | "committing" | "error";

// ─── Component ───────────────────────────────────────────────────────────
export default function MockDraftTradeModal({
  open,
  direction,
  targetSlot,
  currentSlot,
  simId,
  leagueId,
  userOwner,
  userOwnerId,
  onClose,
  onCommitted,
}: MockDraftTradeModalProps) {
  const [status, setStatus] = useState<ModalStatus>("loading");
  const [preview, setPreview] = useState<TradePreviewResponse | null>(null);
  const [err, setErr] = useState<ClassifiedTradeError | null>(null);

  const registerTrade = useMockDraftStore((s) => s.registerTrade);
  const commitTrade = useMockDraftStore((s) => s.commitTrade);
  const revertTrade = useMockDraftStore((s) => s.revertTrade);
  const clearTrade = useMockDraftStore((s) => s.clearTrade);
  const setSim = useMockDraftStore((s) => s.setSim);
  const getUserPicks = useMockDraftStore((s) => s.userPicks);
  const getLockedPicks = useMockDraftStore((s) => s.lockedPicks);
  const getOwnerOverrides = useMockDraftStore((s) => s.ownerOverrides);

  // ── Fetch preview on open / direction / targetSlot change ──
  const fetchPreview = useCallback(async () => {
    setStatus("loading");
    setErr(null);
    if (!simId) {
      setErr({ kind: "expired", message: "No active sim. Start a draft first." });
      setStatus("error");
      return;
    }
    try {
      const endpoint = direction === "up" ? mockDraftTradeUpPreview : mockDraftTradeBackPreview;
      const resp = (await endpoint(leagueId, {
        sim_id: simId,
        target_slot: targetSlot,
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
      })) as TradePreviewResponse;
      setPreview(resp);
      registerTrade({
        direction,
        target_slot: targetSlot,
        user_owner: userOwner,
        preview: resp,
      });
      setStatus("ready");
    } catch (e) {
      setErr(classifyTradeError(e));
      setStatus("error");
    }
  }, [direction, targetSlot, simId, leagueId, userOwner, userOwnerId, registerTrade]);

  useEffect(() => {
    if (!open) return;
    fetchPreview();
  }, [open, fetchPreview]);

  // ── Cancel path — clean, no mutations beyond modal flags ──
  const handleCancel = useCallback(() => {
    clearTrade();
    setPreview(null);
    setErr(null);
    onClose();
  }, [clearTrade, onClose]);

  // ── Confirm path — commit swap, then re-sim. Revert on re-sim failure. ──
  const handleConfirm = useCallback(async () => {
    const snapshot: TradeSnapshot | null = commitTrade();
    if (!snapshot) {
      // commitTrade hit the no-pending-trade guard; treat as cancel.
      onClose();
      return;
    }
    setStatus("committing");
    try {
      const data = (await simulateMockDraftFromState(leagueId, {
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
        user_picks: getUserPicks,
        locked_picks: getLockedPicks,
        pick_ownership_overrides: getOwnerOverrides,
      })) as SimulateResponse;
      setSim(data);
      onCommitted?.(data);
      onClose();
    } catch (e) {
      revertTrade(snapshot);
      setErr(classifyTradeError(e));
      setStatus("error");
    }
  }, [
    commitTrade,
    revertTrade,
    onClose,
    onCommitted,
    leagueId,
    userOwner,
    userOwnerId,
    getUserPicks,
    getLockedPicks,
    getOwnerOverrides,
    setSim,
  ]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="md-trade-modal-overlay"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Dismiss trade modal"
            className="absolute inset-0 bg-black/70 cursor-pointer"
          />

          <motion.div
            key="md-trade-modal-card"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={[
              "relative w-full md:w-[460px] max-h-[90vh] overflow-y-auto",
              "bg-panel border border-gold/30 rounded-t-2xl md:rounded-2xl",
              "shadow-[0_-18px_60px_rgba(0,0,0,0.6)]",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label={direction === "up" ? "Trade up modal" : "Trade back modal"}
          >
            <Header direction={direction} currentSlot={currentSlot} targetSlot={targetSlot} />

            {status === "loading" && <LoadingBody direction={direction} targetSlot={targetSlot} />}

            {status === "ready" && preview && (
              <ReadyBody
                preview={preview}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            )}

            {status === "committing" && (
              <CommittingBody />
            )}

            {status === "error" && err && (
              <ErrorBody err={err} onRetry={fetchPreview} onCancel={handleCancel} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Subviews ────────────────────────────────────────────────────────────

function Header({
  direction,
  currentSlot,
  targetSlot,
}: {
  direction: "up" | "back";
  currentSlot: string;
  targetSlot: string;
}) {
  const label = direction === "up" ? "Trade up" : "Trade back";
  return (
    <div className="px-5 py-4 border-b border-border-lt flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[9px] font-bold tracking-[0.24em] uppercase text-gold">{label}</div>
        <div className="mt-1 text-[15px] font-semibold text-primary tabular-nums">
          {currentSlot} <span className="text-dim">→</span> {targetSlot}
        </div>
      </div>
      <div className="text-[10px] font-mono tabular-nums text-dim whitespace-nowrap">
        preview
      </div>
    </div>
  );
}

function LoadingBody({ direction, targetSlot }: { direction: "up" | "back"; targetSlot: string }) {
  return (
    <div className="px-5 py-8 flex flex-col items-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      <div className="text-[11px] text-secondary text-center">
        Computing {direction === "up" ? "trade-up" : "trade-back"} to {targetSlot}…
      </div>
    </div>
  );
}

function CommittingBody() {
  return (
    <div className="px-5 py-8 flex flex-col items-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      <div className="text-[11px] text-secondary text-center">
        Applying trade and re-running the sim…
      </div>
    </div>
  );
}

function ErrorBody({
  err,
  onRetry,
  onCancel,
}: {
  err: ClassifiedTradeError;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-3">
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-accent-red">
        Trade failed
      </div>
      <div className="text-[12px] leading-relaxed text-primary">{err.message}</div>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-2.5 rounded-lg bg-gold text-[#1a1204] cursor-pointer"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-2.5 rounded-lg bg-white/5 border border-border-lt text-secondary cursor-pointer"
        >
          Cancel trade
        </button>
      </div>
    </div>
  );
}

function ReadyBody({
  preview,
  onConfirm,
  onCancel,
}: {
  preview: TradePreviewResponse;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const verdictTone = verdictToneClass(preview.verdict);
  const picksGiven = preview.suggested_cost?.picks_given ?? [];
  const picksReceived = preview.picks_received ?? [];

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      {/* Verdict strip */}
      <div
        className={[
          "rounded-lg px-3 py-2.5 flex items-baseline justify-between gap-3",
          verdictTone.bg,
          verdictTone.border,
        ].join(" ")}
      >
        <div className="min-w-0">
          <div className={["text-[10px] font-bold tracking-[0.22em] uppercase", verdictTone.fg].join(" ")}>
            {preview.verdict}
          </div>
          <div className="mt-0.5 text-[12px] leading-snug text-secondary">{preview.verdict_reason}</div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-bold text-primary tabular-nums">
            {preview.acceptance_pct}%
          </div>
          <div className="text-[9px] font-mono tabular-nums text-dim uppercase tracking-[0.14em]">
            accept odds
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <PicksColumn label="You give" picks={picksGiven} tone="red" currentSlot={preview.current_slot} direction={preview.direction} />
        <PicksColumn label="You get" picks={picksReceived} tone="green" targetSlot={preview.target_slot} direction={preview.direction} />
      </div>

      {/* Likely player + fit at target */}
      <div className="rounded-lg bg-card/70 border border-border-lt px-3 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-dim">
            Likely at {preview.target_slot}
          </div>
          <div className="text-[13px] font-semibold text-primary truncate mt-0.5">
            {preview.likely_player_at_target ?? "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold text-gold tabular-nums">{preview.fit_score_at_target}</div>
          <div className="text-[9px] font-mono text-dim uppercase tracking-[0.14em]">fit</div>
        </div>
      </div>

      {/* Value gap — expressed as % delta, no SHA text */}
      {Number.isFinite(preview.value_delta_pct) && (
        <div className="text-[11px] text-dim text-center tabular-nums">
          Value delta:{" "}
          <span className={preview.value_delta_pct >= 0 ? "text-accent-green" : "text-accent-red"}>
            {preview.value_delta_pct >= 0 ? "+" : ""}
            {preview.value_delta_pct.toFixed(1)}%
          </span>{" "}
          vs market
        </div>
      )}

      {/* Partner */}
      <div className="text-[10px] text-dim text-center">
        Counterparty: <span className="text-secondary font-semibold">{preview.partner_owner}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-3 rounded-lg bg-white/5 border border-border-lt text-secondary cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-[2] text-[11px] font-black tracking-[0.16em] uppercase px-3 py-3 rounded-lg bg-gradient-to-b from-gold to-[#b88a26] text-[#1a1204] cursor-pointer shadow-[0_6px_18px_rgba(212,165,50,0.30)]"
        >
          Confirm trade
        </button>
      </div>
    </div>
  );
}

function PicksColumn({
  label,
  picks,
  tone,
  currentSlot,
  targetSlot,
  direction,
}: {
  label: string;
  picks: Array<{ slot: string; round: number; value_sha: number }>;
  tone: "red" | "green";
  currentSlot?: string;
  targetSlot?: string;
  direction: "up" | "back";
}) {
  const primarySlot =
    direction === "up"
      ? label.startsWith("You give")
        ? currentSlot
        : targetSlot
      : label.startsWith("You give")
        ? currentSlot
        : targetSlot;
  const toneCls = tone === "red" ? "text-accent-red" : "text-accent-green";
  return (
    <div className="rounded-lg bg-card/60 border border-border-lt px-3 py-2.5">
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-dim">{label}</div>
      {primarySlot && (
        <div className={["mt-1 text-[14px] font-semibold tabular-nums", toneCls].join(" ")}>
          {primarySlot}
        </div>
      )}
      {picks.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {picks.map((p) => (
            <li key={p.slot} className="text-[11px] text-secondary tabular-nums font-mono">
              + {p.slot}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function verdictToneClass(verdict: string): { fg: string; bg: string; border: string } {
  const v = verdict.toUpperCase();
  if (v === "WIN" || v === "STEAL")
    return { fg: "text-accent-green", bg: "bg-accent-green/10", border: "border border-accent-green/25" };
  if (v === "LOSS" || v === "BAD")
    return { fg: "text-accent-red", bg: "bg-accent-red/10", border: "border border-accent-red/25" };
  return { fg: "text-gold", bg: "bg-gold/10", border: "border border-gold/25" };
}
