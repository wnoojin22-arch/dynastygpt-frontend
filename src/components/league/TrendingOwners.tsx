"use client";

/**
 * TRENDING OWNERS · Nd
 *
 * League-internal risers/fallers by 30d format-adjusted roster value.
 * Sits in the League Home right rail as the league-internal replacement
 * for the previous fleet-wide Market Pulse content.
 *
 * Data source: GET /api/league/{id}/league-value-changes?days=30 —
 * the fleet endpoint that fans a single DB query across all rosters
 * (see routers/data.py:league_value_changes + unit tests).
 *
 * Styling is copied, not invented — bar treatment from PowerRankings.tsx
 * (50w × 4h bg-border track, colored fill, mono value on the right).
 * Section label idiom from l/[slug]/page.tsx SectionLabel (dense mono
 * uppercase + gold underline).
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeagueValueChanges } from "@/lib/api";
import { useOwnerClick } from "@/hooks/useOwnerClick";
import { C, MONO, SANS, fmt } from "./tokens";

const DEFAULT_DAYS = 30;

// Show top N risers and top N fallers. Middle bucket is dropped —
// the rail's job is signal, not exhaustive listing.
const RISER_COUNT = 3;
const FALLER_COUNT = 3;

function DeltaBar({ delta, maxAbs }: { delta: number; maxAbs: number }) {
  // Bar width scales against max ABSOLUTE delta in the rendered set so a
  // small mover isn't rendered at 100%. Same bar-language as PowerRankings.
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(delta) / maxAbs) * 100) : 0;
  const positive = delta > 0;
  const color = positive ? C.green : C.red;
  return (
    <div className="w-14 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: C.border }}>
      <div
        className="h-full rounded-full"
        // Data-driven width — same convention as league dashboard
        // fairness bars (l/[slug]/page.tsx:507) and PowerRankings.
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function OwnerRow({
  owner,
  delta,
  maxAbs,
  positive,
  currentOwner,
}: {
  owner: string;
  delta: number;
  maxAbs: number;
  positive: boolean;
  currentOwner: string | null;
}) {
  const onOwnerClick = useOwnerClick();
  const isMe =
    currentOwner != null &&
    owner.trim().toLowerCase() === currentOwner.trim().toLowerCase();

  return (
    <div
      onClick={() => onOwnerClick(owner)}
      className={`flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer ${
        isMe ? "bg-gold-dim border border-gold-border" : "hover:bg-elevated"
      }`}
    >
      <span
        className="flex-1 min-w-0 truncate font-sans text-[12px] font-semibold"
        style={{ color: isMe ? C.gold : C.primary }}
      >
        {owner}
      </span>
      <DeltaBar delta={delta} maxAbs={maxAbs} />
      <span
        className="font-mono text-[11px] font-black tabular-nums w-14 text-right shrink-0"
        style={{ color: positive ? C.green : C.red }}
      >
        {positive ? "▲" : "▼"} {fmt(Math.abs(delta))}
      </span>
    </div>
  );
}

export default function TrendingOwners({
  leagueId,
  currentOwner,
  days = DEFAULT_DAYS,
}: {
  leagueId: string | null | undefined;
  currentOwner: string | null;
  days?: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["league-value-changes", leagueId, days],
    queryFn: () => getLeagueValueChanges(leagueId!, days),
    enabled: !!leagueId,
    staleTime: 30 * 60 * 1000, // 30 min — snapshots refresh daily
  });

  const owners = data?.owners ?? [];
  const risers = owners.filter((o) => o.delta > 0).slice(0, RISER_COUNT);
  const fallers = [...owners]
    .filter((o) => o.delta < 0)
    .sort((a, b) => a.delta - b.delta) // most-negative first
    .slice(0, FALLER_COUNT);
  const maxAbs = Math.max(
    1,
    ...risers.map((o) => Math.abs(o.delta)),
    ...fallers.map((o) => Math.abs(o.delta)),
  );

  return (
    <div className="mt-4">
      {/* Section label — mirrors l/[slug]/page.tsx SectionLabel idiom
          (dense mono uppercase, gold underline). */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1.5">
          <h3 className="font-sans text-[10px] font-black tracking-[0.14em] text-primary uppercase">
            TRENDING OWNERS
          </h3>
          <span className="font-mono text-[9px] text-dim tracking-[0.06em]">
            · {days}D · {data?.format ?? ""}
          </span>
        </div>
        <div className="h-px bg-gold/30" />
      </div>

      {isLoading && (
        <div className="font-mono text-[10px] text-dim py-2">
          Loading roster deltas…
        </div>
      )}

      {!isLoading && risers.length + fallers.length === 0 && (
        <div className="font-mono text-[10px] text-dim py-2">
          No {days}d movement yet.
        </div>
      )}

      {risers.length > 0 && (
        <>
          <div
            className="font-mono text-[9px] font-black tracking-[0.12em] mt-1 mb-1"
            style={{ color: C.green }}
          >
            RISING
          </div>
          <div className="flex flex-col gap-0.5 mb-3">
            {risers.map((o) => (
              <OwnerRow
                key={`r-${o.owner_user_id ?? o.owner}`}
                owner={o.owner}
                delta={o.delta}
                maxAbs={maxAbs}
                positive
                currentOwner={currentOwner}
              />
            ))}
          </div>
        </>
      )}

      {fallers.length > 0 && (
        <>
          <div
            className="font-mono text-[9px] font-black tracking-[0.12em] mt-1 mb-1"
            style={{ color: C.red }}
          >
            FALLING
          </div>
          <div className="flex flex-col gap-0.5">
            {fallers.map((o) => (
              <OwnerRow
                key={`f-${o.owner_user_id ?? o.owner}`}
                owner={o.owner}
                delta={o.delta}
                maxAbs={maxAbs}
                positive={false}
                currentOwner={currentOwner}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
