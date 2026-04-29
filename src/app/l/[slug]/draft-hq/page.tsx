"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getDraftHQYourPicks,
  getDraftHQTendencies,
  getDraftHQOwnerStrategicIntel,
} from "@/lib/api";
import { C, SANS, MONO } from "@/components/league/tokens";
import { MOCK_ROOKIES } from "./mocks";
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
      fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 7px", borderRadius: 3,
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
// TAB 2 — DRAFT BOARD  (mock — needs ADP)
// ═════════════════════════════════════════════════════════════════════════
function DraftBoard() {
  const [posFilter, setPosFilter] = useState<Pos | "ALL">("ALL");
  const filtered = useMemo(
    () => posFilter === "ALL" ? MOCK_ROOKIES : MOCK_ROOKIES.filter((r) => r.position === posFilter),
    [posFilter],
  );

  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner msg="MOCK ROOKIES — ADP unlocks after 2026 rookie crawl completes." />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["ALL", "QB", "RB", "WR", "TE"] as const).map((p) => {
          const act = posFilter === p;
          const c = p === "ALL" ? C.gold : POS_COLOR[p as Pos];
          return (
            <button key={p} onClick={() => setPosFilter(p)} style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
              padding: "6px 14px", borderRadius: 4, cursor: "pointer", border: "none",
              background: act ? `${c}20` : "transparent",
              color: act ? c : C.dim,
              outline: act ? `1px solid ${c}40` : `1px solid ${C.border}`,
            }}>{p}</button>
          );
        })}
      </div>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr 60px 110px 80px 90px",
          padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
          fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.08em", fontWeight: 800,
        }}>
          <div>RANK</div>
          <div>PLAYER</div>
          <div>POS</div>
          <div>ADP</div>
          <div>TIER</div>
          <div style={{ textAlign: "right" }}>% DRAFTED</div>
        </div>
        {filtered.map((r) => (
          <div key={r.rank} style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 60px 110px 80px 90px",
            padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
            alignItems: "center",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold }}>
              #{r.rank}
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>
                {r.name}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>
                {r.team} · {r.age}yo
              </div>
            </div>
            <div><PosBadge pos={r.position} /></div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.primary }}>
              {r.adp_avg == null ? "—" : (
                <>
                  {r.adp_avg.toFixed(1)}
                  <span style={{ color: C.dim, fontSize: 10 }}>
                    {" "}({r.adp_p10?.toFixed(0)}–{r.adp_p90?.toFixed(0)})
                  </span>
                </>
              )}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.primary }}>T{r.tier}</div>
            <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 12, color: C.dim }}>
              {r.pct_drafted == null ? "—" : `${(r.pct_drafted * 100).toFixed(0)}%`}
            </div>
          </div>
        ))}
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
            fontFamily: SANS, fontSize: 10, fontWeight: 800, color: C.gold,
            letterSpacing: "0.16em", marginBottom: 6,
          }}>LEAGUE SCOUTING REPORT</div>
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.primary, lineHeight: 1.55 }}>
            {heroText}
          </div>
          {(t?.sample_size != null) && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 8, letterSpacing: "0.04em" }}>
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
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: C.primary, marginBottom: 10 }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: C.primary }}>
          STRATEGIC INTEL — BY OWNER
        </div>
        <div style={{ display: "flex", gap: 8, fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.04em", flexWrap: "wrap" }}>
          <Chip text="TRADE-UP TARGET" color={FLAG_COLOR.TRADE_UP_TARGET} />
          <Chip text="TRADE-BACK PARTNER" color={FLAG_COLOR.TRADE_BACK_CANDIDATE} />
          <Chip text="LIKELY HOLD" color={FLAG_COLOR.LIKELY_HOLD} />
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12,
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
  const seasonsActive: number = trader.seasons_active || 0;
  const seasonsTotal: number = trader.seasons_total || 0;

  const strengths: string[] = o.roster?.strengths || [];
  const needs: string[] = o.roster?.needs || [];

  const heldThisDraft: string[] = o.picks?.held_this_draft || [];
  const surplusDelta: number | null = o.picks?.surplus_delta ?? null;
  const futurePicks: { year: number; round: number }[] = o.picks?.future_picks || [];
  const futurePicksCount = futurePicks.length;

  const directionTendency: string = o.behavior?.direction_tendency || "INSUFFICIENT_DATA";
  const positionsTargeted: string[] = o.behavior?.positions_targeted || [];

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${flagVerdict === "LIKELY_HOLD" ? C.border : `${flagColor}50`}`,
      borderRadius: 8, padding: 14,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Header — owner name + flag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary, lineHeight: 1.2 }}>
            {o.owner}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {identity && (
              <span title={identityTip || identity} style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                padding: "2px 6px", borderRadius: 3, cursor: "help",
                background: `${identityColor}18`, color: identityColor, border: `1px solid ${identityColor}30`,
              }}>{identity}</span>
            )}
            {windowClass && (
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                padding: "2px 6px", borderRadius: 3,
                background: `${windowColor}18`, color: windowColor, border: `1px solid ${windowColor}30`,
              }}>{windowClass}</span>
            )}
            <span title={`${tradesMade} draft-day trades over ${seasonsActive}/${seasonsTotal} drafts`} style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
              padding: "2px 6px", borderRadius: 3, cursor: "help",
              background: traderTag === "TRADER" ? `${C.gold}18` : `${C.dim}15`,
              color: traderTag === "TRADER" ? C.gold : C.dim,
              border: `1px solid ${traderTag === "TRADER" ? C.goldBorder : C.border}`,
            }}>{traderTag}</span>
          </div>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 900, letterSpacing: "0.06em",
          padding: "4px 8px", borderRadius: 3, whiteSpace: "nowrap",
          background: `${flagColor}18`, color: flagColor, border: `1px solid ${flagColor}50`,
        }}>{flagLabel}</span>
      </div>

      {/* Trade flag reasoning */}
      {flagReason && (
        <div style={{
          fontFamily: SANS, fontSize: 12, color: C.primary, lineHeight: 1.5,
          padding: "8px 10px", borderRadius: 6,
          background: `${flagColor}08`, border: `1px solid ${flagColor}25`,
        }}>{flagReason}</div>
      )}

      {/* Roster strengths/needs */}
      {(strengths.length > 0 || needs.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {strengths.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", width: 56, flexShrink: 0 }}>SET AT</div>
              {strengths.map(s => <Chip key={s} text={s} color={C.green} />)}
            </div>
          )}
          {needs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", width: 56, flexShrink: 0 }}>NEEDS</div>
              {needs.map(n => <Chip key={n} text={n} color={C.red} />)}
            </div>
          )}
        </div>
      )}

      {/* Picks held + surplus + future */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 3 }}>
            HOLDS THIS DRAFT
          </div>
          {heldThisDraft.length > 0 ? (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {heldThisDraft.map((s, i) => (
                <span key={i} style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary,
                  padding: "1px 6px", borderRadius: 3, background: C.elevated, border: `1px solid ${C.border}`,
                }}>{s}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>
          )}
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 3 }}>
            VS LEAGUE AVG
          </div>
          {surplusDelta != null ? (
            <div style={{
              fontFamily: MONO, fontSize: 13, fontWeight: 800,
              color: surplusDelta >= 1 ? C.green : surplusDelta <= -1 ? C.red : C.dim,
            }}>
              {surplusDelta > 0 ? "+" : ""}{surplusDelta.toFixed(1)} picks
            </div>
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>
          )}
        </div>
      </div>

      {/* Behavior + future capital */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        paddingTop: 8, borderTop: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 3 }}>
            DIRECTION
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.primary }}>
            {DIRECTION_LABEL[directionTendency] || directionTendency}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>
            {tradesMade} draft-day trade{tradesMade === 1 ? "" : "s"}
            {seasonsTotal > 0 && ` · ${seasonsActive}/${seasonsTotal} drafts`}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 3 }}>
            FUTURE PICKS
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.primary }}>
            {futurePicksCount} held
          </div>
          {positionsTargeted.length > 0 && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>
              targets {positionsTargeted.join("/")}
            </div>
          )}
        </div>
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
        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.dim }}>—</div>
        {sub && <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>{sub}</div>}
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
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color }}>{display}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>{sub}</div>}
      {meaning && (
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, marginTop: 4, lineHeight: 1.4 }}>
          {meaning}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 4 — ROOKIES (mock — needs profile data)
// ═════════════════════════════════════════════════════════════════════════
function Rookies() {
  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner msg="MOCK ROOKIES — profile ingest pending." />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 10,
      }}>
        {MOCK_ROOKIES.map((r) => (
          <div key={r.rank} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.primary, lineHeight: 1.2 }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 3 }}>
                  {r.team} · {r.age}yo
                </div>
              </div>
              <PosBadge pos={r.position} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>RANK</div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold }}>#{r.rank}</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>TIER</div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.primary }}>T{r.tier}</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>ADP</div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.primary }}>
                  {r.adp_avg == null ? "—" : r.adp_avg.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ))}
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
        {tab === "draft-board" && <DraftBoard />}
        {tab === "intel"       && <DraftIntel lid={currentLeagueId || ""} />}
        {tab === "rookies"     && <Rookies    />}
      </div>
    </div>
  );
}
