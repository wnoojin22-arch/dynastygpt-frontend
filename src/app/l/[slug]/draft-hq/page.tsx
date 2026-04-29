"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  getDraftHQYourPicks,
  getDraftOwnerProfiles,
  getDraftHQTendencies,
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
const BAND_COLOR: Record<string, string> = {
  "HIGH": "#7dd3a0",
  "MEDIUM": "#d4a532",
  "LOW": "#9596a5",
  "UNLIKELY": "#e47272",
};
const REC_COLOR: Record<string, string> = {
  "USE IT": "#7dd3a0",
  "PACKAGE IT": "#d4a532",
  "TRADE BACK": "#6bb8e0",
  "TRADE UP": "#e09c6b",
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
// TAB 1 — YOUR PICKS  (real data: GET /draft-hq/your-picks)
// ═════════════════════════════════════════════════════════════════════════
function YourPicks({ lid, owner, ownerId }: { lid: string; owner: string | null; ownerId: string | null }) {
  const enabled = !!lid && !!owner;
  const { data, isLoading, error } = useQuery({
    queryKey: ["draft-hq-your-picks", lid, owner, ownerId],
    queryFn: () => getDraftHQYourPicks(lid, owner!, ownerId, 3),
    staleTime: 300_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league/owner context — open this from your league dashboard." />;
  if (isLoading) return <EmptyMsg msg="Loading your picks…" />;
  if (error) return <EmptyMsg msg={`Error: ${(error as Error).message}`} />;

  const picks: any[] = data?.picks || [];
  const partners: any[] = data?.likely_partners || [];

  if (!picks.length) return <EmptyMsg msg="No upcoming picks found for this league." />;

  return (
    <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Picks block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {picks.map((p: any, i: number) => {
          const slotKey = p.slot_key || `${p.round}.${p.slot ? String(p.slot).padStart(2, "0") : "??"}`;
          const recColor = REC_COLOR[p.recommendation] || C.dim;
          const top3Pos = Object.entries(p.position_breakdown || {})
            .sort(([, a]: any, [, b]: any) => b - a).slice(0, 3);
          return (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
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
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  padding: "3px 8px", borderRadius: 3,
                  background: `${recColor}18`, color: recColor, border: `1px solid ${recColor}30`,
                }}>{p.recommendation}</span>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>HIT RATE</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 900, color: p.hit_rate >= 50 ? C.green : p.hit_rate >= 30 ? C.gold : C.dim }}>
                    {p.hit_rate}%
                  </div>
                </div>
                {top3Pos.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>COMMON POSITIONS HERE</div>
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
                  </div>
                )}
              </div>

              <div style={{
                fontFamily: SANS, fontSize: 12, color: C.primary, lineHeight: 1.5,
                paddingTop: 8, borderTop: `1px solid ${C.border}`,
              }}>{p.reasoning}</div>
            </div>
          );
        })}
      </div>

      {/* Likely partners block */}
      <div>
        <div style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em",
          color: C.primary, marginBottom: 8,
        }}>LIKELY TRADE PARTNERS</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginBottom: 10 }}>
          Ranked by behavioral willingness to trade up to your slot.
        </div>
        {partners.length === 0 ? (
          <EmptyMsg msg="No partner signals yet — needs league_intel + behavioral_intel populated." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {partners.map((b: any, i: number) => {
              const score = b.willingness?.score ?? 0;
              const band = b.willingness?.band || "—";
              const bandColor = BAND_COLOR[band] || C.dim;
              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px",
                  display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>
                      {b.partner_owner}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 2 }}>
                      {b.window || "—"}
                      {b.pick_surplus_delta != null && (
                        <> · picks Δ {b.pick_surplus_delta > 0 ? "+" : ""}{b.pick_surplus_delta}</>
                      )}
                      {b.down_move_bias != null && (
                        <> · down-move {Math.round(b.down_move_bias * 100)}%</>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>SCORE</div>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 900, color: bandColor }}>{score}</div>
                  </div>
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                    padding: "3px 7px", borderRadius: 3,
                    background: `${bandColor}15`, color: bandColor, border: `1px solid ${bandColor}30`,
                  }}>{band}</span>
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
// TAB 3 — DRAFT INTEL  (real data: GET /draft/owner-profiles)
// ═════════════════════════════════════════════════════════════════════════
function DraftIntel({ lid }: { lid: string }) {
  const enabled = !!lid;
  const { data, isLoading, error } = useQuery({
    queryKey: ["draft-hq-owner-profiles", lid],
    queryFn: () => getDraftOwnerProfiles(lid),
    staleTime: 600_000,
    enabled,
  });
  const tend = useQuery({
    queryKey: ["draft-hq-tendencies", lid],
    queryFn: () => getDraftHQTendencies(lid),
    staleTime: 600_000,
    enabled,
  });

  if (!enabled) return <EmptyMsg msg="No league context." />;
  if (isLoading) return <EmptyMsg msg="Loading owner profiles…" />;
  if (error) return <EmptyMsg msg={`Error: ${(error as Error).message}`} />;

  const profiles: any[] = data?.profiles || [];
  if (!profiles.length) return <EmptyMsg msg="No owner profiles available." />;

  const t = tend.data?.tendencies;
  const fallback = tend.data?.fallback;

  return (
    <div style={{ padding: "20px 0" }}>
      {/* League tendencies card */}
      {t && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 14, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: C.primary }}>
              LEAGUE DRAFT TENDENCIES
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>
              {t.sample_size} picks · {(t.seasons || []).join("+")}
              {fallback === "global" && " · global baseline (no league cache yet)"}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <TendencyStat label="TE PREMIUM"  v={t.te_premium}    fmt="round"  />
            <TendencyStat label="QB EARLY"    v={t.qb_early}      fmt="round"  />
            <TendencyStat label="R1 RB BIAS"  v={t.rb_heavy_r1}   fmt="ratio"  />
          </div>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 12,
      }}>
        {profiles.map((m: any) => {
          const identityColor = IDENTITY_COLOR[m.draft_identity] || C.dim;
          return (
            <div key={m.owner_user_id || m.owner} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14,
            }}>
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

              <StatRow label="HIT RATE"  pct={m.hit_rate}  good />
              <StatRow label="STAR RATE" pct={m.star_rate} good />
              <StatRow label="BUST RATE" pct={m.bust_rate} bad />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dim, marginBottom: 4 }}>
                  R1 POSITIONS
                </div>
                <PosDistBar dist={m.round1_position_distribution || {}} />
              </div>

              <div style={{
                display: "flex", gap: 14, marginTop: 10,
                fontFamily: MONO, fontSize: 10, color: C.dim,
              }}>
                <span><span style={{ color: C.gold, fontWeight: 700 }}>{m.stars}</span> stars</span>
                <span><span style={{ color: C.green, fontWeight: 700 }}>{m.hits}</span> hits</span>
                <span><span style={{ color: C.red, fontWeight: 700 }}>{m.busts}</span> busts</span>
                <span style={{ marginLeft: "auto" }}>{m.total_picks} picks</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ label, pct, good, bad }: { label: string; pct: number; good?: boolean; bad?: boolean }) {
  const color = bad
    ? (pct >= 30 ? C.red : pct >= 20 ? C.orange : C.dim)
    : (pct >= 60 ? C.green : pct >= 40 ? C.gold : C.dim);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.dim, width: 80 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary, width: 32, textAlign: "right" }}>
        {pct}%
      </div>
    </div>
  );
}

function PosDistBar({ dist }: { dist: Record<string, number> }) {
  const order: Pos[] = ["QB", "RB", "WR", "TE"];
  const total = order.reduce((s, p) => s + (dist[p] || 0), 0) || 1;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 2, overflow: "hidden", border: `1px solid ${C.border}` }}>
      {order.map((p) => {
        const pct = ((dist[p] || 0) / total) * 100;
        if (pct === 0) return null;
        return <div key={p} title={`${p} ${pct.toFixed(0)}%`} style={{ width: `${pct}%`, background: POS_COLOR[p] }} />;
      })}
    </div>
  );
}

function TendencyStat({ label, v, fmt }: { label: string; v: number | null; fmt: "round" | "ratio" }) {
  if (v == null) {
    return (
      <div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.dim }}>—</div>
      </div>
    );
  }
  const color = v > 0 ? C.green : v < 0 ? C.red : C.dim;
  const display = fmt === "round"
    ? `${v > 0 ? "+" : ""}${v.toFixed(2)} rd`
    : `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color }}>{display}</div>
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
