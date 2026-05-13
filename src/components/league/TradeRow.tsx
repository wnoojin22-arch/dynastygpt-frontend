"use client";

import React from "react";
import PlayerName from "./PlayerName";
import { useOwnerClick, useIsOwnerCurrent } from "@/hooks/useOwnerClick";
import { deriveTradeDayVerdict, deriveHindsightVerdict, verdictPillClass, type OverallVerdict } from "@/lib/utils";

/**
 * Shared trade-log row — compact, two-line on desktop, ~4-line on mobile.
 *
 * Displays ONE overall verdict for TRADE DAY and ONE for HINDSIGHT (derived
 * from side_a / side_b via lib/utils). Per-side breakdown stays in the
 * detail modal — list views are scannable, modal is detailed.
 */

export interface TradeRowTrade {
  trade_id: string;
  date?: string | null;
  owner: string;
  counter_party: string;
  players_sent?: string[] | null;
  players_received?: string[] | null;
  picks_sent?: string[] | null;
  picks_received?: string[] | null;
  verdict?: string | null;
  side_a_owner?: string | null;
  side_b_owner?: string | null;
  side_a_verdict?: string | null;
  side_b_verdict?: string | null;
  side_a_hindsight_verdict?: string | null;
  side_b_hindsight_verdict?: string | null;
}

function isEmpty(players?: string[] | null, picks?: string[] | null) {
  return !(players || []).filter(Boolean).length && !(picks || []).filter(Boolean).length;
}

export function isEmptyTrade(t: TradeRowTrade): boolean {
  return isEmpty(t.players_sent, t.picks_sent) && isEmpty(t.players_received, t.picks_received);
}

/** Asset summary — first 2 assets joined, "+N" suffix for the rest.
 *  Picks have their "(Owner)" parenthetical stripped for compactness. */
function AssetSummary({ players, picks, className }: { players?: string[] | null; picks?: string[] | null; className?: string }) {
  const p = (players || []).filter(Boolean);
  const pk = (picks || []).map((s) => s.replace(/\s*\([^)]*\)/g, "")).filter(Boolean);
  const all = [
    ...p.map((n) => ({ name: n, isPick: false })),
    ...pk.map((n) => ({ name: n, isPick: true })),
  ];
  if (!all.length) return <span className={`text-dim ${className || ""}`}>—</span>;
  const shown = all.slice(0, 2);
  const extra = all.length - shown.length;
  return (
    <span className={className}>
      {shown.map((a, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-dim">, </span>}
          {a.isPick ? a.name : <PlayerName name={a.name} className="text-secondary" />}
        </React.Fragment>
      ))}
      {extra > 0 && <span className="text-dim"> +{extra}</span>}
    </span>
  );
}

interface VerdictLineProps {
  /** Full label text: "Trade Day" or "Hindsight" — small, muted, mono. */
  prefix: string;
  verdict: OverallVerdict;
}

/** Single-line layout: label + (optional winner name) + verdict pill.
 *  The winner-name span always truncates so long team names can't push the
 *  pill off-screen on narrow viewports. The pill itself never shrinks. */
function VerdictLine({ prefix, verdict }: VerdictLineProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <span className="font-mono text-[10px] font-bold tracking-wider text-dim uppercase shrink-0">{prefix}:</span>
      {verdict.winnerName && (
        <span className="font-sans text-sm font-semibold text-secondary truncate min-w-0 flex-1">{verdict.winnerName}</span>
      )}
      <span className={`font-mono text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded border leading-none whitespace-nowrap shrink-0 ml-auto ${verdictPillClass(verdict.tone)}`}>
        {verdict.pillText}
      </span>
    </div>
  );
}

export default function TradeRow({ trade, onClick }: { trade: TradeRowTrade; onClick: () => void }) {
  const onOwnerClick = useOwnerClick();
  const isOwnerCurrent = useIsOwnerCurrent();
  const date10 = (trade.date || "").slice(0, 10);

  // side_a_owner / side_b_owner from trade_verdicts (uid-keyed on the backend).
  // Fall back to t.owner / t.counter_party if the response is older.
  const sideAName = trade.side_a_owner || trade.owner;
  const sideBName = trade.side_b_owner || trade.counter_party;

  const td = deriveTradeDayVerdict(
    { name: sideAName, verdict: trade.side_a_verdict },
    { name: sideBName, verdict: trade.side_b_verdict },
  );
  const hs = deriveHindsightVerdict(
    trade.date,
    { name: sideAName, verdict: trade.side_a_hindsight_verdict },
    { name: sideBName, verdict: trade.side_b_hindsight_verdict },
  );

  const ownerCurrent = isOwnerCurrent(trade.owner);
  const counterCurrent = isOwnerCurrent(trade.counter_party);

  return (
    // shrink-0 is critical: parent list containers are `flex flex-col` with
    // max-h + overflow-y-auto. Without it, flex defaults each child to
    // `flex-shrink: 1` and squishes cards when total content > max-h,
    // letting content overflow VISIBLY into the next card. Pin the height to
    // intrinsic so the parent scrolls instead of compressing cards.
    <div
      onClick={onClick}
      className="shrink-0 bg-card border border-border rounded-lg cursor-pointer hover:border-border-lt hover:bg-elevated/40 transition-colors px-4 py-4 md:px-5 md:py-4">

      {/* ── MOBILE ── stacked layout, all content left-aligned.
          Both sides flow left-to-right with the arrow between — no
          opposite-edge alignment. */}
      <div className="md:hidden flex flex-col gap-2 min-w-0">
        <span className="font-mono text-[10px] tracking-wider text-dim uppercase">{date10}</span>
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOwnerClick(trade.owner); }}
            className={`block flex-1 min-w-0 font-sans text-sm font-bold text-primary truncate text-left ${ownerCurrent ? "underline decoration-dotted decoration-border-lt underline-offset-2" : ""}`}>
            {trade.owner}
          </button>
          <span className="font-mono text-sm text-gold/70 shrink-0">⇄</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOwnerClick(trade.counter_party); }}
            className={`block flex-1 min-w-0 font-sans text-sm font-bold text-secondary truncate text-left ${counterCurrent ? "underline decoration-dotted decoration-border-lt underline-offset-2" : ""}`}>
            {trade.counter_party}
          </button>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] font-bold tracking-wider text-dim uppercase mb-0.5">SENT</div>
            <div className="font-sans text-xs text-secondary truncate"><AssetSummary players={trade.players_sent} picks={trade.picks_sent} /></div>
          </div>
          <span className="font-mono text-xs text-gold/50 shrink-0 mt-4">⇄</span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] font-bold tracking-wider text-dim uppercase mb-0.5">SENT</div>
            <div className="font-sans text-xs text-secondary truncate"><AssetSummary players={trade.players_received} picks={trade.picks_received} /></div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-border min-w-0">
          <VerdictLine prefix="Trade Day" verdict={td} />
          <VerdictLine prefix="Hindsight" verdict={hs} />
        </div>
      </div>

      {/* ── DESKTOP ── date · cohesive trade-info block · (flex spacer) · verdicts.
          Team columns are content-driven width (capped at 320px each) so they
          sit tightly next to each other with the arrow between them. The
          verdicts column pushes itself to the right edge via ml-auto. */}
      <div className="hidden md:flex items-start gap-5">
        <span className="font-mono text-xs tracking-wider text-dim uppercase whitespace-nowrap pt-1 shrink-0">{date10}</span>
        <div className="flex items-start gap-6 min-w-0">
          {/* Team A column — left-aligned, content-driven width */}
          <div className="flex flex-col gap-1 min-w-0 max-w-[320px]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOwnerClick(trade.owner); }}
              className={`font-sans text-lg font-bold text-primary truncate text-left ${ownerCurrent ? "underline decoration-dotted decoration-border-lt underline-offset-2" : ""}`}>
              {trade.owner}
            </button>
            <span className="font-mono text-[10px] font-bold tracking-wider text-dim uppercase">SENT</span>
            <div className="font-sans text-sm text-secondary"><AssetSummary players={trade.players_sent} picks={trade.picks_sent} /></div>
          </div>
          {/* Center arrow, aligned with the team-name row */}
          <span className="font-mono text-lg text-gold/70 shrink-0 mt-0.5">⇄</span>
          {/* Team B column — left-aligned, content-driven width */}
          <div className="flex flex-col gap-1 min-w-0 max-w-[320px]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOwnerClick(trade.counter_party); }}
              className={`font-sans text-lg font-bold text-secondary truncate text-left ${counterCurrent ? "underline decoration-dotted decoration-border-lt underline-offset-2" : ""}`}>
              {trade.counter_party}
            </button>
            <span className="font-mono text-[10px] font-bold tracking-wider text-dim uppercase">SENT</span>
            <div className="font-sans text-sm text-secondary"><AssetSummary players={trade.players_received} picks={trade.picks_received} /></div>
          </div>
        </div>
        <div className="ml-auto flex flex-col gap-1.5 items-stretch shrink-0 min-w-[200px] max-w-[320px] pt-1">
          <VerdictLine prefix="Trade Day" verdict={td} />
          <VerdictLine prefix="Hindsight" verdict={hs} />
        </div>
      </div>
    </div>
  );
}
