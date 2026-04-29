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
  { id: "rookies",     label: "ROOKIE ADP"  },
  { id: "your-picks",  label: "YOUR PICKS"  },
  { id: "draft-board", label: "DRAFT BOARD" },
  { id: "intel",       label: "DRAFT INTEL" },
];

const COMING_SOON_COPY: Record<string, { title: string; body: string }> = {
  "your-picks": {
    title: "Your Picks",
    body: "Personalized strategy for every pick you own. Likely available rookies, trade-up partners with realistic costs from real trades, trade-back scenarios, sell signals — all built around YOUR roster, YOUR league, YOUR picks. Launching this draft season.",
  },
  "draft-board": {
    title: "Draft Board",
    body: "Every pick in your draft, every owner. See likely targets, biggest roster needs, and trade-up signals across the entire draft order. Spot the picks worth approaching and the ones worth avoiding before draft day. Launching this draft season.",
  },
  "intel": {
    title: "Draft Intel",
    body: "Reconnaissance on your league. Owner cards showing roster strengths, position needs, draft-day trade history, and trade flags. League-wide tendencies — does your league reach on RBs? Let QBs slide? — pulled from your actual draft history. Launching this draft season.",
  },
};

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

function buildTendencyParagraphs(t: any): { headline: string | null; body: string[] } {
  if (!t) return { headline: null, body: [] };

  // ── Headline: discipline tier
  let headline: string | null = null;
  const disc = t.adp_discipline;
  if (disc != null) {
    const a = Math.abs(disc);
    if (a <= 10) headline = "This league drafts on script.";
    else if (a <= 22) headline = "This league mostly drafts on script.";
    else headline = "This league drafts off the cuff.";
  }

  const body: string[] = [];

  // ── Paragraph 1: discipline + reach (the "how predictable is this draft" story)
  const p1: string[] = [];
  if (disc != null) {
    const a = Math.abs(disc);
    if (a <= 10) {
      p1.push(`Picks land within ${a.toFixed(1)} spots of consensus ADP on average — anything inside ±10 is disciplined, ±10–22 is normal scatter, beyond ±22 is chaos.`);
    } else if (a <= 22) {
      p1.push(`Picks drift ${a.toFixed(1)} spots from consensus ADP on average — normal scatter (the ±10–22 band). Expect occasional surprises but no chaos.`);
    } else {
      p1.push(`Picks drift ${a.toFixed(1)} spots from consensus ADP on average — well past the ±22 chaos line. Plan for board breaks you can't predict.`);
    }
  }
  const rm = t.reach_magnitude;
  if (rm != null) {
    if (rm <= -5) {
      p1.push(`Drafters reach early — players go ${Math.abs(rm).toFixed(1)} picks ahead of ADP on net. Anything beyond −5 is aggressive, beyond −10 is impatient. Drop your board down a notch when you make your read.`);
    } else if (rm >= 5) {
      p1.push(`Drafters let value fall — players go ${rm.toFixed(1)} picks past ADP on net. Anything beyond +5 means the board sits tight; you'll often catch a slider.`);
    } else {
      p1.push(`Net reach is roughly neutral (${rm > 0 ? "+" : ""}${rm.toFixed(1)} picks vs ADP) — neither aggressive nor patient.`);
    }
  }
  if (p1.length) body.push(p1.join(" "));

  // ── Paragraph 2: positional bias (QB / TE / RB-heavy R1)
  const p2: string[] = [];
  if (t.qb_early != null) {
    if (t.qb_early >= 0.5) p2.push(`QBs go ${t.qb_early.toFixed(1)} rounds earlier than baseline — a clear superflex/QB-aware market.`);
    else if (t.qb_early <= -0.5) p2.push(`QBs slide ${Math.abs(t.qb_early).toFixed(1)} rounds later than baseline — drafters punt the position.`);
  }
  if (t.te_premium != null && t.te_premium >= 0.5) {
    p2.push(`TE premium scoring shows in the data — TEs leave the board ${t.te_premium.toFixed(1)} rounds earlier than baseline.`);
  }
  if (t.rb_heavy_r1 != null) {
    const pct = Math.round(t.rb_heavy_r1 * 100);
    if (t.rb_heavy_r1 >= 0.05) p2.push(`Round 1 skews RB-heavy (+${pct}% vs baseline) — running backs go off the board first.`);
    else if (t.rb_heavy_r1 <= -0.05) p2.push(`Round 1 is RB-light (${pct}% vs baseline) — WRs and QBs dominate the top of the board.`);
  }
  if (p2.length) body.push(p2.join(" "));

  return { headline, body };
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
  const { headline, body } = buildTendencyParagraphs(t);

  return (
    <div style={{ padding: "20px 0" }}>
      {/* League scouting report — narrative */}
      {(headline || body.length > 0) && (
        <div style={{
          background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 100%)`,
          border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: 22, marginBottom: 18,
        }}>
          <div style={{
            fontFamily: SANS, fontSize: 11, fontWeight: 800, color: C.gold,
            letterSpacing: "0.22em", marginBottom: 10,
          }}>LEAGUE SCOUTING REPORT</div>
          {headline && (
            <div style={{
              fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.primary,
              letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: 14,
            }}>{headline}</div>
          )}
          {body.map((para, i) => (
            <div key={i} style={{
              fontFamily: SANS, fontSize: 15, color: C.primary, lineHeight: 1.65,
              marginBottom: i === body.length - 1 ? 0 : 10,
            }}>{para}</div>
          ))}
          {(t?.sample_size != null) && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 14, letterSpacing: "0.04em" }}>
              {t.sample_size} picks · {(t.seasons || []).join("+")}
              {t.format_key && ` · baseline ${t.format_key}`}
              {fallback === "global" && " · global baseline (no league cache yet)"}
            </div>
          )}
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

function buildOwnerNarrative(o: any): string[] {
  const paragraphs: string[] = [];

  // ── Roster paragraph: strengths + needs in prose
  const strengths: string[] = o.roster?.strengths || [];
  const needs: string[] = o.roster?.needs || [];
  const windowClass: string | null = o.roster?.window || null;
  const rosterParts: string[] = [];
  if (windowClass === "CONTENDER") rosterParts.push("Contender window — built to win now.");
  else if (windowClass === "REBUILDER") rosterParts.push("Rebuilding window — collecting picks and youth.");
  else if (windowClass === "RETOOLING") rosterParts.push("Retooling window — straddling now and later.");
  else if (windowClass === "BALANCED") rosterParts.push("Balanced window — no urgency either direction.");
  if (strengths.length && needs.length) {
    rosterParts.push(`Set at ${strengths.join(" / ")}, thin at ${needs.join(" / ")}.`);
  } else if (strengths.length) {
    rosterParts.push(`Set at ${strengths.join(" / ")} with no glaring holes.`);
  } else if (needs.length) {
    rosterParts.push(`Biggest holes: ${needs.join(" / ")}.`);
  }
  if (rosterParts.length) paragraphs.push(rosterParts.join(" "));

  // ── Capital paragraph: picks held + surplus + future picks
  const heldThisDraft: string[] = o.picks?.held_this_draft || [];
  const surplusDelta: number | null = o.picks?.surplus_delta ?? null;
  const futurePicks: { year: number; round: number }[] = o.picks?.future_picks || [];
  const capitalParts: string[] = [];
  if (heldThisDraft.length > 0) {
    capitalParts.push(`Holds ${heldThisDraft.join(", ")} in this rookie draft`);
  } else {
    capitalParts.push("No picks in this rookie draft");
  }
  if (surplusDelta != null) {
    if (surplusDelta >= 1) capitalParts[capitalParts.length - 1] += ` — that's ${surplusDelta > 0 ? "+" : ""}${surplusDelta.toFixed(1)} above league average, real trade-up ammo`;
    else if (surplusDelta <= -1) capitalParts[capitalParts.length - 1] += ` — ${surplusDelta.toFixed(1)} below league average, light on capital`;
    else capitalParts[capitalParts.length - 1] += ` — roughly the league-average pick load`;
  }
  capitalParts[capitalParts.length - 1] += ".";
  if (futurePicks.length > 0) {
    const byRound = new Map<number, Map<number, number>>();
    for (const p of futurePicks) {
      if (!byRound.has(p.round)) byRound.set(p.round, new Map());
      const yrMap = byRound.get(p.round)!;
      yrMap.set(p.year, (yrMap.get(p.year) || 0) + 1);
    }
    const roundStrs = Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]).map(([rd, yrMap]) => {
      const yrs = Array.from(yrMap.entries()).sort((a, b) => a[0] - b[0])
        .map(([yr, cnt]) => `${cnt > 1 ? `${cnt}× ` : ""}${yr}`).join(", ");
      return `R${rd} (${yrs})`;
    });
    capitalParts.push(`Beyond 2026 they own ${roundStrs.join(", ")}.`);
  }
  paragraphs.push(capitalParts.join(" "));

  // ── Behavior paragraph: draft-day trades + direction + positions targeted
  const trader = o.draft_day_trader || {};
  const tradesMade: number = trader.trades_made || 0;
  const tradesUp: number = trader.trades_up || 0;
  const tradesDown: number = trader.trades_down || 0;
  const tradesLateral: number = trader.trades_lateral || 0;
  const seasonsActive: number = trader.seasons_active || 0;
  const seasonsTotal: number = trader.seasons_total || 0;
  const directionTendency: string = o.behavior?.direction_tendency || "INSUFFICIENT_DATA";
  const positionsTargeted: string[] = o.behavior?.positions_targeted || [];

  const behaviorParts: string[] = [];
  if (tradesMade > 0) {
    const breakdown: string[] = [];
    if (tradesUp > 0) breakdown.push(`${tradesUp} up`);
    if (tradesDown > 0) breakdown.push(`${tradesDown} back`);
    if (tradesLateral > 0) breakdown.push(`${tradesLateral} lateral`);
    behaviorParts.push(`Made ${tradesMade} draft-day trade${tradesMade === 1 ? "" : "s"} across ${seasonsActive}/${seasonsTotal} rookie drafts (${breakdown.join(", ")}).`);
  } else if (seasonsTotal > 0) {
    behaviorParts.push(`Has never traded on draft day across ${seasonsTotal} rookie draft${seasonsTotal === 1 ? "" : "s"} — sits and picks.`);
  }
  if (directionTendency === "TYPICALLY_UP") {
    behaviorParts.push("On pick swaps overall, they typically move up.");
  } else if (directionTendency === "TYPICALLY_DOWN") {
    behaviorParts.push("On pick swaps overall, they typically trade back for capital.");
  } else if (directionTendency === "MIXED") {
    behaviorParts.push("Their pick-swap direction is mixed — moves either way depending on the deal.");
  }
  if (positionsTargeted.length > 0) {
    behaviorParts.push(`Historically targets ${positionsTargeted.join(" / ")} in rookie drafts.`);
  }
  if (behaviorParts.length) paragraphs.push(behaviorParts.join(" "));

  return paragraphs;
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

  const paragraphs = buildOwnerNarrative(o);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${flagVerdict === "LIKELY_HOLD" ? C.border : `${flagColor}50`}`,
      borderRadius: 8, padding: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header — owner name + flag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, color: C.primary, lineHeight: 1.2 }}>
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
            {traderTag === "TRADER" && (
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 8px", borderRadius: 3,
                background: `${C.gold}18`, color: C.gold, border: `1px solid ${C.goldBorder}`,
              }}>TRADER</span>
            )}
          </div>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 900, letterSpacing: "0.06em",
          padding: "6px 11px", borderRadius: 3, whiteSpace: "nowrap",
          background: `${flagColor}18`, color: flagColor, border: `1px solid ${flagColor}50`,
        }}>{flagLabel}</span>
      </div>

      {/* Trade flag reasoning — the headline */}
      {flagReason && (
        <div style={{
          fontFamily: SANS, fontSize: 14.5, color: C.primary, lineHeight: 1.6, fontWeight: 600,
          padding: "12px 14px", borderRadius: 6,
          background: `${flagColor}10`, border: `1px solid ${flagColor}30`,
        }}>{flagReason}</div>
      )}

      {/* Narrative paragraphs */}
      {paragraphs.map((para, i) => (
        <div key={i} style={{
          fontFamily: SANS, fontSize: 14, color: C.secondary, lineHeight: 1.6,
        }}>{para}</div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 4 — ROOKIE ADP
// ═════════════════════════════════════════════════════════════════════════
type TalentTier = { tier: 1 | 2 | 3 | 4; label: string; color: string; bgGrad: string };

function talentTier(adp: number | null | undefined): TalentTier {
  if (adp == null) {
    return { tier: 4, label: "T4", color: "#9596a5", bgGrad: "linear-gradient(135deg, rgba(149,150,165,0.18) 0%, rgba(149,150,165,0.04) 100%)" };
  }
  if (adp <= 6) {
    return { tier: 1, label: "T1", color: "#d4a532",
             bgGrad: "linear-gradient(135deg, rgba(212,165,50,0.32) 0%, rgba(212,165,50,0.06) 65%, rgba(0,0,0,0) 100%)" };
  }
  if (adp <= 12) {
    return { tier: 2, label: "T2", color: "#7dd3a0",
             bgGrad: "linear-gradient(135deg, rgba(125,211,160,0.26) 0%, rgba(125,211,160,0.05) 65%, rgba(0,0,0,0) 100%)" };
  }
  if (adp <= 24) {
    return { tier: 3, label: "T3", color: "#6bb8e0",
             bgGrad: "linear-gradient(135deg, rgba(107,184,224,0.22) 0%, rgba(107,184,224,0.04) 65%, rgba(0,0,0,0) 100%)" };
  }
  return { tier: 4, label: "T4", color: "#9596a5",
           bgGrad: "linear-gradient(135deg, rgba(149,150,165,0.16) 0%, rgba(149,150,165,0.03) 65%, rgba(0,0,0,0) 100%)" };
}

function Rookies({ lid }: { lid: string }) {
  const enabled = !!lid;
  const [posFilter, setPosFilter] = useState<"ALL" | "QB" | "RB" | "WR" | "TE">("ALL");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const adpQ = useQuery({
    queryKey: ["draft-hq-rookie-adp", lid],
    queryFn: () => getDraftHQRookieADP(lid, 100),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league context." />;
  if (adpQ.isLoading) return <EmptyMsg msg="Loading rookie ADP…" />;
  if (adpQ.error) return <EmptyMsg msg={`Error: ${(adpQ.error as Error).message}`} />;

  const rookies: any[] = adpQ.data?.rookies || [];
  const filtered = posFilter === "ALL"
    ? rookies
    : rookies.filter(r => (r.position || "").toUpperCase() === posFilter);

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Title block — over the top */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: SANS, fontSize: 11, fontWeight: 800, color: C.gold,
          letterSpacing: "0.22em", marginBottom: 4,
        }}>2026 ROOKIE DRAFT</div>
        <div style={{
          fontFamily: SANS, fontSize: 36, fontWeight: 900, color: C.primary,
          letterSpacing: "-0.01em", lineHeight: 1, marginBottom: 8,
          background: `linear-gradient(180deg, ${C.primary} 0%, ${C.gold} 200%)`,
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Rookie ADP</div>
        <div style={{
          fontFamily: SANS, fontSize: 14, color: C.secondary, lineHeight: 1.55,
          maxWidth: 720,
        }}>
          Built from <span style={{ color: C.gold, fontWeight: 700 }}>10,000+ real 2026 rookie drafts</span> across the Sleeper network.
          Format-aware to your league&rsquo;s scoring, QB count, and TE premium.
          Refreshed daily.
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em", marginTop: 8 }}>
          {rookies.length} rookies · tiers earned by board position
        </div>
      </div>

      {/* Position filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {(["ALL", "QB", "RB", "WR", "TE"] as const).map(p => {
          const active = posFilter === p;
          const c = p === "ALL" ? C.gold : (POS_COLOR[p as Pos] || C.dim);
          return (
            <button key={p} onClick={() => setPosFilter(p)} style={{
              fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em",
              padding: "8px 18px", borderRadius: 4, cursor: "pointer",
              background: active ? `${c}25` : "transparent",
              color: active ? c : C.dim,
              border: `1px solid ${active ? c : C.border}`,
              boxShadow: active ? `0 0 18px ${c}30` : "none",
              transition: "all 0.15s ease",
            }}>{p}</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyMsg msg="No rookies match this filter." />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 14,
        }}>
          {filtered.map((r, idx) => {
            const adp = r.avg_pick ?? r.p50_pick;
            const tier = talentTier(adp);
            const fmtPick = (n: number | null | undefined) =>
              n == null ? "—" : (Number.isInteger(n) ? String(n) : n.toFixed(1));
            const posCol = POS_COLOR[(r.position || "") as Pos] || C.dim;
            const isHover = hoverIdx === idx;
            return (
              <div
                key={`${r.player_name}-${idx}`}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{
                  position: "relative",
                  background: `${tier.bgGrad}, ${C.card}`,
                  border: `1px solid ${isHover ? `${tier.color}80` : `${tier.color}30`}`,
                  borderRadius: 10, padding: 16,
                  display: "flex", flexDirection: "column", gap: 14,
                  overflow: "hidden",
                  transform: isHover ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: isHover
                    ? `0 8px 24px ${tier.color}25, 0 0 0 1px ${tier.color}40`
                    : `0 2px 6px rgba(0,0,0,0.20)`,
                  transition: "all 0.18s ease",
                }}
              >
                {/* Tier accent stripe */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 4,
                  background: `linear-gradient(90deg, ${tier.color} 0%, ${tier.color}40 100%)`,
                }} />

                {/* Header row: headshot, name, tier box */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PlayerHeadshot name={r.player_name} position={r.position || "PICK"} size={56} sleeperId={r.sleeper_id} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: SANS, fontSize: 17, fontWeight: 800, color: C.primary,
                      lineHeight: 1.15,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{r.player_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <span style={{
                        fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                        padding: "3px 8px", borderRadius: 3,
                        background: `${posCol}20`, color: posCol, border: `1px solid ${posCol}50`,
                      }}>{r.position || "—"}</span>
                    </div>
                  </div>
                  {/* Tier color-coded box */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 6,
                    background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}c0 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column",
                    boxShadow: `0 4px 12px ${tier.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 16, fontWeight: 900, color: "#0a0b14",
                      letterSpacing: "0.02em", lineHeight: 1,
                    }}>{tier.label}</span>
                  </div>
                </div>

                {/* Massive ADP */}
                <div style={{
                  display: "flex", alignItems: "baseline", justifyContent: "center",
                  gap: 8, padding: "4px 0",
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim,
                    letterSpacing: "0.18em",
                  }}>ADP</span>
                  <span style={{
                    fontFamily: MONO, fontSize: 38, fontWeight: 900, color: C.gold,
                    lineHeight: 1, letterSpacing: "-0.02em",
                    textShadow: `0 0 24px ${C.gold}40`,
                  }}>
                    {adp != null ? Number(adp).toFixed(1) : "—"}
                  </span>
                </div>

                {/* Earliest / Latest / R1 odds row */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                  paddingTop: 12, borderTop: `1px solid ${tier.color}25`,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.10em", marginBottom: 3 }}>
                      EARLIEST
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.primary }}>
                      {fmtPick(r.p10_pick)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.10em", marginBottom: 3 }}>
                      R1 ODDS
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800,
                      color: r.pct_round_1 != null && r.pct_round_1 >= 0.7 ? C.green
                           : r.pct_round_1 != null && r.pct_round_1 >= 0.4 ? C.gold
                           : C.primary,
                    }}>
                      {r.pct_round_1 != null ? `${(r.pct_round_1 * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.10em", marginBottom: 3 }}>
                      LATEST
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.primary }}>
                      {fmtPick(r.p90_pick)}
                    </div>
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
// COMING SOON — locked tab panel (soft launch)
// ═════════════════════════════════════════════════════════════════════════
function ComingSoon({ tabId }: { tabId: string }) {
  const copy = COMING_SOON_COPY[tabId];
  if (!copy) return null;
  return (
    <div style={{ padding: "32px 0 60px" }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 70%)`,
        border: `1px solid ${C.goldBorder}`, borderRadius: 14,
        padding: "44px 36px",
      }}>
        {/* Top accent stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          backgroundSize: "200% 100%",
          animation: "rk-shimmer 3.6s linear infinite",
        }} />
        {/* Soft glow blob */}
        <div style={{
          position: "absolute", top: -120, right: -120, width: 320, height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.gold}18 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: 680 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 11px", borderRadius: 999,
            background: `${C.gold}15`, border: `1px solid ${C.goldBorder}`,
            marginBottom: 18,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: C.gold,
              boxShadow: `0 0 8px ${C.gold}`,
            }} />
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold,
              letterSpacing: "0.16em",
            }}>IN FLIGHT</span>
          </div>
          <div style={{
            fontFamily: SANS, fontSize: 36, fontWeight: 900, color: C.primary,
            letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: 16,
            background: `linear-gradient(180deg, ${C.primary} 0%, ${C.gold} 220%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>{copy.title}</div>
          <div style={{
            fontFamily: SANS, fontSize: 16, color: C.secondary, lineHeight: 1.7,
          }}>{copy.body}</div>
        </div>
      </div>
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
  const tab = searchParams.get("tab") || "rookies";
  const { currentLeagueId } = useLeagueStore();

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "rookies") next.delete("tab"); else next.set("tab", id);
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
        {tab === "rookies"     && <Rookies    lid={currentLeagueId || ""} />}
        {tab === "your-picks"  && <ComingSoon tabId="your-picks" />}
        {tab === "draft-board" && <ComingSoon tabId="draft-board" />}
        {tab === "intel"       && <ComingSoon tabId="intel" />}
      </div>
    </div>
  );
}
