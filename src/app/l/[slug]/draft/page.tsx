"use client";

/**
 * DRAFT ROOM — 4-tab draft dashboard, mobile-first.
 * Tab 1: Draft Board (grid by season)
 * Tab 2: Scouting (owner profiles)
 * Tab 3: Pick Analyzer (per-slot intel)
 * Tab 4: Draft Grades (post-draft)
 */
import { useState, useMemo } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getDraftHistory, getDraftAnalysis } from "@/lib/api";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, posColor } from "@/components/league/tokens";

// ── Sub-tab definitions ──────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "MY PROFILE" },
  { id: "scouting", label: "SCOUTING" },
  { id: "board", label: "HISTORY" },
  { id: "grades", label: "GRADES" },
  { id: "league", label: "LEAGUE" },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Helpers ──────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  Star: C.gold, Hit: C.green, Miss: C.orange, Bust: C.red, "Too Early": C.dim,
};

function PosBadge({ pos }: { pos: string }) {
  const pc = posColor(pos);
  return (
    <span style={{
      fontFamily: MONO, fontSize: 8, fontWeight: 800, color: pc,
      background: `${pc}18`, padding: "1px 5px", borderRadius: 3,
    }}>{pos}</span>
  );
}

function LabelBadge({ label }: { label: string }) {
  const color = LABEL_COLORS[label] || C.dim;
  return (
    <span style={{
      fontFamily: MONO, fontSize: 7, fontWeight: 800, color,
      background: `${color}15`, border: `1px solid ${color}30`,
      padding: "1px 4px", borderRadius: 2, letterSpacing: "0.04em",
    }}>{label.toUpperCase()}</span>
  );
}

function DCard({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{
        padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
        {right}
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{
      flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 6,
      background: C.elevated, border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: color || C.primary, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: C.dim, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── TAB 1: MY DRAFT PROFILE ─────────────────────────────────────────────

function MyDraftProfileTab({ seasons, owner }: { seasons: any[]; owner: string }) {
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  const profile = useMemo(() => {
    const ownerLower = owner.toLowerCase();
    const myPicks: any[] = [];
    for (const s of seasons) {
      for (const p of s.picks) {
        if ((p.owner || "").toLowerCase() === ownerLower) myPicks.push({ ...p, _season: s.season });
      }
    }

    const total = myPicks.length;
    const evaluated = myPicks.filter(p => p.label !== "Too Early").length;
    const stars = myPicks.filter(p => p.label === "Star").length;
    const hits = myPicks.filter(p => p.label === "Hit").length;
    const busts = myPicks.filter(p => p.label === "Bust").length;
    const misses = myPicks.filter(p => p.label === "Miss").length;
    const hitRate = evaluated > 0 ? Math.round((stars + hits) / evaluated * 100) : 0;

    // Hit rate by round (exclude Too Early)
    const byRound: Record<number, { total: number; hits: number }> = {};
    for (const p of myPicks) {
      if (p.label === "Too Early") continue;
      if (!byRound[p.round]) byRound[p.round] = { total: 0, hits: 0 };
      byRound[p.round].total++;
      if (p.label === "Star" || p.label === "Hit") byRound[p.round].hits++;
    }
    const roundStats = Object.entries(byRound)
      .map(([r, s]) => ({ round: Number(r), ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => a.round - b.round);

    // Hit rate by position (exclude Too Early)
    const byPos: Record<string, { total: number; hits: number }> = {};
    for (const p of myPicks) {
      if (p.label === "Too Early") continue;
      const pos = p.position || "?";
      if (!byPos[pos]) byPos[pos] = { total: 0, hits: 0 };
      byPos[pos].total++;
      if (p.label === "Star" || p.label === "Hit") byPos[pos].hits++;
    }
    const posStats = Object.entries(byPos)
      .map(([pos, s]) => ({ pos, ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Best + worst picks
    const sorted = [...myPicks].sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
    const best = sorted.slice(0, 3);
    const worst = [...myPicks].filter(p => p.label === "Bust").sort((a, b) => (a.current_value || 0) - (b.current_value || 0)).slice(0, 3);

    // Position tendency (what they draft most)
    const topPos = posStats.slice(0, 2).map(p => p.pos);

    // Total value acquired
    const totalValue = myPicks.reduce((s, p) => s + (p.current_value || 0), 0);

    // Seasons active
    const seasonsActive = [...new Set(myPicks.map(p => p._season))].length;

    return { total, stars, hits, busts, misses, hitRate, roundStats, posStats, best, worst, topPos, totalValue, seasonsActive };
  }, [seasons, owner]);

  if (profile.total === 0) {
    return <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>No draft picks found for {owner}</div>;
  }

  const hrColor = (r: number) => r >= 50 ? C.green : r >= 30 ? C.gold : C.red;

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
        <div className="flex gap-1.5">
          {profile.roundStats.filter((r) => r.round <= 4).map((r) => (
            <div key={r.round} className="flex-1" style={{ textAlign: "center", padding: "6px 2px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: hrColor(r.rate) }}>{r.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 2 }}>RD {r.round}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{r.hits}/{r.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* Hit rate by position */}
      <DCard label="HIT RATE BY POSITION">
        <div className="flex gap-1.5 flex-wrap">
          {profile.posStats.map((p) => (
            <div key={p.pos} style={{ textAlign: "center", padding: "6px 8px", borderRadius: 6, background: `${posColor(p.pos)}08`, border: `1px solid ${posColor(p.pos)}20`, minWidth: 60 }}>
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
            borderBottom: i < profile.best.length - 1 ? `1px solid ${C.white08}` : "none",
            cursor: p.player_name ? "pointer" : "default",
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

      {/* Draft tendencies + advice */}
      <DCard label="DRAFT TENDENCIES">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {profile.topPos.length > 0 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Targets <span style={{ fontWeight: 700, color: posColor(profile.topPos[0]) }}>{profile.topPos[0]}</span>
              {profile.topPos[1] && <> and <span style={{ fontWeight: 700, color: posColor(profile.topPos[1]) }}>{profile.topPos[1]}</span></>} most
            </div>
          )}
          {profile.roundStats[0] && profile.roundStats[0].rate >= 50 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.green }}>
              Strong Round 1 drafter ({profile.roundStats[0].rate}% hit rate)
            </div>
          )}
          {profile.roundStats[0] && profile.roundStats[0].rate < 30 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.red }}>
              Struggles in Round 1 ({profile.roundStats[0].rate}% hit rate) — consider trading down
            </div>
          )}
          {profile.busts > profile.stars && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.orange }}>
              More busts ({profile.busts}) than stars ({profile.stars}) — prioritize proven talent over upside picks
            </div>
          )}
          {profile.hitRate >= 50 && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.green }}>
              Elite drafter — {profile.hitRate}% hit rate across {profile.seasonsActive} seasons. Keep doing what you're doing.
            </div>
          )}
        </div>
      </DCard>
    </div>
  );
}

// ── TAB 2: DRAFT BOARD (renamed HISTORY) ────────────────────────────────

function DraftBoardTab({ seasons, owner }: { seasons: any[]; owner: string }) {
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.season || 2025);
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  const seasonData = seasons.find((s: any) => s.season === selectedSeason);
  const picks = seasonData?.picks || [];

  // Group picks by round
  const byRound: Record<number, any[]> = {};
  for (const p of picks) {
    if (!byRound[p.round]) byRound[p.round] = [];
    byRound[p.round].push(p);
  }
  const rounds = Object.keys(byRound).map(Number).sort();

  // Summary stats for this season
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

      {/* Draft grid — rounds as sections */}
      {rounds.map((round) => {
        const roundPicks = byRound[round].sort((a: any, b: any) => a.slot - b.slot);
        return (
          <div key={round}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 10px", background: C.elevated,
              borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 900, color: C.gold, letterSpacing: "0.08em" }}>
                ROUND {round}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{roundPicks.length} picks</span>
            </div>
            {roundPicks.map((p: any, idx: number) => {
              const isOwner = owner && p.owner?.toLowerCase() === owner.toLowerCase();
              const labelColor = LABEL_COLORS[p.label] || C.dim;
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
                  {/* Pick number */}
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim, width: 28, textAlign: "center" }}>
                    {round}.{String(p.slot).padStart(2, "0")}
                  </span>
                  {/* Position */}
                  <PosBadge pos={p.position || "?"} />
                  {/* Player name */}
                  <span style={{
                    fontFamily: SANS, fontSize: 13, fontWeight: isOwner ? 700 : 500,
                    color: isOwner ? C.gold : C.primary,
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.player_name || "—"}
                  </span>
                  {/* Value */}
                  {p.current_value > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold }}>{fmt(p.current_value)}</span>
                  )}
                  {/* Label */}
                  <LabelBadge label={p.label} />
                  {/* Owner */}
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
        <div style={{ padding: 32, textAlign: "center", fontFamily: SANS, fontSize: 13, color: C.dim }}>
          No draft data for {selectedSeason}
        </div>
      )}
    </div>
  );
}

// ── TAB 2: SCOUTING ─────────────────────────────────────────────────────

function ScoutingTab({ seasons, owner }: { seasons: any[]; owner: string }) {
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);

  // Aggregate picks by owner across all seasons
  const ownerStats = useMemo(() => {
    const stats: Record<string, {
      total: number; stars: number; hits: number; busts: number; misses: number;
      positions: Record<string, number>;
      bestPick: any; worstPick: any;
    }> = {};

    for (const s of seasons) {
      for (const p of s.picks) {
        const o = p.owner || "Unknown";
        if (!stats[o]) stats[o] = { total: 0, stars: 0, hits: 0, busts: 0, misses: 0, positions: {}, bestPick: null, worstPick: null };
        const st = stats[o];
        st.total++;
        if (p.label === "Too Early") { st.total--; continue; }
        if (p.label === "Star") st.stars++;
        if (p.label === "Hit") st.hits++;
        if (p.label === "Bust") st.busts++;
        if (p.label === "Miss") st.misses++;
        st.positions[p.position] = (st.positions[p.position] || 0) + 1;
        if (!st.bestPick || (p.current_value || 0) > (st.bestPick.current_value || 0)) st.bestPick = p;
        if (p.label === "Bust" && (!st.worstPick || (p.current_value || 0) < (st.worstPick?.current_value || 999999))) st.worstPick = p;
      }
    }
    return Object.entries(stats)
      .map(([name, s]) => ({ name, ...s, hitRate: s.total > 0 ? Math.round(((s.stars + s.hits) / s.total) * 100) : 0 }))
      .sort((a, b) => b.hitRate - a.hitRate);
  }, [seasons]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ownerStats.map((o, idx) => {
        const isMe = o.name.toLowerCase() === owner.toLowerCase();
        const hrColor = o.hitRate >= 50 ? C.green : o.hitRate >= 30 ? C.gold : C.red;
        const topPos = Object.entries(o.positions).sort((a, b) => b[1] - a[1]);
        return (
          <div key={o.name} style={{
            borderRadius: 8, overflow: "hidden",
            background: isMe ? C.goldDim : C.card,
            border: `1px solid ${isMe ? C.goldBorder : C.border}`,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim, width: 20 }}>#{idx + 1}</span>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: isMe ? 800 : 600, color: isMe ? C.gold : C.primary, flex: 1 }}>{o.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 900, color: hrColor }}>{o.hitRate}%</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>HIT RATE</span>
            </div>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 4, padding: "0 10px 8px" }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{o.total} picks</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold }}>★{o.stars}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.green }}>✓{o.hits}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.red }}>✗{o.busts}</span>
              <span style={{ color: C.border }}>·</span>
              {topPos.slice(0, 3).map(([pos, cnt]) => (
                <span key={pos} style={{ fontFamily: MONO, fontSize: 9, color: posColor(pos) }}>{pos}:{cnt}</span>
              ))}
            </div>
            {/* Best/worst pick */}
            <div style={{ display: "flex", gap: 8, padding: "0 10px 8px", borderTop: `1px solid ${C.white08}`, paddingTop: 6 }}>
              {o.bestPick && (
                <span onClick={() => openPlayerCard(o.bestPick.player_name)} style={{
                  fontFamily: MONO, fontSize: 9, color: C.green, cursor: "pointer",
                }}>BEST: {o.bestPick.player_name} ({fmt(o.bestPick.current_value)})</span>
              )}
              {o.worstPick && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.red }}>WORST: {o.worstPick.player_name}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TAB 3: PICK ANALYZER ────────────────────────────────────────────────

function PickAnalyzerTab({ seasons }: { seasons: any[] }) {
  const [selectedRound, setSelectedRound] = useState(1);

  // Aggregate hit rates by slot across all seasons
  const slotStats = useMemo(() => {
    const stats: Record<string, { total: number; hits: number; stars: number; busts: number; players: any[] }> = {};
    for (const s of seasons) {
      for (const p of s.picks) {
        if (p.round !== selectedRound) continue;
        const key = `${p.round}.${String(p.slot).padStart(2, "0")}`;
        if (!stats[key]) stats[key] = { total: 0, hits: 0, stars: 0, busts: 0, players: [] };
        stats[key].total++;
        if (p.label === "Star") { stats[key].stars++; stats[key].hits++; }
        if (p.label === "Hit") stats[key].hits++;
        if (p.label === "Bust") stats[key].busts++;
        stats[key].players.push(p);
      }
    }
    return Object.entries(stats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, s]) => ({
        slot, ...s,
        hitRate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0,
        bestPlayer: s.players.sort((a: any, b: any) => (b.current_value || 0) - (a.current_value || 0))[0],
      }));
  }, [seasons, selectedRound]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Round selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4].map((r) => (
          <button key={r} onClick={() => setSelectedRound(r)} style={{
            flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
            background: selectedRound === r ? C.goldDim : C.elevated,
            color: selectedRound === r ? C.gold : C.dim,
            fontFamily: MONO, fontSize: 12, fontWeight: 800,
          }}>
            ROUND {r}
          </button>
        ))}
      </div>

      {/* Slot cards */}
      {slotStats.map((s) => {
        const hrColor = s.hitRate >= 50 ? C.green : s.hitRate >= 30 ? C.gold : C.red;
        return (
          <div key={s.slot} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, color: C.gold, width: 36 }}>{s.slot}</span>
            {/* Hit rate bar */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{s.total} picks across {seasons.length} seasons</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: hrColor }}>{s.hitRate}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: C.elevated, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${s.hitRate}%`, background: hrColor }} />
              </div>
            </div>
            {/* Best pick at this slot */}
            {s.bestPlayer && (
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary }}>{s.bestPlayer.player_name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold }}>{fmt(s.bestPlayer.current_value)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TAB 4: DRAFT GRADES ─────────────────────────────────────────────────

function DraftGradesTab({ seasons, owner }: { seasons: any[]; owner: string }) {
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.season || 2025);
  const seasonData = seasons.find((s: any) => s.season === selectedSeason);
  const picks = seasonData?.picks || [];

  // Grade per owner for this season
  const ownerGrades = useMemo(() => {
    const byOwner: Record<string, any[]> = {};
    for (const p of picks) {
      if (!byOwner[p.owner]) byOwner[p.owner] = [];
      byOwner[p.owner].push(p);
    }

    return Object.entries(byOwner).map(([name, ownerPicks]) => {
      const stars = ownerPicks.filter((p: any) => p.label === "Star").length;
      const hits = ownerPicks.filter((p: any) => p.label === "Hit").length;
      const busts = ownerPicks.filter((p: any) => p.label === "Bust").length;
      const totalValue = ownerPicks.reduce((s: number, p: any) => s + (p.current_value || 0), 0);
      const hitRate = ownerPicks.length > 0 ? Math.round((stars + hits) / ownerPicks.length * 100) : 0;

      // Grade
      let grade = "C";
      if (hitRate >= 75) grade = "A+";
      else if (hitRate >= 60) grade = "A";
      else if (hitRate >= 50) grade = "B+";
      else if (hitRate >= 40) grade = "B";
      else if (hitRate >= 30) grade = "C+";
      else if (hitRate >= 20) grade = "D";
      else grade = "F";

      const best = ownerPicks.sort((a: any, b: any) => (b.current_value || 0) - (a.current_value || 0))[0];

      return { name, picks: ownerPicks.length, stars, hits, busts, totalValue, hitRate, grade, best };
    }).sort((a, b) => b.hitRate - a.hitRate);
  }, [picks]);

  const gradeColor = (g: string) => g.startsWith("A") ? C.green : g.startsWith("B") ? C.blue : g.startsWith("C") ? C.gold : g.startsWith("D") ? C.orange : C.red;

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
          }}>
            {s.season}
          </button>
        ))}
      </div>

      {/* Draft MVP */}
      {ownerGrades[0] && (
        <div style={{
          textAlign: "center", padding: "10px 14px", borderRadius: 8,
          background: C.goldDim, border: `1px solid ${C.goldBorder}`,
        }}>
          <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: C.dim }}>
            {selectedSeason} DRAFT MVP
          </div>
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, color: C.gold, marginTop: 2 }}>
            {ownerGrades[0].name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.secondary, marginTop: 2 }}>
            {ownerGrades[0].hitRate}% hit rate · {ownerGrades[0].stars} stars · {fmt(ownerGrades[0].totalValue)} total value
          </div>
        </div>
      )}

      {/* Grade cards */}
      {ownerGrades.map((o, idx) => {
        const isMe = o.name.toLowerCase() === owner.toLowerCase();
        const gc = gradeColor(o.grade);
        return (
          <div key={o.name} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
            borderRadius: 6, background: isMe ? C.goldDim : C.card,
            border: `1px solid ${isMe ? C.goldBorder : C.border}`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900, color: gc, width: 36, textAlign: "center" }}>{o.grade}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? C.gold : C.primary }}>{o.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 1 }}>
                {o.picks} picks · {o.hitRate}% hits · {fmt(o.totalValue)} value
              </div>
            </div>
            {o.best && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>BEST PICK</div>
                <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.green }}>{o.best.player_name}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TAB 5: LEAGUE DRAFT STATS ───────────────────────────────────────────

function LeagueDraftTab({ seasons, owner }: { seasons: any[]; owner: string }) {
  const allPicks = useMemo(() => {
    const picks: any[] = [];
    for (const s of seasons) for (const p of s.picks) picks.push({ ...p, _season: s.season });
    return picks;
  }, [seasons]);

  const stats = useMemo(() => {
    const total = allPicks.length;
    const stars = allPicks.filter(p => p.label === "Star").length;
    const hits = allPicks.filter(p => p.label === "Hit").length;
    const busts = allPicks.filter(p => p.label === "Bust").length;
    const hitRate = total > 0 ? Math.round((stars + hits) / total * 100) : 0;

    // Hit rate by round (league-wide)
    const byRound: Record<number, { total: number; hits: number }> = {};
    for (const p of allPicks) {
      if (!byRound[p.round]) byRound[p.round] = { total: 0, hits: 0 };
      byRound[p.round].total++;
      if (p.label === "Star" || p.label === "Hit") byRound[p.round].hits++;
    }
    const roundStats = Object.entries(byRound)
      .map(([r, s]) => ({ round: Number(r), ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => a.round - b.round);

    // Hit rate by position (league-wide)
    const byPos: Record<string, { total: number; hits: number }> = {};
    for (const p of allPicks) {
      const pos = p.position || "?";
      if (!byPos[pos]) byPos[pos] = { total: 0, hits: 0 };
      byPos[pos].total++;
      if (p.label === "Star" || p.label === "Hit") byPos[pos].hits++;
    }
    const posStats = Object.entries(byPos)
      .map(([pos, s]) => ({ pos, ...s, rate: s.total > 0 ? Math.round(s.hits / s.total * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Most draft-day trades (owners who traded the most picks — picks where owner != original slot owner would be ideal, but we can approximate from the data)
    const ownerPickCounts: Record<string, number> = {};
    for (const p of allPicks) {
      const o = p.owner || "?";
      ownerPickCounts[o] = (ownerPickCounts[o] || 0) + 1;
    }
    const expectedPerOwner = total / Math.max(Object.keys(ownerPickCounts).length, 1);
    const mostPicks = Object.entries(ownerPickCounts)
      .map(([name, count]) => ({ name, count, extra: count - expectedPerOwner }))
      .sort((a, b) => b.count - a.count);

    // Best drafter (highest hit rate, min 5 picks)
    const ownerHitRates: Record<string, { total: number; hits: number }> = {};
    for (const p of allPicks) {
      const o = p.owner || "?";
      if (!ownerHitRates[o]) ownerHitRates[o] = { total: 0, hits: 0 };
      ownerHitRates[o].total++;
      if (p.label === "Star" || p.label === "Hit") ownerHitRates[o].hits++;
    }
    const ownerRanked = Object.entries(ownerHitRates)
      .filter(([, s]) => s.total >= 5)
      .map(([name, s]) => ({ name, ...s, rate: Math.round(s.hits / s.total * 100) }))
      .sort((a, b) => b.rate - a.rate);

    // Most valuable pick ever
    const mvp = [...allPicks].sort((a, b) => (b.current_value || 0) - (a.current_value || 0))[0];

    // Biggest bust
    const biggestBust = allPicks.filter(p => p.label === "Bust" && p.round <= 2)
      .sort((a, b) => a.round - b.round || a.slot - b.slot)[0];

    // Stars by season
    const starsBySeason: Record<number, number> = {};
    for (const p of allPicks) if (p.label === "Star") starsBySeason[p._season] = (starsBySeason[p._season] || 0) + 1;
    const bestDraftClass = Object.entries(starsBySeason).sort((a, b) => b[1] - a[1])[0];

    return { total, stars, hits, busts, hitRate, roundStats, posStats, mostPicks, ownerRanked, mvp, biggestBust, bestDraftClass };
  }, [allPicks]);

  const hrColor = (r: number) => r >= 50 ? C.green : r >= 30 ? C.gold : C.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Hero */}
      <div className="flex gap-1.5">
        <StatBox value={String(stats.total)} label="TOTAL PICKS" />
        <StatBox value={`${stats.hitRate}%`} label="LEAGUE HIT" color={hrColor(stats.hitRate)} />
        <StatBox value={String(stats.stars)} label="STARS" color={C.gold} />
        <StatBox value={String(seasons.length)} label="DRAFTS" />
      </div>

      {/* League hit rate by round */}
      <DCard label="LEAGUE HIT RATE BY ROUND">
        <div className="flex gap-1.5">
          {stats.roundStats.filter((r) => r.round <= 4).map((r) => (
            <div key={r.round} className="flex-1" style={{ textAlign: "center", padding: "6px 2px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: hrColor(r.rate) }}>{r.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 2 }}>RD {r.round}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{r.hits}/{r.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* League hit rate by position */}
      <DCard label="HIT RATE BY POSITION">
        <div className="flex gap-1.5 flex-wrap">
          {stats.posStats.map((p) => (
            <div key={p.pos} style={{ textAlign: "center", padding: "6px 8px", borderRadius: 6, background: `${posColor(p.pos)}08`, border: `1px solid ${posColor(p.pos)}20`, minWidth: 60 }}>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: posColor(p.pos) }}>{p.rate}%</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(p.pos), marginTop: 1 }}>{p.pos}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>{p.hits}/{p.total}</div>
            </div>
          ))}
        </div>
      </DCard>

      {/* Draft power rankings */}
      <DCard label="DRAFT POWER RANKINGS" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>MIN 5 PICKS</span>}>
        {stats.ownerRanked.slice(0, 6).map((o, idx) => {
          const isMe = o.name.toLowerCase() === owner.toLowerCase();
          return (
            <div key={o.name} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
              borderBottom: idx < 5 ? `1px solid ${C.white08}` : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: idx === 0 ? C.gold : C.dim, width: 20 }}>#{idx + 1}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? C.gold : C.primary, flex: 1 }}>{o.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: hrColor(o.rate) }}>{o.rate}%</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{o.hits}/{o.total}</span>
            </div>
          );
        })}
      </DCard>

      {/* Pick hoarders — who gets the most picks */}
      <DCard label="PICK HOARDERS" right={<span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>DRAFT DAY TRADERS</span>}>
        {stats.mostPicks.filter(o => o.extra > 2).slice(0, 5).map((o, idx) => (
          <div key={o.name} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
            borderBottom: idx < 4 ? `1px solid ${C.white08}` : "none",
          }}>
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>{o.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: C.gold }}>{o.count} picks</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.green }}>+{Math.round(o.extra)} extra</span>
          </div>
        ))}
      </DCard>

      {/* Fun facts */}
      <DCard label="LEAGUE RECORDS">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats.mvp && (
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.secondary }}>
              Most Valuable Pick: <span style={{ fontWeight: 700, color: C.gold }}>{stats.mvp.player_name}</span>
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

// ── MAIN PAGE ────────────────────────────────────────────────────────────

export default function DraftPage() {
  const { currentLeagueId: lid, currentOwner: owner } = useLeagueStore();
  const [tab, setTab] = useState<TabId>("profile");

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
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {TABS.map((t) => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0", textAlign: "center",
            fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            color: tab === t.id ? C.gold : C.dim,
            borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>
            Loading draft data...
          </div>
        ) : tab === "profile" ? (
          <MyDraftProfileTab seasons={seasons} owner={owner || ""} />
        ) : tab === "scouting" ? (
          <ScoutingTab seasons={seasons} owner={owner || ""} />
        ) : tab === "board" ? (
          <DraftBoardTab seasons={seasons} owner={owner || ""} />
        ) : tab === "grades" ? (
          <DraftGradesTab seasons={seasons} owner={owner || ""} />
        ) : (
          <LeagueDraftTab seasons={seasons} owner={owner || ""} />
        )}
      </div>
    </div>
  );
}
