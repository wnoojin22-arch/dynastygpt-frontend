"use client";

/**
 * "YOUR CHAMPIONSHIP ODDS" DCard tile for team pages (both desktop
 * and mobile Dashboard views).
 *
 * Design copied verbatim from DashboardView.tsx:371-413 (the
 * DYNASTYGPT MANAGER RANKS card):
 *   - Same DCard wrapper: goldGlow top strip, goldDark border-top-2,
 *     goldBorder sides, 8px radius
 *   - Same gold header strip: font-mono 10px black tracking-[0.10em]
 *     text-gold, background: C.goldDim
 *   - Same stat-tile shape: bg-elevated, border-border, 6px radius,
 *     text-center, MONO 9px label + DISPLAY 22px black gold numeric
 *
 * Change vs source: three-column grid (playoff / title / bye) instead
 * of two-column rank grid.
 *
 * Reads the same single-row-per-team GET /odds source that the
 * League Home rail + portfolio card odds strip use — never fanout,
 * never recompute FE-side.
 */

import { useQuery } from "@tanstack/react-query";
import { C, MONO, DISPLAY } from "./tokens";
import {
  getChampionshipOdds,
  type ChampionshipOddsRow,
} from "@/lib/api";

function fmtPct(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

interface Props {
  leagueId: string | null | undefined;
  /** Owner display name (currentOwner from the store) — used to find
   *  the row in the fleet response. Null-safe: if we can't find the
   *  user's row (early hydration, unknown owner), tile null-renders. */
  ownerUserId: string | null | undefined;
}

export default function ChampionshipOddsTile({ leagueId, ownerUserId }: Props) {
  const { data } = useQuery({
    queryKey: ["championship-odds", leagueId],
    queryFn: () => getChampionshipOdds(leagueId!),
    enabled: !!leagueId,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const teams: ChampionshipOddsRow[] = data?.teams ?? [];
  // Find the row for the viewing user. Null-safe: if uid is missing
  // or the sim hasn't written a row for this user (rare — happens on
  // just-added rosters mid-sync), fall back to a placeholder that
  // matches the "—" convention of the MANAGER RANKS card when data
  // is missing.
  const myRow =
    ownerUserId != null
      ? teams.find((t) => t.platform_user_id === ownerUserId)
      : undefined;

  // Show the card even without a row so the visual rhythm of the
  // page stays consistent — the numerics degrade to em-dashes.
  return (
    <div className="w-full">
      <div
        style={{
          borderRadius: 8,
          overflow: "hidden",
          background: `linear-gradient(180deg, ${C.goldGlow} 0%, transparent 50%), ${C.card}`,
          borderTop: `2px solid ${C.goldDark}`,
          borderRight: `1px solid ${C.goldBorder}`,
          borderBottom: `1px solid ${C.goldBorder}`,
          borderLeft: `1px solid ${C.goldBorder}`,
        }}
      >
        {/* Gold header strip — identical shape + typography to
            DashboardView.tsx:382-389. */}
        <div
          style={{
            padding: "5px 12px",
            borderBottom: `1px solid ${C.border}`,
            background: C.goldDim,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: C.gold,
            }}
          >
            YOUR CHAMPIONSHIP ODDS
          </span>
        </div>

        {/* Three-column stat-tile grid — same tile shape as
            DashboardView.tsx:392-413's two-column grid, extended to 3. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            padding: "10px 12px 12px",
          }}
        >
          {/* Playoff % */}
          <div
            style={{
              textAlign: "center",
              padding: "6px 8px",
              borderRadius: 6,
              background: C.elevated,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: C.dim,
                marginBottom: 3,
              }}
            >
              PLAYOFF
            </div>
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 22,
                fontWeight: 900,
                color: C.gold,
                lineHeight: 1,
              }}
            >
              {fmtPct(myRow?.p_playoffs)}
            </span>
          </div>

          {/* Title % — the marquee number */}
          <div
            style={{
              textAlign: "center",
              padding: "6px 8px",
              borderRadius: 6,
              background: C.elevated,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: C.dim,
                marginBottom: 3,
              }}
            >
              TITLE
            </div>
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 22,
                fontWeight: 900,
                color: C.gold,
                lineHeight: 1,
              }}
            >
              {fmtPct(myRow?.p_title)}
            </span>
          </div>

          {/* Bye % */}
          <div
            style={{
              textAlign: "center",
              padding: "6px 8px",
              borderRadius: 6,
              background: C.elevated,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: C.dim,
                marginBottom: 3,
              }}
            >
              BYE
            </div>
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 22,
                fontWeight: 900,
                color: C.gold,
                lineHeight: 1,
              }}
            >
              {fmtPct(myRow?.p_bye)}
            </span>
          </div>
        </div>

        {data?.is_stale && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              color: C.dim,
              textAlign: "center",
              padding: "0 0 6px",
            }}
            title={data.stale_reason ?? ""}
          >
            recomputing…
          </div>
        )}
      </div>
    </div>
  );
}
