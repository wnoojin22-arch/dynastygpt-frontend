"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getDraftHQYourPicks,
  getDraftHQTendencies,
  getDraftHQOwnerStrategicIntel,
  getDraftHQRookieADP,
  getOverview,
} from "@/lib/api";
import { C, SANS, MONO } from "@/components/league/tokens";
import PlayerHeadshot from "@/components/league/PlayerHeadshot";
import type { Pos } from "./mocks";

const TABS = [
  { id: "your-picks",  label: "YOUR PICKS"  },
  { id: "draft-board", label: "DRAFT BOARD" },
  { id: "intel",       label: "DRAFT INTEL" },
  { id: "rookies",     label: "ROOKIES"     },
];

const POS_COLOR: Record<Pos, string> = {
  QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b",
};

const IDENTITY_COLOR: Record<string, string> = {
  "DEVELOPER": "#7dd3a0",
  "PIPELINE BUILDER": "#6bb8e0",
  "GAMBLER": "#e09c6b",
  "INEFFICIENT": "#e47272",
  "BALANCED": "#b0b2c8",
};
const IDENTITY_TIP: Record<string, string> = {
  "DEVELOPER":        "Hit rate >55% with strong star rate. Consistently pulls difference-makers from rookie drafts.",
  "PIPELINE BUILDER": "Hit rate 45–55%, balanced position mix. Steady volume drafter.",
  "GAMBLER":          "Bust rate >40%. Swings for upside, misses often.",
  "INEFFICIENT":      "Hit rate <35%. Picks rarely turn into starters.",
  "BALANCED":         "No standout strength or weakness — middle of the pack.",
};

const WINDOW_COLOR: Record<string, string> = {
  CONTENDER: "#7dd3a0",
  REBUILDER: "#e09c6b",
  BALANCED:  "#b0b2c8",
  RETOOLING: "#6bb8e0",
};

const FLAG_COLOR: Record<string, string> = {
  TRADE_UP_TARGET:      "#7dd3a0",
  TRADE_BACK_CANDIDATE: "#6bb8e0",
  LIKELY_HOLD:          "#9596a5",
};
const FLAG_LABEL: Record<string, string> = {
  TRADE_UP_TARGET:      "TRADE-UP TARGET",
  TRADE_BACK_CANDIDATE: "TRADE-BACK PARTNER",
  LIKELY_HOLD:          "LIKELY HOLD",
};

const REC_COLOR: Record<string, string> = {
  "USE IT":      "#7dd3a0",
  "PACKAGE IT":  "#d4a532",
  "TRADE BACK":  "#6bb8e0",
  "TRADE UP":    "#e09c6b",
};
const REC_BLURB: Record<string, string> = {
  "USE IT":     "Make this pick — slot has a real hit rate and a position you need.",
  "PACKAGE IT": "Bundle this with another pick to move up — slot is weaker than your stronger pick in the same round.",
  "TRADE BACK": "Sell down for additional capital — limited upside at this slot.",
  "TRADE UP":   "Combine picks to climb into a higher hit-rate slot.",
};

const DIRECTION_LABEL: Record<string, string> = {
  TYPICALLY_UP:        "Trades up",
  TYPICALLY_DOWN:      "Trades back",
  MIXED:               "Mixed direction",
  INSUFFICIENT_DATA:   "No clear direction",
};

function GlowTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string; onChange: (id: string) => void;
}) {
  return (
    <div style={{
      display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}`,
      overflowX: "auto", scrollbarWidth: "none",
    }}>
      {tabs.map((t) => {
        const act = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{
            padding: "10px 22px",
            fontFamily: SANS, fontSize: 13, fontWeight: 800, letterSpacing: "0.10em",
            color: act ? C.gold : C.dim, cursor: "pointer",
            borderBottom: act ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: act ? `0 3px 12px ${C.gold}40, 0 1px 4px ${C.gold}25` : "none",
            transition: "all 0.2s ease", whiteSpace: "nowrap", flexShrink: 0,
          }}>{t.label}</div>
        );
      })}
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const color = POS_COLOR[pos as Pos] || C.dim;
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 6px", borderRadius: 3,
      background: `${color}20`, color, border: `1px solid ${color}40`,
    }}>{pos}</span>
  );
}

function Chip({ text, color, dim }: { text: string; color?: string; dim?: boolean }) {
  const c = color || (dim ? C.dim : C.secondary);
  return (
    <span style={{
      fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
      padding: "3px 9px", borderRadius: 3,
      background: `${c}15`, color: c, border: `1px solid ${c}30`,
    }}>{text}</span>
  );
}

function MockBanner({ msg }: { msg?: string }) {
  return (
    <div style={{
      margin: "12px 0",
      padding: "8px 14px",
      borderRadius: 6,
      background: "rgba(212,165,50,0.08)",
      border: `1px solid ${C.goldBorder}`,
      fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.05em",
    }}>
      {msg || "MOCK DATA — backend wiring in progress."}
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: 28, textAlign: "center",
      fontFamily: MONO, fontSize: 12, color: C.dim, letterSpacing: "0.04em",
    }}>{msg}</div>
  );
}

// ─── ADP tier display constants ───────────────────────────────────────────
const TIER_LABEL: Record<string, string> = {
  tep_sliced:  "FORMAT-EXACT",
  format_only: "FORMAT-MATCH",
  global:      "GLOBAL ADP",
};
const TIER_COLOR: Record<string, string> = {
  tep_sliced:  "#7dd3a0",
  format_only: "#6bb8e0",
  global:      "#9596a5",
};
const TIER_TIP: Record<string, string> = {
  tep_sliced:  "ADP from leagues that match your scoring, QB count, AND TE-premium setting (sample ≥24).",
  format_only: "ADP from leagues that match scoring + QB count, ignoring TE premium (sample ≥12).",
  global:      "Cross-format ADP fallback — use as a directional baseline only.",
};

function formatScoring(s?: string): string {
  if (!s) return "—";
  if (s === "ppr") return "PPR";
  if (s === "half_ppr") return "Half-PPR";
  if (s === "standard") return "Standard";
  return s.toUpperCase();
}

// ─── ADP candidate helper (shared by Tab 1 + Tab 2) ─────────────────────
type ADPRookie = {
  player_name: string;
  position: string | null;
  avg_pick: number | null;
  p10_pick: number | null;
  p50_pick: number | null;
  p90_pick: number | null;
  pct_round_1: number | null;
  sample_n: number;
  format_key: string;
  tier: string;
};

function pickCandidatesFor(
  pickNum: number,
  rookies: ADPRookie[],
  windowSize = 4,
  count = 3,
): { rookies: ADPRookie[]; fallback: boolean } {
  // Window overlap: rookie's [p10-W, p90+W] contains pickNum
  const inWindow = rookies.filter(r => {
    if (r.p10_pick == null || r.p90_pick == null) return false;
    return (r.p10_pick - windowSize) <= pickNum && (r.p90_pick + windowSize) >= pickNum;
  });

  if (inWindow.length > 0) {
    inWindow.sort((a, b) => {
      const aP50 = a.p50_pick ?? a.avg_pick ?? 0;
      const bP50 = b.p50_pick ?? b.avg_pick ?? 0;
      const aDist = Math.abs(aP50 - pickNum);
      const bDist = Math.abs(bP50 - pickNum);
      if (aDist !== bDist) return aDist - bDist;
      return (b.sample_n || 0) - (a.sample_n || 0);
    });
    return { rookies: inWindow.slice(0, count), fallback: false };
  }

  // Fallback: late pick — show top by latest p90 (most likely to fall)
  const sorted = [...rookies]
    .filter(r => r.p90_pick != null)
    .sort((a, b) => (b.p90_pick! - a.p90_pick!));
  return { rookies: sorted.slice(0, count), fallback: true };
}

function CandidateRow({ r }: { r: ADPRookie }) {
  const tierColor = TIER_COLOR[r.tier] || C.dim;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 0",
    }}>
      <PlayerHeadshot name={r.player_name} position={r.position || "PICK"} size={28} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.player_name}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
            padding: "1px 5px", borderRadius: 3,
            background: `${POS_COLOR[(r.position || "") as Pos] || C.dim}20`,
            color: POS_COLOR[(r.position || "") as Pos] || C.dim,
            border: `1px solid ${POS_COLOR[(r.position || "") as Pos] || C.dim}40`,
          }}>{r.position || "—"}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
            range {r.p10_pick != null && r.p90_pick != null ? `${r.p10_pick.toFixed(0)}–${r.p90_pick.toFixed(0)}` : "—"}
          </span>
          <span title={TIER_TIP[r.tier]} style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            padding: "1px 5px", borderRadius: 3, cursor: "help",
            background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`,
          }}>n={r.sample_n}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>ADP</div>
        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.gold, lineHeight: 1 }}>
          {r.p50_pick != null ? r.p50_pick.toFixed(1) : (r.avg_pick != null ? r.avg_pick.toFixed(1) : "—")}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 1 — YOUR PICKS  (real data)
// ═════════════════════════════════════════════════════════════════════════

function buildYourPicksHero(args: {
  picks: any[];
  selfIntel: any | null;
  tendencies: any | null;
}): string {
  const { picks, selfIntel } = args;
  if (!picks.length) return "No upcoming picks for this season.";

  const slots = picks.map(p => p.slot_key || `${p.round}.${(p.slot ?? "??")}`).join(", ");
  const windowClass: string | undefined = selfIntel?.roster?.window;
  const needs: string[] = selfIntel?.roster?.needs || [];
  const strengths: string[] = selfIntel?.roster?.strengths || [];
  const identity = selfIntel?.draft_identity;

  const hasUseIt    = picks.some(p => p.recommendation === "USE IT");
  const hasPackage  = picks.some(p => p.recommendation === "PACKAGE IT");
  const hasTradeBack= picks.some(p => p.recommendation === "TRADE BACK");

  const sentences: string[] = [];

  // 1. Picks summary
  sentences.push(`You hold ${picks.length} pick${picks.length === 1 ? "" : "s"}: ${slots}.`);

  // 2. Window + roster context
  if (windowClass && (needs.length || strengths.length)) {
    const need = needs.length ? `need ${needs.join("/")}` : "";
    const set  = strengths.length ? `set at ${strengths.join("/")}` : "";
    const ctx = [need, set].filter(Boolean).join(", ");
    sentences.push(`${windowClass.charAt(0) + windowClass.slice(1).toLowerCase()} window — ${ctx}.`);
  } else if (windowClass) {
    sentences.push(`${windowClass.charAt(0) + windowClass.slice(1).toLowerCase()} window.`);
  }

  // 3. Strategy guidance — derived from window + recommendations
  const strat: string[] = [];
  if (hasUseIt && needs.length) {
    strat.push(`Use your strongest slot on ${needs[0]}`);
  }
  if (hasPackage) {
    strat.push("package weaker slots forward to consolidate");
  }
  if (hasTradeBack) {
    strat.push("sell down softer picks for added capital");
  }
  if (windowClass === "CONTENDER" && !strat.length) {
    strat.push("convert rookie capital into proven help");
  } else if (windowClass === "REBUILDER" && !strat.length) {
    strat.push("accumulate picks and lottery tickets");
  }
  if (strat.length) {
    sentences.push(strat.join("; ") + ".");
  }

  // 4. Identity flavor
  if (identity) {
    const tip = IDENTITY_TIP[identity];
    if (tip) sentences.push(`Your draft profile: ${identity} — ${tip}`);
  }

  return sentences.join(" ");
}

function YourPicks({ lid, owner, ownerId }: { lid: string; owner: string | null; ownerId: string | null }) {
  const enabled = !!lid && !!owner;
  const picksQ = useQuery({
    queryKey: ["draft-hq-your-picks", lid, owner, ownerId],
    queryFn: () => getDraftHQYourPicks(lid, owner!, ownerId, 3),
    staleTime: 300_000,
    enabled,
  });
  const intelQ = useQuery({
    queryKey: ["draft-hq-strategic-intel", lid],
    queryFn: () => getDraftHQOwnerStrategicIntel(lid),
    staleTime: 600_000,
    enabled,
  });
  const tendQ = useQuery({
    queryKey: ["draft-hq-tendencies", lid],
    queryFn: () => getDraftHQTendencies(lid),
    staleTime: 600_000,
    enabled,
  });
  const adpQ = useQuery({
    queryKey: ["draft-hq-rookie-adp", lid],
    queryFn: () => getDraftHQRookieADP(lid, 80),
    staleTime: 600_000,
    enabled,
  });
  const overviewQ = useQuery({
    queryKey: ["league-overview", lid],
    queryFn: () => getOverview(lid),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league/owner context — open this from your league dashboard." />;
  if (picksQ.isLoading) return <EmptyMsg msg="Loading your picks…" />;
  if (picksQ.error) return <EmptyMsg msg={`Error: ${(picksQ.error as Error).message}`} />;

  const picks: any[] = picksQ.data?.picks || [];
  const partners: any[] = picksQ.data?.likely_partners || [];

  const selfIntel = useMemo(() => {
    const all: any[] = intelQ.data?.owners || [];
    if (!all.length) return null;
    const lower = (owner || "").toLowerCase().trim();
    return (
      all.find(o => ownerId && o.owner_user_id === ownerId) ||
      all.find(o => (o.owner || "").toLowerCase().trim() === lower) ||
      null
    );
  }, [intelQ.data, owner, ownerId]);

  const heroText = buildYourPicksHero({
    picks,
    selfIntel,
    tendencies: tendQ.data?.tendencies || null,
  });

  if (!picks.length) return <EmptyMsg msg="No upcoming picks found for this league." />;

  return (
    <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero strategy summary */}
      <div style={{
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 100%)`,
        border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: 16,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 10, fontWeight: 800, color: C.gold,
          letterSpacing: "0.16em", marginBottom: 6,
        }}>YOUR DRAFT SUMMARY</div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.primary, lineHeight: 1.55 }}>
          {heroText}
        </div>
      </div>

      {/* Picks block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {picks.map((p: any, i: number) => {
          const slotKey = p.slot_key || `${p.round}.${p.slot ? String(p.slot).padStart(2, "0") : "??"}`;
          const recColor = REC_COLOR[p.recommendation] || C.dim;
          const recBlurb = REC_BLURB[p.recommendation] || "";
          const top3Pos = Object.entries(p.position_breakdown || {})
            .sort(([, a]: any, [, b]: any) => b - a).slice(0, 3);
          const numTeams = overviewQ.data?.format?.num_teams;
          const allRookies: ADPRookie[] = adpQ.data?.rookies || [];
          const pickNum: number | null = (numTeams && p.round && p.slot)
            ? (p.round - 1) * numTeams + p.slot
            : null;
          const candBlock = (pickNum != null && allRookies.length > 0)
            ? pickCandidatesFor(pickNum, allRookies, 4, 3)
            : null;
          return (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900, color: C.gold }}>
                    {slotKey}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
                    {p.season} · ROUND {p.round}{p.slot ? ` · SLOT ${p.slot}` : ""}
                  </span>
                  {!p.is_own_pick && p.original_owner && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
                      from {p.original_owner}
                    </span>
                  )}
                </div>
                <span title={recBlurb} style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  padding: "3px 8px", borderRadius: 3,
                  background: `${recColor}18`, color: recColor, border: `1px solid ${recColor}30`,
                  cursor: "help",
                }}>{p.recommendation}</span>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>SLOT HIT RATE</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 900, color: p.hit_rate >= 50 ? C.green : p.hit_rate >= 30 ? C.gold : C.dim }}>
                    {p.hit_rate}%
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>
                    % of picks at this slot historically that became starters
                  </div>
                </div>
                {top3Pos.length > 0 && (
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>POSITION MIX AT THIS SLOT</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {top3Pos.map(([pos, pct]: any) => (
                        <span key={pos} style={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 700,
                          padding: "2px 6px", borderRadius: 3,
                          background: `${POS_COLOR[pos as Pos] || C.dim}15`,
                          color: POS_COLOR[pos as Pos] || C.dim,
                        }}>{pos} {pct}%</span>
                      ))}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4 }}>
                      What past drafters at this slot picked
                    </div>
                  </div>
                )}
              </div>

              {recBlurb && (
                <div style={{
                  fontFamily: SANS, fontSize: 11, color: recColor, lineHeight: 1.45, marginBottom: 6,
                  paddingTop: 6, paddingLeft: 8, borderLeft: `2px solid ${recColor}40`,
                }}>{recBlurb}</div>
              )}
              <div style={{
                fontFamily: SANS, fontSize: 12, color: C.primary, lineHeight: 1.5,
                paddingTop: 8, borderTop: `1px solid ${C.border}`,
              }}>{p.reasoning}</div>

              {/* Likely available candidates (real ADP) */}
              {candBlock && candBlock.rookies.length > 0 && (
                <div style={{
                  marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
                      {candBlock.fallback ? "REACH TERRITORY" : "LIKELY AVAILABLE"}
                    </div>
                    {pickNum != null && (
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                        at pick #{pickNum}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, marginBottom: 4, lineHeight: 1.4 }}>
                    {candBlock.fallback
                      ? "These rookies have ADP earlier than your pick — could fall if the board breaks right."
                      : "Top 3 rookies whose ADP window overlaps this pick, sorted by closest median."}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {candBlock.rookies.map((r, idx) => (
                      <CandidateRow key={`${r.player_name}-${idx}`} r={r} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Likely partners block — prose-first, scores secondary */}
      <div>
        <div style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em",
          color: C.primary, marginBottom: 4,
        }}>LIKELY TRADE PARTNERS</div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, marginBottom: 12, lineHeight: 1.5 }}>
          Owners most likely to move up to your slots, based on their pick inventory, roster window, and trade history.
        </div>
        {partners.length === 0 ? (
          <EmptyMsg msg="No partner signals yet — needs league_intel + behavioral_intel populated." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {partners.map((b: any, i: number) => {
              const score = b.willingness?.score ?? 0;
              const band = b.willingness?.band || "—";
              const bandColor = band === "HIGH" ? C.green : band === "MEDIUM" ? C.gold : band === "LOW" ? C.dim : C.red;

              const bits: string[] = [];
              if (b.window) bits.push(b.window.toLowerCase() + " window");
              if (b.pick_surplus_delta != null) {
                const sd = b.pick_surplus_delta;
                if (sd >= 1) bits.push(`${sd > 0 ? "+" : ""}${sd.toFixed(0)} picks vs avg`);
                else if (sd <= -1) bits.push(`${sd.toFixed(0)} picks vs avg`);
              }
              if (b.down_move_bias != null && b.down_move_bias <= 0.35) {
                bits.push("history of moving up");
              }
              const subtitle = bits.length ? bits.join(" · ") : "limited signal";

              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px",
                  display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>
                      {b.partner_owner}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 3, letterSpacing: "0.03em" }}>
                      {subtitle}
                    </div>
                  </div>
                  <span title={`willingness score ${score}`} style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                    padding: "4px 9px", borderRadius: 3,
                    background: `${bandColor}15`, color: bandColor, border: `1px solid ${bandColor}30`,
                  }}>{band} INTEREST</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 2 — DRAFT BOARD  (round-grouped, real ADP per pick)
// ═════════════════════════════════════════════════════════════════════════
function DraftBoard({ lid }: { lid: string }) {
  const enabled = !!lid;
  const adpQ = useQuery({
    queryKey: ["draft-hq-rookie-adp", lid],
    queryFn: () => getDraftHQRookieADP(lid, 80),
    staleTime: 600_000,
    enabled,
  });
  const intelQ = useQuery({
    queryKey: ["draft-hq-strategic-intel", lid],
    queryFn: () => getDraftHQOwnerStrategicIntel(lid),
    staleTime: 600_000,
    enabled,
  });
  const overviewQ = useQuery({
    queryKey: ["league-overview", lid],
    queryFn: () => getOverview(lid),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league context." />;
  if (adpQ.isLoading || intelQ.isLoading || overviewQ.isLoading) {
    return <EmptyMsg msg="Loading draft board…" />;
  }
  if (adpQ.error)      return <EmptyMsg msg={`ADP error: ${(adpQ.error as Error).message}`} />;
  if (intelQ.error)    return <EmptyMsg msg={`Intel error: ${(intelQ.error as Error).message}`} />;

  const rookies: ADPRookie[] = adpQ.data?.rookies || [];
  const numTeams = overviewQ.data?.format?.num_teams;
  if (!numTeams) return <EmptyMsg msg="League team count unavailable." />;

  // Build pick → owner map from owner-strategic-intel.held_this_draft
  const owners: any[] = intelQ.data?.owners || [];
  const pickOwner: Record<string, string> = {};
  for (const o of owners) {
    const held: string[] = o.picks?.held_this_draft || [];
    for (const slotKey of held) {
      pickOwner[slotKey] = o.owner;
    }
  }

  // Group all picks by round
  const allSlotKeys = Object.keys(pickOwner);
  const byRound = new Map<number, { slot: number; slotKey: string; ownerName: string }[]>();
  for (const slotKey of allSlotKeys) {
    const m = slotKey.match(/^(\d+)\.(\d+)$/);
    if (!m) continue;
    const round = parseInt(m[1], 10);
    const slot  = parseInt(m[2], 10);
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push({ slot, slotKey, ownerName: pickOwner[slotKey] });
  }
  for (const arr of byRound.values()) arr.sort((a, b) => a.slot - b.slot);
  const roundsSorted = Array.from(byRound.keys()).sort((a, b) => a - b);

  if (roundsSorted.length === 0) {
    return <EmptyMsg msg="No 2026 picks resolved yet for this league." />;
  }

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 100%)`,
        border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: 14, marginBottom: 14,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 12, fontWeight: 800, color: C.gold,
          letterSpacing: "0.16em", marginBottom: 6,
        }}>FULL DRAFT BOARD — 2026 ROOKIE DRAFT</div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.primary, lineHeight: 1.55 }}>
          Every pick in the draft, grouped by round. For each pick, the three rookies whose ADP window most overlaps that slot. Late picks past every rookie's ADP fall back to "Reach territory" — names with the latest expected board fall.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {roundsSorted.map(rd => {
          const picks = byRound.get(rd) || [];
          return (
            <div key={rd}>
              <div style={{
                position: "sticky", top: 0, zIndex: 1,
                background: C.bg, padding: "8px 0",
                borderBottom: `2px solid ${C.gold}`, marginBottom: 10,
              }}>
                <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 900, color: C.gold, letterSpacing: "0.06em" }}>
                  ROUND {rd}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2 }}>
                  {picks.length} pick{picks.length === 1 ? "" : "s"} · slots {picks[0]?.slot}–{picks[picks.length - 1]?.slot}
                </div>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 10,
              }}>
                {picks.map(({ slot, slotKey, ownerName }) => {
                  const pickNum = (rd - 1) * numTeams + slot;
                  const cand = pickCandidatesFor(pickNum, rookies, 4, 3);
                  return (
                    <div key={slotKey} style={{
                      background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 900, color: C.gold }}>
                            {slotKey}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.04em" }}>
                            pick #{pickNum} · {ownerName}
                          </div>
                        </div>
                        {cand.fallback && (
                          <span style={{
                            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                            padding: "2px 6px", borderRadius: 3,
                            background: `${C.orange}18`, color: C.orange, border: `1px solid ${C.orange}40`,
                          }}>REACH</span>
                        )}
                      </div>
                      {cand.rookies.length === 0 ? (
                        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, padding: "8px 0" }}>
                          No ADP data.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {cand.rookies.map((r, idx) => (
                            <CandidateRow key={`${r.player_name}-${idx}`} r={r} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 3 — DRAFT INTEL  (real data: tendencies + strategic intel per owner)
// ═════════════════════════════════════════════════════════════════════════

function buildTendencyHero(t: any): string | null {
  if (!t) return null;
  const sentences: string[] = [];

  // Discipline
  const disc = t.adp_discipline;
  if (disc != null) {
    const a = Math.abs(disc);
    if (a <= 10) {
      sentences.push("This league drafts with discipline — picks rarely stray far from ADP.");
    } else if (a <= 22) {
      sentences.push("This league mostly stays on script, with occasional surprises.");
    } else {
      sentences.push("This league is improvisational — expect picks to drift far from ADP.");
    }
  }

  // Reach magnitude — directional
  const rm = t.reach_magnitude;
  if (rm != null) {
    if (rm <= -5) {
      sentences.push(`Drafters tend to reach earlier than ADP (avg ${rm.toFixed(1)} picks).`);
    } else if (rm >= 5) {
      sentences.push(`Drafters let value fall later than ADP (avg +${rm.toFixed(1)} picks).`);
    }
  }

  // QB early
  if (t.qb_early != null && Math.abs(t.qb_early) >= 0.5) {
    if (t.qb_early > 0) sentences.push(`QBs go ~${t.qb_early.toFixed(1)} rounds earlier than baseline.`);
    else sentences.push(`QBs slide ~${Math.abs(t.qb_early).toFixed(1)} rounds later than baseline.`);
  }

  // TE premium
  if (t.te_premium != null && Math.abs(t.te_premium) >= 0.5) {
    if (t.te_premium > 0) sentences.push(`TE premium scoring is real here — TEs go ~${t.te_premium.toFixed(1)} rounds earlier.`);
  }

  // R1 RB bias
  if (t.rb_heavy_r1 != null && Math.abs(t.rb_heavy_r1) >= 0.05) {
    if (t.rb_heavy_r1 > 0) sentences.push(`Round 1 skews RB-heavy (+${(t.rb_heavy_r1 * 100).toFixed(0)}% vs baseline).`);
    else sentences.push(`Round 1 is RB-light vs baseline (${(t.rb_heavy_r1 * 100).toFixed(0)}%).`);
  }

  if (sentences.length === 0) return null;
  return sentences.join(" ");
}

function DraftIntel({ lid }: { lid: string }) {
  const enabled = !!lid;
  const intelQ = useQuery({
    queryKey: ["draft-hq-strategic-intel", lid],
    queryFn: () => getDraftHQOwnerStrategicIntel(lid),
    staleTime: 600_000,
    enabled,
  });
  const tendQ = useQuery({
    queryKey: ["draft-hq-tendencies", lid],
    queryFn: () => getDraftHQTendencies(lid),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league context." />;
  if (intelQ.isLoading) return <EmptyMsg msg="Loading strategic intel…" />;
  if (intelQ.error) return <EmptyMsg msg={`Error: ${(intelQ.error as Error).message}`} />;

  const owners: any[] = intelQ.data?.owners || [];
  if (!owners.length) return <EmptyMsg msg="No owner intel available — league_intel may not be populated yet." />;

  const t = tendQ.data?.tendencies;
  const fallback = tendQ.data?.fallback;
  const heroText = buildTendencyHero(t);

  // Decide which tendency stats to render — drop nulls, drop TEP=0 when not a TEP league
  const tendencyCards: { label: string; v: number | null; fmt: TendencyFmt; sub?: string; meaning: string }[] = [];
  if (t) {
    if (t.reach_magnitude != null) tendencyCards.push({
      label: "REACH MAGNITUDE",
      v: t.reach_magnitude,
      fmt: "picks_signed",
      sub: t.adp_sample_n != null ? `vs ADP · n=${t.adp_sample_n}` : undefined,
      meaning: "Negative = drafters reach earlier than ADP. Positive = value falls later.",
    });
    if (t.adp_discipline != null) tendencyCards.push({
      label: "ADP DISCIPLINE",
      v: t.adp_discipline,
      fmt: "picks_abs",
      sub: "mean |Δ| from ADP",
      meaning: "Smaller = picks stay close to ADP. Larger = unpredictable.",
    });
    // Hide TEP row when this league has no TE premium signal
    if (t.te_premium != null && Math.abs(t.te_premium) >= 0.1) tendencyCards.push({
      label: "TE PREMIUM",
      v: t.te_premium,
      fmt: "round",
      meaning: "Rounds earlier (or later) TEs go vs baseline.",
    });
    if (t.qb_early != null && Math.abs(t.qb_early) >= 0.1) tendencyCards.push({
      label: "QB EARLY",
      v: t.qb_early,
      fmt: "round",
      meaning: "Rounds earlier (or later) QBs go vs baseline.",
    });
    if (t.rb_heavy_r1 != null && Math.abs(t.rb_heavy_r1) >= 0.02) tendencyCards.push({
      label: "R1 RB BIAS",
      v: t.rb_heavy_r1,
      fmt: "ratio",
      meaning: "R1 RB share above (or below) baseline.",
    });
  }

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Hero summary */}
      {heroText && (
        <div style={{
          background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 100%)`,
          border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: 16, marginBottom: 12,
        }}>
          <div style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 800, color: C.gold,
            letterSpacing: "0.16em", marginBottom: 8,
          }}>LEAGUE SCOUTING REPORT</div>
          <div style={{ fontFamily: SANS, fontSize: 15, color: C.primary, lineHeight: 1.6 }}>
            {heroText}
          </div>
          {(t?.sample_size != null) && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 10, letterSpacing: "0.04em" }}>
              {t.sample_size} picks · {(t.seasons || []).join("+")}
              {t.format_key && ` · baseline ${t.format_key}`}
              {fallback === "global" && " · global baseline (no league cache yet)"}
            </div>
          )}
        </div>
      )}

      {/* Tendencies grid */}
      {tendencyCards.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 14, marginBottom: 16,
        }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", color: C.primary, marginBottom: 12 }}>
            LEAGUE DRAFT TENDENCIES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {tendencyCards.map(c => (
              <TendencyStat key={c.label} {...c} />
            ))}
          </div>
        </div>
      )}

      {/* Owner cards header + key */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", color: C.primary }}>
          STRATEGIC INTEL — BY OWNER
        </div>
        <div style={{ display: "flex", gap: 8, fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.04em", flexWrap: "wrap" }}>
          <Chip text="TRADE-UP TARGET" color={FLAG_COLOR.TRADE_UP_TARGET} />
          <Chip text="TRADE-BACK PARTNER" color={FLAG_COLOR.TRADE_BACK_CANDIDATE} />
          <Chip text="LIKELY HOLD" color={FLAG_COLOR.LIKELY_HOLD} />
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        gap: 14,
      }}>
        {owners.map((o: any) => <OwnerStrategicCard key={o.owner_user_id || o.owner} o={o} />)}
      </div>
    </div>
  );
}

function OwnerStrategicCard({ o }: { o: any }) {
  const flagVerdict = o.trade_flag?.verdict || "LIKELY_HOLD";
  const flagColor = FLAG_COLOR[flagVerdict] || C.dim;
  const flagLabel = FLAG_LABEL[flagVerdict] || flagVerdict;
  const flagReason = o.trade_flag?.reasoning || "";

  const identity: string | null = o.draft_identity;
  const identityColor = identity ? (IDENTITY_COLOR[identity] || C.dim) : C.dim;
  const identityTip = identity ? IDENTITY_TIP[identity] : null;

  const windowClass: string | null = o.roster?.window;
  const windowColor = windowClass ? (WINDOW_COLOR[windowClass] || C.dim) : C.dim;

  const trader = o.draft_day_trader || {};
  const traderTag: string = trader.tag || "UNKNOWN";
  const tradesMade: number = trader.trades_made || 0;
  const tradesUp: number = trader.trades_up || 0;
  const tradesDown: number = trader.trades_down || 0;
  const tradesLateral: number = trader.trades_lateral || 0;
  const seasonsActive: number = trader.seasons_active || 0;
  const seasonsTotal: number = trader.seasons_total || 0;

  const strengths: string[] = o.roster?.strengths || [];
  const needs: string[] = o.roster?.needs || [];

  const heldThisDraft: string[] = o.picks?.held_this_draft || [];
  const surplusDelta: number | null = o.picks?.surplus_delta ?? null;
  const futurePicks: { year: number; round: number }[] = o.picks?.future_picks || [];

  // Group future picks: round -> year -> count
  const futureByRound = new Map<number, Map<number, number>>();
  for (const p of futurePicks) {
    if (!futureByRound.has(p.round)) futureByRound.set(p.round, new Map());
    const yrMap = futureByRound.get(p.round)!;
    yrMap.set(p.year, (yrMap.get(p.year) || 0) + 1);
  }
  const futureRoundsSorted = Array.from(futureByRound.entries()).sort((a, b) => a[0] - b[0]);

  const directionTendency: string = o.behavior?.direction_tendency || "INSUFFICIENT_DATA";
  const positionsTargeted: string[] = o.behavior?.positions_targeted || [];

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${flagVerdict === "LIKELY_HOLD" ? C.border : `${flagColor}50`}`,
      borderRadius: 8, padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header — owner name + flag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 800, color: C.primary, lineHeight: 1.2 }}>
            {o.owner}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {identity && (
              <span title={identityTip || identity} style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 8px", borderRadius: 3, cursor: "help",
                background: `${identityColor}18`, color: identityColor, border: `1px solid ${identityColor}30`,
              }}>{identity}</span>
            )}
            {windowClass && (
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 8px", borderRadius: 3,
                background: `${windowColor}18`, color: windowColor, border: `1px solid ${windowColor}30`,
              }}>{windowClass}</span>
            )}
            <span title={`${tradesMade} draft-day trades over ${seasonsActive}/${seasonsTotal} drafts`} style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
              padding: "3px 8px", borderRadius: 3, cursor: "help",
              background: traderTag === "TRADER" ? `${C.gold}18` : `${C.dim}15`,
              color: traderTag === "TRADER" ? C.gold : C.dim,
              border: `1px solid ${traderTag === "TRADER" ? C.goldBorder : C.border}`,
            }}>{traderTag}</span>
          </div>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 900, letterSpacing: "0.06em",
          padding: "5px 10px", borderRadius: 3, whiteSpace: "nowrap",
          background: `${flagColor}18`, color: flagColor, border: `1px solid ${flagColor}50`,
        }}>{flagLabel}</span>
      </div>

      {/* Trade flag reasoning */}
      {flagReason && (
        <div style={{
          fontFamily: SANS, fontSize: 14, color: C.primary, lineHeight: 1.55,
          padding: "10px 12px", borderRadius: 6,
          background: `${flagColor}08`, border: `1px solid ${flagColor}25`,
        }}>{flagReason}</div>
      )}

      {/* Roster strengths/needs */}
      {(strengths.length > 0 || needs.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {strengths.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em", width: 64, flexShrink: 0 }}>SET AT</div>
              {strengths.map(s => <Chip key={s} text={s} color={C.green} />)}
            </div>
          )}
          {needs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em", width: 64, flexShrink: 0 }}>NEEDS</div>
              {needs.map(n => <Chip key={n} text={n} color={C.red} />)}
            </div>
          )}
        </div>
      )}

      {/* Picks this draft + surplus */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em", marginBottom: 4 }}>
            HOLDS THIS DRAFT
          </div>
          {heldThisDraft.length > 0 ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {heldThisDraft.map((s, i) => (
                <span key={i} style={{
                  fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary,
                  padding: "2px 8px", borderRadius: 3, background: C.elevated, border: `1px solid ${C.border}`,
                }}>{s}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>None</span>
          )}
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, marginTop: 6, lineHeight: 1.4 }}>
            Picks this manager currently owns in the 2026 rookie draft (round.slot).
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em", marginBottom: 4 }}>
            VS LEAGUE AVG
          </div>
          {surplusDelta != null ? (
            <div style={{
              fontFamily: MONO, fontSize: 16, fontWeight: 800,
              color: surplusDelta >= 1 ? C.green : surplusDelta <= -1 ? C.red : C.dim,
            }}>
              {surplusDelta > 0 ? "+" : ""}{surplusDelta.toFixed(1)} picks
            </div>
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>—</span>
          )}
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, marginTop: 6, lineHeight: 1.4 }}>
            Pick capital surplus vs. league average. Positive = trade-up ammo. Negative = candidate to trade back.
          </div>
        </div>
      </div>

      {/* Draft-day trade history */}
      <div style={{
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
          DRAFT-DAY TRADE HISTORY
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>
            {tradesMade} trade{tradesMade === 1 ? "" : "s"}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>
            in {seasonsActive}/{seasonsTotal} drafts
          </div>
        </div>
        {tradesMade > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tradesUp > 0 && (
              <span style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 700,
                padding: "3px 8px", borderRadius: 3,
                background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}35`,
              }}>↑ {tradesUp} UP</span>
            )}
            {tradesDown > 0 && (
              <span style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 700,
                padding: "3px 8px", borderRadius: 3,
                background: `${C.orange}15`, color: C.orange, border: `1px solid ${C.orange}35`,
              }}>↓ {tradesDown} DOWN</span>
            )}
            {tradesLateral > 0 && (
              <span style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 700,
                padding: "3px 8px", borderRadius: 3,
                background: `${C.dim}15`, color: C.dim, border: `1px solid ${C.border}`,
              }}>↔ {tradesLateral} LATERAL</span>
            )}
          </div>
        )}
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.4 }}>
          {tradesMade > 0
            ? "UP = moved up for a better pick. DOWN = traded back for additional capital. LATERAL = swap with no pick climb."
            : "This manager has never made a trade on draft day in the data we have."}
        </div>
        {/* Direction tendency (broader signal across all pick trades, not just draft-day) */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
            OVERALL DIRECTION
          </div>
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>
            {DIRECTION_LABEL[directionTendency] || directionTendency}
          </div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.4 }}>
          Across all pick trades (not just draft-day) — does this manager generally move up, down, or both?
        </div>
      </div>

      {/* Future picks — grouped by round */}
      <div style={{
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
          FUTURE PICKS HELD
        </div>
        {futureRoundsSorted.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {futureRoundsSorted.map(([rd, yrMap]) => {
              const yearsSorted = Array.from(yrMap.entries()).sort((a, b) => a[0] - b[0]);
              const parts = yearsSorted.map(([yr, cnt]) => `${cnt > 1 ? `${cnt}× ` : ""}${yr}`);
              return (
                <div key={rd} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.primary,
                    minWidth: 64,
                  }}>R{rd}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: C.primary }}>
                    {parts.join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>None</span>
        )}
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.4 }}>
          Picks owned beyond 2026 — broken out by round, then year. Trade-up ammo if surplus, trade bait if rebuilding.
        </div>
        {positionsTargeted.length > 0 && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, marginTop: 2 }}>
            historically targets <span style={{ color: C.primary, fontWeight: 700 }}>{positionsTargeted.join(" / ")}</span> in rookie drafts
          </div>
        )}
      </div>
    </div>
  );
}

type TendencyFmt = "round" | "ratio" | "picks_signed" | "picks_abs";

function TendencyStat({
  label, v, fmt, sub, meaning,
}: {
  label: string;
  v: number | null;
  fmt: TendencyFmt;
  sub?: string;
  meaning?: string;
}) {
  if (v == null) {
    return (
      <div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.dim }}>—</div>
        {sub && <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 3 }}>{sub}</div>}
      </div>
    );
  }
  let color: string = C.dim;
  let display: string = "";
  if (fmt === "round") {
    color = v > 0 ? C.green : v < 0 ? C.red : C.dim;
    display = `${v > 0 ? "+" : ""}${v.toFixed(2)} rd`;
  } else if (fmt === "ratio") {
    color = v > 0 ? C.green : v < 0 ? C.red : C.dim;
    display = `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;
  } else if (fmt === "picks_signed") {
    color = v <= -8 ? C.red : v <= -3 ? C.orange : v >= 8 ? C.green : v >= 3 ? C.gold : C.dim;
    display = `${v > 0 ? "+" : ""}${v.toFixed(1)} pk`;
  } else if (fmt === "picks_abs") {
    const a = Math.abs(v);
    color = a <= 10 ? C.green : a <= 22 ? C.gold : C.red;
    display = `${a.toFixed(1)} pk`;
  }
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 800, color, marginTop: 2 }}>{display}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 3 }}>{sub}</div>}
      {meaning && (
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, marginTop: 6, lineHeight: 1.45 }}>
          {meaning}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 4 — ROOKIES (real ADP from rookie_adp_2026_cache)
// ═════════════════════════════════════════════════════════════════════════
function Rookies({ lid }: { lid: string }) {
  const enabled = !!lid;
  const [posFilter, setPosFilter] = useState<"ALL" | "QB" | "RB" | "WR" | "TE">("ALL");

  const adpQ = useQuery({
    queryKey: ["draft-hq-rookie-adp", lid],
    queryFn: () => getDraftHQRookieADP(lid, 80),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league context." />;
  if (adpQ.isLoading) return <EmptyMsg msg="Loading 2026 rookie ADP…" />;
  if (adpQ.error) return <EmptyMsg msg={`Error: ${(adpQ.error as Error).message}`} />;

  const rookies: any[] = adpQ.data?.rookies || [];
  const fmt = adpQ.data?.format || {};
  const filtered = posFilter === "ALL"
    ? rookies
    : rookies.filter(r => (r.position || "").toUpperCase() === posFilter);

  // Tier counts for header summary
  const tierCounts = { tep_sliced: 0, format_only: 0, global: 0 };
  for (const r of rookies) {
    if (r.tier in tierCounts) tierCounts[r.tier as keyof typeof tierCounts]++;
  }

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Format header */}
      <div style={{
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 100%)`,
        border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: 14, marginBottom: 14,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 12, fontWeight: 800, color: C.gold,
          letterSpacing: "0.16em", marginBottom: 6,
        }}>2026 ROOKIE ADP — TUNED FOR YOUR LEAGUE</div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.primary, lineHeight: 1.55 }}>
          {formatScoring(fmt.scoring)} · {fmt.qb === "sf" ? "Superflex" : "1QB"} · {fmt.tep === "tep" ? "TE Premium" : "No TEP"}
          . Each player's ADP is served from the most format-specific tier with enough sample. Tier badges below tell you the confidence.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", fontFamily: MONO, fontSize: 11, color: C.dim }}>
          <span><span style={{ color: TIER_COLOR.tep_sliced, fontWeight: 700 }}>●</span> {tierCounts.tep_sliced} format-exact</span>
          <span><span style={{ color: TIER_COLOR.format_only, fontWeight: 700 }}>●</span> {tierCounts.format_only} format-match</span>
          <span><span style={{ color: TIER_COLOR.global, fontWeight: 700 }}>●</span> {tierCounts.global} global fallback</span>
        </div>
      </div>

      {/* Position filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {(["ALL", "QB", "RB", "WR", "TE"] as const).map(p => {
          const active = posFilter === p;
          const c = p === "ALL" ? C.gold : (POS_COLOR[p as Pos] || C.dim);
          return (
            <button key={p} onClick={() => setPosFilter(p)} style={{
              fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em",
              padding: "6px 14px", borderRadius: 4, cursor: "pointer",
              background: active ? `${c}25` : "transparent",
              color: active ? c : C.dim,
              border: `1px solid ${active ? c : C.border}`,
            }}>{p}</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyMsg msg="No rookies match this filter yet." />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
        }}>
          {filtered.map((r, idx) => {
            const tierColor = TIER_COLOR[r.tier] || C.dim;
            const tierLabel = TIER_LABEL[r.tier] || r.tier;
            const tierTip = TIER_TIP[r.tier] || "";
            return (
              <div key={`${r.player_name}-${idx}`} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <PlayerHeadshot name={r.player_name} position={r.position || "PICK"} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.primary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.player_name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <PosBadge pos={r.position || "—"} />
                      <span title={tierTip} style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                        padding: "2px 6px", borderRadius: 3, cursor: "help",
                        background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}40`,
                      }}>{tierLabel}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>ADP</div>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: C.gold, lineHeight: 1 }}>
                      {r.p50_pick != null ? r.p50_pick.toFixed(1) : (r.avg_pick != null ? r.avg_pick.toFixed(1) : "—")}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", gap: 8,
                  paddingTop: 8, borderTop: `1px solid ${C.border}`,
                  fontFamily: MONO, fontSize: 11,
                }}>
                  <div>
                    <div style={{ color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>RANGE</div>
                    <div style={{ color: C.primary, fontWeight: 700 }}>
                      {r.p10_pick != null && r.p90_pick != null
                        ? `${r.p10_pick.toFixed(0)}–${r.p90_pick.toFixed(0)}`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>R1 ODDS</div>
                    <div style={{ color: C.primary, fontWeight: 700 }}>
                      {r.pct_round_1 != null ? `${(r.pct_round_1 * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>SAMPLE</div>
                    <div style={{ color: C.primary, fontWeight: 700 }}>n={r.sample_n ?? 0}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════
export default function DraftHQPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "your-picks";
  const { currentLeagueId, currentOwner, currentOwnerId } = useLeagueStore();

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "your-picks") next.delete("tab"); else next.set("tab", id);
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.primary, padding: "20px 16px 80px" }}>
      <style>{`@keyframes rk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: SANS, fontSize: 11, color: C.gold, letterSpacing: "0.18em", fontWeight: 800,
          }}>BETA · DRAFT HQ</div>
          <div style={{
            fontFamily: SANS, fontSize: 28, fontWeight: 900, color: C.primary, marginTop: 4, lineHeight: 1.1,
          }}>Rookie Draft Cheat Sheet</div>
          <div style={{
            fontFamily: MONO, fontSize: 12, color: C.dim, marginTop: 6, letterSpacing: "0.04em",
          }}>Format-aware ranks · league tendencies · pick-trade comps</div>
        </div>
        <GlowTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === "your-picks"  && <YourPicks  lid={currentLeagueId || ""} owner={currentOwner} ownerId={currentOwnerId} />}
        {tab === "draft-board" && <DraftBoard lid={currentLeagueId || ""} />}
        {tab === "intel"       && <DraftIntel lid={currentLeagueId || ""} />}
        {tab === "rookies"     && <Rookies    lid={currentLeagueId || ""} />}
      </div>
    </div>
  );
}
