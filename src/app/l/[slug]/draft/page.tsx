"use client";

/**
 * UNIFIED DRAFT ROOM — 4 tabs, mobile-first.
 * Tab 1: MY DRAFT ROOM (personal profile + pick intel)
 * Tab 2: LEAGUE REPORT (league-wide analytics, expandable sections)
 * Tab 3: OWNERS (per-owner profiles with hit rate rings)
 * Tab 4: DRAFT BOARD (full history by season)
 */
import { useState, useMemo } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getDraftHistory, getDraftHitRates, getDraftOwnerProfiles,
  getDraftGrades, getDraftPickIntel, getDraftDayTrades,
} from "@/lib/api";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { C, SANS, MONO, SERIF, fmt, posColor } from "@/components/league/tokens";
import { ChevronDown } from "lucide-react";

// ── Tab definitions ─────────────────────────────────────────────────────

const TABS = [
  { id: "room", label: "MY DRAFT ROOM" },
  { id: "league", label: "LEAGUE REPORT" },
  { id: "owners", label: "OWNERS" },
  { id: "board", label: "DRAFT BOARD" },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Shared helpers ──────────────────────────────────────────────────────

const POS_C: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
const LABEL_COLORS: Record<string, string> = { Star: C.gold, Hit: C.green, Miss: C.orange, Bust: C.red, "Too Early": C.dim };
const LABEL_BG: Record<string, string> = { Star: "#d4a53218", Hit: "#7dd3a018", Miss: "#e09c6b18", Bust: "#e4727218" };
const GRADE_C: Record<string, string> = { "A+": "#7dd3a0", A: "#7dd3a0", "A-": "#7dd3a0", "B+": "#6bb8e0", B: "#6bb8e0", "B-": "#6bb8e0", "C+": "#d4a532", C: "#d4a532", "C-": "#d4a532", "D+": "#e09c6b", D: "#e09c6b", "D-": "#e09c6b", F: "#e47272" };
function gradeCol(g: string) { return GRADE_C[g] || (g?.startsWith("A") ? "#7dd3a0" : g?.startsWith("B") ? "#6bb8e0" : g?.startsWith("C") ? "#d4a532" : g?.startsWith("D") ? "#e09c6b" : g === "F" ? "#e47272" : C.dim); }
const REC_C: Record<string, string> = { "USE IT": "#7dd3a0", "PACKAGE IT": "#d4a532", "TRADE BACK": "#6bb8e0", "TRADE UP": "#EF4444" };
const IDENTITY_C: Record<string, string> = { DEVELOPER: "#7dd3a0", "PIPELINE BUILDER": "#d4a532", GAMBLER: "#e47272", INEFFICIENT: "#9596a5", BALANCED: "#6bb8e0" };

function hrColor(r: number) { return r >= 50 ? C.green : r >= 30 ? C.gold : C.red; }

function PosBadge({ pos }: { pos: string }) {
  const pc = posColor(pos);
  return <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: pc, background: `${pc}18`, padding: "1px 5px", borderRadius: 3 }}>{pos}</span>;
}

function LabelBadge({ label }: { label: string }) {
  const color = LABEL_COLORS[label] || C.dim;
  return <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "1px 4px", borderRadius: 2, letterSpacing: "0.04em" }}>{label.toUpperCase()}</span>;
}

function DCard({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
        {right}
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}` }}>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: color || C.primary, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: C.dim, marginTop: 3 }}>{label}</div>
    </div>
  );
}

/** Expandable pill section */
function Pill({ title, defaultOpen, color, children }: { title: string; defaultOpen?: boolean; color?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const ac = color || C.gold;
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${open ? `${ac}30` : C.border}`, background: C.card, transition: "border-color 0.2s" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px", background: open ? `${ac}06` : "transparent", border: "none", cursor: "pointer", transition: "background 0.2s",
      }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: ac, flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: open ? ac : C.secondary, flex: 1, textAlign: "left" }}>{title}</span>
        <ChevronDown size={14} style={{ color: open ? ac : C.dim, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}>{children}</div>}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1: MY DRAFT ROOM — personal profile + pick intel
   ═══════════════════════════════════════════════════════════════════════════ */

function MyDraftRoomTab({ lid, seasons, owner, ownerId }: { lid: string; seasons: any[]; owner: string; ownerId?: string | null }) {
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  // ── Personal profile (computed from draft history) ──
  const profile = useMemo(() => {
    const ownerLower = owner.toLowerCase();
    const myPicks: any[] = [];
    for (const s of seasons) {
      for (const p of s.picks) {
        const isMe = (ownerId && p.owner_user_id && p.owner_user_id === ownerId)
          || (p.owner || "").toLowerCase() === ownerLower;
        if (isMe) myPicks.push({ ...p, _season: s.season });
      }
    }

    // Separate rookie draft picks (R1-4) from startup picks (R5+)
    const rookiePicks = myPicks.filter(p => p.round <= 4);
    const startupPicks = myPicks.filter(p => p.round > 4);

    const total = rookiePicks.length;
    const MISS_LABELS = ["Bust", "Miss", "Concerning"];
    const SKIP_LABELS = ["Too Early", "Pending"];
    const evaluated = rookiePicks.filter(p => !SKIP_LABELS.includes(p.label)).length;
    const stars = rookiePicks.filter(p => p.label === "Star").length;
    const hitCount = rookiePicks.filter(p => !MISS_LABELS.includes(p.label) && !SKIP_LABELS.includes(p.label)).length;
    const busts = rookiePicks.filter(p => p.label === "Bust").length;
    const misses = rookiePicks.filter(p => MISS_LABELS.includes(p.label)).length;
    const hitRate = evaluated > 0 ? Math.round(hitCount / evaluated * 100) : 0;
    const startupCount = startupPicks.length;

    const byRound: Record<number, { total: number; hits: number }> = {};
    for (const p of rookiePicks) {
      if (p.label === "Too Early") continue;
      if (!byRound[p.round]) byRound[p.round] = { total: 0, hits: 0 };
      byRound[p.round].total++;
      if (!["Bust", "Miss", "Concerning"].includes(p.label)) byRound[p.round].hits++;
    }
    const roundStats = Object.entries(byRound)
      .map(([r, s]) => ({ round: Number(r), ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => a.round - b.round);

    const byPos: Record<string, { total: number; hits: number }> = {};
    for (const p of rookiePicks) {
      if (p.label === "Too Early") continue;
      const pos = p.position || "?";
      if (!byPos[pos]) byPos[pos] = { total: 0, hits: 0 };
      byPos[pos].total++;
      if (!["Bust", "Miss", "Concerning"].includes(p.label)) byPos[pos].hits++;
    }
    const posStats = Object.entries(byPos)
      .map(([pos, s]) => ({ pos, ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    const sorted = [...rookiePicks].sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
    const best = sorted.slice(0, 3);
    const worst = [...rookiePicks].filter(p => p.label === "Bust").sort((a, b) => (a.current_value || 0) - (b.current_value || 0)).slice(0, 3);
    const topPos = posStats.slice(0, 2).map(p => p.pos);
    const totalValue = rookiePicks.reduce((s, p) => s + (p.current_value || 0), 0);
    const seasonsActive = [...new Set(myPicks.map(p => p._season))].length;

    return { total, stars, hits: hitCount, busts, misses, hitRate, roundStats, posStats, best, worst, topPos, totalValue, seasonsActive, evaluated, startupCount };
  }, [seasons, owner, ownerId]);

  // ── Pick intel (from API) ──
  const { data: pickIntelData } = useQuery({
    queryKey: ["draft-pick-intel", lid, owner],
    queryFn: () => getDraftPickIntel(lid, owner),
    enabled: !!lid && !!owner,
    staleTime: 300_000,
  });
  const pickIntel: any[] = pickIntelData?.picks || [];

  if (profile.total === 0) {
    return <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>No draft picks found for {owner}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Hero stats */}
      <div className="flex gap-1.5">
        <StatBox value={String(profile.total)} label="PICKS" />
        <StatBox value={`${profile.hitRate}%`} label="HIT RATE" color={hrColor(profile.hitRate)} />
        <StatBox value={String(profile.stars)} label="STARS" color={C.gold} />
        <StatBox value={fmt(profile.totalValue)} label="VALUE" color={C.gold} />
      </div>

      {/* Hit rate by round */}
      <DCard label="HIT RATE BY ROUND">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(profile.roundStats.length, 4)}, 1fr)`, gap: 6 }}>
          {profile.roundStats.map((r) => (
            <div key={r.round} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 6, background: `${hrColor(r.rate)}08`, border: `1px solid ${hrColor(r.rate)}20` }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: hrColor(r.rate) }}>{r.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: hrColor(r.rate), marginTop: 2 }}>RD {r.round}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{r.hits}/{r.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* Hit rate by position */}
      <DCard label="HIT RATE BY POSITION">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(profile.posStats.filter(p => p.pos !== "?").length, 4)}, 1fr)`, gap: 6 }}>
          {profile.posStats.filter(p => p.pos !== "?").map((p) => (
            <div key={p.pos} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 6, background: `${posColor(p.pos)}08`, border: `1px solid ${posColor(p.pos)}20` }}>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: posColor(p.pos) }}>{p.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(p.pos), marginTop: 1 }}>{p.pos}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{p.hits}/{p.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* Best picks */}
      <DCard label="BEST PICKS" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.green }}>TOP 3</span>}>
        {profile.best.map((p: any, i: number) => (
          <div key={i} onClick={() => p.player_name && openPlayerCard(p.player_name)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
            borderBottom: i < profile.best.length - 1 ? `1px solid ${C.white08}` : "none", cursor: p.player_name ? "pointer" : "default",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, width: 24 }}>{p.round}.{String(p.slot).padStart(2, "0")}</span>
            <PosBadge pos={p.position || "?"} />
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>{p.player_name}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold }}>{fmt(p.current_value)}</span>
            <LabelBadge label={p.label} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{p._season}</span>
          </div>
        ))}
      </DCard>

      {/* Worst picks */}
      {profile.worst.length > 0 && (
        <DCard label="WORST PICKS" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.red }}>BUSTS</span>}>
          {profile.worst.map((p: any, i: number) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
              borderBottom: i < profile.worst.length - 1 ? `1px solid ${C.white08}` : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, width: 24 }}>{p.round}.{String(p.slot).padStart(2, "0")}</span>
              <PosBadge pos={p.position || "?"} />
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.red, flex: 1 }}>{p.player_name}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim }}>{fmt(p.current_value)}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{p._season}</span>
            </div>
          ))}
        </DCard>
      )}

      {/* Draft tendencies */}
      <DCard label="DRAFT TENDENCIES">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {profile.topPos.length > 0 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Targets <span style={{ fontWeight: 700, color: posColor(profile.topPos[0]) }}>{profile.topPos[0]}</span>
              {profile.topPos[1] && <> and <span style={{ fontWeight: 700, color: posColor(profile.topPos[1]) }}>{profile.topPos[1]}</span></>} most
            </div>
          )}
          {profile.roundStats[0] && profile.roundStats[0].rate >= 50 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.green }}>Strong Round 1 drafter ({profile.roundStats[0].rate}% hit rate)</div>
          )}
          {profile.roundStats[0] && profile.roundStats[0].rate < 30 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.red }}>Struggles in Round 1 ({profile.roundStats[0].rate}% hit rate) — consider trading down</div>
          )}
          {profile.busts > profile.stars && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.orange }}>More busts ({profile.busts}) than stars ({profile.stars}) — prioritize proven talent over upside picks</div>
          )}
          {profile.hitRate >= 50 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.green }}>Elite drafter — {profile.hitRate}% hit rate across {profile.seasonsActive} seasons. Keep doing what you&apos;re doing.</div>
          )}
        </div>
      </DCard>

      {/* ── PICK INTEL (ported from DraftRoom.tsx MyDraftRoomTab) ── */}
      {pickIntel.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ height: 1, flex: 1, background: C.border }} />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>PICK INTEL</span>
            <div style={{ height: 1, flex: 1, background: C.border }} />
          </div>

          {pickIntel.map((p: any, i: number) => {
            const recColor = REC_C[p.recommendation] || C.dim;
            const posEntries = Object.entries(p.position_breakdown || {}).sort(([, a]: any, [, b]: any) => b - a);
            return (
              <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card }}>
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.elevated }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 900, color: C.primary }}>{p.season} R{p.round}{p.slot ? `.${String(p.slot).padStart(2, "0")}` : ""}</span>
                    {!p.is_own_pick && <span style={{ fontFamily: MONO, fontSize: 8, padding: "1px 6px", borderRadius: 3, background: "#6bb8e015", color: "#6bb8e0" }}>ACQUIRED</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 6, letterSpacing: "0.06em", color: recColor, background: `${recColor}15`, border: `1px solid ${recColor}30` }}>
                    {p.recommendation}
                  </span>
                </div>
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.5, margin: 0 }}>{p.reasoning}</p>
                  <div style={{ display: "flex", gap: 12, fontFamily: MONO, fontSize: 10 }}>
                    <span>Hit rate: <span style={{ fontWeight: 700, color: hrColor(p.hit_rate) }}>{p.hit_rate}%</span></span>
                    {p.roster_need && <span>Need: <span style={{ fontWeight: 700, color: POS_C[p.roster_need] }}>{p.roster_need}</span></span>}
                  </div>
                  {posEntries.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {posEntries.slice(0, 4).map(([pos, pct]: [string, any]) => (
                        <div key={pos} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4, background: C.elevated }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: POS_C[pos] || C.dim }}>{pos}</span>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2: LEAGUE REPORT — league-wide analytics with expandable pills
   ═══════════════════════════════════════════════════════════════════════════ */

function LeagueReportTab({ lid, seasons, owner }: { lid: string; seasons: any[]; owner: string }) {
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const { data: hitRates } = useQuery({ queryKey: ["draft-hit-rates", lid], queryFn: () => getDraftHitRates(lid), staleTime: 600_000 });
  const { data: grades } = useQuery({ queryKey: ["draft-grades", lid], queryFn: () => getDraftGrades(lid), staleTime: 600_000 });
  const { data: ddt } = useQuery({ queryKey: ["draft-day-trades", lid], queryFn: () => getDraftDayTrades(lid), staleTime: 600_000 });

  const league = hitRates?.league || {};
  const global = hitRates?.global || {};
  const byRound = league.by_round || [];
  const globalByRound = global.by_round || [];

  // Compute league-wide stats from seasons data
  const allPicks = useMemo(() => {
    const picks: any[] = [];
    for (const s of seasons) for (const p of s.picks) picks.push({ ...p, _season: s.season });
    return picks;
  }, [seasons]);

  const stats = useMemo(() => {
    const MISS_L = ["Bust", "Miss", "Concerning"];
    const SKIP_L = ["Too Early", "Pending"];
    const evaluated = allPicks.filter(p => !SKIP_L.includes(p.label)).length;
    const total = allPicks.length;
    const stars = allPicks.filter(p => p.label === "Star").length;
    const hitCount = allPicks.filter(p => !MISS_L.includes(p.label) && !SKIP_L.includes(p.label)).length;
    const busts = allPicks.filter(p => p.label === "Bust").length;
    const hitRate = evaluated > 0 ? Math.round(hitCount / evaluated * 100) : 0;

    // Hit rate by position
    const byPos: Record<string, { total: number; hits: number }> = {};
    for (const p of allPicks) {
      const pos = p.position || "?";
      if (!byPos[pos]) byPos[pos] = { total: 0, hits: 0 };
      byPos[pos].total++;
      if (!["Bust", "Miss", "Concerning"].includes(p.label)) byPos[pos].hits++;
    }
    const posStats = Object.entries(byPos)
      .map(([pos, s]) => ({ pos, ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Draft power rankings (by user_id)
    const _uidName: Record<string, string> = {};
    for (const p of allPicks) { if (p.owner_user_id && p.owner) _uidName[p.owner_user_id] = p.owner; }
    const ownerHR: Record<string, { total: number; hits: number; name: string }> = {};
    for (const p of allPicks) {
      const key = p.owner_user_id || p.owner || "?";
      const name = p.owner_user_id ? (_uidName[p.owner_user_id] || p.owner || "?") : (p.owner || "?");
      if (!ownerHR[key]) ownerHR[key] = { total: 0, hits: 0, name };
      ownerHR[key].total++; ownerHR[key].name = name;
      if (p.label === "Star" || p.label === "Hit") ownerHR[key].hits++;
    }
    const ownerRanked = Object.entries(ownerHR).filter(([, s]) => s.total >= 5)
      .map(([, s]) => ({ name: s.name, total: s.total, hits: s.hits, rate: Math.round(s.hits / s.total * 100) }))
      .sort((a, b) => b.rate - a.rate);

    // League records
    const mvp = [...allPicks].sort((a, b) => (b.current_value || 0) - (a.current_value || 0))[0];
    const biggestBust = allPicks.filter(p => p.label === "Bust" && p.round <= 2).sort((a, b) => a.round - b.round || a.slot - b.slot)[0];
    const starsBySeason: Record<number, number> = {};
    for (const p of allPicks) if (p.label === "Star") starsBySeason[p._season] = (starsBySeason[p._season] || 0) + 1;
    const bestDraftClass = Object.entries(starsBySeason).sort((a, b) => b[1] - a[1])[0];

    return { total, stars, hits: hitCount, busts, hitRate, posStats, ownerRanked, mvp, biggestBust, bestDraftClass };
  }, [allPicks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Hero */}
      <div className="flex gap-1.5">
        <StatBox value={String(stats.total)} label="TOTAL PICKS" />
        <StatBox value={`${stats.hitRate}%`} label="LEAGUE HIT" color={hrColor(stats.hitRate)} />
        <StatBox value={String(stats.stars)} label="STARS" color={C.gold} />
        <StatBox value={String(seasons.length)} label="DRAFTS" />
      </div>

      {/* League hit rate by round — colored pills with global comparison */}
      <DCard label="HIT RATE BY ROUND" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>vs GLOBAL</span>}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(byRound.filter((r: any) => r.round <= 4).length, 4)}, 1fr)`, gap: 6 }}>
          {byRound.filter((r: any) => r.round <= 4).map((r: any) => {
            const gr = globalByRound.find((g: any) => g.round === r.round);
            const gPct = gr?.hit_pct || 0;
            const diff = r.hit_pct - gPct;
            const rc = hrColor(r.hit_pct);
            return (
              <div key={r.round} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 6, background: `${rc}08`, border: `1px solid ${rc}20` }}>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: rc }}>{r.hit_pct}%</div>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: rc, marginTop: 2 }}>RD {r.round}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{r.stars}★ {r.hits}✓ / {r.total}</div>
                {gPct > 0 && (
                  <div style={{
                    fontFamily: MONO, fontSize: 8, marginTop: 3,
                    color: diff > 0 ? C.green : diff < 0 ? C.red : C.dim,
                  }}>{diff > 0 ? "+" : ""}{diff}% avg</div>
                )}
              </div>
            );
          })}
        </div>
      </DCard>

      {/* Hit rate by position */}
      <DCard label="HIT RATE BY POSITION">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.posStats.filter(p => p.pos !== "?").length, 4)}, 1fr)`, gap: 6 }}>
          {stats.posStats.filter(p => p.pos !== "?").map((p) => (
            <div key={p.pos} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 6, background: `${posColor(p.pos)}08`, border: `1px solid ${posColor(p.pos)}20` }}>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: posColor(p.pos) }}>{p.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(p.pos), marginTop: 1 }}>{p.pos}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{p.hits}/{p.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* Expandable pills */}
      <Pill title="DRAFT POWER RANKINGS" color={C.gold}>
        {stats.ownerRanked.slice(0, 8).map((o, idx) => {
          const isMe = o.name.toLowerCase() === owner.toLowerCase();
          return (
            <div key={o.name} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
              borderBottom: idx < stats.ownerRanked.length - 1 ? `1px solid ${C.white08}` : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: idx === 0 ? C.gold : C.dim, width: 20 }}>#{idx + 1}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? C.gold : C.primary, flex: 1 }}>{o.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: hrColor(o.rate) }}>{o.rate}%</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{o.hits}/{o.total}</span>
            </div>
          );
        })}
      </Pill>

      <Pill title="DRAFT CLASS GRADES" color={C.green}>
        {grades?.seasons?.slice(0, 5).map((s: any) => (
          <div key={s.season} style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 4 }}>{s.season}</div>
            {s.mvp_pick && (
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginBottom: 6 }}>
                MVP: <span style={{ color: C.gold, fontWeight: 700 }}>{s.mvp_pick.player}</span> ({s.mvp_pick.year1_ppg} PPG)
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.grades?.slice(0, 12).map((g: any) => (
                <div key={g.owner} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: gradeCol(g.grade) }}>{g.grade}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.owner}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Pill>

      {ddt && ddt.total_trades > 0 && (
        <Pill title={`DRAFT DAY TRADES (${ddt.total_trades})`} color={C.orange}>
          {ddt.trades?.slice(0, 8).map((t: any) => (
            <div key={t.trade_id} style={{ padding: "6px 0", borderBottom: `1px solid ${C.white08}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{t.season}</span>
                <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary }}>{t.owner} ↔ {t.counter_party}</span>
              </div>
              <div style={{ display: "flex", gap: 8, fontFamily: MONO, fontSize: 9 }}>
                <span style={{ color: C.red }}>Gave: {[...(t.players_sent || []), ...(t.picks_sent || []).map((p: string) => p.replace(/\s*\([^)]*\)/g, ""))].join(", ") || "—"}</span>
                <span style={{ color: C.green }}>Got: {[...(t.players_received || []), ...(t.picks_received || []).map((p: string) => p.replace(/\s*\([^)]*\)/g, ""))].join(", ") || "—"}</span>
              </div>
            </div>
          ))}
        </Pill>
      )}

      {/* League records */}
      <DCard label="LEAGUE RECORDS">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats.mvp && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Most Valuable Pick: <span style={{ fontWeight: 700, color: C.gold, cursor: "pointer" }} onClick={() => openPlayerCard(stats.mvp.player_name)}>{stats.mvp.player_name}</span>
              <span style={{ color: C.dim }}> — {stats.mvp.round}.{String(stats.mvp.slot).padStart(2, "0")} by {stats.mvp.owner} ({stats.mvp._season})</span>
              <span style={{ fontWeight: 700, color: C.gold }}> {fmt(stats.mvp.current_value)}</span>
            </div>
          )}
          {stats.biggestBust && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Biggest Bust: <span style={{ fontWeight: 700, color: C.red }}>{stats.biggestBust.player_name}</span>
              <span style={{ color: C.dim }}> — {stats.biggestBust.round}.{String(stats.biggestBust.slot).padStart(2, "0")} by {stats.biggestBust.owner} ({stats.biggestBust._season})</span>
            </div>
          )}
          {stats.bestDraftClass && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Best Draft Class: <span style={{ fontWeight: 700, color: C.green }}>{stats.bestDraftClass[0]}</span>
              <span style={{ color: C.dim }}> — {stats.bestDraftClass[1]} stars found</span>
            </div>
          )}
        </div>
      </DCard>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3: OWNERS — per-owner profiles with hit rate rings
   (ported from DraftRoom.tsx OwnersTab)
   ═══════════════════════════════════════════════════════════════════════════ */

function OwnersTab({ lid }: { lid: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["draft-owner-profiles", lid], queryFn: () => getDraftOwnerProfiles(lid), staleTime: 600_000 });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading owner profiles...</div>;

  const profiles: any[] = data?.profiles || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {profiles.map((p: any) => {
        const isExpanded = expanded === (p.owner_user_id || p.owner);
        const hitPct = p.hit_rate;
        const circumference = 2 * Math.PI * 36;
        const arc = (hitPct / 100) * circumference;
        const ringColor = hrColor(hitPct);

        return (
          <div key={p.owner_user_id || p.owner} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card }}>
            <button
              onClick={() => setExpanded(isExpanded ? null : (p.owner_user_id || p.owner))}
              style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            >
              {/* Hit rate ring */}
              <svg width="70" height="70" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
                <circle cx="40" cy="40" r="36" fill="none" stroke={C.border} strokeWidth="4" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={ringColor} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${arc} ${circumference}`} transform="rotate(-90 40 40)" />
                <text x="40" y="37" textAnchor="middle" fill={ringColor} fontSize="18" fontWeight="900" fontFamily="'JetBrains Mono', monospace">{hitPct}%</text>
                <text x="40" y="50" textAnchor="middle" fill={C.dim} fontSize="7" fontFamily="monospace">HIT RATE</text>
              </svg>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner}</span>
                  <span style={{
                    fontFamily: MONO, fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 3, letterSpacing: "0.06em",
                    color: IDENTITY_C[p.draft_identity] || C.dim, background: `${IDENTITY_C[p.draft_identity] || C.dim}15`,
                  }}>{p.draft_identity}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontFamily: MONO, fontSize: 10 }}>
                  <span><span style={{ color: C.gold, fontWeight: 700 }}>{p.stars}</span> <span style={{ color: C.dim }}>stars</span></span>
                  <span><span style={{ color: C.green, fontWeight: 700 }}>{p.hits}</span> <span style={{ color: C.dim }}>hits</span></span>
                  <span><span style={{ color: C.red, fontWeight: 700 }}>{p.busts}</span> <span style={{ color: C.dim }}>busts</span></span>
                  <span style={{ color: C.dim }}>{p.total_picks} picks</span>
                </div>
                {/* Position bars */}
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {Object.entries(p.position_distribution || {}).map(([pos, pct]: [string, any]) => (
                    <div key={pos} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: POS_C[pos] || C.dim }}>{pos}</span>
                      <div style={{ height: 4, borderRadius: 2, width: `${Math.max(pct, 8)}px`, background: POS_C[pos] || C.dim }} />
                      <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {p.best_pick && (
                    <div style={{ padding: 10, borderRadius: 6, background: `${C.green}08`, border: `1px solid ${C.green}20` }}>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.08em", marginBottom: 3 }}>BEST PICK</div>
                      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>{p.best_pick.player}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>
                        {p.best_pick.season} R{p.best_pick.round}.{String(p.best_pick.slot).padStart(2, "0")} · <span style={{ color: LABEL_COLORS[p.best_pick.label] }}>{p.best_pick.label}</span>
                      </div>
                    </div>
                  )}
                  {p.worst_pick && (
                    <div style={{ padding: 10, borderRadius: 6, background: `${C.red}08`, border: `1px solid ${C.red}20` }}>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.08em", marginBottom: 3 }}>WORST PICK</div>
                      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>{p.worst_pick.player}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 2 }}>
                        {p.worst_pick.season} R{p.worst_pick.round}.{String(p.worst_pick.slot).padStart(2, "0")} · <span style={{ color: LABEL_COLORS[p.worst_pick.label] }}>{p.worst_pick.label}</span>
                      </div>
                    </div>
                  )}
                </div>
                {p.stars > 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                    Stars: <span style={{ color: C.green, fontWeight: 700 }}>{p.stars_kept} kept</span> · <span style={{ color: C.red, fontWeight: 700 }}>{p.stars_flipped} flipped</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 4: DRAFT BOARD — full history by season
   ═══════════════════════════════════════════════════════════════════════════ */

function DraftBoardTab({ seasons, owner, ownerId }: { seasons: any[]; owner: string; ownerId?: string | null }) {
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.season || 2025);
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  const seasonData = seasons.find((s: any) => s.season === selectedSeason);
  const picks = seasonData?.picks || [];

  const byRound: Record<number, any[]> = {};
  for (const p of picks) {
    if (!byRound[p.round]) byRound[p.round] = [];
    byRound[p.round].push(p);
  }
  const rounds = Object.keys(byRound).map(Number).sort();

  const labels = picks.reduce((acc: Record<string, number>, p: any) => {
    acc[p.label] = (acc[p.label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Season selector */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {seasons.map((s: any) => (
          <button key={s.season} onClick={() => setSelectedSeason(s.season)} style={{
            padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            background: selectedSeason === s.season ? C.goldDim : C.elevated,
            color: selectedSeason === s.season ? C.gold : C.dim,
            fontFamily: MONO, fontSize: 12, fontWeight: 800,
            borderBottom: selectedSeason === s.season ? `2px solid ${C.gold}` : "2px solid transparent",
          }}>
            {s.season}
          </button>
        ))}
      </div>

      {/* Season summary */}
      <div style={{ display: "flex", gap: 6 }}>
        <StatBox value={String(picks.length)} label="PICKS" />
        <StatBox value={String(labels.Star || 0)} label="STARS" color={C.gold} />
        <StatBox value={String(labels.Hit || 0)} label="HITS" color={C.green} />
        <StatBox value={String(labels.Bust || 0)} label="BUSTS" color={C.red} />
      </div>

      {/* Draft grid */}
      {rounds.map((round) => {
        const roundPicks = byRound[round].sort((a: any, b: any) => a.slot - b.slot);
        return (
          <div key={round}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: C.elevated,
              borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 900, color: C.gold, letterSpacing: "0.08em" }}>ROUND {round}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roundPicks.length} picks</span>
            </div>
            {roundPicks.map((p: any, idx: number) => {
              const isOwner = owner && ((ownerId && p.owner_user_id === ownerId) || p.owner?.toLowerCase() === owner.toLowerCase());
              return (
                <div key={`${p.slot}-${idx}`}
                  onClick={() => p.player_name && openPlayerCard(p.player_name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    borderBottom: `1px solid ${C.white08}`,
                    borderLeft: isOwner ? `3px solid ${C.gold}` : "3px solid transparent",
                    background: isOwner ? C.goldDim : "transparent",
                    cursor: p.player_name ? "pointer" : "default",
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim, width: 28, textAlign: "center" }}>
                    {round}.{String(p.slot).padStart(2, "0")}
                  </span>
                  <PosBadge pos={p.position || "?"} />
                  <span style={{
                    fontFamily: SANS, fontSize: 13, fontWeight: isOwner ? 700 : 500,
                    color: isOwner ? C.gold : C.primary,
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.player_name || "—"}
                  </span>
                  {p.current_value > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold }}>{fmt(p.current_value)}</span>
                  )}
                  <LabelBadge label={p.label} />
                  <span style={{
                    fontFamily: MONO, fontSize: 9, color: isOwner ? C.gold : C.dim,
                    maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.owner}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {picks.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>No draft data for {selectedSeason}</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DraftPage() {
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId: ownerId } = useLeagueStore();
  const [tab, setTab] = useState<TabId>("room");

  const { data: history, isLoading } = useQuery({
    queryKey: ["draft-history-full", lid],
    queryFn: () => getDraftHistory(lid!),
    enabled: !!lid,
    staleTime: 600000,
  });

  if (!lid) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p>
    </div>
  );

  const seasons = history?.seasons || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
            color: C.gold, display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 14, height: 1, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
            DRAFT ROOM
          </div>
          {seasons.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginLeft: "auto" }}>
              {seasons.reduce((s: number, se: any) => s + se.picks.length, 0)} picks · {seasons.length} seasons
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, gap: 4, padding: "0 12px 8px", flexShrink: 0 }}>
        {TABS.map((t) => {
          const act = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
              textAlign: "center", whiteSpace: "nowrap", transition: "all 0.15s",
              background: act ? C.goldDim : C.elevated,
              color: act ? C.gold : C.dim,
              boxShadow: act ? `0 0 12px ${C.gold}20, inset 0 0 0 1px ${C.goldBorder}` : `inset 0 0 0 1px ${C.border}`,
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Loading draft data...</div>
        ) : tab === "room" ? (
          <MyDraftRoomTab lid={lid} seasons={seasons} owner={owner || ""} ownerId={ownerId} />
        ) : tab === "league" ? (
          <LeagueReportTab lid={lid} seasons={seasons} owner={owner || ""} />
        ) : tab === "owners" ? (
          <OwnersTab lid={lid} />
        ) : (
          <DraftBoardTab seasons={seasons} owner={owner || ""} ownerId={ownerId} />
        )}
      </div>
    </div>
  );
}
