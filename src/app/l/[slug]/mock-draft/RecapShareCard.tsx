"use client";

/**
 * RecapShareCard — fixed 1080×1080 canvas intended for social export.
 * Rendered in a hidden off-DOM node on share; toPng'd via html-to-image.
 *
 * HERO PRIORITY (3-way, computed by computeHero in ./recap):
 *   P1 — steal lead     → "Name FELL N PAST ADP" (big display)
 *   P2 — grade flex     → massive letter with gold glow
 *   P3 — identity       → archetype label as typography treatment over owner
 *
 * Null-safety: every optional Phase 2A field (fit_score, post_draft_grades,
 * user_missed_opportunities, alternate_id) is either rendered or omitted —
 * never filled with stand-in numbers.
 */

import React from "react";
import { C, DISPLAY, MONO, SANS } from "@/components/league/tokens";
import type { ConsensusBoardEntry, Position, PreDraftResponse } from "./contracts";
import { biggestSteal, letterGrade, pickNumFromSlot, valueVsSlot } from "./helpers";
import type { LetterGradeResult, BiggestSteal } from "./helpers";
import { IDENTITY_COLOR, IDENTITY_LABEL, avgRankDelta, computeHero } from "./recap";

const CARD_W = 1080;
const CARD_H = 1080;
const SAFE = 52;

const POS_BADGE: Record<Position | string, { fg: string; bg: string }> = {
  QB: { fg: "#2a0a0a", bg: "#e47272" },
  RB: { fg: "#06121b", bg: "#6bb8e0" },
  WR: { fg: "#051a10", bg: "#7dd3a0" },
  TE: { fg: "#1a0f05", bg: "#e09c6b" },
};

export interface RecapShareCardProps {
  preDraft: PreDraftResponse;
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  userPicks: Record<string, string>;
  avatarId?: string | null;
  identity?: import("./contracts").DraftIdentity | null;
  postDraftGrades?: import("./contracts").PostDraftPositionalGrades | null;
}

export default function RecapShareCard({
  preDraft,
  consensusBoard,
  userPicks,
  avatarId,
  identity = null,
  postDraftGrades = null,
}: RecapShareCardProps) {
  const { owner, league_name, format, te_premium, num_teams } = preDraft;

  // Derivations — null-safe across the board.
  const pickEntries = Object.entries(userPicks);
  const pickCount = pickEntries.length;

  const steal: BiggestSteal | null = biggestSteal(
    userPicks,
    consensusBoard.map((c) => ({ name: c.name, rank: c.rank, position: c.position })),
    num_teams,
  );

  const grade: LetterGradeResult | null = postDraftGrades
    ? letterGrade({
        userPicks,
        consensusBoard: consensusBoard.map((c) => ({ name: c.name, rank: c.rank, position: c.position })),
        postDraftGrades,
        numTeams: num_teams,
      })
    : null;

  const avgDelta = avgRankDelta(userPicks, consensusBoard, num_teams);

  const hero = computeHero({
    biggestSteal: steal,
    letterGrade: grade,
    identity,
    ownerName: owner,
    pickCount,
    format,
    teP: te_premium,
    numTeams: num_teams,
  });

  // InsightStrip content — avoid repeating whatever the hero already led with.
  const insight = deriveInsight({ hero, steal, avgDelta, pickCount });

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,165,50,0.10) 0%, transparent 55%), #06080d",
        color: C.primary,
        fontFamily: SANS,
      }}
    >
      {/* subtle gold hairline at top edge */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${C.gold} 30%, ${C.gold} 70%, transparent 100%)`,
          opacity: 0.6,
        }}
      />

      <div
        style={{
          position: "absolute", inset: SAFE,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* ── TOP BAND — wordmark + league + format ──────────────────── */}
        <TopBand leagueName={league_name} format={format} teP={te_premium} numTeams={num_teams} />

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <Hero hero={hero} ownerName={owner} avatarId={avatarId} identity={identity} />

        {/* ── PICKS GRID ──────────────────────────────────────────────── */}
        <PicksGrid
          picks={pickEntries}
          consensusBoard={consensusBoard}
          numTeams={num_teams}
        />

        {/* ── INSIGHT STRIP (omitted when no useful derivation) ───────── */}
        {insight && <InsightStrip insight={insight} />}

        {/* spacer pushes bottom band flush */}
        <div style={{ flex: 1 }} />

        {/* ── BOTTOM BAND ─────────────────────────────────────────────── */}
        <BottomBand />
      </div>
    </div>
  );
}

// ─── Derivations ─────────────────────────────────────────────────────────
type Insight =
  | { kind: "steal"; steal: BiggestSteal }
  | { kind: "avgDelta"; avg: number }
  | null;

function deriveInsight({
  hero,
  steal,
  avgDelta,
  pickCount: _pickCount,
}: {
  hero: ReturnType<typeof computeHero>;
  steal: BiggestSteal | null;
  avgDelta: number | null;
  pickCount: number;
}): Insight {
  // Steal hero already used the steal fact — swap to avgDelta.
  if (hero.kind === "steal") {
    if (avgDelta !== null && avgDelta > 0) return { kind: "avgDelta", avg: avgDelta };
    return null;
  }
  // Grade/identity hero: promote the steal if we've got one.
  if (steal && steal.delta >= 2) return { kind: "steal", steal };
  if (avgDelta !== null && avgDelta > 0) return { kind: "avgDelta", avg: avgDelta };
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────

function TopBand({
  leagueName,
  format,
  teP,
  numTeams,
}: {
  leagueName: string;
  format: string;
  teP: boolean;
  numTeams: number;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingBottom: 22,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* wordmark */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <span
          style={{
            fontFamily: DISPLAY, fontSize: 20, letterSpacing: "0.04em",
            color: C.primary,
          }}
        >
          DynastyGPT
        </span>
        <span style={{ fontFamily: DISPLAY, fontSize: 20, color: C.gold }}>.com</span>
      </div>

      {/* league name, uppercase + tracked */}
      <div
        style={{
          fontFamily: MONO, fontSize: 13, letterSpacing: "0.22em",
          color: C.dim, textTransform: "uppercase",
        }}
      >
        {leagueName}
      </div>

      {/* format pill */}
      <div
        style={{
          fontFamily: MONO, fontSize: 12, letterSpacing: "0.14em",
          padding: "6px 12px", borderRadius: 4,
          border: `1px solid ${C.border}`, color: C.gold,
        }}
      >
        {format}{teP ? " · TEP" : ""} · {numTeams}T
      </div>
    </div>
  );
}

function Hero({
  hero,
  ownerName,
  avatarId,
  identity,
}: {
  hero: ReturnType<typeof computeHero>;
  ownerName: string;
  avatarId?: string | null;
  identity?: import("./contracts").DraftIdentity | null;
}) {
  if (hero.kind === "steal") return <StealHero hero={hero} ownerName={ownerName} avatarId={avatarId} />;
  if (hero.kind === "grade") return <GradeHero hero={hero} ownerName={ownerName} avatarId={avatarId} identity={identity} />;
  return <IdentityHero hero={hero} avatarId={avatarId} />;
}

function Avatar({ avatarId, ownerName, size = 68 }: { avatarId?: string | null; ownerName: string; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (avatarId && !failed) {
    return (
      <img
        src={`https://sleepercdn.com/avatars/${avatarId}`}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", border: `2px solid ${C.goldBorder}`, flexShrink: 0 }}
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
      />
    );
  }
  const initial = ownerName.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(180deg, ${C.gold} 0%, #8b6914 100%)`,
        color: "#1a1204",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: DISPLAY, fontSize: size * 0.48,
        border: `2px solid ${C.goldBorder}`, flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function StealHero({
  hero,
  ownerName,
  avatarId,
}: {
  hero: Extract<ReturnType<typeof computeHero>, { kind: "steal" }>;
  ownerName: string;
  avatarId?: string | null;
}) {
  const { steal, gradeSecondary } = hero;
  return (
    <div style={{ padding: "40px 0 36px", borderBottom: `1px solid ${C.border}` }}>
      <div
        style={{
          fontFamily: MONO, fontSize: 13, letterSpacing: "0.28em",
          color: C.gold, textTransform: "uppercase", marginBottom: 14,
        }}
      >
        Biggest Steal
      </div>
      <div
        style={{
          fontFamily: DISPLAY, fontSize: 86, lineHeight: 0.95,
          color: C.primary, letterSpacing: "-0.03em",
          textShadow: "0 0 40px rgba(212,165,50,0.2)",
        }}
      >
        {steal.name.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: DISPLAY, fontSize: 56, lineHeight: 1.0,
          color: C.gold, letterSpacing: "-0.02em", marginTop: 10,
        }}
      >
        FELL {steal.delta} PAST ADP
      </div>
      <div
        style={{
          marginTop: 20, display: "flex", alignItems: "center", gap: 18,
        }}
      >
        <Avatar avatarId={avatarId} ownerName={ownerName} size={54} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: SANS, fontSize: 20, color: C.primary }}>{ownerName}</span>
          <span
            style={{
              fontFamily: MONO, fontSize: 13, letterSpacing: "0.14em",
              color: C.dim, textTransform: "uppercase",
            }}
          >
            {steal.position} · #{steal.rank} consensus · taken {slotLabel(steal.slot)}
          </span>
        </div>

        {/* grade corner */}
        {gradeSecondary && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div
              style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em",
                color: C.dim, textTransform: "uppercase",
              }}
            >
              Grade
            </div>
            <div
              style={{
                fontFamily: DISPLAY, fontSize: 38, lineHeight: 1,
                color: C.gold, letterSpacing: "-0.02em", marginTop: 4,
              }}
            >
              {gradeSecondary.letter}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GradeHero({
  hero,
  ownerName,
  avatarId,
  identity,
}: {
  hero: Extract<ReturnType<typeof computeHero>, { kind: "grade" }>;
  ownerName: string;
  avatarId?: string | null;
  identity?: import("./contracts").DraftIdentity | null;
}) {
  const { grade, stealSecondary } = hero;
  return (
    <div
      style={{
        padding: "36px 0",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 36,
      }}
    >
      {/* massive grade */}
      <div style={{ flexShrink: 0, textAlign: "center", width: 280 }}>
        <div
          style={{
            fontFamily: MONO, fontSize: 14, letterSpacing: "0.3em",
            color: C.gold, textTransform: "uppercase", marginBottom: 8,
          }}
        >
          Draft Grade
        </div>
        <div
          style={{
            fontFamily: DISPLAY, fontSize: 180, lineHeight: 0.88,
            color: C.gold,
            letterSpacing: "-0.06em",
            textShadow:
              "0 0 50px rgba(212,165,50,0.45), 0 0 110px rgba(212,165,50,0.2)",
          }}
        >
          {grade.letter}
        </div>
        <div
          style={{
            fontFamily: MONO, fontSize: 14, letterSpacing: "0.18em",
            color: C.dim, marginTop: 10,
          }}
        >
          {grade.score} / 100
        </div>
      </div>

      {/* right column: owner + steal sidekick */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar avatarId={avatarId} ownerName={ownerName} size={68} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 32, color: C.primary, letterSpacing: "-0.02em" }}>
              {ownerName}
            </span>
            {identity && (
              <IdentityLine identity={identity} size="sm" />
            )}
          </div>
        </div>

        {stealSecondary && (
          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div
              style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em",
                color: C.dim, textTransform: "uppercase", marginBottom: 6,
              }}
            >
              Biggest Steal
            </div>
            <div style={{ fontFamily: SANS, fontSize: 18, color: C.primary }}>
              {stealSecondary.name}
              <span style={{ color: C.gold, fontFamily: MONO, fontSize: 14, marginLeft: 10 }}>
                +{stealSecondary.delta}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdentityHero({
  hero,
  avatarId,
}: {
  hero: Extract<ReturnType<typeof computeHero>, { kind: "identity" }>;
  avatarId?: string | null;
}) {
  const tone = hero.identity ? IDENTITY_COLOR[hero.identity] : C.secondary;
  const label = hero.identity ? IDENTITY_LABEL[hero.identity] : "DRAFTER";

  return (
    <div
      style={{
        padding: "44px 0 40px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 32,
      }}
    >
      <Avatar avatarId={avatarId} ownerName={hero.ownerName} size={96} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Identity treated as hero eyebrow, not pill */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div
            style={{
              fontFamily: DISPLAY, fontSize: 36, letterSpacing: "0.24em",
              color: tone, textTransform: "uppercase", lineHeight: 1,
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 10, height: 2, width: 84,
              background: tone, opacity: 0.8,
            }}
          />
        </div>

        <div
          style={{
            fontFamily: DISPLAY, fontSize: 64, lineHeight: 1,
            color: C.primary, letterSpacing: "-0.03em", marginTop: 6,
          }}
        >
          {hero.ownerName}
        </div>

        <div
          style={{
            fontFamily: MONO, fontSize: 14, letterSpacing: "0.22em",
            color: C.dim, textTransform: "uppercase", marginTop: 6,
          }}
        >
          {hero.pickCount} picks · {hero.format}{hero.teP ? " · TEP" : ""} · {hero.numTeams}T
        </div>
      </div>
    </div>
  );
}

function IdentityLine({
  identity,
  size = "md",
}: {
  identity: import("./contracts").DraftIdentity;
  size?: "sm" | "md";
}) {
  const tone = IDENTITY_COLOR[identity];
  const label = IDENTITY_LABEL[identity];
  const fontSize = size === "sm" ? 14 : 22;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <span
        style={{
          fontFamily: DISPLAY, fontSize, letterSpacing: "0.22em",
          color: tone, textTransform: "uppercase", lineHeight: 1,
        }}
      >
        {label}
      </span>
      <div style={{ marginTop: 4, height: 1.5, width: size === "sm" ? 48 : 72, background: tone, opacity: 0.75 }} />
    </div>
  );
}

// ─── Picks grid ──────────────────────────────────────────────────────────
function PicksGrid({
  picks,
  consensusBoard,
  numTeams,
}: {
  picks: Array<[string, string]>;
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  numTeams: number;
}) {
  const cbByName = new Map(consensusBoard.map((c) => [c.name, c]));
  // Row sizing — compresses gracefully up to 8 picks.
  const rowH = picks.length >= 7 ? 56 : picks.length >= 5 ? 68 : 82;
  const nameFs = picks.length >= 7 ? 22 : picks.length >= 5 ? 24 : 28;

  return (
    <div style={{ paddingTop: 28, display: "flex", flexDirection: "column", gap: 8 }}>
      {picks.map(([slot, name], i) => {
        const cb = cbByName.get(name);
        const pos = cb?.position ?? "WR";
        const badge = POS_BADGE[pos];
        const pickNum = pickNumFromSlot(slot, numTeams);
        const vvs = cb ? valueVsSlot(cb.rank, pickNum) : null;
        const fit = cb?.fit_score;
        const vvsColor =
          vvs === "STEAL" ? "#7dd3a0" : vvs === "REACH" ? "#e88560" : C.dim;

        return (
          <div
            key={slot}
            style={{
              height: rowH,
              padding: "0 22px",
              display: "flex", alignItems: "center", gap: 18,
              background: i % 2 === 0 ? "rgba(255,255,255,0.024)" : "transparent",
              border: `1px solid ${i % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent"}`,
              borderRadius: 8,
            }}
          >
            {/* slot */}
            <div
              style={{
                fontFamily: MONO, fontSize: 20, color: C.gold,
                letterSpacing: "-0.01em",
                width: 68, flexShrink: 0,
              }}
            >
              {slot}
            </div>
            {/* position badge */}
            <div
              style={{
                background: badge.bg, color: badge.fg,
                fontFamily: MONO, fontSize: 14, fontWeight: 700,
                padding: "4px 10px", borderRadius: 4, letterSpacing: "0.06em",
                flexShrink: 0,
              }}
            >
              {pos}
            </div>
            {/* name */}
            <div
              style={{
                fontFamily: SANS, fontSize: nameFs, fontWeight: 600,
                color: C.primary, letterSpacing: "-0.01em",
                flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            {/* rank */}
            {cb && (
              <div
                style={{
                  fontFamily: MONO, fontSize: 15, color: C.secondary,
                  minWidth: 56, textAlign: "right", flexShrink: 0,
                }}
              >
                #{cb.rank}
              </div>
            )}
            {/* fit — null-safe: omitted when missing */}
            {typeof fit === "number" && (
              <div
                style={{
                  fontFamily: MONO, fontSize: 15,
                  color: fit >= 80 ? C.gold : fit >= 60 ? "#7dd3a0" : fit >= 45 ? "#e88560" : C.dim,
                  minWidth: 62, textAlign: "right", flexShrink: 0,
                }}
              >
                {fit} fit
              </div>
            )}
            {/* value vs slot */}
            {vvs && (
              <div
                style={{
                  fontFamily: MONO, fontSize: 12, letterSpacing: "0.18em",
                  color: vvsColor, textTransform: "uppercase",
                  minWidth: 68, textAlign: "right", flexShrink: 0,
                }}
              >
                {vvs}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Insight strip ───────────────────────────────────────────────────────
function InsightStrip({ insight }: { insight: NonNullable<Insight> }) {
  if (insight.kind === "steal") {
    return (
      <div
        style={{
          marginTop: 22, padding: "18px 22px",
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "baseline", gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: MONO, fontSize: 12, letterSpacing: "0.24em",
            color: C.gold, textTransform: "uppercase",
          }}
        >
          Biggest Steal
        </span>
        <span style={{ fontFamily: SANS, fontSize: 22, color: C.primary, fontWeight: 600 }}>
          {insight.steal.name}
        </span>
        <span
          style={{
            fontFamily: MONO, fontSize: 15, color: C.gold,
            marginLeft: "auto", letterSpacing: "0.02em",
          }}
        >
          +{insight.steal.delta} past ADP
        </span>
      </div>
    );
  }
  // avgDelta
  return (
    <div
      style={{
        marginTop: 22, padding: "18px 22px",
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "baseline", gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: MONO, fontSize: 12, letterSpacing: "0.24em",
          color: C.gold, textTransform: "uppercase",
        }}
      >
        Avg Rank Delta
      </span>
      <span style={{ fontFamily: DISPLAY, fontSize: 32, color: C.primary, letterSpacing: "-0.02em" }}>
        {insight.avg > 0 ? "+" : ""}{insight.avg}
      </span>
      <span
        style={{
          fontFamily: MONO, fontSize: 13, color: C.dim, letterSpacing: "0.18em",
          textTransform: "uppercase", marginLeft: "auto",
        }}
      >
        vs Consensus
      </span>
    </div>
  );
}

// ─── Bottom band ─────────────────────────────────────────────────────────
function BottomBand() {
  return (
    <div
      style={{
        paddingTop: 22, borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}
    >
      <span style={{ fontFamily: SANS, fontSize: 18, color: C.primary }}>
        Build yours at{" "}
        <span style={{ color: C.gold, fontWeight: 600 }}>DynastyGPT.com</span>
      </span>
      <span
        style={{
          fontFamily: MONO, fontSize: 12, letterSpacing: "0.34em",
          color: C.dim, textTransform: "uppercase",
        }}
      >
        Simulate · Analyze · Share
      </span>
    </div>
  );
}

// ─── utils ───────────────────────────────────────────────────────────────
function slotLabel(slot: string): string {
  return slot; // e.g., "1.12" already canonical
}
