"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoachesCorner } from "@/lib/api";
import { posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import {
  ArrowUpRight, Shield, Target, AlertTriangle,
  Trophy, TrendingUp, TrendingDown,
  Sparkles, Award, Handshake, Gauge, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   COACHES CORNER — Dense GM Dashboard
   ═══════════════════════════════════════════════════════════════ */

function posTagClasses(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red bg-accent-red/10";
    case "RB": return "text-accent-blue bg-accent-blue/10";
    case "WR": return "text-accent-green bg-accent-green/10";
    case "TE": return "text-accent-orange bg-accent-orange/10";
    default: return "text-dim bg-elevated";
  }
}

function SH({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 border-b border-border-lt bg-elevated">
      {icon}
      <span className="font-sans text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ── Market Intel ── */

function MarketIntel({ cc }: { cc: Record<string, unknown> }) {
  const above = (cc.market_above || []) as Array<Record<string, unknown>>;
  const below = (cc.market_below || []) as Array<Record<string, unknown>>;
  if (!above.length && !below.length) return null;

  const Row = ({ p, isAbove }: { p: Record<string, unknown>; isAbove: boolean }) => {
    const pct = Number(p.pct_diff || 0);
    const color = isAbove ? "text-accent-red" : "text-accent-green";
    const label = isAbove ? "sell window" : "buy window";
    return (
      <div className="flex items-center gap-1.5 py-1 px-2">
        <span className={`font-sans text-[10px] font-bold rounded px-1 py-0.5 shrink-0 ${posTagClasses(String(p.position || ""))}`}>{String(p.position || "")}</span>
        <PlayerName name={String(p.name || "")} className="font-sans text-[11px] font-medium text-primary flex-1 truncate" />
        {p.age != null && <span className="font-sans text-[10px] text-dim shrink-0">{String(p.age)}</span>}
        <span className={`font-sans text-[10px] font-bold tabular-nums shrink-0 ${color}`}>{pct > 0 ? "+" : ""}{pct}%</span>
        <span className={`font-sans text-[9px] rounded-full px-1.5 py-0.5 border shrink-0 ${isAbove ? "text-accent-red bg-accent-red/10 border-accent-red/25" : "text-accent-green bg-accent-green/10 border-accent-green/25"}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <SH icon={<TrendingUp size={10} className="text-accent-red" />} label="Above Market" />
        {above.length > 0 ? above.slice(0, 3).map((p, i) => <Row key={i} p={p} isAbove />) : (
          <div className="px-2 py-2 font-sans text-[10px] text-dim text-center">No overvalued assets</div>
        )}
      </div>
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <SH icon={<TrendingDown size={10} className="text-accent-green" />} label="Below Market" />
        {below.length > 0 ? below.slice(0, 3).map((p, i) => <Row key={i} p={p} isAbove={false} />) : (
          <div className="px-2 py-2 font-sans text-[10px] text-dim text-center">No undervalued assets</div>
        )}
      </div>
    </div>
  );
}

/* ── Pick Intel ── */

function PickIntel({ cc }: { cc: Record<string, unknown> }) {
  const draftIntel = cc.draft_intel as Record<string, unknown> | null;
  const window = String(cc.owner_window || cc.window || "BALANCED");
  const weakest = cc.weakest_position as string | null;
  const picks = (draftIntel?.current_picks || []) as Array<Record<string, unknown>>;
  const roundEff = (draftIntel?.round_efficiency || []) as Array<Record<string, unknown>>;
  const hitRate = draftIntel?.hit_rate as number | null;
  const leagueAvg = draftIntel?.league_avg_hit_rate as number | null;

  // Build round hit rate lookup
  const roundHR: Record<number, { rate: number; picks: number; total: number }> = {};
  for (const r of roundEff) {
    const rd = Number(r.round);
    roundHR[rd] = { rate: Number(r.hit_rate || 0), picks: Number(r.hits || 0), total: Number(r.picks || 0) };
  }

  const getPill = (round: number, value: number): { pill: string; cls: string } => {
    const rh = roundHR[round];
    const rate = rh?.rate ?? 50;
    if (window === "CONTENDER") {
      if (round <= 1 && value >= 4000) return { pill: "USE IT", cls: "text-accent-green bg-accent-green/15 border-accent-green/30" };
      if (round >= 3) return { pill: "PACKAGE", cls: "text-accent-orange bg-accent-orange/15 border-accent-orange/30" };
      return { pill: "TRADE UP", cls: "text-accent-blue bg-accent-blue/15 border-accent-blue/30" };
    }
    if (window === "REBUILDER") {
      if (round <= 1) return { pill: "USE IT", cls: "text-accent-green bg-accent-green/15 border-accent-green/30" };
      if (rate >= 40) return { pill: "USE IT", cls: "text-accent-green bg-accent-green/15 border-accent-green/30" };
      return { pill: "PACKAGE", cls: "text-accent-orange bg-accent-orange/15 border-accent-orange/30" };
    }
    if (round <= 1) return { pill: "USE IT", cls: "text-accent-green bg-accent-green/15 border-accent-green/30" };
    if (rate < 30) return { pill: "PACKAGE", cls: "text-accent-orange bg-accent-orange/15 border-accent-orange/30" };
    return { pill: "EVALUATE", cls: "text-dim bg-elevated border-border-lt" };
  };

  // Summary line
  let summary = "";
  if (!picks.length) {
    summary = weakest ? `No picks on roster. Target rebuilding teams — you need ${weakest}.` : "No picks on roster.";
  } else if (hitRate != null && hitRate > 55) {
    summary = `You draft well (${hitRate}% hit rate). Hold your picks and trust the process.`;
  } else if (hitRate != null && hitRate < 35) {
    summary = `${hitRate}% hit rate — trade picks for proven production.`;
  } else {
    summary = `${picks.length} pick${picks.length > 1 ? "s" : ""} on roster${hitRate != null ? ` · ${hitRate}% career hit rate` : ""}.`;
  }

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Sparkles size={10} className="text-gold" />} label="Pick Intel" />
      <div className="px-2 py-1.5 border-b border-white/[0.04]">
        <p className="font-sans text-[11px] text-secondary leading-snug">{summary}</p>
      </div>
      {picks.length > 0 ? picks.map((p, j) => {
        const season = String(p.season || "");
        const round = p.round as number;
        const isOwn = p.is_own as boolean;
        const value = (p.value as number) || 0;
        const rh = roundHR[round];
        const { pill, cls } = getPill(round, value);
        const hitStr = rh ? `${rh.rate}% (${rh.picks}/${rh.total})` : "—";
        const avgStr = leagueAvg != null ? `${leagueAvg}%` : "—";

        return (
          <div key={j} className={`flex items-center gap-1.5 px-2 py-1 ${j < picks.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
            <span className={`font-sans text-[9px] font-bold rounded px-1 py-0.5 shrink-0 ${isOwn ? "text-gold bg-gold/10 border border-gold/25" : "text-[#b39ddb] bg-[#b39ddb]/10 border border-[#b39ddb]/25"}`}>
              {season.slice(2)} R{round}
            </span>
            <span className="font-sans text-[10px] text-dim tabular-nums shrink-0">{Math.round(value).toLocaleString()}</span>
            <span className="font-sans text-[9px] text-secondary flex-1 truncate">
              Your R{round}: {hitStr} vs avg {avgStr}
            </span>
            <span className={`font-sans text-[9px] font-bold rounded-full px-1.5 py-0.5 border shrink-0 ${cls}`}>{pill}</span>
          </div>
        );
      }) : (
        <div className="px-2 py-2 text-center font-sans text-[10px] text-dim">No picks on roster</div>
      )}
    </div>
  );
}

/* ── Lineup Efficiency ── */

function LineupEfficiency({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Gauge size={10} className="text-gold" />} label="Lineup Efficiency" />
      <div className="px-2 py-2 font-sans text-[10px] text-dim text-center">No lineup data</div>
    </div>
  );

  const eff = Number(data.efficiency_pct || 0);
  const ppg = Number(data.ppg_left_on_bench || 0);
  const weeks = Number(data.weeks_analyzed || 0);
  const misbenched = (data.misbenched || []) as Array<Record<string, unknown>>;
  const message = data.message ? String(data.message) : null;

  if (weeks === 0 && message) return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Gauge size={10} className="text-gold" />} label="Lineup Efficiency" />
      <div className="px-2 py-2 font-sans text-[10px] text-dim text-center">{message}</div>
    </div>
  );

  const effColor = eff >= 95 ? "text-accent-green" : eff >= 88 ? "text-gold" : "text-accent-red";
  const effLabel = eff >= 95 ? "Elite" : eff >= 90 ? "Good" : eff >= 85 ? "Average" : "Poor";

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Gauge size={10} className="text-gold" />} label="Lineup Efficiency" />
      <div className="px-2 py-1.5 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className={`font-sans text-[20px] font-bold tabular-nums ${effColor}`}>{eff}%</span>
          <span className={`font-sans text-[11px] font-semibold ${effColor}`}>{effLabel}</span>
          <span className="font-sans text-[10px] text-dim ml-auto">{ppg} pts/wk on bench · {weeks}wk</span>
        </div>
        <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${eff >= 95 ? "bg-accent-green" : eff >= 88 ? "bg-gold" : "bg-accent-red"}`} style={{ width: `${Math.min(eff, 100)}%` }} />
        </div>
        {misbenched.length > 0 && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0">
            {misbenched.slice(0, 4).map((m, i) => (
              <div key={i} className="flex items-center gap-1 py-0.5">
                <span className={`font-sans text-[9px] font-bold rounded px-0.5 ${posTagClasses(String(m.position || ""))}`}>{String(m.position || "")}</span>
                <span className="font-sans text-[10px] text-primary truncate flex-1">{String(m.player || "")}</span>
                <span className="font-sans text-[9px] text-accent-red tabular-nums shrink-0">{String(m.times)}x</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Trade Partners ── */

function TradePartners({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Handshake size={10} className="text-gold" />} label="Trade Partners" />
      <div className="px-2 py-2 font-sans text-[10px] text-dim text-center">No trade partner data</div>
    </div>
  );

  const top = (data.top || []) as Array<Record<string, unknown>>;
  const myStats = data.my_stats as Record<string, unknown> | null;

  const badgeCls = (b: string) => {
    switch (b) {
      case "top match": return "text-accent-green bg-accent-green/10 border-accent-green/25";
      case "panic trader": return "text-accent-red bg-accent-red/10 border-accent-red/25";
      case "frequent partner": return "text-accent-blue bg-accent-blue/10 border-accent-blue/25";
      case "good fit": return "text-gold bg-gold/10 border-gold/25";
      default: return "text-dim bg-elevated border-border-lt";
    }
  };

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <SH icon={<Handshake size={10} className="text-gold" />} label="Trade Partners" />
      <div className="px-2 py-1">
        {myStats && (
          <div className="flex items-center gap-2 flex-wrap py-1 border-b border-white/[0.04]">
            <Award size={10} className="text-gold" />
            <span className="font-sans text-[11px] font-semibold text-primary">{String(myStats.record || "0-0-0")}</span>
            {myStats.win_rate != null && <span className={`font-sans text-[10px] font-semibold ${Number(myStats.win_rate) > 55 ? "text-accent-green" : "text-secondary"}`}>{String(myStats.win_rate)}%</span>}
            {((myStats.badges || []) as string[]).slice(0, 2).map((b, i) => (
              <span key={i} className="font-sans text-[9px] text-gold bg-gold/10 rounded-full px-1.5 py-0.5 border border-gold/20">{b}</span>
            ))}
          </div>
        )}
        {top.map((p, i) => (
          <div key={i} className={`flex items-center gap-1.5 py-1 ${i < top.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
            <span className="font-sans text-[12px] font-bold text-dim/30 w-3 text-center">{i + 1}</span>
            <span className="font-sans text-[12px] font-semibold text-primary truncate flex-1">{String(p.owner)}</span>
            {!!p.badge && <span className={`font-sans text-[9px] font-semibold rounded-full px-1.5 py-0.5 border ${badgeCls(String(p.badge))}`}>{String(p.badge)}</span>}
            <span className="font-sans text-[11px] font-semibold text-secondary tabular-nums shrink-0">{String(p.h2h_record)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Build Trade CTA ── */

function BuildTradeCTA() {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();
  return (
    <div className="bg-card border border-gold/20 rounded-md flex items-center justify-between px-3 py-2">
      <div>
        <div className="font-sans text-[12px] font-semibold text-primary">Ready to make moves?</div>
        <div className="font-sans text-[10px] text-dim">The trade builder matches you with the right partners.</div>
      </div>
      <button onClick={() => router.push(`/l/${currentLeagueSlug}/trades`)} className="flex items-center gap-1 font-sans text-[11px] font-semibold text-card bg-gold hover:bg-gold-bright rounded-full px-4 py-1.5 transition-colors cursor-pointer shrink-0">
        Build trade <ChevronRight size={12} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function CoachesCorner({ leagueId, owner, ownerId }: { leagueId: string; owner: string; ownerId?: string | null }) {
  const { data: cc, isLoading } = useQuery({
    queryKey: ["coaches-corner-v2", leagueId, owner],
    queryFn: () => getCoachesCorner(leagueId, owner, ownerId),
    enabled: !!owner,
  });

  if (!owner) return <div className="p-8 text-center font-sans text-sm text-dim">Select an owner.</div>;
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
        <div className="absolute inset-3 rounded-full bg-gold/5 animate-pulse" />
      </div>
      <div className="text-center">
        <div className="font-mono text-xs font-bold tracking-[0.2em] text-gold animate-pulse">GENERATING YOUR COACHES CORNER</div>
        <div className="font-sans text-xs text-dim mt-2">Analyzing roster, trades, and market data...</div>
      </div>
    </div>
  );

  const data = cc as Record<string, unknown> | undefined;
  if (!data) return <div className="p-8 text-center font-sans text-sm text-dim">Data unavailable.</div>;

  const moveNow = (data.move_now || []) as Array<Record<string, unknown>>;
  const holdPlayers = (data.hold || []) as Array<Record<string, unknown>>;
  const listenPlayers = (data.listen || []) as Array<Record<string, unknown>>;
  const sellAll = [...moveNow, ...listenPlayers];
  const buyLow = (data.buy_low || []) as Array<Record<string, unknown>>;

  const PlayerRow = ({ p, j, total }: { p: Record<string, unknown>; j: number; total: number }) => {
    const pos = String(p.position || "");
    const name = String(p.name || p.player || "");
    const age = p.age != null ? String(p.age) : "";
    const reason = String(p.target || p.reason || "");
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 ${j < total - 1 ? "border-b border-white/[0.04]" : ""}`}>
        <span className={`font-sans text-[9px] font-bold rounded px-1 py-0.5 shrink-0 ${posTagClasses(pos)}`}>{pos || "—"}</span>
        <PlayerName name={name} className="font-sans text-[11px] font-medium text-primary truncate flex-1" />
        {age && <span className="font-sans text-[10px] text-dim shrink-0">{age}</span>}
        {reason && <span className="font-sans text-[9px] text-secondary truncate max-w-[120px] shrink-0 hidden md:block">{reason}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {/* Market Intel */}
      <MarketIntel cc={data} />

      {/* SELL | HOLD | BUY LOW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <SH icon={<ArrowUpRight size={10} className="text-accent-red" />} label={`Sell · ${sellAll.length}`} />
          {sellAll.length > 0 ? sellAll.map((p, j) => <PlayerRow key={`s-${j}`} p={p} j={j} total={sellAll.length} />) : (
            <div className="px-2 py-2 text-center font-sans text-[10px] text-dim">None</div>
          )}
        </div>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <SH icon={<Shield size={10} className="text-accent-green" />} label={`Hold · ${holdPlayers.length}`} />
          {holdPlayers.length > 0 ? holdPlayers.map((p, j) => <PlayerRow key={`h-${j}`} p={p} j={j} total={holdPlayers.length} />) : (
            <div className="px-2 py-2 text-center font-sans text-[10px] text-dim">None</div>
          )}
        </div>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <SH icon={<Target size={10} className="text-gold" />} label={`Buy Low · ${buyLow.length}`} />
          {buyLow.length > 0 ? buyLow.map((p, j) => <PlayerRow key={`b-${j}`} p={p} j={j} total={buyLow.length} />) : (
            <div className="px-2 py-2 text-center font-sans text-[10px] text-dim">None</div>
          )}
        </div>
      </div>

      {/* Pick Intel + Lineup Efficiency — side by side desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        <PickIntel cc={data} />
        <LineupEfficiency data={data.lineup_efficiency as Record<string, unknown> | null} />
      </div>

      {/* Trade Partners */}
      <TradePartners data={data.trade_partners as Record<string, unknown> | null} />

      {/* CTA */}
      <BuildTradeCTA />
    </div>
  );
}
