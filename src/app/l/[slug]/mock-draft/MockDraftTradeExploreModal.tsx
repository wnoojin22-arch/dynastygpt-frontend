"use client";

/**
 * MockDraftTradeExploreModal — the full per-pick trade exploration surface.
 *
 * On open, fires /trade-explore once and renders the verdict banner,
 * willingness why-lines, up to 3 package tabs, and asset columns. On
 * Confirm, fires /commit-trade and hands the response to onConfirm —
 * parent (3d) applies it to the store and triggers the re-sim.
 *
 * State machine:
 *   open=true  → "loading"   (trade-explore in flight)
 *       ↓
 *     "ready"  → user may switch package tabs
 *       ↓ confirm
 *     "committing" → /commit-trade in flight
 *       ↓
 *     onConfirm(response) → parent closes
 *
 *   any fetch failure → "error" (Retry | Cancel)
 *   /commit-trade failure → back to "ready" + error banner shown above footer
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "@/components/league/tokens";
import {
  mockDraftTradeExplore,
  mockDraftCommitTrade,
} from "@/lib/api";
import type {
  CommitTradeResponse,
  TradeExploreResponse,
  TradePackage,
  TradePackagePick,
  FuturePick,
} from "@/lib/stores/mock-draft-store";
import type { ConsensusBoardEntry } from "./contracts";
import { classifyTradeError, type ClassifiedTradeError } from "./trade-errors";
import { WillingnessBadge } from "./TradePanelShared";
import {
  clampTabIndex,
  formatDeltaLabel,
  formatFuturePickLabel,
  formatPickLabel,
  getDeltaTone,
  getVerdictStyle,
  isConfirmEnabled,
  lookupPlayerPosition,
  tabLabels,
  thinPoolMessage,
} from "./trade-explore-modal-helpers";

type ModalStatus = "loading" | "ready" | "committing" | "error";

export interface MockDraftTradeExploreModalProps {
  open: boolean;
  onClose: () => void;
  simId: string;
  leagueId: string;
  userOwner: string;
  userOwnerId: string | null;
  userSlot: string;             // current slot (for header display)
  targetSlot: string;           // slot the user is exploring into
  partnerOwner: string;
  direction: "up" | "back";
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  onConfirm: (response: CommitTradeResponse) => void;
}

export default function MockDraftTradeExploreModal({
  open,
  onClose,
  simId,
  leagueId,
  userOwner,
  userOwnerId,
  userSlot,
  targetSlot,
  partnerOwner,
  direction,
  consensusBoard,
  onConfirm,
}: MockDraftTradeExploreModalProps) {
  const [status, setStatus] = useState<ModalStatus>("loading");
  const [data, setData] = useState<TradeExploreResponse | null>(null);
  const [tabIdx, setTabIdx] = useState(0);
  const [err, setErr] = useState<ClassifiedTradeError | null>(null);
  const [commitErr, setCommitErr] = useState<string | null>(null);

  // ─── Fetch on open ──────────────────────────────────────────────────────
  const fetchExplore = useCallback(async () => {
    setStatus("loading");
    setErr(null);
    try {
      const resp = (await mockDraftTradeExplore(leagueId, {
        sim_id: simId,
        direction,
        target_slot: targetSlot,
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
        include_future_picks: true,
      })) as TradeExploreResponse;
      setData(resp);
      setTabIdx(0);
      setStatus("ready");
    } catch (e) {
      setErr(classifyTradeError(e));
      setStatus("error");
    }
  }, [leagueId, simId, direction, targetSlot, userOwner, userOwnerId]);

  useEffect(() => {
    if (!open) return;
    fetchExplore();
  }, [open, fetchExplore]);

  // Reset local state when modal closes so a re-open starts clean.
  useEffect(() => {
    if (open) return;
    setData(null);
    setErr(null);
    setCommitErr(null);
    setStatus("loading");
    setTabIdx(0);
  }, [open]);

  const pkgs = data?.packages ?? [];
  const activeIdx = clampTabIndex(tabIdx, pkgs.length);
  const activePkg: TradePackage | null = pkgs[activeIdx] ?? null;

  // ─── Confirm handler ────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!activePkg) return;
    setCommitErr(null);
    setStatus("committing");
    try {
      const resp = (await mockDraftCommitTrade(leagueId, {
        sim_id: simId,
        direction,
        package: activePkg as unknown as Record<string, unknown>,
        partner_owner: partnerOwner,
        user_owner: userOwner,
        user_owner_id: userOwnerId ?? undefined,
      })) as CommitTradeResponse;
      onConfirm(resp);
      // parent closes modal + triggers re-sim; we don't call onClose here
      // so the parent stays authoritative on lifecycle.
    } catch (e) {
      const msg = classifyTradeError(e).message;
      setCommitErr(msg);
      setStatus("ready");
    }
  }, [
    activePkg, leagueId, simId, direction, partnerOwner,
    userOwner, userOwnerId, onConfirm,
  ]);

  // ─── Derived values ─────────────────────────────────────────────────────
  const verdict = activePkg?.verdict;
  const verdictStyle = useMemo(
    () => (verdict ? getVerdictStyle(verdict.label) : null),
    [verdict],
  );
  const confirmEnabled = isConfirmEnabled(activePkg);
  const thinMsg = data ? thinPoolMessage(pkgs.length) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mde-overlay"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss trade modal"
            className="absolute inset-0 cursor-pointer"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }}
          />

          <motion.div
            key="mde-card"
            initial={{ y: 30, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full md:w-[640px] max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl"
            style={{
              background: C.panel,
              border: `1px solid ${C.borderLt}`,
              boxShadow: "0 -18px 60px rgba(0,0,0,0.6)",
              fontFamily: "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Trade exploration"
          >
            <Header
              direction={direction}
              userSlot={userSlot}
              targetSlot={targetSlot}
              partnerOwner={partnerOwner}
              onClose={onClose}
            />

            {status === "loading" && <LoadingBody />}

            {status === "error" && err && (
              <ErrorBody err={err} onRetry={fetchExplore} onCancel={onClose} />
            )}

            {data && (status === "ready" || status === "committing") && (
              <>
                {/* ── Verdict banner ──────────────────────────────────── */}
                {verdict && verdictStyle && (
                  <div
                    className="mx-4 mt-4 px-4 py-3 rounded-lg"
                    style={{
                      background: verdictStyle.bg,
                      border: `1px solid ${verdictStyle.border}`,
                      animation: verdict.label === "GREAT" ? "mde-pulse 1.4s ease-out 1" : undefined,
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="text-[11px] font-bold tracking-[0.24em] uppercase"
                        style={{ color: verdictStyle.fg }}
                      >
                        {verdictStyle.label}
                      </span>
                      <WillingnessBadge
                        band={data.willingness.band}
                        score={data.willingness.score}
                      />
                    </div>
                    <div
                      className="mt-2 text-[15px] font-semibold leading-tight"
                      style={{ color: C.primary }}
                    >
                      {verdict.headline}
                    </div>
                  </div>
                )}

                {/* ── Why lines ───────────────────────────────────────── */}
                {verdict && verdict.why_lines.length > 0 && (
                  <ul className="mx-4 mt-3 space-y-1.5">
                    {verdict.why_lines.map((line, i) => (
                      <li
                        key={i}
                        className="text-[12px] leading-snug flex gap-2"
                        style={{ color: C.secondary }}
                      >
                        <span style={{ color: C.dim }}>•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ── Package tabs + thin-pool message ────────────────── */}
                <div className="mx-4 mt-4">
                  <PackageTabs
                    labels={tabLabels(pkgs.length)}
                    activeIdx={activeIdx}
                    onSelect={setTabIdx}
                  />
                  {thinMsg && (
                    <div
                      className="mt-2 text-[11px]"
                      style={{ color: C.dim }}
                    >
                      {thinMsg}
                    </div>
                  )}
                </div>

                {/* ── Active package detail ───────────────────────────── */}
                {activePkg && (
                  <PackageDetail
                    pkg={activePkg}
                    consensusBoard={consensusBoard}
                  />
                )}

                {/* ── Commit error ────────────────────────────────────── */}
                {commitErr && (
                  <div
                    className="mx-4 mt-3 px-3 py-2 rounded text-[12px]"
                    style={{
                      color: C.red,
                      background: "rgba(228,114,114,0.08)",
                      border: `1px solid rgba(228,114,114,0.25)`,
                    }}
                  >
                    Couldn't commit: {commitErr}
                  </div>
                )}

                {/* ── Footer ─────────────────────────────────────────── */}
                <Footer
                  confirmEnabled={confirmEnabled && status !== "committing"}
                  committing={status === "committing"}
                  onCancel={onClose}
                  onConfirm={handleConfirm}
                />
              </>
            )}

            <style>{`
              @keyframes mde-pulse {
                0%   { box-shadow: 0 0 0 0 rgba(125,211,160,0); }
                20%  { box-shadow: 0 0 0 4px rgba(125,211,160,0.35); }
                100% { box-shadow: 0 0 0 0 rgba(125,211,160,0); }
              }
              @keyframes mde-fade {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────
function Header({
  direction, userSlot, targetSlot, partnerOwner, onClose,
}: {
  direction: "up" | "back";
  userSlot: string;
  targetSlot: string;
  partnerOwner: string;
  onClose: () => void;
}) {
  const label = direction === "up" ? "Trade up" : "Trade back";
  return (
    <div
      className="flex items-baseline justify-between gap-3 px-5 py-4"
      style={{ borderBottom: `1px solid ${C.borderLt}` }}
    >
      <div className="min-w-0">
        <div
          className="text-[10px] font-bold tracking-[0.24em] uppercase"
          style={{ color: C.gold }}
        >
          {label} · w/ {partnerOwner}
        </div>
        <div
          className="mt-1 text-[15px] font-semibold tabular-nums"
          style={{ color: C.primary }}
        >
          {userSlot} <span style={{ color: C.dim }}>→</span> {targetSlot}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-[14px] leading-none px-2 py-1 rounded"
        style={{ color: C.dim }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────
function LoadingBody() {
  return (
    <div className="px-5 py-10 flex flex-col items-center gap-3">
      <div
        className="w-6 h-6 rounded-full animate-spin"
        style={{
          border: `2px solid rgba(212,165,50,0.30)`,
          borderTopColor: C.gold,
        }}
      />
      <div className="text-[11px]" style={{ color: C.secondary }}>
        Computing trade options…
      </div>
    </div>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────
function ErrorBody({
  err, onRetry, onCancel,
}: {
  err: ClassifiedTradeError;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-5 py-6">
      <div
        className="text-[12px] font-semibold mb-2"
        style={{ color: C.red }}
      >
        {err.message}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="text-[11px] font-semibold tracking-[0.08em] uppercase rounded px-3 py-1.5"
          style={{ color: C.gold, background: "rgba(212,165,50,0.10)", border: `1px solid rgba(212,165,50,0.28)` }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-semibold tracking-[0.08em] uppercase rounded px-3 py-1.5"
          style={{ color: C.secondary, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)` }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Package tabs ───────────────────────────────────────────────────────
function PackageTabs({
  labels, activeIdx, onSelect,
}: {
  labels: string[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  if (labels.length === 0) return null;
  return (
    <div
      className="flex gap-1 rounded-lg p-1"
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.borderLt}` }}
      role="tablist"
    >
      {labels.map((lbl, i) => {
        const active = i === activeIdx;
        return (
          <button
            key={lbl}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(i)}
            className="flex-1 text-[11px] font-semibold tracking-[0.06em] uppercase py-1.5 rounded transition-colors"
            style={{
              color: active ? C.primary : C.dim,
              background: active ? "rgba(212,165,50,0.14)" : "transparent",
              border: active ? `1px solid rgba(212,165,50,0.28)` : `1px solid transparent`,
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Package detail (two-column asset cards + totals + delta) ───────────
function PackageDetail({
  pkg, consensusBoard,
}: {
  pkg: TradePackage;
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
}) {
  const deltaTone = getDeltaTone(pkg.value_delta_pct);
  const deltaColor =
    deltaTone === "green" ? C.green :
    deltaTone === "red"   ? C.red   : C.dim;
  return (
    <div
      key={pkg.kind}
      className="mx-4 mt-3 rounded-lg overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${C.borderLt}`,
        animation: "mde-fade 240ms ease-out 1",
      }}
    >
      <div className="grid grid-cols-2">
        <AssetColumn
          title="You give"
          picks={pkg.picks_given}
          futurePicks={pkg.future_picks_given}
          playerName={pkg.player_given}
          total={pkg.value_given}
          consensusBoard={consensusBoard}
          borderRight
        />
        <AssetColumn
          title="You get"
          picks={pkg.picks_received}
          futurePicks={pkg.future_picks_received}
          playerName={null}
          total={pkg.value_received}
          consensusBoard={consensusBoard}
        />
      </div>
      <div
        className="flex items-center justify-center px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
        style={{
          borderTop: `1px solid ${C.borderLt}`,
          background: "rgba(0,0,0,0.25)",
          color: deltaColor,
        }}
      >
        Δ {formatDeltaLabel(pkg.value_delta_pct)} vs parity
      </div>
    </div>
  );
}

function AssetColumn({
  title, picks, futurePicks, playerName, total, consensusBoard, borderRight,
}: {
  title: string;
  picks: TradePackagePick[];
  futurePicks: FuturePick[];
  playerName: string | null;
  total: number;
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  borderRight?: boolean;
}) {
  const playerPos = lookupPlayerPosition(playerName, consensusBoard);
  const hasAssets = picks.length + futurePicks.length > 0 || playerName;
  return (
    <div
      className="px-4 py-3 flex flex-col gap-1.5"
      style={{ borderRight: borderRight ? `1px solid ${C.borderLt}` : undefined }}
    >
      <div
        className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1"
        style={{ color: C.dim }}
      >
        {title}
      </div>
      {!hasAssets && (
        <div className="text-[12px]" style={{ color: C.dim }}>—</div>
      )}
      {picks.map((p) => (
        <AssetCard key={p.slot} label={formatPickLabel(p)} />
      ))}
      {futurePicks.map((f, i) => (
        <AssetCard key={`fp-${i}`} label={formatFuturePickLabel(f)} tone="future" />
      ))}
      {playerName && (
        <AssetCard
          label={playerPos ? `${playerName} · ${playerPos}` : playerName}
          tone="player"
        />
      )}
      <div
        className="mt-2 pt-2 text-[11px] font-semibold tabular-nums"
        style={{ color: C.secondary, borderTop: `1px dashed rgba(255,255,255,0.06)` }}
      >
        {total > 0 ? total.toLocaleString("en-US") : "—"} total
      </div>
    </div>
  );
}

function AssetCard({ label, tone }: { label: string; tone?: "future" | "player" }) {
  const fg = tone === "future" ? C.blue : tone === "player" ? C.gold : C.primary;
  return (
    <div
      className="text-[12px] tabular-nums px-2 py-1.5 rounded"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid rgba(255,255,255,0.04)`,
        color: fg,
      }}
    >
      {label}
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────
function Footer({
  confirmEnabled, committing, onCancel, onConfirm,
}: {
  confirmEnabled: boolean;
  committing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="flex items-center justify-end gap-2 px-4 py-3 mt-3"
      style={{ borderTop: `1px solid ${C.borderLt}`, background: "rgba(0,0,0,0.2)" }}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={committing}
        className="text-[12px] font-semibold tracking-[0.06em] uppercase rounded px-3.5 py-1.5 disabled:opacity-50"
        style={{
          color: C.secondary,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(255,255,255,0.10)`,
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!confirmEnabled}
        className="text-[12px] font-semibold tracking-[0.06em] uppercase rounded px-4 py-1.5 disabled:cursor-not-allowed"
        style={{
          color: confirmEnabled ? "#07090f" : C.dim,
          background: confirmEnabled ? C.gold : "rgba(255,255,255,0.05)",
          border: `1px solid ${confirmEnabled ? C.gold : "rgba(255,255,255,0.08)"}`,
        }}
      >
        {committing ? "Committing…" : "Confirm trade"}
      </button>
    </div>
  );
}
