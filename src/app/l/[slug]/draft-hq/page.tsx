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
// TAB 3 — DRAFT INTEL (per-manager tendencies)
// ═════════════════════════════════════════════════════════════════════════
function DraftIntel() {
  const sorted = [...MOCK_MANAGER_INTEL].sort((a, b) => b.trade_up_willingness - a.trade_up_willingness);
  return (
    <div style={{ padding: "20px 0" }}>
      <MockBanner />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}>
        {sorted.map((m) => (
          <div key={m.user_id} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: C.primary }}>
                {m.name}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.dim,
              }}>
                TRADE-UP <span style={{
                  color: m.trade_up_willingness >= 70 ? C.green : m.trade_up_willingness >= 40 ? C.gold : C.dim,
                  fontWeight: 800, marginLeft: 4,
                }}>{m.trade_up_willingness}</span>
              </div>
            </div>
            <StatRow label="REACH RATE"   value={m.reach_rate}        suffix="%" />
            <StatRow label="PICK-TRADER"  value={m.pick_trade_rate}   suffix="%" />
            <StatRow label="QB-EARLY"     value={m.qb_early_score} />
            <StatRow label="TE-PREMIUM"   value={m.te_premium_score} />
            {m.recent_move && (
              <div style={{
                marginTop: 10, padding: "6px 8px", borderRadius: 4,
                background: C.elevated, border: `1px solid ${C.border}`,
                fontFamily: MONO, fontSize: 10, color: C.secondary, lineHeight: 1.4,
              }}>{m.recent_move}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: C.dim, width: 90 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
        <div style={{
          width: `${value}%`, height: "100%",
          background: value >= 70 ? C.gold : value >= 40 ? C.blue : C.dim,
        }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary, width: 36, textAlign: "right" }}>
        {value}{suffix || ""}
      </div>
    </div>
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
