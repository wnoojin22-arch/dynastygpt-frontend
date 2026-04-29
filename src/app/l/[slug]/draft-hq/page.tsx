"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname, useParams } from "next/navigation";
import { C, SANS, MONO } from "@/components/league/tokens";
import { MOCK_ROOKIES, MOCK_USER_PICKS, MOCK_MANAGER_INTEL } from "./mocks";
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

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 6px", borderRadius: 3,
      background: `${POS_COLOR[pos]}20`, color: POS_COLOR[pos],
      border: `1px solid ${POS_COLOR[pos]}40`,
    }}>{pos}</span>
  );
}

function MockBanner() {
  return (
    <div style={{
      margin: "12px 0",
      padding: "8px 14px",
      borderRadius: 6,
      background: "rgba(212,165,50,0.08)",
      border: `1px solid ${C.goldBorder}`,
      fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.05em",
    }}>
      MOCK DATA — backend wiring in progress. Layout/structure for review only.
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 1 — YOUR PICKS
// ═════════════════════════════════════════════════════════════════════════
function YourPicks() {
  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {MOCK_USER_PICKS.map((p) => (
          <div key={p.slot} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 900, color: C.gold }}>
                  {p.slot}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.08em" }}>
                  PICK #{p.pick_num}
                </span>
              </div>
              {p.tier_cliff_after && (
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  padding: "3px 8px", borderRadius: 3,
                  background: "rgba(228,114,114,0.12)", color: C.red,
                  border: "1px solid rgba(228,114,114,0.30)",
                }}>TIER CLIFF AFTER</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.recommended.map((r, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center",
                  padding: "10px 12px", borderRadius: 6,
                  background: i === 0 ? "rgba(212,165,50,0.06)" : C.elevated,
                  border: `1px solid ${i === 0 ? C.goldBorder : C.border}`,
                }}>
                  <PosBadge pos={r.position} />
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary }}>
                      {r.name}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 2 }}>
                      {r.reason}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>RANK</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.primary }}>#{r.rank}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>FIT</div>
                    <div style={{
                      fontFamily: MONO, fontSize: 14, fontWeight: 800,
                      color: r.fit_score >= 85 ? C.green : r.fit_score >= 70 ? C.gold : C.dim,
                    }}>{r.fit_score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 2 — DRAFT BOARD
// ═════════════════════════════════════════════════════════════════════════
function DraftBoard() {
  const [posFilter, setPosFilter] = useState<Pos | "ALL">("ALL");
  const filtered = useMemo(
    () => posFilter === "ALL" ? MOCK_ROOKIES : MOCK_ROOKIES.filter((r) => r.position === posFilter),
    [posFilter],
  );

  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner />
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
// TAB 3 — DRAFT INTEL (per-manager — fields mirror /draft/owner-profiles + likely-buyers)
// ═════════════════════════════════════════════════════════════════════════
const IDENTITY_COLOR: Record<string, string> = {
  "DEVELOPER": "#7dd3a0",
  "PIPELINE BUILDER": "#6bb8e0",
  "GAMBLER": "#e09c6b",
  "INEFFICIENT": "#e47272",
  "BALANCED": "#b0b2c8",
};
const BAND_COLOR: Record<string, string> = {
  "HIGH": "#7dd3a0",
  "MEDIUM": "#d4a532",
  "LOW": "#9596a5",
  "UNLIKELY": "#e47272",
};

function DraftIntel() {
  const sorted = [...MOCK_MANAGER_INTEL].sort((a, b) => b.willingness.score - a.willingness.score);
  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 12,
      }}>
        {sorted.map((m) => {
          const identityColor = IDENTITY_COLOR[m.draft_identity] || C.dim;
          const bandColor = BAND_COLOR[m.willingness.band] || C.dim;
          return (
            <div key={m.owner_user_id} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14,
            }}>
              {/* Header — name + identity badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>
                  {m.owner}
                </div>
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                  padding: "3px 7px", borderRadius: 3,
                  background: `${identityColor}18`, color: identityColor,
                  border: `1px solid ${identityColor}30`,
                }}>{m.draft_identity}</span>
              </div>

              {/* Trade-up willingness — big number + band */}
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10,
                padding: "8px 10px", borderRadius: 4,
                background: `${bandColor}10`, border: `1px solid ${bandColor}28`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dim }}>
                  TRADE-UP
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900, color: bandColor }}>
                  {m.willingness.score}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: bandColor, letterSpacing: "0.06em" }}>
                  {m.willingness.band}
                </div>
              </div>

              {/* Hit/star/bust rates */}
              <StatRow label="HIT RATE"  ratio={m.hit_rate}  good />
              <StatRow label="STAR RATE" ratio={m.star_rate} good />
              <StatRow label="BUST RATE" ratio={m.bust_rate} bad  />

              {/* Round 1 position distribution */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dim, marginBottom: 4 }}>
                  R1 POSITIONS
                </div>
                <PosDistBar dist={m.round1_position_distribution} />
              </div>

              {/* Willingness factors + adapter signals */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                <FactorChip label="ACTIVITY" v={m.willingness.factors.activity} />
                <FactorChip label="WINDOW"   v={m.willingness.factors.window_alignment} />
                <FactorChip label="PANIC"    v={m.willingness.factors.panic_signal} />
                <FactorChip label="H2H"      v={m.willingness.factors.h2h_history} />
                <FactorChip label="DOWN-MOVE" v={Math.round(m.down_move_bias * 100)} />
                <FactorChip label="PICKS Δ" v={m.pick_surplus_delta} format="signed" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ label, ratio, good, bad }: { label: string; ratio: number; good?: boolean; bad?: boolean }) {
  const pct = Math.round(ratio * 100);
  const color = bad
    ? (pct >= 30 ? C.red : pct >= 20 ? C.orange : C.dim)
    : (pct >= 60 ? C.green : pct >= 40 ? C.gold : C.dim);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.dim, width: 80 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary, width: 32, textAlign: "right" }}>
        {pct}%
      </div>
    </div>
  );
}

function PosDistBar({ dist }: { dist: { QB: number; RB: number; WR: number; TE: number } }) {
  const order: Pos[] = ["QB", "RB", "WR", "TE"];
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 2, overflow: "hidden", border: `1px solid ${C.border}` }}>
      {order.map((p) => {
        const pct = dist[p] * 100;
        if (pct === 0) return null;
        return <div key={p} title={`${p} ${pct.toFixed(0)}%`} style={{ width: `${pct}%`, background: POS_COLOR[p] }} />;
      })}
    </div>
  );
}

function FactorChip({ label, v, format }: { label: string; v: number; format?: "signed" }) {
  const display = format === "signed" ? (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) : `${v}`;
  const c = format === "signed"
    ? (v > 0 ? C.green : v < 0 ? C.red : C.dim)
    : (v >= 70 ? C.gold : v >= 40 ? C.blue : C.dim);
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 6px", borderRadius: 3,
      background: `${c}12`, color: c, border: `1px solid ${c}26`,
    }}>{label} {display}</span>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TAB 4 — ROOKIES (profiles)
// ═════════════════════════════════════════════════════════════════════════
function Rookies() {
  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner />
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
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "your-picks";

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
        {tab === "your-picks"  && <YourPicks  />}
        {tab === "draft-board" && <DraftBoard />}
        {tab === "intel"       && <DraftIntel />}
        {tab === "rookies"     && <Rookies    />}
      </div>
    </div>
  );
}
