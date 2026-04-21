"use client";

/**
 * DraftRecap — internal, in-app recap screen shown after draft completion.
 * Replaces the inline recap previously in page.tsx. Every optional section
 * degrades on missing Phase 2A data (fit_score, post_draft_positional_grades,
 * user_missed_opportunities, alternate_id) by *omitting*, not fabricating.
 *
 * Share flow: CTA → modal with RecapShareCard preview + download.
 * Export uses html-to-image against a hidden 1080×1080 DOM node.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { C, DISPLAY, MONO, SANS } from "@/components/league/tokens";
import type {
  ConsensusBoardEntry,
  DraftIdentity,
  MissedOpportunity,
  Position,
  PositionalGrade,
  PostDraftPositionalGrades,
  PreDraftResponse,
  TradeFlag,
} from "./contracts";
import {
  biggestSteal,
  letterGrade,
  pickNumFromSlot,
  valueVsSlot,
  type LetterGradeResult,
} from "./helpers";
import { IDENTITY_COLOR, IDENTITY_LABEL } from "./recap";
import RecapShareCard from "./RecapShareCard";

const RC = {
  bg: "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,165,50,0.055) 0%, transparent 60%), #07090f",
  card: "rgba(255,255,255,0.018)",
  cardHair: "rgba(255,255,255,0.06)",
  hair: "rgba(255,255,255,0.055)",
  goldHair: "rgba(212,165,50,0.22)",
};

const POS_BADGE: Record<Position | string, { fg: string; bg: string }> = {
  QB: { fg: "#2a0a0a", bg: "#e47272" },
  RB: { fg: "#06121b", bg: "#6bb8e0" },
  WR: { fg: "#051a10", bg: "#7dd3a0" },
  TE: { fg: "#1a0f05", bg: "#e09c6b" },
};

const GRADE_TONE: Record<PositionalGrade, string> = {
  CRITICAL: "#e47272",
  WEAK: "#e09c6b",
  AVERAGE: "#b0b2c8",
  STRONG: "#7dd3a0",
  ELITE: "#d4a532",
};
const GRADE_LETTER: Record<PositionalGrade, string> = {
  CRITICAL: "D", WEAK: "C", AVERAGE: "B", STRONG: "A-", ELITE: "A+",
};

export interface DraftRecapProps {
  preDraft: PreDraftResponse;
  consensusBoard: ReadonlyArray<ConsensusBoardEntry>;
  userPicks: Record<string, string>;
  tradeFlags?: ReadonlyArray<TradeFlag>;
  postDraftGrades?: PostDraftPositionalGrades | null;
  missedOpportunities?: ReadonlyArray<MissedOpportunity> | null;
  identity?: DraftIdentity | null;
  avatarId?: string | null;
  alternateSimulateAvailable?: boolean;
  onAlternatePath?: () => void;
  simulationsRun?: number;
}

export default function DraftRecap({
  preDraft,
  consensusBoard,
  userPicks,
  tradeFlags = [],
  postDraftGrades = null,
  missedOpportunities = null,
  identity = null,
  avatarId = null,
  alternateSimulateAvailable = false,
  onAlternatePath,
  simulationsRun,
}: DraftRecapProps) {
  const { owner, league_name, num_teams, format, te_premium } = preDraft;
  const picks = useMemo(() => Object.entries(userPicks), [userPicks]);
  const cbByName = useMemo(() => new Map(consensusBoard.map((c) => [c.name, c])), [consensusBoard]);

  const steal = useMemo(
    () =>
      biggestSteal(
        userPicks,
        consensusBoard.map((c) => ({ name: c.name, rank: c.rank, position: c.position })),
        num_teams,
      ),
    [userPicks, consensusBoard, num_teams],
  );

  const grade: LetterGradeResult | null = useMemo(() => {
    if (!postDraftGrades) return null;
    return letterGrade({
      userPicks,
      consensusBoard: consensusBoard.map((c) => ({ name: c.name, rank: c.rank, position: c.position })),
      postDraftGrades,
      numTeams: num_teams,
    });
  }, [postDraftGrades, userPicks, consensusBoard, num_teams]);

  // Share card modal state + export
  const [shareOpen, setShareOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#06080d",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${owner.replace(/\s+/g, "-").toLowerCase()}-draft-recap.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  }, [owner]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const blob = await htmlToImage.toBlob(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#06080d",
      });
      if (!blob) return;
      const file = new File([blob], `${owner}-draft-recap.png`, { type: "image/png" });
      const navAny = navigator as typeof navigator & { canShare?: (d: { files?: File[] }) => boolean };
      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${owner} — Draft Recap` });
      } else {
        handleDownload();
      }
    } catch {
      // user cancel or unsupported — fall back to download
      handleDownload();
    } finally {
      setExporting(false);
    }
  }, [owner, handleDownload]);

  const userSlots = useMemo(() => new Set(Object.keys(userPicks)), [userPicks]);
  const tradeIntel = useMemo(
    () => tradeFlags.filter((t) => userSlots.has(t.slot)),
    [tradeFlags, userSlots],
  );

  return (
    <div className="min-h-screen" style={{ background: RC.bg, fontFamily: SANS, color: C.primary }}>
      <div className="mx-auto max-w-[720px] px-4 md:px-6 pt-6 md:pt-10 pb-16">
        {/* ═ HERO HEADER ═ */}
        <HeroHeader
          grade={grade}
          owner={owner}
          league={league_name}
          format={format}
          teP={te_premium}
          numTeams={num_teams}
          identity={identity}
          avatarId={avatarId}
          onShare={() => setShareOpen(true)}
        />

        {/* ═ PICKS LIST ═ */}
        <section className="mt-6">
          <SectionHeader eyebrow="Your draft" title="Picks" meta={`${picks.length} selections`} />
          <div className="mt-3 rounded-xl overflow-hidden"
            style={{ background: RC.card, border: `1px solid ${RC.cardHair}` }}>
            {picks.map(([slot, name], i) => (
              <PickRow
                key={slot}
                slot={slot}
                name={name}
                cb={cbByName.get(name)}
                numTeams={num_teams}
                borderTop={i > 0}
              />
            ))}
          </div>
        </section>

        {/* ═ BIGGEST STEAL CALLOUT (null-safe) ═ */}
        {steal && (
          <section className="mt-6">
            <div
              className="rounded-xl px-4 md:px-5 py-4"
              style={{
                background: "rgba(212,165,50,0.05)",
                border: `1px solid ${RC.goldHair}`,
              }}
            >
              <div className="text-[9px] font-bold tracking-[0.26em] uppercase" style={{ color: C.gold }}>
                Biggest steal
              </div>
              <div className="mt-1.5 text-[15px] md:text-[16px] leading-snug" style={{ color: C.primary }}>
                <span className="font-semibold" style={{ fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>{steal.name}</span>{" "}
                <span style={{ color: C.secondary }}>fell</span>{" "}
                <span style={{ color: C.gold, fontWeight: 700 }}>{steal.delta} {steal.delta === 1 ? "spot" : "spots"}</span>{" "}
                <span style={{ color: C.secondary }}>past consensus rank</span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: C.secondary, fontFamily: MONO, letterSpacing: "0.08em" }}>
                {steal.position} · consensus #{steal.rank} · taken at {steal.slot}
              </div>
            </div>
          </section>
        )}

        {/* ═ POSITION IMPACT (null-safe — omit when postDraftGrades missing) ═ */}
        {postDraftGrades && (
          <section className="mt-6">
            <SectionHeader eyebrow="Impact" title="Position strength" meta="before draft → after draft" />
            <div className="mt-3 grid grid-cols-4 gap-2 md:gap-3">
              {(["QB", "RB", "WR", "TE"] as Position[]).map((pos) => {
                const d = postDraftGrades[pos];
                if (!d) return null;
                const toneBefore = GRADE_TONE[d.before];
                const toneAfter = GRADE_TONE[d.after];
                return (
                  <div
                    key={pos}
                    className="rounded-lg p-3"
                    style={{ background: RC.card, border: `1px solid ${RC.cardHair}` }}
                  >
                    <div className="text-[10px] font-bold tracking-[0.14em]" style={{ color: C.dim }}>{pos}</div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <div className="flex flex-col items-start">
                        <span className="text-[7px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>Before</span>
                        <span style={{ fontFamily: DISPLAY, fontSize: 16, color: toneBefore, opacity: 0.7 }}>
                          {GRADE_LETTER[d.before]}
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: C.dim }}>→</span>
                      <div className="flex flex-col items-start">
                        <span className="text-[7px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>After</span>
                        <span style={{ fontFamily: DISPLAY, fontSize: 22, color: toneAfter, letterSpacing: "-0.02em" }}>
                          {GRADE_LETTER[d.after]}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mt-1.5 text-[10px] font-bold"
                      style={{
                        fontFamily: MONO,
                        color: d.delta > 0 ? "#7dd3a0" : d.delta < 0 ? "#e47272" : C.dim,
                        letterSpacing: "0.04em",
                      }}
                      title={`Positional grade changed by ${d.delta > 0 ? "+" : ""}${d.delta} ${Math.abs(d.delta) === 1 ? "tier" : "tiers"}`}
                    >
                      {d.delta > 0 ? `+${d.delta} ${d.delta === 1 ? "grade" : "grades"}` : d.delta < 0 ? `${d.delta} ${Math.abs(d.delta) === 1 ? "grade" : "grades"}` : "No change"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═ MISSED OPPORTUNITIES (null-safe — omit when absent) ═ */}
        {missedOpportunities && missedOpportunities.length > 0 && (
          <section className="mt-6">
            <SectionHeader eyebrow="Alternate" title="Missed opportunities" meta={`${missedOpportunities.length} flagged`} />
            <div className="mt-3 flex flex-col gap-2">
              {missedOpportunities.slice(0, 3).map((m, i) => (
                <MissedRow key={i} missed={m} />
              ))}
            </div>
          </section>
        )}

        {/* ═ TRADE INTEL RECAP ═ */}
        {tradeIntel.length > 0 && (
          <section className="mt-6">
            <SectionHeader eyebrow="Draft day" title="Trade intel" />
            <div className="mt-3 flex flex-col gap-2">
              {tradeIntel.slice(0, 3).map((tf) => (
                <TradeIntelRow key={tf.slot} tf={tf} />
              ))}
            </div>
          </section>
        )}

        {/* ═ ALTERNATE PATH CTA (null-safe) ═ */}
        {alternateSimulateAvailable && onAlternatePath && (
          <section className="mt-6">
            <button
              onClick={onAlternatePath}
              className="w-full rounded-xl px-4 py-4 text-left"
              style={{
                background: "rgba(212,165,50,0.04)",
                border: `1px dashed ${RC.goldHair}`,
                cursor: "pointer",
              }}
            >
              <div className="text-[9px] font-bold tracking-[0.26em] uppercase" style={{ color: C.gold }}>
                Replay
              </div>
              <div className="mt-1 text-[13px] font-semibold" style={{ color: C.primary }}>
                What if you traded back at {steal?.slot ?? picks[0]?.[0]}?
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: C.secondary }}>
                Run an alternate path and compare the resulting roster.
              </div>
            </button>
          </section>
        )}

        {/* ═ FOOTER META ═ */}
        <div className="mt-8 text-[10px] text-center" style={{ color: C.dim, fontFamily: MONO, letterSpacing: "0.14em" }}>
          Based on {simulationsRun ?? 100} simulations across {consensusBoard.length} prospects
        </div>
      </div>

      {/* ═ SHARE MODAL ═ */}
      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          onDownload={handleDownload}
          onShare={handleShare}
          exporting={exporting}
        >
          <div ref={cardRef} style={{ width: 1080, height: 1080 }}>
            <RecapShareCard
              preDraft={preDraft}
              consensusBoard={consensusBoard}
              userPicks={userPicks}
              avatarId={avatarId}
              identity={identity}
              postDraftGrades={postDraftGrades}
            />
          </div>
        </ShareModal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="text-[9px] font-bold tracking-[0.24em] uppercase" style={{ color: C.gold }}>
          {eyebrow}
        </span>
        <h2 className="text-[14px] md:text-[15px] font-semibold truncate" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
          {title}
        </h2>
      </div>
      {meta && (
        <span className="text-[10px] whitespace-nowrap" style={{ color: C.dim, fontFamily: MONO }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function HeroHeader({
  grade,
  owner,
  league,
  format,
  teP,
  numTeams,
  identity,
  avatarId,
  onShare,
}: {
  grade: LetterGradeResult | null;
  owner: string;
  league: string;
  format: "SF" | "1QB";
  teP: boolean;
  numTeams: number;
  identity: DraftIdentity | null;
  avatarId: string | null;
  onShare: () => void;
}) {
  const identityTone = identity ? IDENTITY_COLOR[identity] : C.secondary;
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.26em] uppercase" style={{ color: C.gold }}>
        Draft complete
      </div>

      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <HeroAvatar avatarId={avatarId} owner={owner} />
          <div className="min-w-0">
            <div
              className="truncate"
              style={{
                fontFamily: DISPLAY, fontSize: 28, color: C.primary,
                letterSpacing: "-0.02em", lineHeight: 1.1,
              }}
            >
              {owner}
            </div>
            <div className="mt-1 text-[11px] truncate" style={{ color: C.dim, fontFamily: MONO, letterSpacing: "0.1em" }}>
              {league} · {format}{teP ? " · TEP" : ""} · {numTeams}T
            </div>
          </div>
        </div>

        {grade && (
          <div className="text-right">
            <div className="text-[9px] font-bold tracking-[0.26em] uppercase" style={{ color: C.dim }}>
              Grade
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 48, color: C.gold, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {grade.letter}
            </div>
            <div className="text-[10px]" style={{ color: C.dim, fontFamily: MONO }}>
              {grade.score} / 100
            </div>
          </div>
        )}
      </div>

      {identity && (
        <div className="mt-4 flex flex-col items-start">
          <span
            style={{
              fontFamily: DISPLAY, fontSize: 18, letterSpacing: "0.26em",
              color: identityTone, textTransform: "uppercase",
            }}
          >
            {IDENTITY_LABEL[identity]}
          </span>
          <div style={{ marginTop: 3, height: 1.5, width: 54, background: identityTone, opacity: 0.7 }} />
        </div>
      )}

      <button
        onClick={onShare}
        className="mt-5 w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 cursor-pointer"
        style={{
          background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
          color: "#1a1204",
          fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
          border: "none",
          boxShadow: "0 6px 20px rgba(212,165,50,0.2), inset 0 1px 0 rgba(255,255,255,0.22)",
          minHeight: 44,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Share recap
      </button>
    </div>
  );
}

function HeroAvatar({ avatarId, owner }: { avatarId: string | null; owner: string }) {
  const [failed, setFailed] = useState(false);
  if (avatarId && !failed) {
    return (
      <img
        src={`https://sleepercdn.com/avatars/${avatarId}`}
        alt=""
        width={56}
        height={56}
        style={{ borderRadius: "50%", border: `2px solid ${RC.goldHair}`, flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      style={{
        width: 56, height: 56, borderRadius: "50%",
        background: `linear-gradient(180deg, ${C.gold} 0%, #8b6914 100%)`,
        color: "#1a1204", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: DISPLAY, fontSize: 22, border: `2px solid ${RC.goldHair}`, flexShrink: 0,
      }}
    >
      {owner.charAt(0).toUpperCase()}
    </div>
  );
}

function PickRow({
  slot,
  name,
  cb,
  numTeams,
  borderTop,
}: {
  slot: string;
  name: string;
  cb: ConsensusBoardEntry | undefined;
  numTeams: number;
  borderTop: boolean;
}) {
  const pos = cb?.position ?? "WR";
  const badge = POS_BADGE[pos];
  const pickNum = pickNumFromSlot(slot, numTeams);
  const vvs = cb ? valueVsSlot(cb.rank, pickNum) : null;
  const fit = cb?.fit_score;
  const vvsTone = vvs === "STEAL" ? "#7dd3a0" : vvs === "REACH" ? "#e88560" : C.dim;

  return (
    <div
      className="flex items-center gap-2 px-3 md:px-4 py-3"
      style={{ borderTop: borderTop ? `1px solid ${RC.hair}` : undefined }}
    >
      <span className="text-[11px] font-semibold" style={{ fontFamily: MONO, color: C.gold, minWidth: 38 }}>
        {slot}
      </span>
      <span
        className="text-[9px] font-bold tracking-[0.06em] px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ fontFamily: MONO, color: badge.fg, background: badge.bg }}
      >
        {pos}
      </span>
      <span className="text-[12px] md:text-[13px] font-semibold flex-1 truncate"
        style={{ color: C.primary, letterSpacing: "-0.01em" }}>
        {name}
      </span>
      {cb && (
        <span className="text-[10px] flex-shrink-0" style={{ fontFamily: MONO, color: C.dim, minWidth: 34, textAlign: "right" }}>
          #{cb.rank}
        </span>
      )}
      {typeof fit === "number" && (
        <span
          className="flex items-baseline gap-1 flex-shrink-0"
          style={{ fontFamily: MONO }}
          title={`Fit score: ${fit}/100 for your roster at ${slot}`}
        >
          <span
            className="text-[10px] font-bold"
            style={{
              color: fit >= 80 ? C.gold : fit >= 60 ? "#7dd3a0" : fit >= 45 ? "#e88560" : C.dim,
              minWidth: 22, textAlign: "right",
            }}
          >
            {fit}
          </span>
          <span className="text-[8px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>fit</span>
        </span>
      )}
      {vvs && (
        <span
          className="text-[8px] font-bold tracking-[0.16em] uppercase flex-shrink-0"
          style={{ fontFamily: MONO, color: vvsTone, minWidth: 48, textAlign: "right" }}
        >
          {vvs}
        </span>
      )}
    </div>
  );
}

function MissedRow({ missed }: { missed: MissedOpportunity }) {
  return (
    <div
      className="rounded-lg px-3 py-3"
      style={{
        background: "rgba(228,114,114,0.04)",
        border: "1px solid rgba(228,114,114,0.14)",
      }}
    >
      <div className="text-[10px]" style={{ color: C.secondary }}>
        At <span style={{ color: C.gold, fontFamily: MONO }}>{missed.user_slot}</span> you took{" "}
        <span style={{ color: C.primary, fontWeight: 600 }}>{missed.user_actual_pick.name}</span>{" "}
        <span style={{ color: C.dim, fontFamily: MONO }}>(#{missed.user_actual_pick.rank} · fit {missed.user_actual_pick.fit_score})</span>
        {" "}over{" "}
        <span style={{ color: C.primary, fontWeight: 600 }}>{missed.missed_prospect.name}</span>{" "}
        <span style={{ color: C.dim, fontFamily: MONO }}>(#{missed.missed_prospect.rank} · fit {missed.missed_prospect.fit_score})</span>
      </div>
      <div className="mt-1 text-[10px]" style={{ color: C.dim, fontFamily: MONO }}>
        Available through {missed.available_until_slot} · value delta +{missed.value_delta}
      </div>
    </div>
  );
}

function TradeIntelRow({ tf }: { tf: TradeFlag }) {
  const tb = tf.top_buyer;
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: RC.card, border: `1px solid ${RC.cardHair}` }}
    >
      <div className="text-[10px]" style={{ color: C.secondary }}>
        <span style={{ color: C.gold, fontFamily: MONO }}>{tf.slot}</span>:{" "}
        {tb ? (
          <>
            <span style={{ color: C.primary, fontWeight: 600 }}>{tb.name}</span> —{" "}
            <span style={{ color: C.dim, fontFamily: MONO }}>{tb.estimated_cost}</span>
          </>
        ) : (
          <span>{tf.reason}</span>
        )}
      </div>
    </div>
  );
}

function ShareModal({
  children,
  onClose,
  onDownload,
  onShare,
  exporting,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  exporting: boolean;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,8,13,0.88)", backdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl overflow-hidden"
        style={{
          background: "#06080d",
          border: `1px solid ${RC.cardHair}`,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* Scaled preview of the card */}
        <div
          style={{
            width: 1080 * 0.48,
            height: 1080 * 0.48,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ transform: "scale(0.48)", transformOrigin: "top left" }}>
            {children}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderTop: `1px solid ${RC.hair}` }}>
          <button
            onClick={onClose}
            className="text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-2 rounded cursor-pointer"
            style={{
              fontFamily: MONO, color: C.secondary, background: "transparent",
              border: `1px solid ${RC.hair}`,
            }}
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={exporting}
              className="text-[11px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded cursor-pointer"
              style={{
                fontFamily: MONO, color: C.primary, background: "rgba(255,255,255,0.04)",
                border: `1px solid ${RC.hair}`,
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? "…" : "Download"}
            </button>
            <button
              onClick={onShare}
              disabled={exporting}
              className="text-[11px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded cursor-pointer"
              style={{
                fontFamily: MONO, color: "#1a1204",
                background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
                border: "none",
                boxShadow: "0 3px 10px rgba(212,165,50,0.18)",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? "…" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
