"use client";

import React, { useMemo } from "react";
import { C, MONO, SANS } from "@/components/league/tokens";
import type {
  AvailabilityEntry,
  ChalkPick,
  ConsensusBoardEntry,
  HitRatesResponse,
  OwnerProfile,
  Position,
  PositionalGrade,
  PreDraftResponse,
  SimulateResponse,
} from "./contracts";
import { pickNumFromSlot } from "./helpers";
import {
  activeDrafters,
  prospectsAtRisk,
  threatsAheadOfUser,
} from "./warroom";

// ─── Local design tokens ─────────────────────────────────────────────────
const WR = {
  bg: "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,165,50,0.055) 0%, transparent 60%), #07090f",
  card: "rgba(255,255,255,0.018)",
  cardHair: "rgba(255,255,255,0.06)",
  cardGlow: "rgba(212,165,50,0.04)",
  hair: "rgba(255,255,255,0.055)",
  hairStrong: "rgba(255,255,255,0.10)",
  goldHair: "rgba(212,165,50,0.22)",
  greenGlow: "rgba(125,211,160,0.14)",
  redGlow: "rgba(228,114,114,0.14)",
};

// Vibrant position colors for badges (premium pill style)
const POS_BADGE: Record<Position | string, { fg: string; bg: string }> = {
  QB: { fg: "#2a0a0a", bg: "#e47272" },
  RB: { fg: "#06121b", bg: "#6bb8e0" },
  WR: { fg: "#051a10", bg: "#7dd3a0" },
  TE: { fg: "#1a0f05", bg: "#e09c6b" },
};
const POS_MUTED: Record<Position | string, string> = {
  QB: "#8a4a4a",
  RB: "#4a7a98",
  WR: "#5c9477",
  TE: "#98724f",
};

const IDENTITY_LABEL: Record<OwnerProfile["draft_identity"], string> = {
  DEVELOPER: "Developer",
  "PIPELINE BUILDER": "Pipeline",
  GAMBLER: "Gambler",
  INEFFICIENT: "Inefficient",
  BALANCED: "Balanced",
};
const IDENTITY_TOOLTIP: Record<OwnerProfile["draft_identity"], string> = {
  GAMBLER: "Gambler — swings for upside, leans boom/bust prospects",
  DEVELOPER: "Developer — drafts raw talent, patient with development",
  "PIPELINE BUILDER": "Pipeline — accumulates picks, builds long-term via draft capital",
  INEFFICIENT: "Inefficient — historically reaches or misses value",
  BALANCED: "Balanced — mixes safe picks with upside swings",
};
const IDENTITY_TONE: Record<OwnerProfile["draft_identity"], string> = {
  GAMBLER: "#e47272",
  DEVELOPER: "#7dd3a0",
  "PIPELINE BUILDER": "#d4a532",
  INEFFICIENT: "#b0b2c8",
  BALANCED: "#6bb8e0",
};
const WINDOW_TOOLTIP: Record<string, string> = {
  REBUILDER: "Rebuilder — targeting future seasons, collecting assets",
  CONTENDER: "Contender — competing now, values immediate impact",
  BALANCED: "Balanced — neither fully rebuilding nor all-in",
};
const BOOMBUST_TOOLTIP: Record<string, string> = {
  SAFE: "Safe pick — reliable floor, low bust risk",
  MODERATE: "Moderate — balanced upside and risk",
  POLARIZING: "Polarizing — analysts disagree, wide range of outcomes",
  "BOOM/BUST": "Boom/Bust — high upside, high bust risk",
};

// Positional grade → letter
const GRADE_TO_LETTER: Record<PositionalGrade, string> = {
  CRITICAL: "D",
  WEAK: "C",
  AVERAGE: "B",
  STRONG: "A-",
  ELITE: "A+",
};
const GRADE_TONE: Record<PositionalGrade, string> = {
  CRITICAL: "#e47272",
  WEAK: "#e09c6b",
  AVERAGE: "#b0b2c8",
  STRONG: "#7dd3a0",
  ELITE: "#d4a532",
};

// ─── Props ───────────────────────────────────────────────────────────────
export interface WarRoomLandingProps {
  preDraft: PreDraftResponse;
  hitRates: HitRatesResponse;
  ownerProfiles: ReadonlyArray<OwnerProfile & { avatar_id?: string }>;
  simSnapshot: SimulateResponse;
  onStartSim: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function WarRoomLanding({
  preDraft,
  hitRates,
  ownerProfiles,
  simSnapshot,
  onStartSim,
}: WarRoomLandingProps) {
  const { league_name, format, te_premium, num_teams, owner, window: userWindow, positional_grades, needs, user_picks } = preDraft;

  // Map owner → avatar for avatar lookup
  const avatarByOwner = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const p of ownerProfiles) m.set(p.owner.toLowerCase(), p.avatar_id);
    return m;
  }, [ownerProfiles]);

  // User's first pick slot
  const userFirstSlot = user_picks[0]?.slot ?? "";
  const userFirstPickNum = pickNumFromSlot(userFirstSlot, num_teams);
  const userIdentity = ownerProfiles.find((p) => p.owner === owner);

  // Derived: drafters in round 1 (threat radar base set)
  const _activeDrafters = useMemo(
    () => activeDrafters(simSnapshot.chalk, owner, num_teams),
    [simSnapshot.chalk, owner, num_teams],
  );

  // Derived: threats ahead of user (uses sim chalk)
  const threats = useMemo(
    () => threatsAheadOfUser({
      userOwner: owner,
      userFirstSlot,
      numTeams: num_teams,
      chalk: simSnapshot.chalk,
      ownerMeta: ownerProfiles.map((p) => ({
        owner: p.owner,
        owner_user_id: p.owner_user_id ?? "",
        draft_identity: p.draft_identity,
        hit_rate: p.hit_rate,
        round1_position_distribution: p.round1_position_distribution as Record<string, number>,
        avatar_id: p.avatar_id,
      })),
      availability: simSnapshot.prospect_availability,
    }),
    [owner, userFirstSlot, num_teams, simSnapshot.chalk, simSnapshot.prospect_availability, ownerProfiles],
  );

  // Derived: prospects at risk (won't make it to you)
  const atRisk = useMemo(
    () => prospectsAtRisk({
      consensusBoard: simSnapshot.consensus_board,
      availability: simSnapshot.prospect_availability,
      userFirstSlot,
      threshold: 50,
      topN: 10,
    }),
    [simSnapshot.consensus_board, simSnapshot.prospect_availability, userFirstSlot],
  );

  // Top prospects for the rail — realistic decision space at user's slot.
  // Filter out prospects with ~0% availability (they won't be there) so the
  // board reflects what the user actually has to choose between. Top-of-class
  // prospects with high fit_score still live in consensus_board for the
  // formula's edge-case coverage — they just don't clutter the user-facing list.
  const topProspects = useMemo(() => {
    return simSnapshot.consensus_board
      .map((p) => {
        const avail = simSnapshot.prospect_availability[p.name]?.find((a) => a.slot === userFirstSlot);
        return {
          ...p,
          availability_at_user: avail?.pct_available ?? null,
          fills_need: needs.includes(p.position),
        };
      })
      .filter((p) => p.availability_at_user === null || p.availability_at_user >= 2)
      .slice(0, 10);
  }, [simSnapshot.consensus_board, simSnapshot.prospect_availability, userFirstSlot, needs]);

  // Tier distribution per position (drives the micro-bar in Position Strength)
  const tierDistByPos = useMemo(() => {
    const result: Record<string, Record<number, number>> = { QB: {}, RB: {}, WR: {}, TE: {} };
    for (const p of simSnapshot.consensus_board) {
      if (!result[p.position]) continue;
      result[p.position][p.tier] = (result[p.position][p.tier] ?? 0) + 1;
    }
    return result;
  }, [simSnapshot.consensus_board]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: WR.bg, fontFamily: SANS, color: C.primary }}>
      <style>{`
        .wr-tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
        .wr-bar-fill { transform-origin: left; animation: wr-bar 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes wr-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .wr-stagger > * { animation: wr-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .wr-stagger > *:nth-child(1) { animation-delay: 40ms; }
        .wr-stagger > *:nth-child(2) { animation-delay: 90ms; }
        .wr-stagger > *:nth-child(3) { animation-delay: 140ms; }
        .wr-stagger > *:nth-child(4) { animation-delay: 190ms; }
        .wr-stagger > *:nth-child(5) { animation-delay: 240ms; }
        .wr-stagger > *:nth-child(6) { animation-delay: 290ms; }
        .wr-stagger > *:nth-child(7) { animation-delay: 340ms; }
        .wr-stagger > *:nth-child(8) { animation-delay: 390ms; }
        @keyframes wr-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .wr-cta { transition: transform 140ms ease, box-shadow 240ms ease; }
        .wr-cta:active { transform: scale(0.985); }
        .wr-cta::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: 0 0 0 0 rgba(212,165,50,0.35); animation: wr-pulse 2.4s ease-in-out infinite; }
        @keyframes wr-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,50,0); } 50% { box-shadow: 0 0 0 8px rgba(212,165,50,0.08); } }
        .wr-scroll-x { scrollbar-width: none; }
        .wr-scroll-x::-webkit-scrollbar { display: none; }
        .wr-row-tap { transition: background 160ms ease; }
        .wr-row-tap:active { background: rgba(255,255,255,0.03); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER STRIP — Bloomberg-style single dense row
          ═══════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{
          borderBottom: `1px solid ${WR.hair}`,
          background: "rgba(7, 9, 15, 0.82)",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 md:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
            <span
              className="text-[10px] md:text-[11px] font-bold tracking-[0.18em] uppercase truncate"
              style={{ color: C.gold }}
            >
              {league_name}
            </span>
            <span
              className="text-[9px] md:text-[10px] font-semibold tracking-[0.14em] px-1.5 py-0.5 rounded wr-tabular"
              style={{
                fontFamily: MONO,
                color: C.dim,
                border: `1px solid ${WR.hair}`,
              }}
            >
              {format}{te_premium ? " · TEP" : ""} · {num_teams}T
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px]" style={{ color: C.secondary }}>
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] tracking-[0.18em] uppercase" style={{ color: C.dim }}>Pick</span>
              <span className="wr-tabular font-semibold" style={{ color: C.gold, letterSpacing: "-0.01em" }}>{userFirstSlot}</span>
            </span>
            <span style={{ width: 1, height: 14, background: WR.hair }} />
            <span className="flex items-center gap-2">
              <span style={{ color: C.primary }}>{owner}</span>
              {userIdentity && (
                <span
                  className="text-[9px] font-semibold tracking-[0.08em] px-1.5 py-0.5 rounded-full uppercase"
                  style={{
                    color: IDENTITY_TONE[userIdentity.draft_identity],
                    background: `${IDENTITY_TONE[userIdentity.draft_identity]}12`,
                    border: `1px solid ${IDENTITY_TONE[userIdentity.draft_identity]}30`,
                  }}
                  title={IDENTITY_TOOLTIP[userIdentity.draft_identity]}
                >
                  {IDENTITY_LABEL[userIdentity.draft_identity]}
                </span>
              )}
            </span>
            <span style={{ width: 1, height: 14, background: WR.hair }} />
            <span
              className="text-[10px] tracking-[0.14em] uppercase"
              style={{ color: C.dim }}
              title={WINDOW_TOOLTIP[userWindow] ?? ""}
            >
              {userWindow}
            </span>
          </div>
          {/* Mobile: compact right side */}
          <div className="flex md:hidden items-center gap-2 text-[11px]">
            <span className="wr-tabular font-semibold" style={{ color: C.gold }}>{userFirstSlot}</span>
            <span style={{ width: 1, height: 12, background: WR.hair }} />
            <span className="truncate max-w-[88px]" style={{ color: C.primary }}>{owner}</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          2. YOUR PICKS — horizontal rail of trading cards
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-5 md:pt-6">
        <SectionHeader
          eyebrow="Your Capital"
          title="Picks on the clock"
          meta={`${user_picks.length} picks · ${preDraft.total_picks_2026} total 2026`}
        />
        <div
          className="wr-scroll-x flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 md:mx-0 md:px-0 wr-stagger"
          style={{ scrollPaddingInline: 16 }}
        >
          {user_picks.map((pick) => {
            // Top 3 realistic targets at this slot
            const targets = simSnapshot.consensus_board
              .map((c) => {
                const avail = simSnapshot.prospect_availability[c.name]?.find((a) => a.slot === pick.slot);
                return avail ? { name: c.name, position: c.position, pct: avail.pct_available, rank: c.rank } : null;
              })
              .filter((t): t is NonNullable<typeof t> => !!t && t.pct >= 30)
              .slice(0, 3);
            return (
              <article
                key={pick.slot}
                className="snap-center flex-shrink-0 rounded-xl p-4 md:p-5"
                style={{
                  width: 236,
                  background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)`,
                  border: `1px solid ${WR.cardHair}`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
                }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-semibold tracking-[0.22em] uppercase" style={{ color: C.dim }}>
                    Round {pick.round}
                  </span>
                  <span className="text-[9px] font-medium tracking-[0.12em]" style={{ color: C.dim, fontFamily: MONO }}>
                    {pick.picks_before} away
                  </span>
                </div>
                <div
                  className="mt-2 wr-tabular font-semibold leading-none"
                  style={{
                    fontSize: 44,
                    letterSpacing: "-0.03em",
                    color: C.primary,
                  }}
                >
                  {pick.slot}
                </div>
                <div
                  className="mt-4 pt-3"
                  style={{ borderTop: `1px solid ${WR.hair}` }}
                >
                  {targets.length > 0 ? (
                    <>
                      <div className="text-[8px] tracking-[0.18em] uppercase mb-1.5" style={{ color: C.dim }}>
                        Likely available at {pick.slot}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {targets.map((t) => (
                          <div key={t.name} className="flex items-center gap-2 text-[11px]">
                            <PosDot pos={t.position} />
                            <span className="truncate flex-1" style={{ color: C.secondary }}>{t.name}</span>
                            <span
                              className="wr-tabular text-[10px] font-semibold"
                              style={{ color: t.pct > 60 ? C.green : t.pct > 30 ? C.gold : C.dim }}
                              title={`${t.pct}% of simulations have ${t.name} still on the board at ${pick.slot}`}
                            >
                              {t.pct}% avail
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] tracking-[0.12em]" style={{ color: C.dim }}>
                      Board opens up — run sim for targets
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. THREE-COL ROW — Position Strength · Hit Rates · Threat Radar
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-7 md:pt-8 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
        {/* ── 3a. Position Strength ── */}
        <PanelCard>
          <SectionHeader eyebrow="Roster" title="Position strength" />
          <div className="grid grid-cols-4 gap-1.5 md:gap-3 mt-3">
            {(["QB", "RB", "WR", "TE"] as Position[]).map((pos) => {
              const grade = positional_grades[pos] ?? "AVERAGE";
              const letter = GRADE_TO_LETTER[grade];
              const tone = GRADE_TONE[grade];
              const tiers = tierDistByPos[pos] ?? {};
              const tierTotal = Object.values(tiers).reduce((a, b) => a + b, 0) || 1;
              const isNeed = needs.includes(pos);
              return (
                <div key={pos} className="flex flex-col" style={{ minWidth: 0 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-[0.12em]" style={{ color: POS_MUTED[pos] }}>{pos}</span>
                    {isNeed && (
                      <span
                        className="text-[8px] font-bold tracking-[0.14em] px-1 py-[1px] rounded uppercase"
                        style={{ color: "#2a0a0a", background: tone }}
                      >
                        Need
                      </span>
                    )}
                  </div>
                  <div
                    className="wr-tabular font-semibold leading-none mt-2"
                    style={{ fontSize: 26, color: tone, letterSpacing: "-0.03em" }}
                  >
                    {letter}
                  </div>
                  <div className="text-[8px] md:text-[9px] mt-1 tracking-[0.08em] uppercase truncate" style={{ color: C.dim }}>
                    {grade.toLowerCase()}
                  </div>
                  <div className="mt-2.5 flex h-[3px] gap-[2px]">
                    {[1, 2, 3, 4].map((t) => {
                      const pct = (tiers[t] ?? 0) / tierTotal;
                      return (
                        <div
                          key={t}
                          className="flex-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div
                            className="h-full wr-bar-fill"
                            style={{
                              background: t === 1 ? tone : t === 2 ? `${tone}99` : t === 3 ? `${tone}55` : `${tone}25`,
                              width: `${Math.max(pct, 0.08) * 100}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>

        {/* ── 3b. Hit Rates vs Global ── */}
        <PanelCard>
          <SectionHeader eyebrow="Intel" title="Hit rates · vs global" />
          <HitRateMatrix hitRates={hitRates} />
          {(() => {
            const leagueOverall = hitRates.league.overall_hit_pct;
            const globalOverall = hitRates.global.overall_hit_pct;
            const delta = leagueOverall - globalOverall;
            const above = delta > 0;
            return (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${WR.hair}` }}>
                <div className="text-[9px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: C.dim }}>
                  Overall
                </div>
                <div className="flex items-baseline gap-2 wr-tabular flex-wrap text-[11px]">
                  <span style={{ color: C.secondary }}>
                    Your league: <span className="font-semibold" style={{ color: C.gold }}>{leagueOverall}%</span>
                  </span>
                  <span style={{ color: C.dim }}>·</span>
                  <span style={{ color: C.secondary }}>
                    Global: <span className="font-semibold" style={{ color: C.primary }}>{globalOverall}%</span>
                  </span>
                  <span style={{ color: C.dim }}>·</span>
                  <span
                    className="font-semibold"
                    style={{ color: above ? C.green : delta < 0 ? C.red : C.dim }}
                  >
                    {above ? "+" : ""}{delta}pp {above ? "above" : delta < 0 ? "below" : "equal to"} average
                  </span>
                </div>
              </div>
            );
          })()}
        </PanelCard>

        {/* ── 3c. Picks Before You ── */}
        <PanelCard>
          <SectionHeader eyebrow="Recon" title="Picks before you" meta={`${threats.length} before ${userFirstSlot}`} />
          <div className="text-[10px] mt-1 tracking-[0.08em]" style={{ color: C.dim }}>
            Owners drafting ahead of your {userFirstSlot}
          </div>
          <div className="mt-3 flex flex-col gap-2 wr-stagger">
            {threats.map((t) => (
              <ThreatRow key={t.slot} threat={t} numTeams={num_teams} userPickNum={userFirstPickNum} avatarId={avatarByOwner.get(t.owner.toLowerCase())} />
            ))}
          </div>
        </PanelCard>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. TOP PROSPECTS — horizontal rail at md+, vertical list at sm
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-7 md:pt-9 pb-36">
        <SectionHeader
          eyebrow="Board"
          title="Top of the board"
          meta={`Fit + availability at ${userFirstSlot}`}
        />

        {/* Mobile: vertical list */}
        <div className="md:hidden mt-3 flex flex-col wr-stagger">
          {topProspects.map((p, i) => (
            <ProspectRow
              key={p.name}
              prospect={p}
              isFirst={i === 0}
              isAtRisk={atRisk.some((r) => r.name === p.name)}
            />
          ))}
        </div>

        {/* md+: horizontal rail */}
        <div className="hidden md:flex gap-3 mt-4 overflow-x-auto snap-x snap-mandatory wr-scroll-x pb-1 wr-stagger">
          {topProspects.map((p) => (
            <ProspectCard
              key={p.name}
              prospect={p}
              isAtRisk={atRisk.some((r) => r.name === p.name)}
            />
          ))}
        </div>

        {atRisk.length > 0 && (
          <div className="mt-4 px-4 py-3 rounded-lg flex items-center gap-3" style={{ background: "rgba(228,114,114,0.05)", border: `1px solid rgba(228,114,114,0.18)` }}>
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "#e47272" }}>
              At risk
            </span>
            <span className="text-[11px] flex-1" style={{ color: C.secondary }}>
              <span style={{ color: C.primary }}>{atRisk.length}</span> top-10 prospects likely gone before {userFirstSlot}:{" "}
              <span style={{ color: C.primary }}>{atRisk.slice(0, 3).map((r) => r.name).join(", ")}</span>
              {atRisk.length > 3 ? ` +${atRisk.length - 3} more` : ""}
            </span>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. STICKY CTA — persistent bottom action bar
          Sits above the mobile 56px global bottom tab bar (sm:hidden).
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 right-0 z-30 backdrop-blur bottom-14 sm:bottom-0"
        style={{
          background: "linear-gradient(180deg, rgba(7,9,15,0.5) 0%, rgba(7,9,15,0.96) 50%)",
          borderTop: `1px solid ${WR.hair}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] md:text-[11px] tracking-[0.12em]" style={{ color: C.dim }}>
              Based on your <span style={{ color: C.primary }}>{userFirstSlot}</span> slot and league tendencies
            </span>
            <span className="text-[10px] md:text-[11px] tracking-[0.12em] wr-tabular" style={{ color: C.dim }}>
              <span style={{ color: C.secondary }}>{simSnapshot.simulations_run}</span> simulations · <span style={{ color: C.secondary }}>{num_teams}</span> owner profiles · <span style={{ color: C.secondary }}>{simSnapshot.consensus_board.length}</span> prospects
            </span>
          </div>
          <button
            onClick={onStartSim}
            className="wr-cta relative flex-shrink-0 flex items-center gap-2 rounded-lg cursor-pointer"
            style={{
              padding: "12px 18px",
              background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
              color: "#1a1204",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              minHeight: 44,
              boxShadow: "0 6px 20px rgba(212,165,50,0.18), inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            <span className="uppercase">Run simulation</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          className="text-[9px] font-bold tracking-[0.24em] uppercase"
          style={{ color: C.gold }}
        >
          {eyebrow}
        </span>
        <h2
          className="text-[14px] md:text-[15px] font-semibold truncate"
          style={{ color: C.primary, letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
      </div>
      {meta && (
        <span className="text-[10px] wr-tabular whitespace-nowrap" style={{ color: C.dim, fontFamily: MONO }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3 md:p-5 overflow-hidden"
      style={{
        background: WR.card,
        border: `1px solid ${WR.cardHair}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.035)`,
      }}
    >
      {children}
    </div>
  );
}

function PosDot({ pos }: { pos: string }) {
  const tone = POS_MUTED[pos] ?? C.dim;
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 5, height: 5, background: tone, boxShadow: `0 0 6px ${tone}55` }}
    />
  );
}

function PosBadge({ pos }: { pos: string }) {
  const b = POS_BADGE[pos];
  if (!b) return null;
  return (
    <span
      className="wr-tabular text-[9px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded"
      style={{ color: b.fg, background: b.bg, letterSpacing: "0.05em" }}
    >
      {pos}
    </span>
  );
}

// ─── Hit Rate Matrix ─────────────────────────────────────────────────────
function HitRateMatrix({ hitRates }: { hitRates: HitRatesResponse }) {
  const positions: Position[] = ["QB", "RB", "WR", "TE"];
  const rounds: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const byKey = (source: HitRatesResponse["league"], pos: Position, round: number) =>
    source.by_position_round.find((r) => r.position === pos && r.round === round);

  return (
    <div className="mt-3">
      {/* Round header row (R1 R2 R3 R4) */}
      <div className="flex items-center gap-[2px]">
        <div style={{ width: 22, flexShrink: 0 }} />
        {rounds.map((r) => (
          <div
            key={r}
            className="text-center text-[9px] tracking-[0.14em] uppercase wr-tabular"
            style={{ color: C.dim, flex: "1 1 0", minWidth: 0 }}
          >
            R{r}
          </div>
        ))}
      </div>
      {/* Sub-header row (YOU / GLOB under each round) */}
      <div className="flex items-center gap-[2px] mt-0.5">
        <div style={{ width: 22, flexShrink: 0 }} />
        {rounds.map((r) => (
          <div key={r} className="flex" style={{ flex: "1 1 0", minWidth: 0 }}>
            <div
              className="flex-1 text-center text-[7px] tracking-[0.12em] uppercase"
              style={{ color: C.gold, opacity: 0.7 }}
              title="Your league's hit rate for this position and round"
            >
              You
            </div>
            <div
              className="flex-1 text-center text-[7px] tracking-[0.12em] uppercase"
              style={{ color: C.dim }}
              title="Global average hit rate across all leagues"
            >
              Glob
            </div>
          </div>
        ))}
      </div>
      {/* Position rows */}
      <div className="mt-1 flex flex-col gap-[2px]">
        {positions.map((pos) => (
          <div key={pos} className="flex items-stretch gap-[2px]">
            <div
              className="flex items-center text-[10px] font-bold tracking-[0.08em]"
              style={{ color: POS_MUTED[pos], width: 22, flexShrink: 0 }}
            >
              {pos}
            </div>
            {rounds.map((r) => {
              const league = byKey(hitRates.league, pos, r);
              const global = byKey(hitRates.global, pos, r);
              if (!league || !global) {
                return (
                  <div
                    key={r}
                    className="py-1.5 rounded"
                    style={{ background: "rgba(255,255,255,0.02)", flex: "1 1 0", minWidth: 0 }}
                  />
                );
              }
              const delta = league.hit_pct - global.hit_pct;
              const above = delta > 3;
              const below = delta < -8;
              return (
                <div
                  key={r}
                  className="py-1.5 rounded flex items-center"
                  style={{
                    background: above
                      ? "rgba(212,165,50,0.10)"
                      : below
                        ? "rgba(228,114,114,0.08)"
                        : "rgba(255,255,255,0.025)",
                    border: above
                      ? "1px solid rgba(212,165,50,0.28)"
                      : below
                        ? "1px solid rgba(228,114,114,0.18)"
                        : `1px solid ${WR.hair}`,
                    boxShadow: above ? "inset 0 0 12px rgba(212,165,50,0.10)" : undefined,
                    flex: "1 1 0",
                    minWidth: 0,
                  }}
                  title={`${pos} · R${r}: your league hits ${league.hit_pct}% vs global ${global.hit_pct}% (${delta >= 0 ? "+" : ""}${delta}pp)`}
                >
                  <span
                    className="flex-1 text-center wr-tabular text-[11px] font-semibold leading-none"
                    style={{ color: above ? C.gold : below ? "#e47272" : C.primary, letterSpacing: "-0.01em" }}
                  >
                    {league.hit_pct}%
                  </span>
                  <span
                    className="flex-1 text-center wr-tabular text-[10px]"
                    style={{ color: C.dim }}
                  >
                    {global.hit_pct}%
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[8px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>
        <span className="flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(212,165,50,0.35)", border: "1px solid rgba(212,165,50,0.5)" }} />
          Above global
        </span>
        <span className="flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(228,114,114,0.25)", border: "1px solid rgba(228,114,114,0.4)" }} />
          Below global
        </span>
      </div>
    </div>
  );
}

// ─── Threat Row ──────────────────────────────────────────────────────────
function ThreatRow({
  threat,
  numTeams,
  userPickNum,
  avatarId,
}: {
  threat: ReturnType<typeof threatsAheadOfUser>[number];
  numTeams: number;
  userPickNum: number;
  avatarId?: string;
}) {
  const picksAway = userPickNum - pickNumFromSlot(threat.slot, numTeams);
  const tone = IDENTITY_TONE[threat.draft_identity];
  return (
    <div
      className="wr-row-tap flex items-start gap-3 py-2.5 px-1"
      style={{ borderBottom: `1px solid ${WR.hair}` }}
    >
      <Avatar avatarId={avatarId} name={threat.owner} tone={tone} />
      <div className="min-w-0 flex-1">
        {/* Header: owner + identity + slot + picks-away */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[12px] font-semibold truncate" style={{ color: C.primary }}>{threat.owner}</span>
          <span
            className="text-[8px] font-semibold tracking-[0.12em] uppercase px-1 py-[1px] rounded-full whitespace-nowrap"
            style={{ color: tone, background: `${tone}12`, border: `1px solid ${tone}30` }}
            title={IDENTITY_TOOLTIP[threat.draft_identity]}
          >
            {IDENTITY_LABEL[threat.draft_identity]}
          </span>
          <span className="text-[10px] wr-tabular ml-auto whitespace-nowrap" style={{ color: C.dim }}>
            Pick {threat.slot} · {picksAway} {picksAway === 1 ? "pick" : "picks"} away
          </span>
        </div>
        {/* Likely action + impact on user */}
        {threat.likely_pick_name && (
          <div className="text-[10px] mt-1 flex items-start gap-1.5 leading-snug">
            {threat.likely_pick_position && <span className="mt-1"><PosDot pos={threat.likely_pick_position} /></span>}
            <span style={{ color: C.secondary }}>
              Will take <span style={{ color: C.primary, fontWeight: 600 }}>{threat.likely_pick_name}</span>
              {threat.availability_shift && (
                <>
                  {" "}
                  — availability{" "}
                  <span className="wr-tabular" style={{ color: C.secondary }}>{threat.availability_shift.before}%</span>
                  <span style={{ color: C.dim, margin: "0 4px" }}>→</span>
                  <span className="wr-tabular" style={{ color: "#e47272" }}>{threat.availability_shift.after}%</span>
                  {" "}at your pick
                </>
              )}
            </span>
          </div>
        )}
        {/* Track record */}
        <div
          className="text-[10px] mt-1 wr-tabular"
          style={{ color: threat.hit_rate > 50 ? C.gold : C.dim }}
          title={`${threat.owner} hits on ${threat.hit_rate}% of first-round picks historically`}
        >
          Hits on {threat.hit_rate}% of R1 picks
        </div>
      </div>
    </div>
  );
}

function Avatar({ avatarId, name, tone }: { avatarId?: string; name: string; tone: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://sleepercdn.com/avatars/thumbs/${avatarId}`}
        alt={name}
        width={28}
        height={28}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${tone}30`,
          background: "#1a1e2b",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: `linear-gradient(135deg, ${tone}22, ${tone}08)`,
        border: `1px solid ${tone}30`,
        color: tone,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Prospect Card (md+) and Row (sm) ────────────────────────────────────

type EnrichedProspect = ConsensusBoardEntry & {
  availability_at_user: number | null;
  fills_need: boolean;
};

function ProspectCard({ prospect: p, isAtRisk }: { prospect: EnrichedProspect; isAtRisk: boolean }) {
  const fitColor = p.fit_score >= 80 ? C.gold : p.fit_score >= 60 ? C.green : p.fit_score >= 40 ? C.secondary : C.dim;
  return (
    <article
      className="snap-center flex-shrink-0 rounded-xl p-4"
      style={{
        width: 220,
        background: p.fills_need
          ? `linear-gradient(180deg, rgba(212,165,50,0.04) 0%, rgba(255,255,255,0.008) 100%)`
          : WR.card,
        border: `1px solid ${p.fills_need ? WR.goldHair : WR.cardHair}`,
        boxShadow: p.fills_need
          ? `inset 0 1px 0 rgba(212,165,50,0.10), 0 0 24px rgba(212,165,50,0.04)`
          : `inset 0 1px 0 rgba(255,255,255,0.035)`,
      }}
    >
      <div className="flex items-center justify-between">
        <PosBadge pos={p.position} />
        <span className="wr-tabular text-[9px] tracking-[0.12em]" style={{ color: C.dim }}>#{p.rank}</span>
      </div>
      <div className="mt-2.5 text-[14px] font-semibold leading-tight" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
        {p.name}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>Tier {p.tier}</span>
        <BoomBustIcon value={p.boom_bust} />
      </div>

      <div className="mt-3.5 flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold tracking-[0.24em] uppercase" style={{ color: C.dim }}>Fit</span>
          <span className="wr-tabular font-semibold leading-none mt-0.5" style={{ fontSize: 30, color: fitColor, letterSpacing: "-0.02em" }}>
            {p.fit_score}
          </span>
        </div>
        {p.availability_at_user !== null && (
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold tracking-[0.24em] uppercase" style={{ color: C.dim }}>Avail</span>
            <span className="wr-tabular text-[13px] font-semibold mt-0.5" style={{ color: isAtRisk ? "#e47272" : C.secondary }}>
              {p.availability_at_user ?? 0}%
            </span>
            <div className="mt-1 h-[2px] w-[60px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full wr-bar-fill"
                style={{
                  width: `${Math.max(p.availability_at_user ?? 0, 2)}%`,
                  background: isAtRisk ? "#e47272" : C.secondary,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function ProspectRow({ prospect: p, isFirst, isAtRisk }: { prospect: EnrichedProspect; isFirst: boolean; isAtRisk: boolean }) {
  const fitColor = p.fit_score >= 80 ? C.gold : p.fit_score >= 60 ? C.green : p.fit_score >= 40 ? C.secondary : C.dim;
  return (
    <div
      className="wr-row-tap flex items-center gap-3 py-3"
      style={{ borderTop: isFirst ? `1px solid ${WR.hair}` : undefined, borderBottom: `1px solid ${WR.hair}` }}
    >
      <span className="wr-tabular text-[10px] w-5 text-right" style={{ color: C.dim }}>{p.rank}</span>
      <PosBadge pos={p.position} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold leading-tight" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
          {p.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] tracking-[0.12em] uppercase" style={{ color: C.dim }}>T{p.tier}</span>
          <BoomBustIcon value={p.boom_bust} />
          {p.fills_need && (
            <span
              className="text-[8px] font-bold tracking-[0.14em] uppercase px-1 py-[1px] rounded"
              style={{ color: C.gold, background: "rgba(212,165,50,0.10)", border: "1px solid rgba(212,165,50,0.25)" }}
            >
              Fills need
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <div className="flex items-baseline gap-1" title={`Fit score: ${p.fit_score}/100`}>
          <span className="wr-tabular font-semibold leading-none" style={{ fontSize: 20, color: fitColor, letterSpacing: "-0.02em" }}>
            {p.fit_score}
          </span>
          <span className="text-[8px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>fit</span>
        </div>
        {p.availability_at_user !== null && (
          <span
            className="wr-tabular text-[10px]"
            style={{ color: isAtRisk ? "#e47272" : C.dim }}
            title={`${p.availability_at_user}% of simulations have ${p.name} available at your pick`}
          >
            {p.availability_at_user ?? 0}% avail
          </span>
        )}
      </div>
    </div>
  );
}

function BoomBustIcon({ value }: { value: string }) {
  const tone = value === "SAFE" ? C.green : value === "BOOM/BUST" ? "#e47272" : value === "POLARIZING" ? "#e09c6b" : C.dim;
  const label = value === "SAFE" ? "Safe" : value === "BOOM/BUST" ? "Boom/bust" : value === "POLARIZING" ? "Polarizing" : "Moderate";
  return (
    <span
      className="flex items-center gap-1 text-[9px] tracking-[0.10em]"
      style={{ color: tone }}
      title={BOOMBUST_TOOLTIP[value] ?? ""}
    >
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: tone, display: "inline-block" }} />
      {label}
    </span>
  );
}
