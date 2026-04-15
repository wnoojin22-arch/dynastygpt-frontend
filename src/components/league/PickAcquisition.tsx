"use client";

import { useQuery } from "@tanstack/react-query";
import { getPickAcquisition } from "@/lib/api";

interface Pick {
  player: string;
  position: string;
  season: number;
  round: number;
  slot: number;
  sha_value: number;
  pos_rank: string;
  original_owner: string;
  hit: boolean;
  bust: boolean;
}

interface PickAcquisitionData {
  acquired_count: number;
  own_count: number;
  acquired_pct: number;
  acquired_hit_rate: number;
  own_hit_rate: number;
  acquired_avg_sha: number;
  own_avg_sha: number;
  acquired_hits: number;
  own_hits: number;
  best_acquired_pick: Pick | null;
  worst_acquired_pick: Pick | null;
  round_breakdown: Record<string, number>;
}

const POS_COLORS: Record<string, string> = {
  QB: "text-accent-red", RB: "text-accent-blue", WR: "text-accent-green", TE: "text-accent-orange",
};
const POS_BG: Record<string, string> = {
  QB: "bg-accent-red/10", RB: "bg-accent-blue/10", WR: "bg-accent-green/10", TE: "bg-accent-orange/10",
};

function PickCard({ pick, label, accent }: { pick: Pick; label: string; accent: string }) {
  return (
    <div className={`rounded-lg border p-3 ${accent === "green" ? "border-accent-green/20 bg-accent-green/[0.04]" : "border-accent-red/20 bg-accent-red/[0.04]"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`font-mono text-[8px] font-bold tracking-widest ${accent === "green" ? "text-accent-green" : "text-accent-red"}`}>{label}</span>
        <span className="font-mono text-[9px] text-dim">R{pick.round}.{String(pick.slot).padStart(2, "0")} · {pick.season}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[10px] font-bold rounded px-1 py-0.5 ${POS_COLORS[pick.position] || "text-dim"} ${POS_BG[pick.position] || "bg-elevated"}`}>{pick.position}</span>
        <span className="font-sans text-sm font-semibold text-primary flex-1">{pick.player}</span>
        <span className="font-mono text-xs font-bold text-gold">{Math.round(pick.sha_value).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className="font-mono text-[9px] text-dim">from</span>
        <span className="font-mono text-[9px] text-secondary">{pick.original_owner}</span>
        {pick.pos_rank && <span className="font-mono text-[9px] text-dim ml-auto">{pick.pos_rank}</span>}
      </div>
    </div>
  );
}

export default function PickAcquisition({ leagueId, owner, ownerId }: { leagueId: string; owner: string; ownerId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["pick-acquisition", leagueId, owner],
    queryFn: () => getPickAcquisition(leagueId, owner, ownerId),
    enabled: !!leagueId && !!owner,
    staleTime: 600_000,
  });

  const d = data as PickAcquisitionData | undefined;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="font-mono text-[9px] font-bold tracking-widest text-dim">PICK ACQUISITION</div>
        <div className="font-sans text-sm text-dim mt-2">Loading...</div>
      </div>
    );
  }

  if (!d || (d.acquired_count === 0 && d.own_count === 0)) {
    return null; // No data — don't render
  }

  const acqWins = d.acquired_hit_rate > d.own_hit_rate;
  const diff = Math.abs(d.acquired_hit_rate - d.own_hit_rate);
  const rdBreakdown = d.round_breakdown || {};

  // Answer headline
  let headline = "";
  if (d.acquired_count === 0) {
    headline = "No picks acquired via trade yet.";
  } else if (acqWins && diff >= 15) {
    headline = `Trades for picks at ${d.acquired_hit_rate}% — significantly better than their own ${d.own_hit_rate}%.`;
  } else if (acqWins) {
    headline = `Acquired picks hit at ${d.acquired_hit_rate}% vs ${d.own_hit_rate}% on their own.`;
  } else if (diff >= 15) {
    headline = `Own picks hit at ${d.own_hit_rate}% — significantly better than acquired ${d.acquired_hit_rate}%.`;
  } else {
    headline = `Similar hit rates: ${d.acquired_hit_rate}% acquired vs ${d.own_hit_rate}% own.`;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-elevated flex items-center gap-2">
        <span className="text-gold text-xs">🎯</span>
        <span className="font-mono text-[9px] font-bold tracking-widest text-dim">PICK ACQUISITION</span>
      </div>

      <div className="p-4 space-y-4">
        {/* ── ANSWER ── */}
        <p className="font-sans text-[13px] text-secondary leading-relaxed">{headline}</p>

        {/* ── BY THE NUMBERS ── */}
        {d.acquired_count > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {/* Acquired */}
              <div className="rounded-lg border border-border bg-elevated p-3 text-center">
                <div className="font-mono text-[8px] font-bold tracking-widest text-dim mb-1">ACQUIRED PICKS</div>
                <div className={`font-mono text-2xl font-black ${acqWins ? "text-accent-green" : "text-primary"}`}>{d.acquired_hit_rate}%</div>
                <div className="font-mono text-[9px] text-dim mt-0.5">{d.acquired_hits}/{d.acquired_count} hits · avg {d.acquired_avg_sha.toLocaleString()}</div>
              </div>
              {/* Own */}
              <div className="rounded-lg border border-border bg-elevated p-3 text-center">
                <div className="font-mono text-[8px] font-bold tracking-widest text-dim mb-1">OWN PICKS</div>
                <div className={`font-mono text-2xl font-black ${!acqWins ? "text-accent-green" : "text-primary"}`}>{d.own_hit_rate}%</div>
                <div className="font-mono text-[9px] text-dim mt-0.5">{d.own_hits}/{d.own_count} hits · avg {d.own_avg_sha.toLocaleString()}</div>
              </div>
            </div>

            {/* Round breakdown pills */}
            <div>
              <div className="font-mono text-[8px] font-bold tracking-widest text-dim mb-2">ACQUIRED BY ROUND</div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((rd) => {
                  const count = rdBreakdown[String(rd)] || 0;
                  return (
                    <div key={rd} className={`flex-1 rounded-md border text-center py-2 ${count > 0 ? "border-gold/20 bg-gold/[0.06]" : "border-border bg-elevated"}`}>
                      <div className={`font-mono text-sm font-bold ${count > 0 ? "text-gold" : "text-dim"}`}>{count}</div>
                      <div className="font-mono text-[8px] text-dim">R{rd}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── EVIDENCE — best/worst ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {d.best_acquired_pick && <PickCard pick={d.best_acquired_pick} label="BEST ACQUIRED" accent="green" />}
              {d.worst_acquired_pick && <PickCard pick={d.worst_acquired_pick} label="WORST ACQUIRED" accent="red" />}
            </div>

            {/* Acquisition % */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
                <div className="h-full rounded-full bg-gold" style={{ width: `${d.acquired_pct}%` }} />
              </div>
              <span className="font-mono text-[9px] text-dim">{d.acquired_pct}% of R1-4 picks were acquired via trade</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
