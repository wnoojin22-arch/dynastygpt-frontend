"use client";

/**
 * PickScreen — F2 during-draft screen shown when the user is on the clock.
 *
 * Structure (mobile-first):
 *   1. Header        — slot + owner + next-pick hint
 *   2. Threat radar  — tier cliff indicator with flash on first render
 *   3. Decision zone — DRAFT + TRADE as *complementary* signals
 *                      mobile 375: stacked vertical (DRAFT → TRADE)
 *                      md 768+:    side-by-side 2 columns
 *                      Tabs would force a false choice — these are two inputs
 *                      to one decision, not two screens.
 *   4. All-available prospect table — searchable, position-filterable
 *
 * Trade card hierarchy (per design review):
 *   - Cost string primary in body text (e.g. "1.12 + 3.12 for 1.11")
 *   - pick_value_delta secondary as an accent chip, green positive /
 *     red-muted negative. Never compete with cost for primary real estate.
 */

import React, { useMemo, useState } from "react";
import { C, MONO, SANS } from "@/components/league/tokens";
import type {
  ConsensusBoardEntry,
  Position,
  PositionalGrade,
  PreDraftResponse,
  SimulateResponse,
  TradeBuyer,
} from "./contracts";
import { pickNumFromSlot } from "./helpers";
import SelectionTray from "./SelectionTray";

// ─── Tokens — mirrored from WarRoomLanding so F1/F2 feel like one surface ─
const PS = {
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
const POS_MUTED: Record<Position | string, string> = {
  QB: "#8a4a4a", RB: "#4a7a98", WR: "#5c9477", TE: "#98724f",
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

// ─── Props ───────────────────────────────────────────────────────────────
export interface PickScreenProps {
  preDraft: PreDraftResponse;
  simSnapshot: SimulateResponse;
  currentSlot: string;               // e.g. "1.12"
  pickedNames: ReadonlyArray<string>; // names already off the board
  onDraft: (prospectName: string) => void;
  onTrade?: (buyerName: string) => void;
}

// Enriched shape carried through the render.
type AvailableProspect = ConsensusBoardEntry & {
  avail_here: number;
  fills_need: boolean;
};

export default function PickScreen({
  preDraft,
  simSnapshot,
  currentSlot,
  pickedNames,
  onDraft,
  onTrade,
}: PickScreenProps) {
  const { owner, num_teams, needs } = preDraft;
  const pickNum = pickNumFromSlot(currentSlot, num_teams);
  const pickedSet = useMemo(() => new Set(pickedNames), [pickedNames]);

  // ── User's next pick + picks-between window ──
  const nextUserSlot = useMemo(() => {
    const slots = preDraft.user_picks.map((p) => p.slot);
    const idx = slots.indexOf(currentSlot);
    return idx >= 0 ? slots[idx + 1] ?? null : null;
  }, [preDraft.user_picks, currentSlot]);

  const picksUntilNextUserPick = useMemo(() => {
    if (!nextUserSlot) return null;
    return pickNumFromSlot(nextUserSlot, num_teams) - pickNum;
  }, [nextUserSlot, num_teams, pickNum]);

  // ── Available = consensus_board minus drafted minus effectively-gone ──
  const available: AvailableProspect[] = useMemo(() => {
    return simSnapshot.consensus_board
      .filter((p) => !pickedSet.has(p.name))
      .map((p) => {
        const slot = simSnapshot.prospect_availability[p.name]?.find(
          (a) => a.slot === currentSlot,
        );
        return {
          ...p,
          avail_here: slot?.pct_available ?? 100,
          fills_need: needs.includes(p.position),
        };
      })
      .filter((p) => p.avail_here >= 2);
  }, [simSnapshot.consensus_board, simSnapshot.prospect_availability, pickedSet, currentSlot, needs]);

  // ── Recommendations sorted by fit_score DESC ──
  //    First = hero "RECOMMENDED PICK". Next 4 = "OTHER OPTIONS".
  const ranked = useMemo(
    () => [...available].sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)),
    [available],
  );
  const heroRec = ranked[0];
  const otherRecs = ranked.slice(1, 5);

  // ── Trade offer live at this slot ──
  const tradeFlag = simSnapshot.trade_flags.find((t) => t.slot === currentSlot);

  // ════════════════════════════════════════════════════════════════════
  // TIER CLIFF DETECTION
  // ────────────────────────────────────────────────────────────────────
  // A tier cliff fires when passing on this pick would materially change
  // what's available by the user's NEXT pick, specifically at a position
  // the user cares about. Two concrete triggers:
  //
  //   (A) Last-in-tier: only 1 prospect remains in the currently-top
  //       available tier at a relevant position. The next pick could take
  //       the last one and force a tier drop for that position.
  //
  //   (B) Tier transition imminent: among the top-tier remaining at a
  //       relevant position, the last member's availability at nextUserSlot
  //       drops below 0.30. High confidence they'll be gone by the user's
  //       return — a "cliff" in positional quality is incoming.
  //
  // "Relevant position" = in `needs`, OR current grade AVERAGE/WEAK/CRITICAL
  // (a tier-2 prospect is still a real upgrade at an AVERAGE position).
  //
  // The flash animation fires once on render of a user pick — a cue, not a
  // loop. If Billy lands on this screen and there's no cliff, the radar is
  // visibly calm ("Board stable").
  // ════════════════════════════════════════════════════════════════════
  const tierCliffs = useMemo(() => {
    const byPosTier: Record<string, Record<number, AvailableProspect[]>> = {};
    for (const p of available) {
      if (!byPosTier[p.position]) byPosTier[p.position] = {};
      (byPosTier[p.position][p.tier] ??= []).push(p);
    }
    const relevant = new Set<Position>([
      ...needs,
      ...(Object.entries(preDraft.positional_grades)
        .filter(([, g]) => g === "AVERAGE" || g === "WEAK" || g === "CRITICAL")
        .map(([pos]) => pos) as Position[]),
    ]);

    const cliffs: Array<{
      position: Position;
      tier: number;
      kind: "last-in-tier" | "availability-drop";
      reason: string;
    }> = [];

    for (const pos of relevant) {
      const tiers = byPosTier[pos];
      if (!tiers) continue;
      const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
      const topTier = tierKeys[0];
      if (topTier == null) continue;
      const bucket = tiers[topTier];

      // (A) last-in-tier
      if (bucket.length === 1) {
        const only = bucket[0];
        cliffs.push({
          position: pos,
          tier: topTier,
          kind: "last-in-tier",
          reason: `Last tier-${topTier} ${pos} — ${only.name}`,
        });
        continue;
      }

      // (B) tier transition imminent (requires nextUserSlot availability)
      if (nextUserSlot) {
        const anyAtRisk = bucket.some((p) => {
          const nextAvail = simSnapshot.prospect_availability[p.name]?.find(
            (a) => a.slot === nextUserSlot,
          );
          return (nextAvail?.pct_available ?? 100) < 30;
        });
        if (anyAtRisk) {
          cliffs.push({
            position: pos,
            tier: topTier,
            kind: "availability-drop",
            reason: `Tier-${topTier} ${pos} cliff — gone before ${nextUserSlot}`,
          });
        }
      }
    }
    return cliffs;
  }, [available, needs, preDraft.positional_grades, nextUserSlot, simSnapshot.prospect_availability]);

  // ── Prospect table state ──
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<"ALL" | Position>("ALL");

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [available, search, posFilter]);

  return (
    <div
      className="min-h-screen pb-[96px] md:pb-6 md:pr-[340px]"
      style={{ background: PS.bg, fontFamily: SANS, color: C.primary }}
    >
      <style>{`
        .ps-tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
        .ps-flash { animation: ps-flash 1.6s ease-out 1; }
        @keyframes ps-flash {
          0%   { box-shadow: 0 0 0 0 rgba(228,114,114,0); }
          18%  { box-shadow: 0 0 0 4px rgba(228,114,114,0.42); }
          100% { box-shadow: 0 0 0 0 rgba(228,114,114,0); }
        }
        .ps-rise > * { animation: ps-rise 420ms cubic-bezier(0.22,1,0.36,1) both; }
        .ps-rise > *:nth-child(1) { animation-delay: 40ms; }
        .ps-rise > *:nth-child(2) { animation-delay: 90ms; }
        .ps-rise > *:nth-child(3) { animation-delay: 140ms; }
        @keyframes ps-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ps-row-tap { transition: background 160ms ease; }
        .ps-row-tap:active { background: rgba(255,255,255,0.04); }
        .ps-cta { transition: transform 140ms ease, box-shadow 240ms ease; }
        .ps-cta:active { transform: scale(0.985); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER STRIP — slot + owner + next hint
          ═══════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{
          borderBottom: `1px solid ${PS.hair}`,
          background: "rgba(7,9,15,0.85)",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 md:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="text-[10px] md:text-[11px] font-bold tracking-[0.22em] uppercase"
              style={{ color: C.gold }}
            >
              On the clock
            </span>
            <span
              className="ps-tabular font-semibold leading-none"
              style={{
                fontSize: 30,
                color: C.primary,
                letterSpacing: "-0.03em",
              }}
            >
              {currentSlot}
            </span>
          </div>
          <div className="text-right min-w-0">
            <div className="text-[11px] md:text-[12px] truncate" style={{ color: C.primary }}>
              {owner}
            </div>
            {nextUserSlot && (
              <div
                className="text-[9px] md:text-[10px] tracking-[0.12em] mt-0.5 ps-tabular"
                style={{ color: C.dim, fontFamily: MONO }}
              >
                Next · <span style={{ color: C.secondary }}>{nextUserSlot}</span>
                {picksUntilNextUserPick != null && (
                  <> · <span style={{ color: C.secondary }}>{picksUntilNextUserPick - 1}</span> away</>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          2. THREAT RADAR — tier cliff indicator, flashes once
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-4 md:pt-5">
        <div
          className={`rounded-xl p-3 md:p-4 ${tierCliffs.length > 0 ? "ps-flash" : ""}`}
          style={{
            background: tierCliffs.length > 0 ? "rgba(228,114,114,0.05)" : PS.card,
            border: `1px solid ${tierCliffs.length > 0 ? "rgba(228,114,114,0.24)" : PS.cardHair}`,
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span
              className="text-[9px] font-bold tracking-[0.22em] uppercase"
              style={{ color: tierCliffs.length > 0 ? "#e47272" : C.green }}
              title={tierCliffs.length > 0
                ? "A tier cliff means the next tier drop at a position you care about is imminent"
                : "No tier drops at your target positions before your next pick"}
            >
              {tierCliffs.length > 0
                ? `Tier cliff: ${tierCliffs.length} ${tierCliffs.length === 1 ? "position" : "positions"}`
                : "No tier cliff — depth at your positions"}
            </span>
            {tradeFlag && (
              <span
                className="text-[10px] ps-tabular"
                style={{ color: C.gold, fontFamily: MONO }}
                title={`${tradeFlag.trade_probability}% of simulations show an owner offering for this pick`}
              >
                Trade interest: {tradeFlag.trade_probability}% chance an owner offers for your pick
              </span>
            )}
          </div>
          {tierCliffs.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
              {tierCliffs.map((c) => (
                <div key={`${c.position}-${c.tier}-${c.kind}`} className="flex items-center gap-2 text-[11px]">
                  <PosDot pos={c.position} />
                  <span style={{ color: C.secondary }}>{c.reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px]" style={{ color: C.dim }}>
              No tier breaks imminent for positions you're targeting.
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. DECISION ZONE — DRAFT + TRADE, stacked mobile / split md+
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-4 md:pt-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
        {/* 3a · DRAFT — hero recommended pick + 4 smaller other options */}
        <Panel>
          <PanelHeader eyebrow="Draft" title="Recommended pick" meta={heroRec ? `Top fit ${heroRec.fit_score}` : "—"} />
          <div className="mt-3 flex flex-col gap-2.5 ps-rise">
            {heroRec ? (
              <DraftHero
                prospect={heroRec}
                pickNum={pickNum}
                currentSlot={currentSlot}
                positionalGrades={preDraft.positional_grades}
                onDraft={() => onDraft(heroRec.name)}
              />
            ) : (
              <div className="text-[11px] py-4 text-center" style={{ color: C.dim }}>
                No available prospects in fit window.
              </div>
            )}
            {otherRecs.length > 0 && (
              <>
                <div className="mt-1 text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: C.dim }}>
                  Other options
                </div>
                <div className="flex flex-col gap-1.5">
                  {otherRecs.map((p) => (
                    <DraftRowCompact
                      key={p.name}
                      prospect={p}
                      pickNum={pickNum}
                      currentSlot={currentSlot}
                      onDraft={() => onDraft(p.name)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* 3b · TRADE */}
        <Panel>
          <PanelHeader
            eyebrow="Trade"
            title="Buyers on the line"
            meta={tradeFlag ? `${tradeFlag.trade_probability}% chance of live offer` : "No live offers"}
          />
          <div className="mt-3 flex flex-col gap-2 ps-rise">
            {tradeFlag?.top_buyer && (
              <TradeCard
                buyer={tradeFlag.top_buyer}
                primary
                onAccept={() => onTrade?.(tradeFlag.top_buyer!.name)}
              />
            )}
            {tradeFlag?.alt_buyer && (
              <TradeCard
                buyer={tradeFlag.alt_buyer}
                primary={false}
                onAccept={() => onTrade?.(tradeFlag.alt_buyer!.name)}
              />
            )}
            {!tradeFlag && (
              <div className="text-[11px] px-2 py-5 text-center" style={{ color: C.dim }}>
                No live trade offers for this slot.
              </div>
            )}
          </div>
        </Panel>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. ALL AVAILABLE — searchable + position-filterable
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pt-6 md:pt-8 pb-16">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-[9px] font-bold tracking-[0.24em] uppercase" style={{ color: C.gold }}>
              Board
            </span>
            <h2 className="text-[14px] md:text-[15px] font-semibold" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
              All available
            </h2>
          </div>
          <span className="text-[10px] ps-tabular whitespace-nowrap" style={{ color: C.dim, fontFamily: MONO }}>
            {tableRows.length} / {available.length}
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search prospects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-[12px] px-3 py-2 rounded-lg outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${PS.hair}`,
              color: C.primary,
              fontFamily: SANS,
            }}
          />
          <div className="flex items-center gap-1">
            {(["ALL", "QB", "RB", "WR", "TE"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className="text-[10px] font-bold px-2 py-2 rounded-lg ps-cta"
                style={{
                  fontFamily: MONO,
                  cursor: "pointer",
                  border: "none",
                  background: posFilter === f ? `${C.gold}18` : "rgba(255,255,255,0.03)",
                  color: posFilter === f ? C.gold : C.dim,
                  minWidth: 34,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: PS.card, border: `1px solid ${PS.cardHair}` }}>
          {tableRows.map((p, i) => (
            <BoardRow
              key={p.name}
              prospect={p}
              borderTop={i > 0}
              onDraft={() => onDraft(p.name)}
            />
          ))}
          {tableRows.length === 0 && (
            <div className="text-[11px] text-center py-8" style={{ color: C.dim }}>
              No prospects match.
            </div>
          )}
        </div>
      </section>

      <SelectionTray consensusBoard={simSnapshot.consensus_board} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3 md:p-5"
      style={{
        background: PS.card,
        border: `1px solid ${PS.cardHair}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
      }}
    >
      {children}
    </div>
  );
}

function PanelHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="text-[9px] font-bold tracking-[0.24em] uppercase" style={{ color: C.gold }}>
          {eyebrow}
        </span>
        <h3 className="text-[13px] md:text-[14px] font-semibold truncate" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
          {title}
        </h3>
      </div>
      {meta && (
        <span className="text-[10px] ps-tabular whitespace-nowrap" style={{ color: C.dim, fontFamily: MONO }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function PosBadge({ pos }: { pos: Position | string }) {
  const b = POS_BADGE[pos];
  if (!b) return null;
  return (
    <span
      className="ps-tabular text-[9px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ color: b.fg, background: b.bg }}
    >
      {pos}
    </span>
  );
}

function PosDot({ pos }: { pos: Position | string }) {
  const tone = POS_MUTED[pos] ?? C.dim;
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 5, height: 5, background: tone, boxShadow: `0 0 6px ${tone}55` }}
    />
  );
}

function fitTone(fit: number | null | undefined): string {
  const f = fit ?? 0;
  if (f >= 80) return C.gold;
  if (f >= 60) return C.green;
  if (f >= 45) return "#e09c6b";
  return C.dim;
}

// Build a short, non-tautological context line for a recommended prospect.
// Priority: fills-gap upgrade → top fit_reason → steal → tier value.
function fitContext(
  prospect: AvailableProspect,
  pickNum: number,
  currentSlot: string,
  positionalGrades?: Record<Position, PositionalGrade>,
): string {
  const fit = prospect.fit_score ?? 0;
  const grade = positionalGrades?.[prospect.position as Position];
  if (prospect.fills_need && grade && (grade === "CRITICAL" || grade === "WEAK" || grade === "AVERAGE")) {
    const target: PositionalGrade =
      grade === "CRITICAL" ? "AVERAGE" : grade === "WEAK" ? "AVERAGE" : "STRONG";
    return `Fills ${prospect.position} gap — upgrades from ${grade} to ${target}`;
  }
  if (prospect.fit_reasons && prospect.fit_reasons.length > 0) {
    return prospect.fit_reasons[0];
  }
  const delta = pickNum - prospect.rank;
  if (delta >= 5) return `Fit ${fit} · Steal at ${currentSlot}`;
  return `Fit ${fit} · Tier ${prospect.tier} prospect`;
}

function DraftHero({
  prospect,
  pickNum,
  currentSlot,
  positionalGrades,
  onDraft,
}: {
  prospect: AvailableProspect;
  pickNum: number;
  currentSlot: string;
  positionalGrades?: Record<Position, PositionalGrade>;
  onDraft: () => void;
}) {
  const fit = prospect.fit_score ?? 0;
  const tone = fitTone(fit);
  const context = fitContext(prospect, pickNum, currentSlot, positionalGrades);
  const extraReasons = (prospect.fit_reasons ?? []).filter((r) => r !== context).slice(0, 2);
  return (
    <div
      className="rounded-xl p-3.5 md:p-4"
      style={{
        background: "linear-gradient(180deg, rgba(212,165,50,0.07) 0%, rgba(212,165,50,0.03) 100%)",
        border: `1px solid ${PS.goldHair}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 14px rgba(0,0,0,0.22)",
      }}
    >
      <div className="flex items-start gap-3">
        <PosBadge pos={prospect.position} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[9px] font-bold tracking-[0.22em] uppercase"
              style={{ color: C.gold }}
            >
              Recommended pick
            </span>
            {prospect.fills_need && (
              <span
                className="text-[8px] font-bold tracking-[0.14em] uppercase px-1.5 py-0.5 rounded"
                style={{ color: "#051a10", background: "#7dd3a0" }}
              >
                Need
              </span>
            )}
          </div>
          <div
            className="mt-1 text-[16px] md:text-[17px] font-semibold truncate"
            style={{ color: C.primary, letterSpacing: "-0.015em" }}
          >
            {prospect.name}
          </div>
          <div className="mt-0.5 text-[10px] ps-tabular" style={{ color: C.dim, fontFamily: MONO }}>
            <span title={`Consensus rank #${prospect.rank} overall`}>#{prospect.rank}</span>
            {" · "}
            <span title={`Tier ${prospect.tier} prospect`}>Tier {prospect.tier}</span>
            {" · "}
            <span title={BOOMBUST_TOOLTIP[prospect.boom_bust] ?? ""}>{prospect.boom_bust}</span>
          </div>
        </div>

        <div className="flex flex-col items-end flex-shrink-0">
          <span
            className="ps-tabular font-semibold leading-none"
            style={{ fontSize: 30, color: tone, letterSpacing: "-0.02em" }}
          >
            {fit}
          </span>
          <span className="text-[9px] tracking-[0.14em] uppercase mt-0.5" style={{ color: C.dim }}>
            fit
          </span>
        </div>
      </div>

      <div
        className="mt-2.5 text-[11px] md:text-[12px] leading-snug"
        style={{ color: C.secondary }}
      >
        {context}
      </div>

      {extraReasons.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {extraReasons.map((r, i) => (
            <li key={i} className="text-[10px] leading-snug" style={{ color: C.dim }}>
              · {r}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onDraft}
        className="ps-cta mt-3 w-full text-[11px] font-bold tracking-[0.16em] uppercase py-2.5 rounded-md cursor-pointer"
        style={{
          fontFamily: MONO,
          color: "#1a1204",
          background: `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`,
          border: "none",
          boxShadow:
            "0 4px 14px rgba(212,165,50,0.22), inset 0 1px 0 rgba(255,255,255,0.25)",
          minHeight: 42,
        }}
      >
        Draft {prospect.name}
      </button>
    </div>
  );
}

function DraftRowCompact({
  prospect,
  pickNum,
  currentSlot,
  onDraft,
}: {
  prospect: AvailableProspect;
  pickNum: number;
  currentSlot: string;
  onDraft: () => void;
}) {
  const fit = prospect.fit_score ?? 0;
  const tone = fitTone(fit);
  const context = fitContext(prospect, pickNum, currentSlot);
  return (
    <div
      className="rounded-lg px-2.5 py-2 flex items-center gap-2.5"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: `1px solid ${PS.cardHair}`,
      }}
    >
      <PosBadge pos={prospect.position} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: C.primary, letterSpacing: "-0.01em" }}
          >
            {prospect.name}
          </span>
          {prospect.fills_need && (
            <span
              className="text-[7px] font-bold tracking-[0.14em] uppercase px-1 py-0.5 rounded flex-shrink-0"
              style={{ color: "#051a10", background: "#7dd3a0" }}
            >
              Need
            </span>
          )}
        </div>
        <div className="text-[10px] leading-snug truncate" style={{ color: C.dim }}>
          {context}
        </div>
      </div>
      <div className="flex items-baseline gap-1 flex-shrink-0">
        <span
          className="ps-tabular font-semibold"
          style={{ fontSize: 15, color: tone, letterSpacing: "-0.01em", minWidth: 24, textAlign: "right" }}
        >
          {fit}
        </span>
        <span className="text-[8px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>
          fit
        </span>
      </div>
      <button
        onClick={onDraft}
        className="ps-cta text-[9px] font-bold tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-md cursor-pointer flex-shrink-0"
        style={{
          fontFamily: MONO,
          color: C.primary,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${PS.hair}`,
          minHeight: 30,
        }}
      >
        Draft
      </button>
    </div>
  );
}

function TradeCard({
  buyer,
  primary,
  onAccept,
}: {
  buyer: TradeBuyer;
  primary: boolean;
  onAccept: () => void;
}) {
  const delta = buyer.pick_value_delta;
  const positive = delta >= 0;
  const chipBg = positive ? "rgba(125,211,160,0.12)" : "rgba(228,114,114,0.08)";
  const chipBorder = positive ? "rgba(125,211,160,0.28)" : "rgba(228,114,114,0.18)";
  const chipFg = positive ? "#7dd3a0" : "rgba(228,114,114,0.82)";
  const windowTone =
    buyer.window === "CONTENDER" ? "#7dd3a0" : buyer.window === "REBUILDER" ? "#e47272" : C.secondary;
  const windowBg =
    buyer.window === "CONTENDER"
      ? "rgba(125,211,160,0.10)"
      : buyer.window === "REBUILDER"
        ? "rgba(228,114,114,0.10)"
        : "rgba(176,178,200,0.08)";

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: primary ? "rgba(212,165,50,0.04)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${primary ? PS.goldHair : PS.cardHair}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-semibold truncate" style={{ color: C.primary, letterSpacing: "-0.01em" }}>
            {buyer.name}
          </span>
          <span
            className="text-[8px] font-bold tracking-[0.14em] uppercase px-1.5 py-0.5 rounded"
            style={{ color: windowTone, background: windowBg }}
            title={WINDOW_TOOLTIP[buyer.window] ?? ""}
          >
            {buyer.window}
          </span>
        </div>
        {!primary && (
          <span className="text-[9px] tracking-[0.18em] uppercase" style={{ color: C.dim }}>Alt</span>
        )}
      </div>

      {/* Cost string — primary in the card body */}
      <div className="mt-2">
        <div className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: C.dim }}>
          Cost to move up
        </div>
        <div
          className="text-[13px] md:text-[14px] font-semibold mt-0.5"
          style={{
            color: C.primary,
            fontFamily: MONO,
            letterSpacing: "-0.01em",
          }}
        >
          {buyer.estimated_cost}
        </div>
      </div>

      {/* Value delta + context */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span
          className="ps-tabular text-[10px] font-bold tracking-[0.04em] px-1.5 py-0.5 rounded"
          style={{
            color: chipFg,
            background: chipBg,
            border: `1px solid ${chipBorder}`,
            fontFamily: MONO,
          }}
          title={`Value change if you accept: ${positive ? "+" : ""}${delta} KTC points (${buyer.pick_value_source})`}
        >
          {positive ? "↑ +" : "↓ "}{delta} value
        </span>
        <span className="text-[9px] tracking-[0.12em]" style={{ color: C.dim, fontFamily: MONO }}>
          {buyer.pick_value_source}
        </span>
      </div>

      {/* Buyer's draft capital — verbose */}
      <div className="mt-1 text-[10px] ps-tabular" style={{ color: C.dim, fontFamily: MONO }}>
        {buyer.picks_2026} picks in 2026 · {buyer.picks_2027} picks in 2027
        {buyer.h2h_trades > 0 && ` · ${buyer.h2h_trades} past ${buyer.h2h_trades === 1 ? "trade" : "trades"} with you`}
      </div>

      {/* Reason */}
      <div className="mt-2 text-[10px] leading-snug" style={{ color: C.secondary }}>
        {buyer.reason}
      </div>

      {/* CTA */}
      <button
        onClick={onAccept}
        className="ps-cta mt-2.5 w-full text-[10px] font-bold tracking-[0.12em] uppercase py-2 rounded-md cursor-pointer"
        style={{
          fontFamily: MONO,
          color: primary ? "#1a1204" : C.primary,
          background: primary
            ? `linear-gradient(180deg, ${C.gold} 0%, #b88a26 100%)`
            : "rgba(255,255,255,0.04)",
          border: primary ? "none" : `1px solid ${PS.hair}`,
          boxShadow: primary
            ? "0 3px 12px rgba(212,165,50,0.18), inset 0 1px 0 rgba(255,255,255,0.22)"
            : "none",
          minHeight: 36,
        }}
      >
        Open offer
      </button>
    </div>
  );
}

function BoardRow({
  prospect,
  borderTop,
  onDraft,
}: {
  prospect: AvailableProspect;
  borderTop: boolean;
  onDraft: () => void;
}) {
  const fit = prospect.fit_score ?? 0;
  const tone = fitTone(fit);
  return (
    <div
      className="ps-row-tap flex items-center gap-2 px-3 py-2.5"
      style={{ borderTop: borderTop ? `1px solid ${PS.hair}` : undefined }}
    >
      <PosBadge pos={prospect.position} />
      <span className="text-[11px] md:text-[12px] font-semibold flex-1 min-w-0 truncate" style={{ color: C.primary }}>
        {prospect.name}
      </span>
      {prospect.fills_need && (
        <span
          className="text-[8px] font-bold tracking-[0.14em] uppercase px-1 py-0.5 rounded flex-shrink-0"
          style={{ color: "#051a10", background: "#7dd3a0" }}
        >
          Need
        </span>
      )}
      <span
        className="text-[10px] ps-tabular flex-shrink-0"
        style={{ color: C.dim, fontFamily: MONO, minWidth: 26, textAlign: "right" }}
        title={`Consensus rank #${prospect.rank}`}
      >
        #{prospect.rank}
      </span>
      <span
        className="text-[10px] ps-tabular flex-shrink-0"
        style={{ color: C.dim, fontFamily: MONO, minWidth: 34, textAlign: "right" }}
        title={`Tier ${prospect.tier} prospect`}
      >
        Tier {prospect.tier}
      </span>
      <span
        className="flex items-baseline gap-1 flex-shrink-0"
        title={`Fit score: ${fit}/100 for your roster at this slot`}
      >
        <span
          className="ps-tabular font-semibold"
          style={{ color: tone, fontSize: 13, letterSpacing: "-0.01em", minWidth: 22, textAlign: "right" }}
        >
          {fit}
        </span>
        <span className="text-[8px] tracking-[0.14em] uppercase" style={{ color: C.dim }}>fit</span>
      </span>
      <button
        onClick={onDraft}
        className="ps-cta text-[9px] font-bold tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-md cursor-pointer flex-shrink-0"
        style={{
          fontFamily: MONO,
          color: C.primary,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${PS.hair}`,
          minHeight: 30,
        }}
      >
        Draft
      </button>
    </div>
  );
}
