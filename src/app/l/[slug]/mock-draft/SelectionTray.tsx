"use client";

/**
 * SelectionTray — sticky dock that shows the user's locked picks + live
 * positional grade deltas during a mock draft.
 *
 * Mobile: bottom sheet. Collapsed ≈ 72px peek; tap the grab bar OR swipe
 * up to expand to ~55vh with scroll.
 * Desktop (md+): right rail. Always expanded, sticky to viewport.
 *
 * Data flows from the Zustand store (userPicks + sim + grade deltas). No
 * props required beyond the consensus board for position/tier/fit lookup.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  useMockDraftStore,
  useMockDraftPositionalGradeDeltas,
} from "@/lib/stores/mock-draft-store";
import type {
  ConsensusBoardEntry,
  PositionalGradeDelta,
} from "./contracts";

// ─── Props ───────────────────────────────────────────────────────────────
interface SelectionTrayProps {
  /**
   * Consensus board from the live sim — used to resolve each locked slot's
   * prospect name to position/tier/fit. Safe to pass [] when the sim hasn't
   * loaded yet; the tray renders an empty state.
   */
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  /**
   * Optional — called when the user taps the × on a locked pick to unlock
   * it. Store already exposes unlockPick; this is a hook for parent flows
   * that need to re-run the sim after an unlock.
   */
  onUnlock?: (slot: string) => void;
}

// ─── Positions rendered in grade-delta strip, in the order that matches
//     the rest of the UI (QB → RB → WR → TE). ──
const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
type TrackedPosition = (typeof POSITIONS)[number];

const POS_BG: Record<TrackedPosition, string> = {
  QB: "bg-accent-red/15 text-accent-red",
  RB: "bg-accent-blue/15 text-accent-blue",
  WR: "bg-accent-green/15 text-accent-green",
  TE: "bg-accent-orange/15 text-accent-orange",
};

// ─── Component ───────────────────────────────────────────────────────────
export default function SelectionTray({
  consensusBoard,
  onUnlock,
}: SelectionTrayProps) {
  const userPicks = useMockDraftStore((s) => s.userPicks);
  const unlockPick = useMockDraftStore((s) => s.unlockPick);
  const gradeDeltas = useMockDraftPositionalGradeDeltas();

  const [expanded, setExpanded] = useState(false);

  // Lookup map for prospect → position/tier/fit. Recomputes only when the
  // board itself changes.
  const boardByName = useMemo(() => {
    const m = new Map<string, ConsensusBoardEntry>();
    for (const p of consensusBoard) m.set(p.name, p);
    return m;
  }, [consensusBoard]);

  const pickRows = useMemo(() => {
    const entries = Object.entries(userPicks);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([slot, name]) => ({
      slot,
      name,
      prospect: boardByName.get(name) ?? null,
    }));
  }, [userPicks, boardByName]);

  const handleUnlock = (slot: string) => {
    unlockPick(slot);
    onUnlock?.(slot);
  };

  const toggleExpanded = () => setExpanded((e) => !e);

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    // Swipe up (negative y) expands; swipe down collapses.
    if (info.offset.y < -40 || info.velocity.y < -400) setExpanded(true);
    else if (info.offset.y > 40 || info.velocity.y > 400) setExpanded(false);
  };

  return (
    <>
      {/* ═══ MOBILE BOTTOM SHEET ═══ */}
      <motion.aside
        className={[
          "fixed inset-x-0 bottom-0 z-30",
          "bg-panel border-t border-border-lt",
          "shadow-[0_-8px_28px_rgba(0,0,0,0.45)]",
          "md:hidden",
        ].join(" ")}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.25}
        onDragEnd={onDragEnd}
        initial={false}
        animate={{ height: expanded ? "55vh" : 88 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        aria-expanded={expanded}
      >
        <TrayHandle expanded={expanded} onToggle={toggleExpanded} />

        {/* Collapsed peek — always visible */}
        <CollapsedPeek
          pickCount={pickRows.length}
          gradeDeltas={gradeDeltas}
          onTap={toggleExpanded}
        />

        {/* Expanded contents */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="expanded-body"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="px-4 pb-5 overflow-y-auto h-[calc(55vh-88px)]"
            >
              <TrayContents
                pickRows={pickRows}
                gradeDeltas={gradeDeltas}
                onUnlock={handleUnlock}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ═══ DESKTOP RIGHT RAIL ═══ */}
      <aside
        className={[
          "hidden md:block",
          "fixed right-4 top-24 bottom-6 w-[320px] z-20",
          "bg-panel border border-border-lt rounded-xl",
          "shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
          "overflow-y-auto",
        ].join(" ")}
      >
        <div className="px-4 py-3 border-b border-border-lt flex items-baseline justify-between">
          <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-gold">
            Your draft
          </span>
          <span className="text-[10px] font-mono tabular-nums text-dim">
            {pickRows.length} locked
          </span>
        </div>
        <div className="px-4 py-4">
          <TrayContents
            pickRows={pickRows}
            gradeDeltas={gradeDeltas}
            onUnlock={handleUnlock}
          />
        </div>
      </aside>
    </>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function TrayHandle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex flex-col items-center pt-2 pb-1 select-none cursor-pointer"
      aria-label={expanded ? "Collapse selection tray" : "Expand selection tray"}
    >
      <span className="block w-10 h-1 rounded-full bg-border-lt" />
    </button>
  );
}

function CollapsedPeek({
  pickCount,
  gradeDeltas,
  onTap,
}: {
  pickCount: number;
  gradeDeltas: ReturnType<typeof useMockDraftPositionalGradeDeltas>;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full px-4 py-2 flex items-center justify-between gap-3 cursor-pointer"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-gold">
          Your draft
        </span>
        <span className="text-[11px] font-mono tabular-nums text-primary">
          {pickCount} locked
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {POSITIONS.map((pos) => (
          <GradeDeltaChip
            key={pos}
            position={pos}
            delta={gradeDeltas?.[pos] ?? null}
            compact
          />
        ))}
      </div>
    </button>
  );
}

function TrayContents({
  pickRows,
  gradeDeltas,
  onUnlock,
}: {
  pickRows: Array<{
    slot: string;
    name: string;
    prospect: ConsensusBoardEntry | null;
  }>;
  gradeDeltas: ReturnType<typeof useMockDraftPositionalGradeDeltas>;
  onUnlock: (slot: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Grade delta strip */}
      <section>
        <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-dim mb-2">
          Positional grade
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {POSITIONS.map((pos) => (
            <GradeDeltaCard
              key={pos}
              position={pos}
              delta={gradeDeltas?.[pos] ?? null}
            />
          ))}
        </div>
      </section>

      {/* Locked picks list */}
      <section>
        <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-dim mb-2">
          Locked picks
        </div>
        {pickRows.length === 0 ? (
          <div className="text-[11px] text-dim px-1 py-3 text-center">
            No picks locked yet. Your drafted players will appear here.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pickRows.map((row) => (
              <LockedPickRow
                key={row.slot}
                slot={row.slot}
                name={row.name}
                prospect={row.prospect}
                onUnlock={() => onUnlock(row.slot)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LockedPickRow({
  slot,
  name,
  prospect,
  onUnlock,
}: {
  slot: string;
  name: string;
  prospect: ConsensusBoardEntry | null;
  onUnlock: () => void;
}) {
  const pos = prospect?.position as TrackedPosition | undefined;
  const posClass = pos ? POS_BG[pos] : "bg-white/5 text-dim";
  const fit = prospect?.fit_score ?? null;
  const tier = prospect?.tier ?? null;

  return (
    <li className="flex items-center gap-2 px-2 py-2 rounded-lg bg-card/70 border border-border">
      <span
        className={[
          "text-[9px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded tabular-nums",
          posClass,
        ].join(" ")}
      >
        {pos ?? "—"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-mono tabular-nums text-dim flex-shrink-0">
            {slot}
          </span>
          <span className="text-[12px] font-semibold text-primary truncate">
            {name}
          </span>
        </div>
        <div className="text-[10px] font-mono tabular-nums text-dim mt-0.5">
          {tier != null ? `Tier ${tier}` : "Tier —"}
          {" · "}
          {fit != null ? (
            <span className="text-secondary">Fit {fit}</span>
          ) : (
            "Fit —"
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onUnlock}
        aria-label={`Unlock pick at ${slot}`}
        className="text-dim hover:text-red active:text-accent-red-bright text-[14px] leading-none px-2 py-1 cursor-pointer"
      >
        ×
      </button>
    </li>
  );
}

function GradeDeltaCard({
  position,
  delta,
}: {
  position: TrackedPosition;
  delta: PositionalGradeDelta | null;
}) {
  const changed = !!delta && delta.delta !== 0;
  const positive = !!delta && delta.delta > 0;
  return (
    <div
      className={[
        "rounded-md px-2 py-2 border",
        changed
          ? positive
            ? "bg-accent-green/10 border-accent-green/25"
            : "bg-accent-red/10 border-accent-red/25"
          : "bg-card/60 border-border",
      ].join(" ")}
    >
      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-dim">
        {position}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] text-secondary truncate">
          {delta?.before ?? "—"}
        </span>
        <span className="text-[9px] text-dim">→</span>
        <span
          className={[
            "text-[11px] font-semibold truncate",
            changed ? (positive ? "text-accent-green" : "text-accent-red") : "text-primary",
          ].join(" ")}
        >
          {delta?.after ?? "—"}
        </span>
      </div>
    </div>
  );
}

function GradeDeltaChip({
  position,
  delta,
  compact = false,
}: {
  position: TrackedPosition;
  delta: PositionalGradeDelta | null;
  compact?: boolean;
}) {
  const changed = !!delta && delta.delta !== 0;
  const positive = !!delta && delta.delta > 0;
  const tone = changed
    ? positive
      ? "bg-accent-green/15 text-accent-green"
      : "bg-accent-red/15 text-accent-red"
    : "bg-white/5 text-dim";
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 rounded font-mono tabular-nums font-bold",
        compact ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-1",
        tone,
      ].join(" ")}
      aria-label={
        delta
          ? `${position} ${delta.before} to ${delta.after}`
          : `${position} grade pending`
      }
    >
      {position}
      {changed && (positive ? "↑" : "↓")}
    </span>
  );
}
