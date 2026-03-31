"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoachesCorner } from "@/lib/api";
import { posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  ArrowUpRight, Shield, Eye, Target, AlertTriangle,
  Trophy, TrendingUp, TrendingDown, Minus, Zap,
  Users, BarChart3, Crosshair, ChevronRight,
  Sparkles, CircleDot, Award, Handshake, Gauge,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   COACHES CORNER — Full GM Dashboard
   7 sections, 2-column grid, all Tailwind
   ═══════════════════════════════════════════════════════════════ */

// ── Tailwind helpers ──

function posTagClasses(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red bg-accent-red/10";
    case "RB": return "text-accent-blue bg-accent-blue/10";
    case "WR": return "text-accent-green bg-accent-green/10";
    case "TE": return "text-accent-orange bg-accent-orange/10";
    default: return "text-dim bg-elevated";
  }
}

function posTextClass(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red";
    case "RB": return "text-accent-blue";
    case "WR": return "text-accent-green";
    case "TE": return "text-accent-orange";
    default: return "text-dim";
  }
}

function actionPillClasses(action: string): string {
  switch (action) {
    case "SELL": return "text-accent-red bg-accent-red/15 border-accent-red/30";
    case "HOLD": return "text-accent-green bg-accent-green/15 border-accent-green/30";
    case "LISTEN":
    case "CAUTIOUS": return "text-accent-orange bg-accent-orange/15 border-accent-orange/30";
    default: return "text-dim bg-elevated border-border-lt";
  }
}

function gradeTagClasses(grade: string): string {
  switch (grade) {
    case "ELITE": return "text-accent-green bg-accent-green/10 border-accent-green/25";
    case "STRONG": return "text-accent-blue bg-accent-blue/10 border-accent-blue/25";
    case "AVERAGE": return "text-gold bg-gold/10 border-gold/25";
    case "WEAK": return "text-accent-orange bg-accent-orange/10 border-accent-orange/25";
    case "CRITICAL": return "text-accent-red bg-accent-red/10 border-accent-red/25";
    default: return "text-dim bg-elevated border-border-lt";
  }
}

function posRankLabel(p: Record<string, unknown>): string {
  if (p.sha_pos_rank && typeof p.sha_pos_rank === "string" && p.sha_pos_rank.trim()) return p.sha_pos_rank.trim();
  if (typeof p.sha_pos_rank === "number") {
    const pos = String(p.position || "");
    return pos ? `${pos}${p.sha_pos_rank}` : `#${p.sha_pos_rank}`;
  }
  if (p.pos_rank && typeof p.pos_rank === "string") return p.pos_rank.trim();
  return "";
}

// ── Section header ──

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border-lt bg-elevated">
      {icon}
      <span className="font-sans text-[13px] font-medium text-zinc-400 tracking-wide">{label}</span>
    </div>
  );
}

// ── Skeleton ──

function Skel() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="h-3.5 w-24 bg-elevated rounded mb-3 animate-pulse" />
      <div className="h-4 w-full bg-elevated rounded mb-2 animate-pulse" />
      <div className="h-4 w-3/4 bg-elevated rounded animate-pulse" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: ROSTER ACTIONS TABLE
   ═══════════════════════════════════════════════════════════════ */

function RosterActionsTable({ cc }: { cc: Record<string, unknown> }) {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();
  const goToTrades = () => router.push(`/l/${currentLeagueSlug}/trades`);
  const moveNow = (cc.move_now || []) as Array<Record<string, unknown>>;
  const listen = (cc.listen || []) as Array<Record<string, unknown>>;
  const hold = (cc.hold || []) as Array<Record<string, unknown>>;
  const buyLow = (cc.buy_low || []) as Array<Record<string, unknown>>;

  const renderRow = (p: Record<string, unknown>, idx: number, isLast: boolean) => {
    const pos = String(p.position || "");
    const name = String(p.name || p.player || "");
    const age = p.age != null ? String(p.age) : "";
    const rank = posRankLabel(p);
    const action = String(p.action || "");
    const target = String(p.target || p.reason || "");
    const gradeWithout = String(p.position_grade_without || "");

    return (
      <div key={`${action}-${idx}`} className={`grid grid-cols-[1fr_44px_32px_56px_60px_1fr] gap-2 px-3 py-2 items-center hover:bg-elevated/50 transition-colors ${!isLast ? "border-b border-white/[0.06]" : ""}`}>
        <PlayerName name={name} className="font-sans text-[13px] font-medium text-primary truncate" />
        <span className={`font-sans text-[11px] font-bold text-center rounded px-1 py-0.5 ${posTagClasses(pos)}`}>{pos || "—"}</span>
        <span className="font-sans text-[12px] text-dim text-center tabular-nums">{age}</span>
        <span className="font-sans text-[11px] font-semibold text-secondary text-center bg-elevated rounded-full px-1.5 py-0.5 border border-border-lt truncate">{rank || "—"}</span>
        <span className={`font-sans text-[11px] font-semibold text-center rounded-full px-1.5 py-0.5 border ${actionPillClasses(action)}`}>{action || "—"}</span>
        <div className="min-w-0">
          <span className="font-sans text-[12px] text-secondary truncate block" title={target}>{target}</span>
          {gradeWithout && action === "SELL" && (
            <span className="font-sans text-[10px] text-zinc-500 truncate block">{gradeWithout}</span>
          )}
        </div>
      </div>
    );
  };

  const sections = [
    { items: moveNow, label: "Sell", icon: <ArrowUpRight size={13} className="text-accent-red" />, colorClass: "bg-accent-red/[0.05] text-accent-red" },
    { items: listen, label: "Listen", icon: <Eye size={13} className="text-accent-orange" />, colorClass: "bg-accent-orange/[0.05] text-accent-orange" },
    { items: hold, label: "Hold", icon: <Shield size={13} className="text-accent-green" />, colorClass: "bg-accent-green/[0.05] text-accent-green" },
  ];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_44px_32px_56px_60px_1fr] gap-2 px-3 py-2 border-b border-border-lt bg-elevated">
        {["Player", "Pos", "Age", "Rank", "Action", "Target"].map((h, i) => (
          <span key={h} className={`font-sans text-[11px] font-medium text-dim uppercase tracking-wider ${i >= 1 && i <= 4 ? "text-center" : ""}`}>{h}</span>
        ))}
      </div>

      {sections.map(({ items, label, icon, colorClass }) => items.length > 0 && (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-2 px-3 py-1.5 border-b border-border ${colorClass.split(" ")[0]}`}>
            {icon}
            <span className={`font-sans text-[11px] font-semibold uppercase tracking-wider ${colorClass.split(" ")[1]}`}>{label}</span>
            <span className="font-sans text-[11px] text-dim ml-auto">{items.length}</span>
          </div>
          {items.map((p, j) => renderRow(p, j, j === items.length - 1))}
        </React.Fragment>
      ))}

      {!moveNow.length && !listen.length && !hold.length && (
        <div className="px-4 py-8 text-center font-sans text-sm text-dim">No coaching recommendations available.</div>
      )}

      {/* Buy Low row */}
      {buyLow.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/[0.05] border-y border-border">
            <Target size={13} className="text-gold" />
            <span className="font-sans text-[11px] font-semibold text-gold uppercase tracking-wider">Buy Low Targets</span>
            <span className="font-sans text-[11px] text-dim ml-auto">{buyLow.length}</span>
          </div>
          {buyLow.map((p, j) => (
            <div key={`buy-${j}`} className={`px-3 py-2 flex items-center gap-2 ${j < buyLow.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
              <span className={`font-sans text-[11px] font-bold shrink-0 min-w-[28px] text-center rounded px-1.5 py-0.5 ${posTagClasses(String(p.position || ""))}`}>{String(p.position || "—")}</span>
              <PlayerName name={String(p.name || p.player || "—")} className="font-sans text-[13px] font-medium text-primary flex-1 truncate" />
              {String(p.owner || "") !== "" && <span className="font-sans text-[11px] text-dim shrink-0">from {String(p.owner)}</span>}
              {posRankLabel(p) && <span className="font-sans text-[11px] font-semibold text-secondary bg-elevated rounded-full px-1.5 py-0.5 border border-border-lt shrink-0">{posRankLabel(p)}</span>}
            </div>
          ))}
        </>
      )}

      {/* Build Trade CTA */}
      <div className="px-3 py-3 border-t border-border bg-elevated/50 flex items-center justify-end">
        <button onClick={goToTrades} className="flex items-center gap-1.5 font-sans text-[12px] font-semibold text-gold bg-gold/10 hover:bg-gold/20 border border-gold/25 rounded-full px-4 py-1.5 transition-colors cursor-pointer">
          Build a trade <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: POSITION GRADES + NEEDS
   ═══════════════════════════════════════════════════════════════ */

function PositionGrades({ cc }: { cc: Record<string, unknown> }) {
  const grades = cc.positional_grades as Record<string, string> | undefined;
  const weakest = cc.weakest_position as string | undefined;
  if (!grades) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<BarChart3 size={13} className="text-gold" />} label="Position Grades" />
      <div className="p-3 flex flex-col gap-1.5">
        {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
          const grade = grades[pos] || "—";
          const isWeakest = pos === weakest;
          return (
            <div key={pos} className={`flex items-center gap-2 py-1.5 px-2 rounded ${isWeakest ? "bg-accent-orange/[0.07]" : ""}`}>
              <span className={`font-sans text-[12px] font-bold w-7 ${posTextClass(pos)}`}>{pos}</span>
              <span className={`font-sans text-[11px] font-semibold rounded px-2 py-0.5 min-w-[64px] text-center border ${gradeTagClasses(grade)}`}>{grade}</span>
              {isWeakest && <AlertTriangle size={11} className="text-accent-orange ml-auto shrink-0" />}
            </div>
          );
        })}
      </div>
      {weakest && (
        <div className="px-3 py-2 border-t border-border-lt flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-accent-orange" />
          <span className="font-sans text-[11px] text-accent-orange">Priority need: {weakest}</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: DRAFT CAPITAL + HIT RATES
   ═══════════════════════════════════════════════════════════════ */

function DraftIntel({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Trophy size={13} className="text-gold" />} label="Draft Capital" />
      <div className="p-4 font-sans text-[12px] text-dim text-center">No draft data available</div>
    </div>
  );

  const hitRate = data.hit_rate as number | null;
  const bustRate = data.bust_rate as number | null;
  const leagueAvg = data.league_avg_hit_rate as number | null;
  const rounds = (data.round_efficiency || []) as Array<Record<string, unknown>>;
  const picks = (data.current_picks || []) as Array<Record<string, unknown>>;
  const coaching = String(data.coaching_line || "");

  const hitColor = hitRate != null ? (hitRate > 50 ? "text-accent-green" : hitRate < 35 ? "text-accent-red" : "text-gold") : "text-dim";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Trophy size={13} className="text-gold" />} label="Draft Capital" />

      <div className="p-3 space-y-3">
        {/* Hit rate hero */}
        {hitRate != null && (
          <div className="flex items-baseline gap-3">
            <span className={`font-sans text-[24px] font-bold tabular-nums ${hitColor}`}>{hitRate}%</span>
            <span className="font-sans text-[12px] text-dim">draft hit rate</span>
            {leagueAvg != null && (
              <span className={`font-sans text-[11px] ml-auto ${hitRate > leagueAvg ? "text-accent-green" : "text-accent-red"}`}>
                league avg {leagueAvg}%
              </span>
            )}
          </div>
        )}

        {/* Round efficiency */}
        {rounds.length > 0 && (
          <div className="space-y-1">
            {rounds.map((r) => {
              const rd = Number(r.round);
              const hr = Number(r.hit_rate || 0);
              return (
                <div key={rd} className="flex items-center gap-2">
                  <span className="font-sans text-[11px] text-dim w-6 shrink-0">R{rd}</span>
                  <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${hr > 50 ? "bg-accent-green" : hr > 30 ? "bg-gold" : "bg-accent-red"}`} style={{ width: `${Math.min(hr, 100)}%` }} />
                  </div>
                  <span className="font-sans text-[11px] text-secondary tabular-nums w-10 text-right">{hr.toFixed(0)}%</span>
                  <span className="font-sans text-[10px] text-dim w-12 text-right">{String(r.picks || 0)} picks</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Current draft capital */}
        {picks.length > 0 && (
          <div>
            <div className="font-sans text-[11px] text-dim uppercase tracking-wider mb-1.5">Current Picks</div>
            <div className="flex flex-wrap gap-1.5">
              {picks.map((p, i) => (
                <span key={i} className={`font-sans text-[11px] font-semibold rounded-full px-2 py-0.5 border ${p.is_own ? "text-gold bg-gold/10 border-gold/25" : "text-secondary bg-elevated border-border-lt"}`}>
                  {String(p.season).slice(2)} R{String(p.round)}
                  {!p.is_own && <span className="text-dim ml-0.5">({String(p.original_owner).slice(0, 8)})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Coaching line */}
        {coaching && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-border-lt">
            <Sparkles size={12} className="text-gold shrink-0 mt-0.5" />
            <span className="font-sans text-[12px] text-secondary leading-tight">{coaching}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4: TRADE PARTNERS
   ═══════════════════════════════════════════════════════════════ */

function TradePartners({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Handshake size={13} className="text-gold" />} label="Trade Partners" />
      <div className="p-4 font-sans text-[12px] text-dim text-center">No trade partner data available</div>
    </div>
  );

  const top = (data.top || []) as Array<Record<string, unknown>>;
  const avoid = (data.avoid || []) as Array<Record<string, unknown>>;
  const myStats = data.my_stats as Record<string, unknown> | null;

  const badgeClasses = (b: string) => {
    switch (b) {
      case "top match": return "text-accent-green bg-accent-green/10 border-accent-green/25";
      case "panic trader": return "text-accent-red bg-accent-red/10 border-accent-red/25";
      case "frequent partner": return "text-accent-blue bg-accent-blue/10 border-accent-blue/25";
      case "good fit": return "text-gold bg-gold/10 border-gold/25";
      default: return "text-dim bg-elevated border-border-lt";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Handshake size={13} className="text-gold" />} label="Trade Partners" />

      <div className="p-3 space-y-3">
        {/* My stats bar */}
        {myStats && (
          <div className="flex items-center gap-3 flex-wrap pb-2 border-b border-border-lt">
            <div className="flex items-center gap-1">
              <Award size={12} className="text-gold" />
              <span className="font-sans text-[11px] text-dim">You:</span>
              <span className="font-sans text-[12px] font-semibold text-primary">{String(myStats.record || "0-0-0")}</span>
            </div>
            {myStats.win_rate != null && (
              <span className={`font-sans text-[11px] font-semibold ${Number(myStats.win_rate) > 55 ? "text-accent-green" : Number(myStats.win_rate) < 45 ? "text-accent-red" : "text-secondary"}`}>
                {String(myStats.win_rate)}% win rate
              </span>
            )}
            {!!myStats.archetype && (
              <span className="font-sans text-[10px] text-dim bg-elevated rounded-full px-2 py-0.5 border border-border-lt">{String(myStats.archetype)}</span>
            )}
            {((myStats.badges || []) as string[]).slice(0, 2).map((b, i) => (
              <span key={i} className="font-sans text-[10px] text-gold bg-gold/10 rounded-full px-2 py-0.5 border border-gold/20">{b}</span>
            ))}
          </div>
        )}

        {/* Top partners */}
        {top.map((p, i) => (
          <div key={i} className={`flex items-start gap-2 py-2 ${i < top.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
            <span className="font-sans text-[16px] font-bold text-dim/30 shrink-0 w-5 text-center tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-[13px] font-semibold text-primary">{String(p.owner)}</span>
                {!!p.badge && <span className={`font-sans text-[10px] font-semibold rounded-full px-2 py-0.5 border ${badgeClasses(String(p.badge))}`}>{String(p.badge)}</span>}
                {!!p.archetype && <span className="font-sans text-[10px] text-dim">{String(p.archetype).replace(/_/g, " ").toLowerCase()}</span>}
              </div>
              <div className="font-sans text-[12px] text-secondary mt-0.5">{String(p.reason)}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-sans text-[12px] font-semibold text-secondary tabular-nums">{String(p.h2h_record)}</div>
              <div className="font-sans text-[10px] text-dim">h2h record</div>
            </div>
          </div>
        ))}

        {/* Avoid section */}
        {avoid.length > 0 && (
          <div className="pt-2 border-t border-border-lt">
            <div className="font-sans text-[10px] text-dim uppercase tracking-wider mb-1.5">Avoid</div>
            {avoid.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <Minus size={11} className="text-accent-red shrink-0" />
                <span className="font-sans text-[12px] text-dim">{String(p.owner)}</span>
                <span className="font-sans text-[10px] text-dim/60 ml-auto">{String(p.reason)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 5: LINEUP EFFICIENCY
   ═══════════════════════════════════════════════════════════════ */

function LineupEfficiency({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Gauge size={13} className="text-gold" />} label="Lineup Efficiency" />
      <div className="p-4 font-sans text-[12px] text-dim text-center">No lineup data available</div>
    </div>
  );

  const eff = Number(data.efficiency_pct || 0);
  const ppg = Number(data.ppg_left_on_bench || 0);
  const weeks = Number(data.weeks_analyzed || 0);
  const misbenched = (data.misbenched || []) as Array<Record<string, unknown>>;
  const message = data.message ? String(data.message) : null;

  if (weeks === 0 && message) return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Gauge size={13} className="text-gold" />} label="Lineup Efficiency" />
      <div className="p-4 font-sans text-[12px] text-dim text-center">{message}</div>
    </div>
  );

  const effColor = eff >= 95 ? "text-accent-green" : eff >= 88 ? "text-gold" : "text-accent-red";
  const effLabel = eff >= 95 ? "Elite" : eff >= 90 ? "Good" : eff >= 85 ? "Average" : "Poor";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<Gauge size={13} className="text-gold" />} label="Lineup Efficiency" />

      <div className="p-3 space-y-3">
        {/* Efficiency hero */}
        <div className="flex items-baseline gap-3">
          <span className={`font-sans text-[28px] font-bold tabular-nums ${effColor}`}>{eff}%</span>
          <div>
            <span className={`font-sans text-[12px] font-semibold ${effColor}`}>{effLabel}</span>
            <span className="font-sans text-[11px] text-dim block">{ppg} PPG left on bench</span>
          </div>
          {weeks > 0 && <span className="font-sans text-[10px] text-dim ml-auto">{weeks} weeks</span>}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${eff >= 95 ? "bg-accent-green" : eff >= 88 ? "bg-gold" : "bg-accent-red"}`} style={{ width: `${Math.min(eff, 100)}%` }} />
        </div>

        {/* Misbenched players */}
        {misbenched.length > 0 && (
          <div>
            <div className="font-sans text-[11px] text-dim uppercase tracking-wider mb-1.5">Most Misbenched</div>
            {misbenched.map((m, i) => (
              <div key={i} className={`flex items-center gap-2 py-1.5 ${i < misbenched.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                <span className={`font-sans text-[11px] font-bold rounded px-1 py-0.5 ${posTagClasses(String(m.position || ""))}`}>{String(m.position || "—")}</span>
                <PlayerName name={String(m.player || "")} className="font-sans text-[12px] font-medium text-primary flex-1 truncate" />
                <span className="font-sans text-[11px] text-accent-red tabular-nums">{String(m.times)}x</span>
                <span className="font-sans text-[10px] text-dim">{String(m.avg_impact)} PPG impact</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 6: COMPETITIVE LANDSCAPE
   ═══════════════════════════════════════════════════════════════ */

function CompetitiveLandscape({ data }: { data: Array<Record<string, unknown>> | null }) {
  if (!data || !data.length) return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<TrendingUp size={13} className="text-gold" />} label="Competitive Landscape" />
      <div className="p-4 font-sans text-[12px] text-dim text-center">No trending data available</div>
    </div>
  );

  const maxDelta = Math.max(...data.map((d) => Math.abs(Number(d.delta || 0))), 1);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={<TrendingUp size={13} className="text-gold" />} label="30-Day Competitive Landscape" />

      <div className="p-0">
        {data.map((entry, i) => {
          const delta = Number(entry.delta || 0);
          const dir = String(entry.direction || "stable");
          const isMe = !!entry.is_me;
          const tag = entry.tag ? String(entry.tag) : null;
          const barWidth = Math.abs(delta) / maxDelta * 100;

          return (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 ${isMe ? "bg-gold/[0.06]" : ""} ${i < data.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
              <span className="font-sans text-[11px] text-dim w-4 text-center tabular-nums">{i + 1}</span>
              <span className={`font-sans text-[12px] truncate flex-1 min-w-0 ${isMe ? "font-semibold text-gold" : "text-primary"}`}>
                {String(entry.owner)}{isMe ? " (you)" : ""}
              </span>
              {tag && (
                <span className={`font-sans text-[9px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5 shrink-0 ${tag === "rising threat" ? "text-accent-green bg-accent-green/10" : "text-accent-red bg-accent-red/10"}`}>{tag}</span>
              )}
              <div className="w-16 flex items-center justify-end gap-1 shrink-0">
                {dir === "up" ? <TrendingUp size={11} className="text-accent-green" /> :
                 dir === "down" ? <TrendingDown size={11} className="text-accent-red" /> :
                 <Minus size={11} className="text-dim" />}
                <span className={`font-sans text-[11px] font-semibold tabular-nums ${dir === "up" ? "text-accent-green" : dir === "down" ? "text-accent-red" : "text-dim"}`}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 7: BUILD TRADE CTA
   ═══════════════════════════════════════════════════════════════ */

function BuildTradeCTA() {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();
  const goToTrades = () => router.push(`/l/${currentLeagueSlug}/trades`);
  return (
    <div className="bg-card border border-gold/20 rounded-lg overflow-hidden flex items-center justify-between px-5 py-4">
      <div>
        <div className="font-sans text-[13px] font-semibold text-primary">Ready to make moves?</div>
        <div className="font-sans text-[12px] text-dim mt-0.5">The trade builder matches you with the right partners and assets.</div>
      </div>
      <button onClick={goToTrades} className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-card bg-gold hover:bg-gold-bright rounded-full px-5 py-2 transition-colors cursor-pointer shrink-0">
        Build a trade <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — 7-section grid layout
   ═══════════════════════════════════════════════════════════════ */

export default function CoachesCorner({ leagueId, owner, ownerId }: { leagueId: string; owner: string; ownerId?: string | null }) {
  const { data: cc, isLoading } = useQuery({
    queryKey: ["coaches-corner-v2", leagueId, owner],
    queryFn: () => getCoachesCorner(leagueId, owner, ownerId),
    enabled: !!owner,
  });

  if (!owner) return (
    <div className="p-10 text-center font-sans text-sm text-dim">Select an owner to view coaching intel.</div>
  );

  if (isLoading) return (
    <div className="space-y-3 p-4">
      <Skel /><div className="grid grid-cols-2 gap-3"><Skel /><Skel /></div><Skel />
    </div>
  );

  const data = cc as Record<string, unknown> | undefined;
  if (!data) return (
    <div className="p-10 text-center font-sans text-sm text-dim">Coaches corner data unavailable.</div>
  );

  return (
    <div className="space-y-4">
      {/* Row 1: Full width — Roster Actions */}
      <RosterActionsTable cc={data} />

      {/* Row 2: 2 columns — Position Grades | Draft Capital */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PositionGrades cc={data} />
        <DraftIntel data={data.draft_intel as Record<string, unknown> | null} />
      </div>

      {/* Row 3: Full width — Trade Partners */}
      <TradePartners data={data.trade_partners as Record<string, unknown> | null} />

      {/* Row 4: 2 columns — Lineup Efficiency | Competitive Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineupEfficiency data={data.lineup_efficiency as Record<string, unknown> | null} />
        <CompetitiveLandscape data={data.competitive_landscape as Array<Record<string, unknown>> | null} />
      </div>

      {/* Row 5: Full width — Build Trade CTA */}
      <BuildTradeCTA />
    </div>
  );
}
