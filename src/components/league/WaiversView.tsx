"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaiverRecs, getWaiversAll } from "@/lib/api";
import type { WaiverRec, DroppableCandidate, WaiverAllPlayer } from "@/lib/api";
import PlayerHeadshot from "@/components/league/PlayerHeadshot";
import { leaguePrefix } from "@/components/league/tokens";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   TOKENS — match the rest of the league app
   Header treatment cited from
   src/app/l/[slug]/rankings/page.tsx lines 717-728.
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.08)",
};
const POS: Record<string, string> = { QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";

/* Grid template shared by header + rows so columns line up.
   Player | POS RK | PROJ | FIT | MOVE | VALUE
   Rankings has 5 cols "0.8fr 4fr 1.2fr 1.2fr 1.5fr" (rankings/page.tsx:719).
   Waivers has 6 cols — dropping RK, keeping PLAYER wide, adding FIT +
   MOVE. PROJ gets 1.6fr (wider than rankings' 1.2 because two-line
   value), FIT gets 2.6fr, MOVE 2.3fr. */
const COLS = "3.6fr 0.9fr 1.6fr 2.6fr 2.3fr 1fr";

/* Rankings-page header cell — VERBATIM from
   src/app/l/[slug]/rankings/page.tsx:724
     fontFamily: MONO, fontSize: 9, fontWeight: 800,
     letterSpacing: "0.08em", color: C.dim */
const HEADER_CELL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
  color: C.dim,
};

/* SectionHeader — gold bar + gold-bright mono uppercase label.
   VERBATIM idiom from src/app/l/[slug]/rankings/page.tsx:851-853
   (the only place this pattern exists fleet-wide).
   Container: display: "flex", alignItems: "center", gap: 10, marginBottom: 16
   Gold bar:  width: 3, height: 24, borderRadius: 2, background: C.gold
   Label:     fontFamily: MONO, fontSize: 15, fontWeight: 900,
              letterSpacing: "0.14em", color: C.goldBright */
function SectionHeader({ label, size = "md", marginBottom = 16 }: {
  label: string; size?: "sm" | "md"; marginBottom?: number;
}) {
  const barH = size === "sm" ? 16 : 24;
  const fs = size === "sm" ? 11 : 15;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom }}>
      <div style={{
        width: 3, height: barH, borderRadius: 2, background: C.gold, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: MONO, fontSize: fs, fontWeight: 900,
        letterSpacing: "0.14em", color: C.goldBright,
      }}>{label}</span>
    </div>
  );
}

/* GlowTabs — VERBATIM from src/app/l/[slug]/rankings/page.tsx:82-108
   3px gold underline when active, gold-bright text, glow shadow.
   Reused here for the "Recommended Actions | Full Waivers List" tabs. */
function GlowTabs<T extends string>({ tabs, active, onChange, size = "md" }: {
  tabs: { id: T; label: string }[];
  active: T; onChange: (id: T) => void;
  size?: "lg" | "md" | "sm";
}) {
  const s = size === "lg" ? { px: 28, py: 10, fs: 15, ls: "0.12em" }
    : size === "md" ? { px: 20, py: 8, fs: 13, ls: "0.10em" }
    : { px: 14, py: 6, fs: 11, ls: "0.08em" };
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}` }}>
      {tabs.map((t) => {
        const act = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} style={{
            padding: `${s.py}px ${s.px}px`,
            fontFamily: size === "sm" ? MONO : SANS,
            fontSize: s.fs, fontWeight: 800, letterSpacing: s.ls,
            color: act ? C.gold : C.dim, cursor: "pointer",
            borderBottom: act ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: act ? `0 3px 12px ${C.gold}40, 0 1px 4px ${C.gold}25` : "none",
            transition: "all 0.2s ease",
          }}>{t.label}</div>
        );
      })}
    </div>
  );
}

/* Container attrs verbatim from rankings/page.tsx:718-723
     display: "grid", gridTemplateColumns: <cols>,
     alignItems: "center", gap: 8, padding: "6px 16px" (header)
     padding: "10px 20px" (row @ line 762)
   The gap: 8 IS the column gap. To keep PROJ + FIT visually separate
   with two-line PROJ values, PROJ is right-aligned to the column
   edge and FIT starts fresh at its column's left edge. */
const GRID_BASE: React.CSSProperties = {
  display: "grid", gridTemplateColumns: COLS,
  alignItems: "center", gap: 16,
};

function NeedBadge({ grade }: { grade: string }) {
  const color = grade === "deficit" ? C.red : grade === "surplus" ? C.blue : C.dim;
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, color, textTransform: "uppercase",
      letterSpacing: 0.5, padding: "1px 5px", border: `1px solid ${color}`,
      borderRadius: 3, opacity: 0.85,
    }}>{grade}</span>
  );
}

/* Position pill — matches rankings/page.tsx:779-783 exactly */
function PosPill({ pos }: { pos: string }) {
  const pc = POS[pos] || "#9596a5";
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 4, flexShrink: 0,
      background: `${pc}15`, color: pc, border: `1px solid ${pc}30`,
    }}>{pos}</span>
  );
}

/* DepthChartPill — renders inside the expanded ElitePanel at the top,
   above VALUES. Shows Sleeper's NFL depth-chart position with the
   "DEPTH CHART · {POS}{N}" or "DEPTH CHART · STARTER" format. Color
   codes: depth 1 → green (STARTER), depth 2 → blue, depth 3+ → dim.
   Shape idiom from rankings/page.tsx:28-37 (TierBadge). */
function DepthChartPill({ pos, depth }: { pos: string; depth: number | null | undefined }) {
  if (depth == null || depth < 1) return null;
  const value = depth === 1 ? "STARTER" : `${pos}${depth}`;
  const color = depth === 1 ? C.green : depth === 2 ? C.blue : C.dim;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0,
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }}>
      <span style={{ color: C.dim, letterSpacing: "0.08em" }}>DEPTH CHART</span>
      <span style={{ color: C.dim }}>·</span>
      <span>{value}</span>
    </span>
  );
}

/* HandcuffRolePill — companion to DepthChartPill, only shows when the
   player's depth_chart_order >= 2 (they are a backup on their NFL team,
   the generic definition of a handcuff role). Separate from the
   opportunity-specific "INSURANCE" flag below, which fires only when
   they back up an injured rostered starter. */
function HandcuffRolePill({ depth }: { depth: number | null | undefined }) {
  if (depth == null || depth < 2) return null;
  const color = depth === 2 ? C.blue : C.dim;
  const label = depth === 2 ? "HANDCUFF" : "DEEP DEPTH";
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0,
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function OpenSlotPill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: SANS, fontSize: 11, color: C.green,
      background: "rgba(125,211,160,0.10)", padding: "2px 8px",
      border: `1px solid rgba(125,211,160,0.3)`, borderRadius: 3,
    }}>Open bench slot</span>
  );
}

function DroppableCard({ c }: { c: DroppableCandidate }) {
  const { openPlayerCard } = usePlayerCardStore();
  const reasonColor = c.reason === "position_surplus" ? C.blue : C.dim;
  const reasonLabel = c.reason === "position_surplus" ? "surplus" : "worst";
  return (
    <div
      onClick={() => openPlayerCard(c.player_name)}
      style={{
        display: "flex", alignItems: "center", gap: 10, minWidth: 200,
        padding: "8px 12px",
        background: C.elevated,
        border: `1px solid ${C.border}`, borderRadius: 6,
        cursor: "pointer",
      }}>
      <PlayerHeadshot name={c.player_name} position={c.position} sleeperId={c.player_id} size={30} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          minWidth: 0,
        }}>
          <span style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.player_name}</span>
          <PosPill pos={c.position} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
          {c.projected_ppg.toFixed(1)} PPG · {c.sha_adjusted.toFixed(0)}
        </div>
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 9, color: reasonColor, fontWeight: 800,
        border: `1px solid ${reasonColor}55`, padding: "1px 5px", borderRadius: 3,
        textTransform: "uppercase", letterSpacing: 0.6,
      }}>{reasonLabel}</div>
    </div>
  );
}

/* One rec row — rankings-page density (padding "10px 20px" @ line 762).
   Desktop only. Mobile uses RecCardMobile below. */
function RecRow({ r, isMarginal, valueLabel }: {
  r: WaiverRec; isMarginal?: boolean; valueLabel: string;
}) {
  const { openPlayerCard } = usePlayerCardStore();
  const porpColor = r.porp > 0 ? C.green : r.porp < 0 ? C.red : C.dim;
  const opacity = isMarginal ? 0.7 : 1;

  return (
    <div
      onClick={() => openPlayerCard(r.player_name)}
      style={{
        ...GRID_BASE, padding: "10px 20px",
        borderBottom: `1px solid ${C.white08}`,
        opacity, cursor: "pointer",
      }}>
      {/* Player: headshot + name + pos pill + team subline. Cited
          from rankings/page.tsx:772-789 (player + pos-pill + team). */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <PlayerHeadshot name={r.player_name} position={r.position} sleeperId={r.sleeper_id} size={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
            <span style={{
              /* Player name — rankings/page.tsx:776 verbatim
                 fontFamily: SANS, fontSize: 15, fontWeight: 700,
                 color: C.primary, lineHeight: 1.2 */
              fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.primary,
              lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{r.player_name}</span>
            <PosPill pos={r.position} />
          </div>
          <div style={{
            /* Team subline — rankings/page.tsx:785 verbatim
               fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1 */
            fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1,
          }}>
            {r.team || "FA"}
          </div>
        </div>
      </div>
      {/* POS RK — rankings/page.tsx:791 verbatim
          fontFamily: MONO, fontSize: 13, fontWeight: 700,
          color: C.secondary, textAlign: "center" */}
      <span style={{
        fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.secondary,
        textAlign: "center",
      }}>{r.pos_rank || "—"}</span>
      {/* PROJ — right-aligned per Billy 2026-07-23 directive. Two-line
          value so the column reads down cleanly against its right edge.
          paddingRight isolates the number strip from FIT to the right. */}
      <div style={{ textAlign: "right", paddingRight: 12 }}>
        <div style={{
          /* PROJ PTS top line — rankings/page.tsx:795 verbatim shape
             fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary */
          fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary,
        }}>
          {r.projected_ppg.toFixed(1)} <span style={{ color: C.dim, fontWeight: 400, fontSize: 10 }}>PPG</span>
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, color: porpColor, fontWeight: 700, marginTop: 2,
        }}>
          {r.porp > 0 ? "+" : ""}{r.porp.toFixed(1)} <span style={{ color: C.dim, fontWeight: 400 }}>over repl</span>
        </div>
        {r.faab && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 3 }}>
            ~{r.faab.typical_pct < 1 ? r.faab.typical_pct.toFixed(1) : Math.round(r.faab.typical_pct)}% FAAB{" "}
            <span style={{ color: C.dim, fontWeight: 400, fontSize: 9 }}>
              ({r.faab.source === "league_avg" ? "league" : "fleet"} avg)
            </span>
          </div>
        )}
      </div>
      {/* FIT — paddingLeft breathing room from PROJ's right-aligned edge. */}
      <div style={{
        fontFamily: SANS, fontSize: 12, color: C.secondary, paddingLeft: 12,
      }}>
        {r.priority_tag}
        {r.injury_status && (
          <span style={{
            marginLeft: 6, fontFamily: MONO, fontSize: 9, color: C.orange,
            background: "rgba(224,156,107,0.12)", padding: "1px 4px", borderRadius: 2,
          }}>{r.injury_status}</span>
        )}
      </div>
      {/* MOVE */}
      <div style={{ fontFamily: SANS, fontSize: 11 }}>
        {r.no_drop_needed ? (
          <OpenSlotPill />
        ) : r.suggested_drop ? (
          <span style={{ color: C.secondary }}>
            Drop <span style={{ color: C.primary, fontWeight: 600 }}>{r.suggested_drop.player_name}</span>
            <span style={{ color: C.dim, fontFamily: MONO, fontSize: 10, marginLeft: 4 }}>
              (Δ {r.net_delta > 0 ? "+" : ""}{r.net_delta.toFixed(1)})
            </span>
          </span>
        ) : (
          <span style={{ color: C.dim }}>—</span>
        )}
      </div>
      {/* VALUE (SHA demoted, dim) — rankings/page.tsx:799 shape */}
      <span style={{
        fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.dim, textAlign: "right",
      }}>
        {r.sha_adjusted.toFixed(0)}
      </span>
    </div>
  );
}

/* Mobile card — stacked layout, tap opens player card. Every info
   line the desktop row shows across 6 columns folds into vertical
   sections here. */
function RecCardMobile({ r, isMarginal }: { r: WaiverRec; isMarginal?: boolean }) {
  const { openPlayerCard } = usePlayerCardStore();
  const porpColor = r.porp > 0 ? C.green : r.porp < 0 ? C.red : C.dim;
  return (
    <div
      onClick={() => openPlayerCard(r.player_name)}
      style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: "12px 14px",
        borderBottom: `1px solid ${C.white08}`,
        opacity: isMarginal ? 0.75 : 1,
      }}
    >
      {/* Row 1 — headshot + name + pos pill + POS RK */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PlayerHeadshot name={r.player_name} position={r.position} sleeperId={r.sleeper_id} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.primary,
              lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{r.player_name}</span>
            <PosPill pos={r.position} />
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1,
            display: "flex", gap: 8,
          }}>
            <span>{r.team || "FA"}</span>
            {r.pos_rank && <span style={{ color: C.secondary }}>{r.pos_rank}</span>}
          </div>
        </div>
      </div>

      {/* Row 2 — the numbers strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.primary }}>
          {r.projected_ppg.toFixed(1)}
          <span style={{ color: C.dim, fontWeight: 400, fontSize: 10, marginLeft: 3 }}>PPG</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: porpColor }}>
          {r.porp > 0 ? "+" : ""}{r.porp.toFixed(1)}
          <span style={{ color: C.dim, fontWeight: 400, marginLeft: 3 }}>over repl</span>
        </span>
        {r.faab && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold, fontWeight: 700 }}>
            ~{r.faab.typical_pct < 1 ? r.faab.typical_pct.toFixed(1) : Math.round(r.faab.typical_pct)}% FAAB
            <span style={{ color: C.dim, fontWeight: 400, fontSize: 10, marginLeft: 3 }}>
              ({r.faab.source === "league_avg" ? "league" : "fleet"} avg)
            </span>
          </span>
        )}
      </div>

      {/* Row 3 — FIT tag */}
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
        {r.priority_tag}
        {r.injury_status && (
          <span style={{
            marginLeft: 6, fontFamily: MONO, fontSize: 9, color: C.orange,
            background: "rgba(224,156,107,0.12)", padding: "1px 4px", borderRadius: 2,
          }}>{r.injury_status}</span>
        )}
      </div>

      {/* Row 4 — MOVE (open slot pill or drop instruction) */}
      <div style={{ fontFamily: SANS, fontSize: 12 }}>
        {r.no_drop_needed ? (
          <OpenSlotPill />
        ) : r.suggested_drop ? (
          <span style={{ color: C.secondary }}>
            Drop <span style={{ color: C.primary, fontWeight: 600 }}>{r.suggested_drop.player_name}</span>
            <span style={{ color: C.dim, fontFamily: MONO, fontSize: 11, marginLeft: 4 }}>
              (Δ {r.net_delta > 0 ? "+" : ""}{r.net_delta.toFixed(1)})
            </span>
          </span>
        ) : (
          <span style={{ color: C.dim }}>—</span>
        )}
      </div>
    </div>
  );
}

/* ─── Full Waivers List (browse tab) ─────────────────────────────
   Simplified row + card layout — no drop, no FIT, no MOVE column.
   Click row to expand → weekly PPG grid. Player name click opens card. */

const FULL_COLS = "0.4fr 3.4fr 0.9fr 1.4fr 1.2fr";

/* Elite expansion panel — everything a manager needs to evaluate a
   waiver-wire target in one place: flags (injury, handcuff), the
   3-card value block (league / dynasty / win-now, positional ranks),
   the weekly schedule with bye marked, and the bio strip. */

/* ValueCard — verbatim shape from
   src/components/league/PlayerCardModal.tsx:899-907 (the ValueCard
   component behind the LEAGUE VALUE / DYNASTY / WIN-NOW trio at
   PlayerCardModal.tsx:270-272). */
function ValueCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
      padding: "6px 8px", borderTop: `2px solid ${color}30`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ElitePanel({ p }: { p: WaiverAllPlayer }) {
  const { openPlayerCard } = usePlayerCardStore();
  // Regular season runs weeks 1..18 (17 games + 1 bye per team, verified
  // against Sleeper schedule 2026-07-23). Weekly grid renders all 18.
  const WEEKS = 18;
  const weeks = Array.from({ length: WEEKS }, (_, i) => i + 1);
  const total = weeks.reduce(
    (s, w) => s + (p.weekly_ppg[String(w)]?.pts ?? 0),
    0,
  );
  const heightFt = p.height && !p.height.includes("'") && !p.height.includes("-")
    ? `${Math.floor(Number(p.height) / 12)}'${Number(p.height) % 12}"`
    : p.height;

  return (
    <div style={{
      background: C.elevated, padding: "12px 16px",
      borderTop: `1px dashed ${C.border}`,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Roster context — depth-chart position + generic handcuff role.
          Renders whenever we have depth data. This is the "who is this
          player on their NFL team" band, above VALUES. Separate from the
          opportunity-specific INSURANCE flag below (which only fires when
          they back up an injured rostered starter). */}
      {(p.depth_chart_order ?? null) != null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <DepthChartPill pos={p.position} depth={p.depth_chart_order} />
          <HandcuffRolePill depth={p.depth_chart_order} />
        </div>
      )}

      {/* Flags row — injury + handcuff opportunity — only renders if any flag fires */}
      {(p.injury_status || p.handcuff_for) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {p.injury_status && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", background: "rgba(224,156,107,0.10)",
              border: `1px solid rgba(224,156,107,0.30)`, borderRadius: 4,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.orange, fontWeight: 800 }}>
                INJURY
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: C.primary, fontWeight: 700 }}>
                {p.injury_status}{p.injury_body_part ? ` — ${p.injury_body_part}` : ""}
              </span>
            </div>
          )}
          {p.handcuff_for && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", background: "rgba(107,184,224,0.10)",
              border: `1px solid rgba(107,184,224,0.30)`, borderRadius: 4,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.blue, fontWeight: 800 }}>
                INSURANCE
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: C.primary }}>
                Backs up{" "}
                <span style={{ fontWeight: 700 }}>{p.handcuff_for.player_name}</span>
                {" "}
                <span style={{ color: C.orange }}>({p.handcuff_for.injury_status})</span>
                {" "}
                <span style={{ color: C.dim }}>rostered by</span>
                {" "}
                <span style={{ fontWeight: 700 }}>{p.handcuff_for.rostered_by}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Values — 3-card block. Component cited from
          PlayerCardModal.tsx:899-907; label set per Billy 2026-07-23:
            DYNASTYGPT VALUE ← sha_value + sha_pos_rank (gold)
            DYNASTY VALUE ← dynasty_value + dynasty_pos_rank (blue)
            WIN NOW VALUE ← redraft_value + redraft_pos_rank (green)
          KTC pill removed — KTC never surfaces user-facing.
          PPG removed — already lives in the row header. */}
      <div>
        <SectionHeader label="VALUES" size="sm" marginBottom={6} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          <ValueCard
            label="DYNASTYGPT VALUE"
            value={p.sha_value != null ? p.sha_value.toFixed(0) : "—"}
            sub={p.pos_rank || ""}
            color={C.gold}
          />
          <ValueCard
            label="DYNASTY VALUE"
            value={p.dynasty_value != null ? p.dynasty_value.toFixed(0) : "—"}
            sub={p.dynasty_pos_rank || ""}
            color={C.blue}
          />
          <ValueCard
            label="WIN NOW VALUE"
            value={p.redraft_value != null ? p.redraft_value.toFixed(0) : "—"}
            sub={p.redraft_pos_rank || ""}
            color={C.green}
          />
        </div>
      </div>

      {/* Weekly schedule + projected points grid — SectionHeader idiom.
          Each cell: WK{n} label, opponent (@KC / vs BUF / BYE), points.
          On bye week the opp is null and cell shows BYE + orange tint.
          Container is horizontal-scrollable so 18 cells fit any viewport
          (18 × ~46px = ~830px on desktop, scrolls on mobile). */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
        }}>
          <SectionHeader label="WEEKLY SCHEDULE & PROJECTIONS" size="sm" marginBottom={0} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>
            Season total{" "}
            <span style={{ color: C.gold, fontWeight: 700, marginLeft: 4 }}>{total.toFixed(1)}</span>
          </span>
        </div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${WEEKS}, minmax(46px, 1fr))`,
            gap: 3, minWidth: 46 * WEEKS,
          }}>
            {weeks.map((w) => {
              const cell = p.weekly_ppg[String(w)];
              const pts = cell?.pts ?? null;
              const opp = cell?.opp ?? null;
              // nfl_schedule is authoritative. Every team plays 17 of 18
              // weeks + 1 bye, and the seed populated all 32 teams. So
              // any week 1..18 with no opp is the team's bye. Ignore the
              // legacy p.bye_week field (from nfl_byes, verified stale
              // 2026-07-23: BUF said wk5, Sleeper has BUF playing wk5).
              const hasAnySchedule = Object.values(p.weekly_ppg).some((c) => c && c.opp != null);
              const isBye = hasAnySchedule && opp == null;
              const hasPts = pts != null && pts > 0;
              const isHome = opp?.startsWith("vs");
              const oppColor = isBye ? C.orange
                : opp ? (isHome ? C.secondary : C.dim)
                : C.dim;
              return (
                <div key={w} style={{
                  padding: "4px 3px",
                  background: isBye ? "rgba(224,156,107,0.10)" : C.panel,
                  border: `1px solid ${isBye ? "rgba(224,156,107,0.30)" : C.border}`,
                  borderRadius: 3, textAlign: "center", minWidth: 0,
                }}>
                  <div style={{
                    fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.06em",
                  }}>
                    WK{w}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 700, color: oppColor,
                    marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {isBye ? "BYE" : opp ?? "—"}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 700,
                    color: isBye ? C.orange : hasPts ? C.primary : C.dim,
                    marginTop: 2,
                  }}>
                    {isBye ? "—" : hasPts ? pts!.toFixed(1) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bio strip + View card */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: 12, paddingTop: 8, borderTop: `1px solid ${C.white08}`,
        fontFamily: MONO, fontSize: 11, color: C.secondary,
      }}>
        {p.age != null && <span>{p.age} yrs</span>}
        {p.years_exp != null && <span>{p.years_exp} exp</span>}
        {heightFt && p.weight && <span>{heightFt} · {p.weight} lb</span>}
        {p.college && <span style={{ color: C.dim }}>{p.college}</span>}
        <span
          onClick={(e) => { e.stopPropagation(); openPlayerCard(p.player_name); }}
          style={{
            marginLeft: "auto",
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            color: C.gold, cursor: "pointer", letterSpacing: "0.04em",
          }}
        >
          VIEW PLAYER CARD →
        </span>
      </div>
    </div>
  );
}

function FullListRow({ p, expanded, onToggle }: {
  p: WaiverAllPlayer; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div>
    <div
      onClick={onToggle}
      style={{
        display: "grid", gridTemplateColumns: FULL_COLS,
        alignItems: "center", gap: 6, padding: "5px 12px",
        borderBottom: expanded ? "none" : `1px solid ${C.white08}`,
        cursor: "pointer",
        background: expanded ? C.elevated : "transparent",
      }}
    >
      {/* Chevron — signals expandability, rotates on open. */}
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: expanded ? C.gold : C.dim,
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}>
        <ChevronRight size={14} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <PlayerHeadshot name={p.player_name} position={p.position} sleeperId={p.sleeper_id} size={24} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
            {/* Name — VERBATIM from rankings/page.tsx:775-778
                fontFamily: SANS, fontSize: 15, fontWeight: 700,
                color: C.primary, lineHeight: 1.2 */}
            <span style={{
              fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.primary,
              lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{p.player_name}</span>
            <PosPill pos={p.position} />
          </div>
          {/* Team subline — VERBATIM from rankings/page.tsx:785
              fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1 */}
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1 }}>
            {p.team || "FA"}
            {p.injury_status && (
              <span style={{
                marginLeft: 6, fontFamily: MONO, fontSize: 9, color: C.orange,
                background: "rgba(224,156,107,0.12)", padding: "1px 4px", borderRadius: 2,
              }}>{p.injury_status}</span>
            )}
          </div>
        </div>
      </div>
      {/* POS RK — VERBATIM from rankings/page.tsx:791
          fontFamily: MONO, fontSize: 13, fontWeight: 700,
          color: C.secondary, textAlign: "center" */}
      <span style={{
        fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.secondary, textAlign: "center",
      }}>
        {p.pos_rank || "—"}
      </span>
      {/* PROJ — VERBATIM shape from rankings/page.tsx:795 (row primary
          number), textAlign right to match column edge. */}
      <span style={{
        fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary,
        textAlign: "right", paddingRight: 12,
      }}>
        {p.projected_ppg.toFixed(1)}
      </span>
      {/* VALUE — VERBATIM from rankings/page.tsx:799
          fontFamily: MONO, fontSize: 15, fontWeight: 800,
          color: C.gold, textAlign: "right" */}
      <span style={{
        fontFamily: MONO, fontSize: 15, fontWeight: 800, color: C.gold, textAlign: "right",
      }}>
        {p.sha_adjusted.toFixed(0)}
      </span>
    </div>
    {expanded && <ElitePanel p={p} />}
    </div>
  );
}

function FullListCardMobile({ p, expanded, onToggle }: {
  p: WaiverAllPlayer; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div>
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
        borderBottom: expanded ? "none" : `1px solid ${C.white08}`,
        cursor: "pointer",
        background: expanded ? C.elevated : "transparent",
      }}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: expanded ? C.gold : C.dim,
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}>
        <ChevronRight size={14} />
      </span>
      <PlayerHeadshot name={p.player_name} position={p.position} sleeperId={p.sleeper_id} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary,
            lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{p.player_name}</span>
          <PosPill pos={p.position} />
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1,
          display: "flex", gap: 8,
        }}>
          <span>{p.team || "FA"}</span>
          {p.pos_rank && <span style={{ color: C.secondary }}>{p.pos_rank}</span>}
          {p.injury_status && <span style={{ color: C.orange }}>{p.injury_status}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.primary }}>
          {p.projected_ppg.toFixed(1)} <span style={{ color: C.dim, fontSize: 9, fontWeight: 400 }}>PPG</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, fontWeight: 800 }}>
          {p.sha_adjusted.toFixed(0)}
        </div>
      </div>
    </div>
    {expanded && <ElitePanel p={p} />}
    </div>
  );
}

type FullListSort = "proj" | "value";
const POS_FILTERS: readonly ("ALL" | "QB" | "RB" | "WR" | "TE")[] = ["ALL", "QB", "RB", "WR", "TE"];

function FullListPanel({
  lid, valueLabel, isMobile,
}: { lid: string; valueLabel: string; isMobile: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["waivers-all", lid],
    queryFn: () => getWaiversAll(lid),
    enabled: !!lid,
    staleTime: 60_000,
  });

  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<typeof POS_FILTERS[number]>("ALL");
  const [sort, setSort] = useState<FullListSort>("proj");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (sid: string) => setExpandedId((cur) => (cur === sid ? null : sid));

  const players = data?.players || [];

  // Autocomplete suggestions: top 6 matches by name.
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => p.player_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [players, search]);

  const filtered = useMemo(() => {
    let out = players;
    if (pos !== "ALL") out = out.filter((p) => p.position === pos);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((p) => p.player_name.toLowerCase().includes(q));
    }
    if (sort === "proj") out = [...out].sort((a, b) => b.projected_ppg - a.projected_ppg);
    else out = [...out].sort((a, b) => b.sha_adjusted - a.sha_adjusted);
    return out;
  }, [players, pos, search, sort]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.dim, fontFamily: SANS }}>Loading available players…</div>;
  }
  if (error || !data) {
    return <div style={{ padding: 40, textAlign: "center", color: C.red, fontFamily: SANS }}>Failed to load available players.</div>;
  }

  return (
    <div>
      {/* Controls — compact, two rows.
          Row 1: search + POS filter.
          Row 2: sort. */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 6,
        padding: "8px 10px",
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
        marginBottom: 8, position: "relative",
      }}>
        {/* Row 1: search + POS filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 8px",
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
            }}>
              <Search size={12} color={C.dim} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAutocomplete(true); }}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                placeholder="Search available players…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: C.primary, fontFamily: SANS, fontSize: 12,
                }}
              />
              {search && (
                <X size={12} color={C.dim} style={{ cursor: "pointer" }} onClick={() => setSearch("")} />
              )}
            </div>
            {showAutocomplete && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 4,
                zIndex: 10, maxHeight: 260, overflowY: "auto",
              }}>
                {suggestions.map((p) => (
                  <div key={p.sleeper_id}
                    onMouseDown={() => setSearch(p.player_name)}
                    style={{
                      padding: "6px 10px", cursor: "pointer",
                      borderBottom: `1px solid ${C.white08}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                    <PlayerHeadshot name={p.player_name} position={p.position} sleeperId={p.sleeper_id} size={20} />
                    <span style={{ fontFamily: SANS, fontSize: 12, color: C.primary, flex: 1 }}>{p.player_name}</span>
                    <PosPill pos={p.position} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {POS_FILTERS.map((p) => {
              const active = pos === p;
              const c = p === "ALL" ? C.gold : POS[p] || C.dim;
              return (
                <button key={p} onClick={() => setPos(p)}
                  style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                    padding: "4px 8px", borderRadius: 3, cursor: "pointer", border: "none",
                    background: active ? `${c}20` : "transparent",
                    color: active ? c : C.dim,
                    outline: active ? `1px solid ${c}40` : `1px solid ${C.border}`,
                  }}>{p}</button>
              );
            })}
          </div>
        </div>

        {/* Row 2: sort — SectionHeader idiom (small variant) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SectionHeader label="SORT BY" size="sm" marginBottom={0} />
          <div style={{ display: "flex", gap: 3 }}>
            {([
              { id: "proj" as const, label: "Projected points" },
              { id: "value" as const, label: "DynastyGPT value" },
            ]).map((s) => {
              const active = sort === s.id;
              return (
                <button key={s.id} onClick={() => setSort(s.id)}
                  style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                    padding: "4px 10px", borderRadius: 3, cursor: "pointer", border: "none",
                    background: active ? `${C.gold}20` : "transparent",
                    color: active ? C.gold : C.dim,
                    outline: active ? `1px solid ${C.gold}40` : `1px solid ${C.border}`,
                  }}>{s.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Counts */}
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, padding: "0 4px 6px" }}>
        Showing {filtered.length} of {data.counts.returned} available · rostered filtered {data.counts.rostered_filtered} · rookies hidden {data.counts.draft_pool_hidden}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", fontFamily: SANS, fontSize: 12, color: C.dim }}>
          No players match your filters.
        </div>
      ) : isMobile ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6 }}>
          {filtered.slice(0, 200).map((p) => (
            <FullListCardMobile key={p.sleeper_id} p={p}
              expanded={expandedId === p.sleeper_id}
              onToggle={() => toggle(p.sleeper_id)} />
          ))}
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6 }}>
          {/* header row */}
          <div style={{
            display: "grid", gridTemplateColumns: FULL_COLS,
            alignItems: "center", gap: 6, padding: "5px 12px",
            background: C.panel, borderBottom: `1px solid ${C.border}`,
            position: "sticky", top: 0, zIndex: 2,
          }}>
            <span />
            <span style={HEADER_CELL}>PLAYER</span>
            <span style={{ ...HEADER_CELL, textAlign: "center" }}>POS RK</span>
            <span style={{ ...HEADER_CELL, textAlign: "right", paddingRight: 12 }}>PROJ</span>
            <span style={{ ...HEADER_CELL, color: C.gold, textAlign: "right" }}>{valueLabel}</span>
          </div>
          {filtered.slice(0, 200).map((p) => (
            <FullListRow key={p.sleeper_id} p={p}
              expanded={expandedId === p.sleeper_id}
              onToggle={() => toggle(p.sleeper_id)} />
          ))}
          {filtered.length > 200 && (
            <div style={{ padding: "12px 20px", textAlign: "center", fontFamily: MONO, fontSize: 10, color: C.dim }}>
              Top 200 shown · refine your search to see more
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* Rankings-page style header row — GRID_BASE + padding "6px 16px" per
   rankings/page.tsx:720. PROJ header right-aligned to match the
   right-aligned cell so number columns read down as a column. */
function TableHeader({ valueLabel }: { valueLabel: string }) {
  return (
    <div style={{
      ...GRID_BASE, padding: "6px 16px",
      background: C.panel, borderBottom: `1px solid ${C.border}`,
      position: "sticky", top: 0, zIndex: 2,
    }}>
      <span style={HEADER_CELL}>PLAYER</span>
      <span style={{ ...HEADER_CELL, textAlign: "center" }}>POS RK</span>
      <span style={{ ...HEADER_CELL, textAlign: "right", paddingRight: 12 }}>PROJ</span>
      <span style={{ ...HEADER_CELL, paddingLeft: 12 }}>FIT</span>
      <span style={HEADER_CELL}>MOVE</span>
      <span style={{ ...HEADER_CELL, color: C.gold, textAlign: "right" }}>{valueLabel}</span>
    </div>
  );
}

/* Section — gold-bar SectionHeader idiom for the title, collapsible.
   Cited: rankings/page.tsx:851-853 for the label; chevron for the
   affordance is standard. */
function Section({ title, subtitle, children, defaultOpen = true }: {
  title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 20 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", background: "transparent", border: "none",
          borderBottom: open ? `1px solid ${C.border}` : "none", cursor: "pointer",
          textAlign: "left",
        }}>
        <div style={{
          width: 3, height: 20, borderRadius: 2, background: C.gold, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: MONO, fontSize: 13, fontWeight: 900,
          letterSpacing: "0.14em", color: C.goldBright,
        }}>{title.toUpperCase()}</span>
        {subtitle && (
          <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 11, color: C.dim, fontWeight: 400 }}>
            {subtitle}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: C.dim, display: "inline-flex" }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

type WaiversTab = "recs" | "browse";

export default function WaiversView({ lid, owner, ownerId, leagueName }: {
  lid: string; owner: string; ownerId?: string | null; leagueName?: string;
}) {
  const valueLabel = leaguePrefix(leagueName || "") || "Value";
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<WaiversTab>("recs");
  const { data, isLoading, error } = useQuery({
    queryKey: ["waiver-recs", lid, owner, ownerId],
    queryFn: () => getWaiverRecs(lid, owner, ownerId, 30),
    enabled: !!lid && !!owner,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.dim, fontFamily: SANS }}>
        Loading waiver recommendations…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.red, fontFamily: SANS }}>
        Failed to load waiver recommendations.
      </div>
    );
  }

  const positive = data.recommendations.filter((r) => !r.marginal);
  const marginal = data.recommendations.filter((r) => r.marginal);
  const droppable = data.droppable_candidates || [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px", background: C.bg, minHeight: "100vh" }}>
      {/* Page title — SectionHeader gold-bar idiom cited from
          rankings/page.tsx:851-853, extended with a metadata sub-line
          in dim mono (format line — kept dim per Billy's directive
          "format line can stay dim, it's metadata"). */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader label={`WAIVER WIRE — ${owner.toUpperCase()}`} marginBottom={6} />
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.dim, margin: 0, paddingLeft: 13 }}>
          Ranked by projected points over the next-best available at each position, {valueLabel} format.
          <span style={{ marginLeft: 6, color: C.secondary }}>
            {data.format.is_superflex ? "SF" : "1QB"} · {data.format.scoring_type.toUpperCase()} · {data.format.pass_td_pts}pt pass TD
            {data.format.te_premium ? ` · TEP ${data.format.te_premium.toFixed(1)}` : ""}
          </span>
        </p>
      </div>

      {/* Tab bar — GlowTabs from rankings/page.tsx:82-108 (3px gold
          underline + gold-bright text + glow shadow when active). */}
      <div style={{ marginBottom: 16 }}>
        <GlowTabs<WaiversTab>
          tabs={[
            { id: "recs", label: "Recommended Actions" },
            { id: "browse", label: "Full Waivers List" },
          ]}
          active={tab}
          onChange={setTab}
          size="md"
        />
      </div>

      {tab === "browse" ? (
        <FullListPanel lid={lid} valueLabel={valueLabel} isMobile={isMobile} />
      ) : (<>

      {/* Positional needs — SectionHeader idiom (rankings/page.tsx:851-853) */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeader label="POSITIONAL NEEDS" size="sm" marginBottom={8} />
        <div style={{
          display: "flex", gap: 12, padding: "10px 14px",
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
          alignItems: "center", flexWrap: "wrap",
        }}>
          {(["QB", "RB", "WR", "TE"] as const).map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PosPill pos={p} />
              <NeedBadge grade={data.positional_needs[p] || "adequate"} />
            </div>
          ))}
        </div>
      </div>

      {/* Notes callout — rookie-draft-pending note suppressed per Billy
          2026-07-23. BE still emits the note (kept for logic gates and
          future re-enable); FE just doesn't render it. */}
      {(() => {
        const visibleNotes = data.notes.filter(
          (n) => !n.toLowerCase().startsWith("rookie draft pending")
        );
        if (visibleNotes.length === 0) return null;
        return (
          <div style={{
            marginBottom: 16, padding: "10px 14px",
            background: "rgba(224,156,107,0.06)",
            border: `1px solid rgba(224,156,107,0.20)`, borderRadius: 6,
            fontFamily: SANS, fontSize: 12, color: C.orange,
          }}>
            {visibleNotes.map((n, i) => <div key={i}>{n}</div>)}
          </div>
        );
      })()}

      {/* Droppable strip — SectionHeader idiom */}
      {droppable.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <SectionHeader label="DROPPABLE" size="sm" marginBottom={0} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>
              {droppable.length === 1
                ? "one obvious cut"
                : `${droppable.length} rational cuts — first is the default drop`}
            </span>
          </div>
          <div style={{
            display: isMobile ? "flex" : "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 10, flexWrap: "wrap",
          }}>
            {droppable.map((c) => <DroppableCard key={c.player_id} c={c} />)}
          </div>
        </div>
      )}

      {/* POSITIVE section */}
      <Section
        title="Recommended Adds"
        subtitle={positive.length === 0
          ? "no moves worth making"
          : `${positive.length} above replacement · ${data.open_bench_slots} open bench slot${data.open_bench_slots === 1 ? "" : "s"}`}
      >
        {positive.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontFamily: SANS, fontSize: 12, color: C.dim }}>
            no moves worth making
          </div>
        ) : isMobile ? (
          <div>{positive.map((r) => <RecCardMobile key={r.sleeper_id} r={r} />)}</div>
        ) : (
          <div>
            <TableHeader valueLabel={valueLabel} />
            {positive.map((r) => <RecRow key={r.sleeper_id} r={r} valueLabel={valueLabel} />)}
          </div>
        )}
      </Section>

      {/* MARGINAL section */}
      <Section
        title="Marginal Options"
        subtitle={marginal.length === 0
          ? "none"
          : `${marginal.length} shown · at or below replacement`}
        defaultOpen={false}
      >
        {marginal.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontFamily: SANS, fontSize: 12, color: C.dim }}>
            No marginal options in the returned batch.
          </div>
        ) : isMobile ? (
          <div>{marginal.map((r) => <RecCardMobile key={r.sleeper_id} r={r} isMarginal />)}</div>
        ) : (
          <div>
            <TableHeader valueLabel={valueLabel} />
            {marginal.map((r) => <RecRow key={r.sleeper_id} r={r} isMarginal valueLabel={valueLabel} />)}
          </div>
        )}
      </Section>

      {/* Footer diagnostics */}
      <div style={{
        marginTop: 16, padding: "10px 14px", background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 4,
        fontFamily: MONO, fontSize: 10, color: C.dim,
      }}>
        Universe {data.counts.universe} · rostered filtered {data.counts.rostered_filtered_from_universe} · season-killers dropped {data.counts.season_killer_dropped} · rookies hidden {data.counts.draft_pool_hidden} · protected top-{data.protected_from_drop.top_n_count}, handcuffs {data.protected_from_drop.handcuff_count} · open bench {data.open_bench_slots}
      </div>
      </>)}
    </div>
  );
}
