"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTrack } from "@/hooks/useTrack";
import {
  getDraftHQYourPicks,
  getDraftHQYourPicksRecs,
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

function GlowTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string; onChange: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}`,
      overflowX: "auto", scrollbarWidth: "none",
    }}>
      {tabs.map((t) => {
        const act = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{
            padding: isMobile ? "8px 12px" : "10px 22px",
            fontFamily: SANS, fontSize: isMobile ? 11 : 13, fontWeight: 800, letterSpacing: "0.08em",
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
  pct_round: number | null;
  expected_round: number | null;
  pct_by_round: Record<string, number> | null;
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

// ── YourPicks helpers ──────────────────────────────────────────────────────
function hitRateColorYP(pct: number | null | undefined): string {
  if (pct == null) return C.dim;
  if (pct >= 50) return C.green;
  if (pct >= 30) return C.gold;
  return C.red;
}

function availColorYP(pct: number | null | undefined): string {
  if (pct == null) return C.dim;
  if (pct >= 60) return C.green;
  if (pct >= 30) return C.gold;
  return C.red;
}

function gradePillStyleYP(grade: string | null | undefined): { bg: string; color: string; border: string } {
  const g = (grade || "AVERAGE").toUpperCase();
  if (g === "ELITE")    return { bg: `${C.green}22`, color: C.green, border: `${C.green}60` };
  if (g === "STRONG")   return { bg: `${C.green}14`, color: "#a8e0bf", border: `${C.green}40` };
  if (g === "WEAK")     return { bg: `${C.orange}1a`, color: C.orange, border: `${C.orange}40` };
  if (g === "CRITICAL") return { bg: `${C.red}1f`, color: C.red, border: `${C.red}60` };
  return { bg: "rgba(149,150,165,0.10)", color: C.secondary, border: "rgba(149,150,165,0.32)" };
}

function verdictPillStyleYP(tag: string | null | undefined): { bg: string; color: string; border: string } {
  const t = (tag || "").toUpperCase();
  if (t === "HOLD FIRM")          return { bg: `${C.green}14`, color: C.green, border: `${C.green}40` };
  if (t === "LISTEN, DON'T SHOP") return { bg: `${C.gold}14`, color: C.gold, border: `${C.gold}40` };
  if (t === "PACKAGE FORWARD")    return { bg: `${C.blue}14`, color: C.blue, border: `${C.blue}40` };
  if (t === "ACTIVELY SHOP")      return { bg: `${C.orange}14`, color: C.orange, border: `${C.orange}40` };
  return { bg: "rgba(149,150,165,0.12)", color: C.secondary, border: "rgba(149,150,165,0.32)" };
}

function recChipStyleYP(label: string): { bg: string; color: string; border: string } {
  if (label === "TARGET")        return { bg: `${C.gold}22`, color: C.goldBright, border: `${C.gold}66` };
  if (label === "REALISTIC")     return { bg: `${C.blue}14`, color: C.blue, border: `${C.blue}40` };
  if (label === "OPPORTUNISTIC") return { bg: `${C.orange}14`, color: C.orange, border: `${C.orange}40` };
  return { bg: "rgba(149,150,165,0.12)", color: C.secondary, border: "rgba(149,150,165,0.32)" };
}

function recBandColorYP(band: string | null | undefined): string {
  if (!band) return C.dim;
  const b = band.toUpperCase();
  if (b === "STEAL") return C.green;
  if (b === "REACH") return C.red;
  return C.dim;
}

function YourPicks({ lid, owner, ownerId }: { lid: string; owner: string | null; ownerId: string | null }) {
  const isMobile = useIsMobile();
  const enabled = !!lid && !!owner;
  const picksQ = useQuery({
    queryKey: ["draft-hq-your-picks", lid, owner, ownerId],
    queryFn: () => getDraftHQYourPicks(lid, owner!, ownerId, 3),
    staleTime: 300_000,
    enabled,
  });
  const recsQ = useQuery({
    queryKey: ["draft-hq-your-picks-recs", lid, owner, ownerId],
    queryFn: () => getDraftHQYourPicksRecs(lid, owner!, ownerId),
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

  const FEEDBACK_BANNER_KEY = "your_picks_feedback_banner_dismissed_v1";
  const [bannerDismissed, setBannerDismissed] = useState(true);
  useEffect(() => {
    try {
      setBannerDismissed(localStorage.getItem(FEEDBACK_BANNER_KEY) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, []);
  const dismissBanner = () => {
    try { localStorage.setItem(FEEDBACK_BANNER_KEY, "1"); } catch {}
    setBannerDismissed(true);
  };
  const openFeedback = () => {
    try { window.dispatchEvent(new CustomEvent("open-feedback")); } catch {}
  };

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

  if (!enabled) return <EmptyMsg msg="No league/owner context — open this from your league dashboard." />;
  if (picksQ.isLoading || recsQ.isLoading) return <EmptyMsg msg="Loading your picks…" />;
  if (picksQ.error) return <EmptyMsg msg={`Error: ${(picksQ.error as Error).message}`} />;

  const picksRaw: any[] = picksQ.data?.picks || [];
  const recsByKey = new Map<string, any>();
  for (const rp of (recsQ.data?.picks || [])) {
    const k = `${rp.round}.${rp.slot ?? "x"}`;
    recsByKey.set(k, rp);
  }
  const ownerCtx = recsQ.data?.owner_context || null;
  const ownerWindow: string | null = ownerCtx?.window || null;
  const heroText = buildYourPicksHero({
    picks: picksRaw,
    selfIntel,
    tendencies: tendQ.data?.tendencies || null,
  });

  if (!picksRaw.length) return <EmptyMsg msg="No upcoming picks found for this league." />;

  return (
    <div style={{ padding: isMobile ? "14px 0" : "20px 0", fontFamily: SANS, display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>
      <style>{`
        @keyframes ypFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .yp-card { animation: ypFadeIn 280ms ease-out both; }
        .yp-row:hover { background-color: ${C.elevated}; }
        .yp-likely-scroll::-webkit-scrollbar { width: 6px; }
        .yp-likely-scroll::-webkit-scrollbar-track { background: transparent; }
        .yp-likely-scroll::-webkit-scrollbar-thumb { background: ${C.borderLt}; border-radius: 3px; }
      `}</style>

      {!bannerDismissed && (
        <div style={{
          position: "relative",
          background: C.goldDim,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 10,
          padding: isMobile ? "14px 16px" : "18px 20px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 10 : 16,
        }}>
          <div style={{ flex: 1, paddingRight: isMobile ? 24 : 32 }}>
            <div style={{
              fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary,
              marginBottom: 4,
            }}>Help shape this feature</div>
            <div style={{
              fontFamily: SANS, fontSize: isMobile ? 12 : 13, color: C.secondary,
              lineHeight: 1.5,
            }}>
              This was built and tested with one league&apos;s data — it&apos;s not perfect yet. If something doesn&apos;t make sense, looks off, or is straight-up broken, hit the feedback button. This is a work in progress and your input directly improves it.
            </div>
          </div>
          <button
            onClick={openFeedback}
            style={{
              flexShrink: 0,
              fontFamily: SANS, fontSize: 12, fontWeight: 600,
              color: C.primary,
              background: C.elevated,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 6,
              padding: "8px 14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >Send feedback</button>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss"
            style={{
              position: "absolute",
              top: 6, right: 8,
              background: "transparent",
              border: "none",
              color: C.dim,
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
            }}
          >×</button>
        </div>
      )}

      {/* Title block — same gradient treatment as Rookie ADP */}
      <div style={{ marginBottom: isMobile ? 4 : 6 }}>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 10 : 11, fontWeight: 800, color: C.gold,
          letterSpacing: "0.22em", marginBottom: 4,
        }}>YOUR DRAFT STRATEGY</div>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 26 : 36, fontWeight: 900, color: C.primary,
          letterSpacing: "-0.01em", lineHeight: 1, marginBottom: isMobile ? 8 : 10,
          background: `linear-gradient(180deg, ${C.primary} 0%, ${C.gold} 200%)`,
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Your Picks</div>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 12.5 : 14, color: C.secondary, lineHeight: 1.55,
          maxWidth: 760,
        }}>{heroText}</div>
        {ownerWindow && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: isMobile ? 8 : 10,
            padding: isMobile ? "4px 9px" : "5px 11px",
            borderRadius: 4,
            background: `${C.gold}10`, border: `1px solid ${C.gold}30`,
            fontFamily: MONO, fontSize: isMobile ? 9.5 : 10.5,
            fontWeight: 800, letterSpacing: "0.10em", color: C.gold,
          }}>WINDOW · {ownerWindow}</div>
        )}
      </div>

      {/* Roster grades pill row */}
      {ownerCtx?.grades && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: isMobile ? "12px 14px" : "14px 18px",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
            color: C.dim, marginBottom: 10,
          }}>YOUR ROSTER GRADES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
              const g = ((ownerCtx.grades as Record<string, string>)[pos]) || "AVERAGE";
              const posC = POS_COLOR[pos];
              const gp = gradePillStyleYP(g);
              return (
                <span key={pos} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "5px 10px", borderRadius: 4,
                  background: gp.bg, border: `1px solid ${gp.border}`,
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                    padding: "2px 6px", borderRadius: 3,
                    background: `${posC}20`, color: posC, border: `1px solid ${posC}50`,
                  }}>{pos}</span>
                  <span style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.10em",
                    color: gp.color,
                  }}>{g}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Picks */}
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>
        {picksRaw.map((p: any, i: number) => {
          const k = `${p.round}.${p.slot ?? "x"}`;
          const recPick = recsByKey.get(k) || null;
          const slotLabel = p.slot_key || `${p.round}.${p.slot ? String(p.slot).padStart(2, "0") : "??"}`;
          const pickNum = recPick?.pick_num ?? null;
          const yourHr: number | null = recPick?.your_round_hit_rate ?? p.your_round_hit_rate ?? null;
          const yourHrSample: number = recPick?.your_round_sample ?? p.your_round_hit_sample ?? 0;
          const leagueAvgHr: number | null = recPick?.league_avg_round_hit_rate ?? p.round_avg_hit ?? null;
          const slotHr: number | null = recPick?.slot_hit_rate ?? p.slot_hit_rate ?? p.hit_rate ?? null;
          const slotN: number = recPick?.slot_total ?? p.slot_total ?? 0;
          const posMix = recPick?.pos_mix_top3
            || Object.entries(p.position_breakdown || {})
                .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
                .slice(0, 3).map(([position, pct]: any) => ({ position, pct }));
          const likely: any[] = recPick?.likely_available || [];
          const recs: any[] = recPick?.recommendations || [];
          const tradeAngle = recPick?.trade_angle || null;
          const verdictTag = tradeAngle?.tag || p.recommendation || null;
          const vpill = verdictPillStyleYP(verdictTag);
          const roundLabelClean = recPick?.round_label?.toUpperCase().replace(/\s/g, "") || `R${p.round}`;

          return (
            <div
              key={i}
              className="yp-card"
              style={{
                position: "relative",
                background: `linear-gradient(180deg, ${C.card} 0%, ${C.panel} 100%)`,
                border: `1px solid ${C.border}`,
                borderRadius: isMobile ? 10 : 12,
                padding: isMobile ? 14 : 20,
                animationDelay: `${i * 30}ms`,
                boxShadow: `0 2px 8px rgba(0,0,0,0.25)`,
                overflow: "hidden",
              }}
            >
              {/* Gold accent stripe at top */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${C.gold} 0%, ${C.gold}40 100%)`,
              }} />

              {/* Pick header strip — pick num + meta + 3 inline stat tiles + verdict pill, ONE row */}
              <div style={{
                display: "flex", flexWrap: "wrap", alignItems: "center",
                gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 18,
              }}>
                {/* Pick number + meta (the headline) */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: isMobile ? 22 : 32, fontWeight: 900,
                    color: C.gold, lineHeight: 1, letterSpacing: "-0.02em",
                    textShadow: `0 0 20px ${C.gold}40`,
                  }}>Pick {slotLabel}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
                      color: C.dim,
                    }}>R{p.round}{p.slot ? ` · ${slotLabel}` : ""} · {p.season}</span>
                    {!p.is_own_pick && p.original_owner && (
                      <span style={{ fontFamily: SANS, fontSize: 10.5, color: C.dim, letterSpacing: "0.02em" }}>
                        from {p.original_owner}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 inline stat tiles — context, not headline; height 50 max */}
                <div style={{
                  display: "flex", flex: "1 1 auto", gap: 8, minWidth: 0,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                }}>
                  {/* YOUR HIT RATE */}
                  <div style={{
                    flex: "1 1 0", minWidth: isMobile ? 140 : 0,
                    background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "6px 10px", height: 50,
                    display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                  }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                      color: C.dim,
                    }}>YOUR {roundLabelClean} HIT</div>
                    {yourHr != null && yourHrSample > 0 ? (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                        <span style={{
                          fontFamily: MONO, fontSize: 16, fontWeight: 800,
                          color: hitRateColorYP(yourHr), lineHeight: 1,
                        }}>{Math.round(yourHr)}%</span>
                        {leagueAvgHr != null && (
                          <span style={{
                            fontFamily: MONO, fontSize: 11, color: C.secondary,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>league avg {leagueAvgHr}%</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.dim, lineHeight: 1 }}>—</span>
                    )}
                  </div>

                  {/* SLOT HIT RATE */}
                  <div style={{
                    flex: "1 1 0", minWidth: isMobile ? 140 : 0,
                    background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "6px 10px", height: 50,
                    display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                  }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                      color: C.dim,
                    }}>SLOT {slotLabel} HIT</div>
                    {slotHr != null && slotN > 0 ? (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                        <span style={{
                          fontFamily: MONO, fontSize: 16, fontWeight: 800,
                          color: hitRateColorYP(slotHr), lineHeight: 1,
                        }}>{Math.round(slotHr)}%</span>
                        <span style={{
                          fontFamily: MONO, fontSize: 11, color: C.secondary,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>league-wide</span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.dim, lineHeight: 1 }}>—</span>
                    )}
                  </div>

                  {/* POS MIX — condensed pills */}
                  <div style={{
                    flex: "1 1 0", minWidth: isMobile ? 140 : 0,
                    background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "6px 10px", height: 50,
                    display: "flex", flexDirection: "column", justifyContent: "center", gap: 3,
                  }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                      color: C.dim,
                    }}>POS MIX</div>
                    {posMix && posMix.length > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", minWidth: 0 }}>
                        {posMix.slice(0, 3).map((m: any) => {
                          const c = POS_COLOR[m.position as Pos] || C.dim;
                          return (
                            <span key={m.position} style={{
                              display: "inline-flex", alignItems: "center", gap: 3,
                            }}>
                              <span style={{
                                padding: "1px 4px", borderRadius: 2,
                                background: `${c}20`, color: c, border: `1px solid ${c}40`,
                                fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                              }}>{m.position}</span>
                              <span style={{
                                fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.secondary,
                              }}>{m.pct}%</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim }}>no slot data</span>
                    )}
                  </div>
                </div>

                {/* Verdict pill — far right of the same row */}
                {verdictTag && (
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
                    padding: "5px 10px", borderRadius: 4,
                    background: vpill.bg, color: vpill.color, border: `1px solid ${vpill.border}`,
                    flexShrink: 0, whiteSpace: "nowrap",
                  }}>{verdictTag}</span>
                )}
              </div>

              {/* LIKELY AVAILABLE + RECOMMENDATIONS — TWO-COLUMN GRID */}
              <div style={{
                paddingTop: isMobile ? 14 : 18,
                borderTop: `1px solid ${C.border}`,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: isMobile ? 16 : 20,
              }}>
                {/* LIKELY AVAILABLE */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "baseline", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 8, marginBottom: 10,
                  }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.18em",
                      color: C.dim,
                    }}>LIKELY AVAILABLE</div>
                    {pickNum != null && (
                      <div style={{
                        fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em",
                      }}>at #{pickNum}</div>
                    )}
                  </div>
                  {likely.length > 0 ? (
                    <div className="yp-likely-scroll" style={{
                      maxHeight: 320, overflowY: "auto", paddingRight: 4,
                      display: "flex", flexDirection: "column",
                    }}>
                      {likely.map((r: any, idx: number) => {
                        const isLast = idx === likely.length - 1;
                        const posCol = POS_COLOR[(r.position || "") as Pos] || C.dim;
                        const ac = availColorYP(r.availability_pct);
                        return (
                          <div
                            key={`${r.name}-${idx}`}
                            className="yp-row"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto minmax(0, 1fr) auto",
                              gap: 10, alignItems: "center",
                              padding: "8px 6px",
                              borderBottom: isLast ? "none" : `1px solid ${C.border}80`,
                              borderRadius: 4, transition: "background 0.15s ease",
                            }}
                          >
                            <PlayerHeadshot name={r.name} position={r.position || "PICK"} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontFamily: SANS, fontSize: 13.5, fontWeight: 700,
                                color: C.primary, lineHeight: 1.2,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>{r.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                <span style={{
                                  fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                                  padding: "1px 5px", borderRadius: 3,
                                  background: `${posCol}20`, color: posCol, border: `1px solid ${posCol}40`,
                                }}>{r.position || "—"}</span>
                                <span style={{
                                  fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.02em",
                                }}>
                                  ADP {r.avg_pick != null ? Number(r.avg_pick).toFixed(1) : "—"}
                                  {r.p10_pick != null && r.p90_pick != null && (
                                    <> · {Math.round(r.p10_pick)}–{Math.round(r.p90_pick)}</>
                                  )}
                                  {r.age != null && <> · age {r.age}</>}
                                </span>
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{
                                fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.10em",
                              }}>AVAIL</div>
                              <div style={{
                                fontFamily: MONO, fontSize: 14, fontWeight: 800, color: ac, lineHeight: 1,
                              }}>{r.availability_pct == null ? "—" : `${r.availability_pct}%`}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim }}>
                      No ADP coverage for this slot.
                    </div>
                  )}
                </div>

                {/* RECOMMENDATIONS — ALWAYS 3 CARDS */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: MONO, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.18em",
                    color: C.dim, marginBottom: 10,
                  }}>RECOMMENDATIONS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(() => {
                      const slots: Array<"TARGET" | "REALISTIC" | "OPPORTUNISTIC"> = ["TARGET", "REALISTIC", "OPPORTUNISTIC"];
                      const byLabel = new Map<string, any>();
                      for (const r of recs) byLabel.set(r.label, r);
                      const emptyDefault: Record<string, string> = {
                        TARGET: "No high-availability target at this slot — see Realistic.",
                        REALISTIC: "No fallback option in this window.",
                        OPPORTUNISTIC: "No opportunistic upside in this window.",
                      };
                      return slots.map((label) => {
                        const rec = byLabel.get(label);
                        const chip = recChipStyleYP(label);
                        const isTarget = label === "TARGET";
                        const cardBg = isTarget
                          ? `linear-gradient(180deg, ${C.gold}10 0%, ${C.panel} 100%)`
                          : C.panel;
                        const cardBorder = isTarget ? `${C.gold}66` : C.border;
                        const cardBorderWidth = isTarget ? 2 : 1;

                        if (!rec || rec.empty) {
                          const msg = rec?.empty_message || emptyDefault[label];
                          return (
                            <div key={label} style={{
                              borderRadius: 8,
                              border: `${isTarget ? 2 : 1}px solid ${isTarget ? `${C.gold}38` : C.border}`,
                              background: isTarget ? `${C.gold}05` : C.panel,
                              padding: "12px 14px",
                              opacity: 0.78,
                            }}>
                              <div style={{ marginBottom: 8 }}>
                                <span style={{
                                  fontFamily: MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em",
                                  padding: "3px 7px", borderRadius: 3,
                                  background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
                                  opacity: 0.7,
                                }}>{label}</span>
                              </div>
                              <div style={{
                                fontFamily: SANS, fontSize: 12, color: C.dim,
                                lineHeight: 1.55,
                              }}>{msg}</div>
                            </div>
                          );
                        }

                        const players: any[] = Array.isArray(rec.players) && rec.players.length > 0
                          ? rec.players
                          : [];

                        // Multi-player OPPORTUNISTIC card — list of 1–3 players + shared reason
                        if (players.length > 0) {
                          return (
                            <div key={label} style={{
                              borderRadius: 8,
                              border: `${cardBorderWidth}px solid ${cardBorder}`,
                              background: cardBg,
                              padding: "12px 14px",
                              boxShadow: isTarget ? `0 0 0 1px ${C.gold}10, 0 4px 14px ${C.gold}10` : "none",
                            }}>
                              <div style={{ marginBottom: 8 }}>
                                <span style={{
                                  fontFamily: MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em",
                                  padding: "3px 7px", borderRadius: 3,
                                  background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
                                }}>{label}</span>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                                {players.map((pl: any, pi: number) => {
                                  const pPosCol = POS_COLOR[(pl.position || "") as Pos] || C.dim;
                                  const pBandC = recBandColorYP(pl.band);
                                  return (
                                    <div key={`${pl.name}-${pi}`} style={{
                                      display: "flex", alignItems: "center", gap: 8,
                                      flexWrap: "wrap", minWidth: 0,
                                      paddingBottom: pi < players.length - 1 ? 6 : 0,
                                      borderBottom: pi < players.length - 1 ? `1px solid ${C.border}80` : "none",
                                    }}>
                                      <span style={{
                                        fontFamily: SANS, fontSize: 13.5, fontWeight: 800, color: C.primary,
                                        letterSpacing: "-0.005em",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                      }}>{pl.name}</span>
                                      <span style={{
                                        fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                                        padding: "1px 5px", borderRadius: 3,
                                        background: `${pPosCol}20`, color: pPosCol, border: `1px solid ${pPosCol}40`,
                                      }}>{pl.position}</span>
                                      <span style={{
                                        fontFamily: MONO, fontSize: 10.5, color: C.dim, letterSpacing: "0.02em",
                                      }}>
                                        ADP {pl.avg_pick != null ? Number(pl.avg_pick).toFixed(1) : "—"}
                                      </span>
                                      {pl.band && (
                                        <span style={{
                                          fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em",
                                          color: pBandC,
                                        }}>{pl.band}</span>
                                      )}
                                      <div style={{ flex: 1 }} />
                                      {pl.fit_score != null && (
                                        <span style={{
                                          fontFamily: MONO, fontSize: 11, fontWeight: 800,
                                          color: C.primary, letterSpacing: "0.04em",
                                        }}>FIT {pl.fit_score}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{
                                fontFamily: SANS, fontSize: 13, color: C.secondary,
                                lineHeight: 1.55,
                              }}>{rec.reason}</div>
                            </div>
                          );
                        }

                        const posCol = POS_COLOR[(rec.position || "") as Pos] || C.dim;
                        const ac = availColorYP(rec.availability_pct);
                        const bandC = recBandColorYP(rec.band);

                        return (
                          <div key={label} style={{
                            borderRadius: 8,
                            border: `${cardBorderWidth}px solid ${cardBorder}`,
                            background: cardBg,
                            padding: "12px 14px",
                            boxShadow: isTarget ? `0 0 0 1px ${C.gold}10, 0 4px 14px ${C.gold}10` : "none",
                          }}>
                            <div style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              flexWrap: "wrap", gap: 10, marginBottom: 8,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                                <span style={{
                                  fontFamily: MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em",
                                  padding: "3px 7px", borderRadius: 3,
                                  background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
                                }}>{label}</span>
                                <span style={{
                                  fontFamily: SANS, fontSize: 14, fontWeight: 800, color: C.primary,
                                  letterSpacing: "-0.005em",
                                }}>{rec.name}</span>
                                <span style={{
                                  fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                                  padding: "1px 5px", borderRadius: 3,
                                  background: `${posCol}20`, color: posCol, border: `1px solid ${posCol}40`,
                                }}>{rec.position}</span>
                                {rec.band && (
                                  <span style={{
                                    fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.10em",
                                    color: bandC,
                                  }}>{rec.band}</span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
                                {rec.fit_score != null && (
                                  <div style={{ textAlign: "right", lineHeight: 1 }}>
                                    <div style={{
                                      fontFamily: MONO, fontSize: 8.5, color: C.dim,
                                      letterSpacing: "0.14em", marginBottom: 2,
                                    }}>FIT</div>
                                    <div style={{
                                      fontFamily: MONO, fontSize: 14, fontWeight: 800,
                                      color: C.primary, lineHeight: 1,
                                    }}>{rec.fit_score}</div>
                                  </div>
                                )}
                                {rec.availability_pct != null && (
                                  <div style={{ textAlign: "right", lineHeight: 1 }}>
                                    <div style={{
                                      fontFamily: MONO, fontSize: 8.5, color: C.dim,
                                      letterSpacing: "0.14em", marginBottom: 2,
                                    }}>AVAIL</div>
                                    <div style={{
                                      fontFamily: MONO, fontSize: 14, fontWeight: 800,
                                      color: ac, lineHeight: 1,
                                    }}>{rec.availability_pct}%</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{
                              fontFamily: SANS, fontSize: 13, color: C.secondary,
                              lineHeight: 1.55,
                            }}>{rec.reason}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* TRADE ANGLE */}
              {tradeAngle && (
                <div style={{
                  marginTop: isMobile ? 16 : 20,
                  paddingTop: isMobile ? 14 : 18,
                  borderTop: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{
                      fontFamily: MONO, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.18em",
                      color: C.dim,
                    }}>SHOULD YOU TRADE THIS PICK</div>
                    <span style={{
                      fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
                      padding: "3px 8px", borderRadius: 4,
                      background: vpill.bg, color: vpill.color, border: `1px solid ${vpill.border}`,
                    }}>{tradeAngle.tag}</span>
                  </div>
                  {tradeAngle.angle && (
                    <div style={{
                      fontFamily: SANS, fontSize: 13.5, color: C.primary,
                      lineHeight: 1.6, marginBottom: 14,
                    }}>{tradeAngle.angle}</div>
                  )}
                  {Array.isArray(tradeAngle.try) && tradeAngle.try.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                        color: C.dim, marginBottom: 8,
                      }}>TRY</div>
                      <ol style={{ display: "flex", flexDirection: "column", gap: 7, listStyle: "none", padding: 0, margin: 0 }}>
                        {tradeAngle.try.map((t: string, ti: number) => (
                          <li key={ti} style={{
                            display: "flex", gap: 10,
                            fontFamily: SANS, fontSize: 13, color: C.primary, lineHeight: 1.55,
                          }}>
                            <span style={{
                              fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.gold,
                              flexShrink: 0, lineHeight: 1.55,
                            }}>{ti + 1}.</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {Array.isArray(tradeAngle.likely_partners) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                        color: C.dim, marginBottom: 8,
                      }}>LIKELY PARTNERS</div>
                      {tradeAngle.likely_partners.length === 0 ? (
                        <div style={{
                          fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.45,
                        }}>
                          No realistic trade partners at this slot — most owners don&apos;t have the willingness or capital to move up.
                        </div>
                      ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {tradeAngle.likely_partners.map((partner: any, pi: number) => {
                          const name = typeof partner === "string" ? partner : partner?.name;
                          const band = typeof partner === "object" ? partner?.band : null;
                          const reasoning = typeof partner === "object" ? partner?.reasoning : null;
                          const bandStyle =
                            band === "HIGH" ? { color: C.green, bg: C.greenDim, border: `${C.green}55` } :
                            band === "MEDIUM" ? { color: C.gold, bg: C.goldDim, border: C.goldBorder } :
                            band === "LOW" ? { color: C.dim, bg: "rgba(149,150,165,0.10)", border: `${C.borderLt}` } :
                            { color: C.red, bg: C.redDim, border: `${C.red}40` };
                          return (
                            <div key={pi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{
                                  fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary,
                                }}>{name}</span>
                                {band && (
                                  <span style={{
                                    fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.10em",
                                    color: bandStyle.color, background: bandStyle.bg,
                                    border: `1px solid ${bandStyle.border}`,
                                    padding: "2px 6px", borderRadius: 3,
                                  }}>{band}</span>
                                )}
                              </div>
                              {reasoning && (
                                <div style={{
                                  fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.45,
                                }}>{reasoning}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  )}
                  {tradeAngle.fallback && (
                    <div>
                      <div style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                        color: C.dim, marginBottom: 8,
                      }}>IF NO TAKERS</div>
                      <div style={{
                        fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.55,
                      }}>{tradeAngle.fallback}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
    queryKey: ["draft-hq-rookie-adp-v2", lid],
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
  const isMobile = useIsMobile();
  const [posFilter, setPosFilter] = useState<"ALL" | "QB" | "RB" | "WR" | "TE">("ALL");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const adpQ = useQuery({
    queryKey: ["draft-hq-rookie-adp-v2", lid],
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
    <div style={{ padding: isMobile ? "14px 0" : "20px 0" }}>
      {/* Title block — over the top */}
      <div style={{ marginBottom: isMobile ? 12 : 18 }}>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 10 : 11, fontWeight: 800, color: C.gold,
          letterSpacing: "0.22em", marginBottom: 4,
        }}>2026 ROOKIE DRAFT</div>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 26 : 36, fontWeight: 900, color: C.primary,
          letterSpacing: "-0.01em", lineHeight: 1, marginBottom: isMobile ? 6 : 8,
          background: `linear-gradient(180deg, ${C.primary} 0%, ${C.gold} 200%)`,
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Rookie ADP</div>
        <div style={{
          fontFamily: SANS, fontSize: isMobile ? 12.5 : 14, color: C.secondary, lineHeight: 1.55,
          maxWidth: 720,
        }}>
          Built from{" "}
          <span style={{ color: C.gold, fontWeight: 700 }}>10,000+ real 2026 rookie drafts</span>
          {" "}across the Sleeper network. Format-aware to your league&rsquo;s scoring, QB count, and TE premium. Refreshed daily.
        </div>
        <div style={{ fontFamily: MONO, fontSize: isMobile ? 10 : 11, color: C.dim, letterSpacing: "0.06em", marginTop: 8 }}>
          {rookies.length} rookies · tiers earned by board position
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          marginTop: isMobile ? 8 : 10,
          padding: isMobile ? "4px 9px" : "5px 11px",
          borderRadius: 4,
          background: `${C.gold}10`,
          border: `1px solid ${C.gold}30`,
          fontFamily: MONO, fontSize: isMobile ? 9.5 : 10.5,
          fontWeight: 800, letterSpacing: "0.10em",
          color: C.gold,
        }}>
          IDP NOT YET SUPPORTED
        </div>
      </div>

      {/* Position filter */}
      <div style={{ display: "flex", gap: isMobile ? 4 : 6, marginBottom: isMobile ? 12 : 18, flexWrap: "wrap" }}>
        {(["ALL", "QB", "RB", "WR", "TE"] as const).map(p => {
          const active = posFilter === p;
          const c = p === "ALL" ? C.gold : (POS_COLOR[p as Pos] || C.dim);
          return (
            <button key={p} onClick={() => setPosFilter(p)} style={{
              fontFamily: MONO, fontSize: isMobile ? 11 : 12, fontWeight: 800, letterSpacing: "0.08em",
              padding: isMobile ? "6px 12px" : "8px 18px", borderRadius: 4, cursor: "pointer",
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
        <>
        <style>{`
          .rk-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            width: 100%;
            box-sizing: border-box;
          }
          .rk-grid > * { min-width: 0; box-sizing: border-box; }
          .rk-stats { display: flex; align-items: stretch; width: 100%; box-sizing: border-box; }
          .rk-stats > div { flex: 1 1 0; min-width: 0; text-align: center; box-sizing: border-box; }
          @media (min-width: 769px) {
            .rk-grid {
              grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
              gap: 14px;
            }
          }
        `}</style>
        <div className="rk-grid">
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
                  borderRadius: isMobile ? 8 : 10,
                  padding: isMobile ? 9 : 16,
                  display: "flex", flexDirection: "column",
                  gap: isMobile ? 8 : 14,
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
                  position: "absolute", top: 0, left: 0, right: 0, height: isMobile ? 3 : 4,
                  background: `linear-gradient(90deg, ${tier.color} 0%, ${tier.color}40 100%)`,
                }} />

                {/* Header row: headshot, name, tier box */}
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 7 : 12 }}>
                  <PlayerHeadshot
                    name={r.player_name}
                    position={r.position || "PICK"}
                    size={isMobile ? 36 : 56}
                    sleeperId={r.sleeper_id}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: SANS, fontSize: isMobile ? 12 : 17, fontWeight: 800, color: C.primary,
                      lineHeight: 1.15,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{r.player_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: isMobile ? 3 : 6 }}>
                      <span style={{
                        fontFamily: MONO, fontSize: isMobile ? 9 : 11, fontWeight: 800, letterSpacing: "0.08em",
                        padding: isMobile ? "2px 5px" : "3px 8px", borderRadius: 3,
                        background: `${posCol}20`, color: posCol, border: `1px solid ${posCol}50`,
                      }}>{r.position || "—"}</span>
                    </div>
                  </div>
                  {/* Tier color-coded box */}
                  <div style={{
                    width: isMobile ? 28 : 44, height: isMobile ? 28 : 44, borderRadius: isMobile ? 5 : 6,
                    background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}c0 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column",
                    boxShadow: `0 4px 12px ${tier.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: MONO, fontSize: isMobile ? 11 : 16, fontWeight: 900, color: "#0a0b14",
                      letterSpacing: "0.02em", lineHeight: 1,
                    }}>{tier.label}</span>
                  </div>
                </div>

                {/* Massive ADP */}
                <div style={{
                  display: "flex", alignItems: "baseline", justifyContent: "center",
                  gap: isMobile ? 5 : 8, padding: isMobile ? "2px 0" : "4px 0",
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: isMobile ? 9 : 11, fontWeight: 800, color: C.dim,
                    letterSpacing: "0.18em",
                  }}>ADP</span>
                  <span style={{
                    fontFamily: MONO, fontSize: isMobile ? 26 : 38, fontWeight: 900, color: C.gold,
                    lineHeight: 1, letterSpacing: "-0.02em",
                    textShadow: `0 0 24px ${C.gold}40`,
                  }}>
                    {adp != null ? Number(adp).toFixed(1) : "—"}
                  </span>
                </div>

                {/* Earliest / R1 odds / Latest row — flex enforces single row */}
                <div className="rk-stats" style={{
                  paddingTop: isMobile ? 6 : 12, borderTop: `1px solid ${tier.color}25`,
                  gap: 0,
                }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 9 : 10, color: "#c5c6d2", letterSpacing: 0, marginBottom: isMobile ? 2 : 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      EARLY
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 13 : 16, fontWeight: 800, color: C.primary, whiteSpace: "nowrap" }}>
                      {fmtPick(r.p10_pick)}
                    </div>
                  </div>
                  <div style={{ borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 9 : 10, color: "#c5c6d2", letterSpacing: 0, marginBottom: isMobile ? 2 : 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {`R${r.expected_round ?? 1} %`}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 13 : 16, fontWeight: 800, whiteSpace: "nowrap",
                      color: r.pct_round != null && r.pct_round >= 0.7 ? C.green
                           : r.pct_round != null && r.pct_round >= 0.4 ? C.gold
                           : C.primary,
                    }}>
                      {r.pct_round != null ? `${(r.pct_round * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 9 : 10, color: "#c5c6d2", letterSpacing: 0, marginBottom: isMobile ? 2 : 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      LATE
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: isMobile ? 13 : 16, fontWeight: 800, color: C.primary, whiteSpace: "nowrap" }}>
                      {fmtPick(r.p90_pick)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COMING SOON — locked tab panel (soft launch)
// ═════════════════════════════════════════════════════════════════════════
function ComingSoon({ tabId }: { tabId: string }) {
  const isMobile = useIsMobile();
  const copy = COMING_SOON_COPY[tabId];
  if (!copy) return null;
  return (
    <div style={{ padding: isMobile ? "20px 0 40px" : "32px 0 60px" }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${C.goldGlow} 0%, ${C.card} 70%)`,
        border: `1px solid ${C.goldBorder}`, borderRadius: isMobile ? 10 : 14,
        padding: isMobile ? "26px 18px" : "44px 36px",
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
            marginBottom: isMobile ? 12 : 18,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: C.gold,
              boxShadow: `0 0 8px ${C.gold}`,
            }} />
            <span style={{
              fontFamily: MONO, fontSize: isMobile ? 10 : 11, fontWeight: 800, color: C.gold,
              letterSpacing: "0.16em",
            }}>IN FLIGHT</span>
          </div>
          <div style={{
            fontFamily: SANS, fontSize: isMobile ? 26 : 36, fontWeight: 900, color: C.primary,
            letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: isMobile ? 12 : 16,
            background: `linear-gradient(180deg, ${C.primary} 0%, ${C.gold} 220%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>{copy.title}</div>
          <div style={{
            fontFamily: SANS, fontSize: isMobile ? 13.5 : 16, color: C.secondary, lineHeight: 1.65,
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
  const { currentLeagueId, currentOwner, currentOwnerId } = useLeagueStore();
  const isMobile = useIsMobile();
  const track = useTrack();

  // Track page open + every tab transition. Mount fires draft_hq_viewed
  // once; subsequent tab changes (incl. URL-driven ones) fire
  // draft_hq_tab_clicked with from/to + league_id so the admin dashboard
  // can break down which tabs beta users actually use.
  const lastTabRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastTabRef.current === null) {
      track("draft_hq_viewed", { tab, league_id: currentLeagueId || null });
    } else if (lastTabRef.current !== tab) {
      track("draft_hq_tab_clicked", {
        from: lastTabRef.current,
        to: tab,
        league_id: currentLeagueId || null,
      });
    }
    lastTabRef.current = tab;
  }, [tab, currentLeagueId, track]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "rookies") next.delete("tab"); else next.set("tab", id);
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  return (
    <div style={{ padding: isMobile ? "12px 10px" : "16px 20px", maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
      <style>{`@keyframes rk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <div style={{ marginBottom: isMobile ? 10 : 14 }}>
          <div style={{
            fontFamily: SANS, fontSize: isMobile ? 10 : 11, color: C.gold, letterSpacing: "0.18em", fontWeight: 800,
          }}>BETA · DRAFT HQ</div>
          <div style={{
            fontFamily: SANS, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.primary, marginTop: 4, lineHeight: 1.1,
          }}>Rookie Draft Cheat Sheet</div>
          <div style={{
            fontFamily: MONO, fontSize: isMobile ? 11 : 12, color: C.dim, marginTop: 6, letterSpacing: "0.04em",
          }}>Format-aware ranks · league tendencies · pick-trade comps</div>
        </div>
        <GlowTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === "rookies"     && <Rookies    lid={currentLeagueId || ""} />}
        {tab === "your-picks"  && <YourPicks  lid={currentLeagueId || ""} owner={currentOwner} ownerId={currentOwnerId} />}
        {tab === "draft-board" && <DraftBoard lid={currentLeagueId || ""} />}
        {tab === "intel"       && <DraftIntel lid={currentLeagueId || ""} />}
    </div>
  );
}
