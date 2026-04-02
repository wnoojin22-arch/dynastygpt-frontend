"use client";

import { useState, useMemo } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import {
  getDraftHistory, getDraftHitRates, getDraftOwnerProfiles,
  getDraftGrades, getDraftPickIntel, getDraftDayTrades,
} from "@/lib/api";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";

/* ── Tokens ── */
const POS_C: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
const LABEL_C: Record<string, string> = { Star: "#d4a532", Hit: "#7dd3a0", Miss: "#e09c6b", Bust: "#e47272" };
const LABEL_BG: Record<string, string> = { Star: "#d4a53218", Hit: "#7dd3a018", Miss: "#e09c6b18", Bust: "#e4727218" };
const GRADE_C: Record<string, string> = { "A+": "#7dd3a0", A: "#7dd3a0", "B+": "#6bb8e0", B: "#6bb8e0", C: "#d4a532", D: "#e09c6b", F: "#e47272" };

const TABS = [
  { key: "board", label: "DRAFT BOARD" },
  { key: "analytics", label: "ANALYTICS" },
  { key: "owners", label: "OWNERS" },
  { key: "room", label: "MY DRAFT ROOM" },
] as const;
type Tab = typeof TABS[number]["key"];

export default function DraftRoom() {
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId } = useLeagueStore();
  const [tab, setTab] = useState<Tab>("board");

  if (!lid) return <div className="flex items-center justify-center h-64"><p className="font-mono text-sm text-[#9596a5]">No league loaded</p></div>;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Tab bar */}
      <div className="flex gap-1 bg-[#0a0d15] rounded-lg p-1 border border-[#1a1e30]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-md font-mono text-[10px] font-extrabold tracking-widest transition-colors ${
              tab === t.key ? "bg-[#10131d] text-[#d4a532] border border-[#d4a53230]" : "text-[#9596a5] hover:text-[#eeeef2]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "board" && <DraftBoardTab lid={lid} />}
      {tab === "analytics" && <AnalyticsTab lid={lid} />}
      {tab === "owners" && <OwnersTab lid={lid} />}
      {tab === "room" && <MyDraftRoomTab lid={lid} owner={owner || ""} />}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   TAB 1: DRAFT BOARD
   ══════════════════════════════════════════════════════════════════════════════ */
function DraftBoardTab({ lid }: { lid: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["draft-history-v2", lid], queryFn: () => getDraftHistory(lid), staleTime: 600_000 });
  const openPlayerCard = usePlayerCardStore((s) => s.openPlayerCard);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const seasons: any[] = data?.seasons || [];
  const activeSeason = selectedSeason ?? seasons[0]?.season;
  const picks: any[] = seasons.find((s: any) => s.season === activeSeason)?.picks || [];

  // Group by round
  const byRound = useMemo(() => {
    const m: Record<number, any[]> = {};
    for (const p of picks) {
      if (!m[p.round]) m[p.round] = [];
      m[p.round].push(p);
    }
    return Object.entries(m).sort(([a], [b]) => Number(a) - Number(b));
  }, [picks]);

  if (isLoading) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">Loading draft history...</div>;
  if (!seasons.length) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">No draft data available</div>;

  return (
    <div className="flex flex-col gap-3">
      {/* Season selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {seasons.map((s: any) => (
          <button
            key={s.season}
            onClick={() => setSelectedSeason(s.season)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 transition-colors ${
              s.season === activeSeason
                ? "bg-[#d4a53220] text-[#d4a532] border border-[#d4a53240]"
                : "bg-[#10131d] text-[#9596a5] border border-[#1a1e30] hover:text-[#eeeef2]"
            }`}
          >
            {s.season}
          </button>
        ))}
      </div>

      {/* Draft grid */}
      {byRound.map(([round, roundPicks]) => (
        <div key={round} className="rounded-xl overflow-hidden border border-[#1a1e30]">
          <div className="px-4 py-2 bg-[#0a0d15] border-b border-[#1a1e30]">
            <span className="font-mono text-[10px] font-extrabold tracking-widest text-[#9596a5]">ROUND {round}</span>
          </div>
          <div className="divide-y divide-[#1a1e30]">
            {roundPicks.sort((a: any, b: any) => (a.slot || a.pick_no) - (b.slot || b.pick_no)).map((p: any) => (
              <button
                key={`${p.round}-${p.slot}-${p.player_name}`}
                onClick={() => p.player_name && openPlayerCard(p.player_name)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#171b2840] transition-colors text-left"
              >
                {/* Slot */}
                <span className="font-mono text-xs text-[#9596a5] w-8 shrink-0">{round}.{String(p.slot || p.pick_no).padStart(2, "0")}</span>
                {/* Position badge */}
                <span
                  className="font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: POS_C[p.position] || "#9596a5", background: `${POS_C[p.position] || "#9596a5"}15` }}
                >
                  {p.position}
                </span>
                {/* Player name + owner */}
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-sm font-semibold text-[#eeeef2] truncate">{p.player_name || "—"}</div>
                  <div className="font-mono text-[9px] text-[#9596a5] truncate">{p.owner}</div>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-[10px] text-[#b0b2c8]">{p.year1_ppg > 0 ? `${p.year1_ppg} PPG` : "—"}</div>
                    <div className="font-mono text-[9px] text-[#9596a5]">{p.current_rank || "—"}</div>
                  </div>
                  {/* Label badge */}
                  <span
                    className="font-mono text-[8px] font-extrabold px-2 py-0.5 rounded w-12 text-center"
                    style={{ color: LABEL_C[p.label] || "#9596a5", background: LABEL_BG[p.label] || "#9596a515" }}
                  >
                    {p.label?.toUpperCase() || "—"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   TAB 2: ANALYTICS
   ══════════════════════════════════════════════════════════════════════════════ */
function AnalyticsTab({ lid }: { lid: string }) {
  const { data: hitRates, isLoading: loadingHR } = useQuery({ queryKey: ["draft-hit-rates", lid], queryFn: () => getDraftHitRates(lid), staleTime: 600_000 });
  const { data: grades, isLoading: loadingG } = useQuery({ queryKey: ["draft-grades", lid], queryFn: () => getDraftGrades(lid), staleTime: 600_000 });
  const { data: ddt } = useQuery({ queryKey: ["draft-day-trades", lid], queryFn: () => getDraftDayTrades(lid), staleTime: 600_000 });

  if (loadingHR || loadingG) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">Loading analytics...</div>;

  const league = hitRates?.league || {};
  const global = hitRates?.global || {};
  const byRound = league.by_round || [];
  const globalByRound = global.by_round || [];

  return (
    <div className="flex flex-col gap-4">
      {/* ── HIT RATES BY ROUND ── */}
      <div className="rounded-xl border border-[#1a1e30] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#d4a53208] border-b border-[#1a1e30] flex items-center justify-between">
          <span className="font-mono text-[10px] font-extrabold tracking-widest text-[#d4a532]">HIT RATES BY ROUND</span>
          <span className="font-mono text-[10px] text-[#9596a5]">League vs Global</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {byRound.filter((r: any) => r.round <= 5).map((r: any) => {
            const gr = globalByRound.find((g: any) => g.round === r.round);
            const gPct = gr?.hit_pct || 0;
            const diff = r.hit_pct - gPct;
            return (
              <div key={r.round}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-[#eeeef2]">R{r.round}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#b0b2c8]">{r.stars}★ {r.hits}✓ / {r.total}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: r.hit_pct >= 50 ? "#7dd3a0" : r.hit_pct >= 30 ? "#d4a532" : "#e47272" }}>
                      {r.hit_pct}%
                    </span>
                    {gPct > 0 && (
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${diff > 0 ? "text-[#7dd3a0] bg-[#7dd3a015]" : diff < 0 ? "text-[#e47272] bg-[#e4727215]" : "text-[#9596a5]"}`}>
                        {diff > 0 ? "+" : ""}{diff}% vs avg
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[#171b28] rounded-full overflow-hidden relative">
                  {gPct > 0 && <div className="absolute h-full rounded-full bg-[#9596a520]" style={{ width: `${gPct}%` }} />}
                  <div className="h-full rounded-full relative z-10" style={{ width: `${r.hit_pct}%`, background: r.hit_pct >= 50 ? "#7dd3a0" : r.hit_pct >= 30 ? "#d4a532" : "#e47272" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DRAFT CLASS GRADES ── */}
      {grades?.seasons && (
        <div className="rounded-xl border border-[#1a1e30] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0a0d15] border-b border-[#1a1e30]">
            <span className="font-mono text-[10px] font-extrabold tracking-widest text-[#9596a5]">DRAFT CLASS GRADES</span>
          </div>
          {grades.seasons.slice(0, 5).map((s: any) => (
            <div key={s.season} className="border-b border-[#1a1e30] last:border-0">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#eeeef2]">{s.season}</span>
                {s.mvp_pick && (
                  <span className="font-mono text-[9px] text-[#9596a5]">
                    MVP: <span className="text-[#d4a532] font-bold">{s.mvp_pick.player}</span> ({s.mvp_pick.year1_ppg} PPG)
                  </span>
                )}
              </div>
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {s.grades.slice(0, 12).map((g: any) => (
                  <div key={g.owner} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#171b28] border border-[#1a1e30]">
                    <span className="font-mono text-sm font-extrabold" style={{ color: GRADE_C[g.grade] || "#9596a5" }}>{g.grade}</span>
                    <span className="font-mono text-[9px] text-[#b0b2c8] truncate max-w-[100px]">{g.owner}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DRAFT DAY TRADES ── */}
      {ddt && ddt.total_trades > 0 && (
        <div className="rounded-xl border border-[#1a1e30] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#d4a53208] border-b border-[#1a1e30] flex items-center justify-between">
            <span className="font-mono text-[10px] font-extrabold tracking-widest text-[#d4a532]">DRAFT DAY TRADES</span>
            <span className="font-mono text-[10px] text-[#9596a5]">{ddt.total_trades} trades · most active: {ddt.most_active_trader?.owner}</span>
          </div>
          <div className="divide-y divide-[#1a1e30]">
            {ddt.trades.slice(0, 8).map((t: any) => (
              <div key={t.trade_id} className="px-4 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-[#9596a5]">{t.season}</span>
                  <span className="font-sans text-xs font-semibold text-[#eeeef2]">{t.owner} ↔ {t.counter_party}</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <span className="font-mono text-[8px] text-[#e47272]">GAVE: </span>
                    <span className="font-sans text-[11px] text-[#b0b2c8]">{[...t.players_sent, ...t.picks_sent].slice(0, 3).join(", ") || "—"}</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-mono text-[8px] text-[#7dd3a0]">GOT: </span>
                    <span className="font-sans text-[11px] text-[#b0b2c8]">{[...t.players_received, ...t.picks_received].slice(0, 3).join(", ") || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   TAB 3: OWNERS
   ══════════════════════════════════════════════════════════════════════════════ */
function OwnersTab({ lid }: { lid: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["draft-owner-profiles", lid], queryFn: () => getDraftOwnerProfiles(lid), staleTime: 600_000 });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">Loading owner profiles...</div>;

  const profiles: any[] = data?.profiles || [];

  const IDENTITY_C: Record<string, string> = {
    DEVELOPER: "#7dd3a0", "PIPELINE BUILDER": "#d4a532", GAMBLER: "#e47272",
    INEFFICIENT: "#9596a5", BALANCED: "#6bb8e0",
  };

  return (
    <div className="flex flex-col gap-3">
      {profiles.map((p: any) => {
        const isExpanded = expanded === p.owner_user_id;
        const hitPct = p.hit_rate;
        const circumference = 2 * Math.PI * 36;
        const arc = (hitPct / 100) * circumference;
        const ringColor = hitPct >= 50 ? "#7dd3a0" : hitPct >= 30 ? "#d4a532" : "#e47272";

        return (
          <div key={p.owner_user_id || p.owner} className="rounded-xl border border-[#1a1e30] overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : (p.owner_user_id || p.owner))}
              className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#171b2830] transition-colors"
            >
              {/* Hit rate ring */}
              <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#1a1e30" strokeWidth="4" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={ringColor} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${arc} ${circumference}`} transform="rotate(-90 40 40)" />
                <text x="40" y="37" textAnchor="middle" fill={ringColor} fontSize="18" fontWeight="900" fontFamily="'JetBrains Mono', monospace">{hitPct}%</text>
                <text x="40" y="50" textAnchor="middle" fill="#9596a5" fontSize="7" fontFamily="monospace">HIT RATE</text>
              </svg>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-sm font-bold text-[#eeeef2] truncate">{p.owner}</span>
                  <span className="font-mono text-[8px] font-extrabold px-2 py-0.5 rounded tracking-wider"
                    style={{ color: IDENTITY_C[p.draft_identity] || "#9596a5", background: `${IDENTITY_C[p.draft_identity] || "#9596a5"}15` }}>
                    {p.draft_identity}
                  </span>
                </div>
                <div className="flex gap-4 font-mono text-[10px]">
                  <span><span className="text-[#d4a532] font-bold">{p.stars}</span> <span className="text-[#9596a5]">stars</span></span>
                  <span><span className="text-[#7dd3a0] font-bold">{p.hits}</span> <span className="text-[#9596a5]">hits</span></span>
                  <span><span className="text-[#e47272] font-bold">{p.busts}</span> <span className="text-[#9596a5]">busts</span></span>
                  <span className="text-[#9596a5]">{p.total_picks} picks</span>
                </div>
                {/* Position bars */}
                <div className="flex gap-1 mt-2">
                  {Object.entries(p.position_distribution || {}).map(([pos, pct]: [string, any]) => (
                    <div key={pos} className="flex items-center gap-1">
                      <span className="font-mono text-[8px] font-bold" style={{ color: POS_C[pos] || "#9596a5" }}>{pos}</span>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(pct, 8)}px`, background: POS_C[pos] || "#9596a5" }} />
                      <span className="font-mono text-[8px] text-[#9596a5]">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>

            {/* Expanded: best/worst + stars kept */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-[#1a1e30] flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  {p.best_pick && (
                    <div className="p-3 rounded-lg bg-[#7dd3a008] border border-[#7dd3a020]">
                      <div className="font-mono text-[8px] text-[#9596a5] tracking-wider mb-1">BEST PICK</div>
                      <div className="font-sans text-sm font-bold text-[#eeeef2]">{p.best_pick.player}</div>
                      <div className="font-mono text-[9px] text-[#9596a5] mt-0.5">
                        {p.best_pick.season} R{p.best_pick.round}.{String(p.best_pick.slot).padStart(2, "0")} ·
                        <span style={{ color: LABEL_C[p.best_pick.label] }}> {p.best_pick.label}</span>
                      </div>
                    </div>
                  )}
                  {p.worst_pick && (
                    <div className="p-3 rounded-lg bg-[#e4727208] border border-[#e4727220]">
                      <div className="font-mono text-[8px] text-[#9596a5] tracking-wider mb-1">WORST PICK</div>
                      <div className="font-sans text-sm font-bold text-[#eeeef2]">{p.worst_pick.player}</div>
                      <div className="font-mono text-[9px] text-[#9596a5] mt-0.5">
                        {p.worst_pick.season} R{p.worst_pick.round}.{String(p.worst_pick.slot).padStart(2, "0")} ·
                        <span style={{ color: LABEL_C[p.worst_pick.label] }}> {p.worst_pick.label}</span>
                      </div>
                    </div>
                  )}
                </div>
                {p.stars > 0 && (
                  <div className="font-mono text-[10px] text-[#9596a5]">
                    Stars: <span className="text-[#7dd3a0] font-bold">{p.stars_kept} kept</span> · <span className="text-[#e47272] font-bold">{p.stars_flipped} flipped</span>
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


/* ══════════════════════════════════════════════════════════════════════════════
   TAB 4: MY DRAFT ROOM
   ══════════════════════════════════════════════════════════════════════════════ */
function MyDraftRoomTab({ lid, owner }: { lid: string; owner: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["draft-pick-intel", lid, owner],
    queryFn: () => getDraftPickIntel(lid, owner),
    enabled: !!lid && !!owner,
    staleTime: 300_000,
  });

  if (!owner) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">Select an owner to view draft room</div>;
  if (isLoading) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">Loading pick intel...</div>;

  const picks: any[] = data?.picks || [];
  if (!picks.length) return <div className="text-center py-12 font-mono text-xs text-[#9596a5]">No picks on file for {owner}</div>;

  const REC_C: Record<string, string> = { "USE IT": "#7dd3a0", "PACKAGE IT": "#d4a532", "TRADE BACK": "#6bb8e0", "TRADE UP": "#EF4444" };

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1 flex items-center justify-between">
        <span className="font-mono text-[10px] font-extrabold tracking-widest text-[#d4a532]">PICK INTEL — {owner.toUpperCase()}</span>
        <span className="font-mono text-[10px] text-[#9596a5]">{picks.length} picks</span>
      </div>

      {picks.map((p: any, i: number) => {
        const recColor = REC_C[p.recommendation] || "#9596a5";
        const posEntries = Object.entries(p.position_breakdown || {}).sort(([, a]: any, [, b]: any) => b - a);

        return (
          <div key={i} className="rounded-xl border border-[#1a1e30] overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-[#0a0d15]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-extrabold text-[#eeeef2]">{p.season} R{p.round}{p.slot ? `.${String(p.slot).padStart(2, "0")}` : ""}</span>
                {!p.is_own_pick && <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[#6bb8e015] text-[#6bb8e0]">ACQUIRED</span>}
              </div>
              <span className="font-mono text-[10px] font-extrabold px-3 py-1 rounded-lg tracking-wider"
                style={{ color: recColor, background: `${recColor}15`, border: `1px solid ${recColor}30` }}>
                {p.recommendation}
              </span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-2">
              {/* Reasoning */}
              <p className="font-sans text-sm text-[#b0b2c8] leading-relaxed">{p.reasoning}</p>

              {/* Stats row */}
              <div className="flex gap-4 font-mono text-[10px]">
                <span>Hit rate: <span className="font-bold" style={{ color: p.hit_rate >= 50 ? "#7dd3a0" : p.hit_rate >= 30 ? "#d4a532" : "#e47272" }}>{p.hit_rate}%</span></span>
                {p.roster_need && <span>Need: <span className="font-bold" style={{ color: POS_C[p.roster_need] }}>{p.roster_need}</span></span>}
              </div>

              {/* Position breakdown */}
              {posEntries.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {posEntries.slice(0, 4).map(([pos, pct]: [string, any]) => (
                    <div key={pos} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b28]">
                      <span className="font-mono text-[9px] font-bold" style={{ color: POS_C[pos] || "#9596a5" }}>{pos}</span>
                      <span className="font-mono text-[9px] text-[#9596a5]">{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
