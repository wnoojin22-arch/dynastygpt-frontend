"use client";

/**
 * "YOUR CHAMPIONSHIP ODDS" DCard tile — desktop + mobile variants.
 *
 * Desktop (variant="desktop", default):
 *   Three-column stat grid (PLAYOFF / TITLE / 1ST-RD BYE) inside the
 *   gold-header DCard shell copied from DashboardView.tsx:371-413's
 *   MANAGER RANKS card. Full label "1ST-RD BYE" clears the "what is
 *   bye" ambiguity at the width where it fits.
 *
 * Mobile (variant="mobile"):
 *   Compact horizontal strip, total height ~1 action-grid row. Two
 *   stats only (PLAYOFF · TITLE) — BYE dropped so the action grid
 *   below stays the mobile focal point.
 *
 * Both variants share the empty-state ("Odds arrive after the first
 * sim run") when the league has no championship_odds row yet.
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

const EMPTY_COPY = "Odds arrive after the first sim run";

interface Props {
  leagueId: string | null | undefined;
  ownerUserId: string | null | undefined;
  variant?: "desktop" | "mobile";
}

export default function ChampionshipOddsTile({
  leagueId,
  ownerUserId,
  variant = "desktop",
}: Props) {
  const { data } = useQuery({
    queryKey: ["championship-odds", leagueId],
    queryFn: () => getChampionshipOdds(leagueId!),
    enabled: !!leagueId,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const teams: ChampionshipOddsRow[] = data?.teams ?? [];
  const myRow =
    ownerUserId != null
      ? teams.find((t) => t.platform_user_id === ownerUserId)
      : undefined;
  const hasAnyRow = teams.length > 0 && data?.computed_at != null;

  const shell = {
    borderRadius: variant === "mobile" ? 6 : 8,
    overflow: "hidden" as const,
    background: `linear-gradient(180deg, ${C.goldGlow} 0%, transparent 50%), ${C.card}`,
    borderTop: `2px solid ${C.goldDark}`,
    borderRight: `1px solid ${C.goldBorder}`,
    borderBottom: `1px solid ${C.goldBorder}`,
    borderLeft: `1px solid ${C.goldBorder}`,
  };

  if (variant === "mobile") {
    return (
      <div className="w-full">
        <div style={shell}>
          <div
            style={{
              padding: "3px 10px",
              borderBottom: `1px solid ${C.border}`,
              background: C.goldDim,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.10em",
                color: C.gold,
              }}
            >
              CHAMPIONSHIP ODDS
            </span>
          </div>

          {hasAnyRow ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                padding: "5px 10px 6px",
              }}
            >
              {[
                { label: "PLAYOFF", val: fmtPct(myRow?.p_playoffs) },
                { label: "TITLE", val: fmtPct(myRow?.p_title) },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      color: C.dim,
                      marginBottom: 1,
                    }}
                  >
                    {s.label}
                  </div>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 18,
                      fontWeight: 900,
                      color: C.gold,
                      lineHeight: 1,
                    }}
                  >
                    {s.val}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "8px 10px",
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.06em",
                color: C.dim,
              }}
            >
              {EMPTY_COPY}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div style={shell}>
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

        {hasAnyRow ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              padding: "10px 12px 12px",
            }}
          >
            {[
              { label: "PLAYOFF", val: fmtPct(myRow?.p_playoffs) },
              { label: "TITLE", val: fmtPct(myRow?.p_title) },
              { label: "1ST-RD BYE", val: fmtPct(myRow?.p_bye) },
            ].map((s) => (
              <div
                key={s.label}
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
                  {s.label}
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
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "14px 12px 16px",
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.06em",
              color: C.dim,
            }}
          >
            {EMPTY_COPY}
          </div>
        )}

        {data?.is_stale && hasAnyRow && (
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
