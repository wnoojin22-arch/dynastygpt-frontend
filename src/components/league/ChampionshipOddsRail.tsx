"use client";

/**
 * Championship Odds — League Home rail block.
 *
 * Reads GET /api/league/{id}/odds (single BE row per team, no fanout).
 * Renders each team's playoff % / title % / bye % as a compact row that
 * matches the PowerRankings idiom directly above it in the rail:
 *
 *   [rank] owner_name .......... playoff%   title%   bye%
 *
 * Density + spacing copied verbatim from PowerRankings.tsx:96-121 so the
 * two rail blocks read as one continuous list. Gold treatment on the
 * top team's title % mirrors PowerRankings' champion crown row.
 *
 * Copy-not-invent — no new design.
 * Source: docs/specs/delta-sync-and-cron-consolidation.md §3.5 topology
 * + the Phase 6 build brief (2026-08-14).
 */

import { useQuery } from "@tanstack/react-query";
import { C, SANS, MONO } from "./tokens";
import { getChampionshipOdds, type ChampionshipOddsRow } from "@/lib/api";
import { useOwnerClick } from "@/hooks/useOwnerClick";

/**
 * Format a probability (0..1 from the sim) as a percent integer.
 * `.toFixed(0)` matches the portfolio-card pill treatment so
 * "same team, same number" holds to the digit across surfaces.
 */
function fmtPct(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

interface Props {
  leagueId: string | null | undefined;
  /** Owner display name → resolves via getOwners upstream; used to
   *  match the row for click routing. Optional; the rail renders
   *  fine without a current-owner match. */
  ownersByUid?: Record<string, string>;
}

export default function ChampionshipOddsRail({ leagueId, ownersByUid }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["championship-odds", leagueId],
    queryFn: () => getChampionshipOdds(leagueId!),
    enabled: !!leagueId,
    // Cron A fires at ~10:30 UTC daily; the row is stable for ~24h.
    // Serve from cache for a full day so navigations don't refetch.
    staleTime: 24 * 60 * 60 * 1000,
  });
  const onOwnerClick = useOwnerClick();

  if (isLoading) return null;
  const teams: ChampionshipOddsRow[] = data?.teams ?? [];
  if (!teams.length) return null;

  // BE orders by p_title DESC — same sort we want, but re-sort defensively
  // in case the shape changes.
  const rows = [...teams].sort((a, b) => b.p_title - a.p_title);

  return (
    <div className="mt-4">
      <div className="mb-3">
        {/* SectionLabel-style label — matches home/page.tsx:843
            `<SectionLabel title="LEAGUE DYNASTYGPT RANKINGS" />` and
            TrendingOwners.tsx:126-128 heading. Copy-not-invent. */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <h3 className="font-sans text-[10px] font-black tracking-[0.14em] text-primary uppercase">
            CHAMPIONSHIP ODDS
          </h3>
          <span className="font-mono text-[9px] text-dim tracking-[0.06em]">
            playoff · title · bye
          </span>
        </div>
        <div className="h-px w-8 bg-gold" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r, i) => {
          const owner =
            (ownersByUid && ownersByUid[r.platform_user_id]) ||
            r.platform_user_id;
          const rank = i + 1;
          // Row treatment mirrors PowerRankings.tsx:96-121:
          //   #1 gold background + crown, top-4 green rank, mid grey, bottom red.
          const rankColor =
            i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? C.secondary : C.red;
          const titleColor =
            i === 0 ? C.gold : i < 4 ? C.green : C.secondary;
          return (
            <div
              key={r.platform_user_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 4,
                background: i === 0 ? C.goldDim : "transparent",
                border: i === 0 ? `1px solid ${C.goldBorder}` : "1px solid transparent",
                transition: "background 0.12s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (i > 0) e.currentTarget.style.background = C.elevated;
              }}
              onMouseLeave={(e) => {
                if (i > 0) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 18,
                  fontSize: 11,
                  fontWeight: 900,
                  color: rankColor,
                  fontFamily: MONO,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {rank}
              </span>
              {i === 0 && <span style={{ fontSize: 11, flexShrink: 0 }}>👑</span>}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOwnerClick(owner);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: i < 4 ? 700 : 500,
                  color: i < 4 ? C.primary : C.secondary,
                  fontFamily: SANS,
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  borderBottom: `1px dotted ${C.border}`,
                }}
              >
                {owner}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.dim,
                  fontFamily: MONO,
                  width: 36,
                  textAlign: "right",
                  flexShrink: 0,
                }}
                title="Playoff %"
              >
                {fmtPct(r.p_playoffs)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: titleColor,
                  fontFamily: MONO,
                  width: 36,
                  textAlign: "right",
                  flexShrink: 0,
                }}
                title="Title %"
              >
                {fmtPct(r.p_title)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.dim,
                  fontFamily: MONO,
                  width: 32,
                  textAlign: "right",
                  flexShrink: 0,
                }}
                title="Bye %"
              >
                {fmtPct(r.p_bye)}
              </span>
            </div>
          );
        })}
      </div>
      {data?.is_stale && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: C.dim,
            marginTop: 4,
            paddingLeft: 10,
          }}
          title={data.stale_reason ?? ""}
        >
          {/* is_stale drives the FE hint; the /odds/recompute POST is
              deliberately NOT called from here — user-triggered only. */}
          recomputing…
        </div>
      )}
    </div>
  );
}
