"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOwnerQuickViewStore } from "@/lib/stores/owner-quickview-store";
import { useLeagueStore } from "@/lib/stores/league-store";
import { getRoster, getPicks, getTradeRecord, getOwnerProfile } from "@/lib/api";
import { useTrack } from "@/hooks/useTrack";
import type { LeagueIntelOwner } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   OWNER QUICK VIEW MODAL — Tailwind only

   Header data comes from league-intel cache (already loaded, instant).
   Roster, Picks, Trading sections lazy-load on expand.
   ═══════════════════════════════════════════════════════════════ */

const POS_CLS: Record<string, string> = {
  QB: "text-[var(--pos-qb)]",
  RB: "text-[var(--pos-rb)]",
  WR: "text-[var(--pos-wr)]",
  TE: "text-[var(--pos-te)]",
};

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function safe(v: unknown): number {
  return typeof v === "number" && !isNaN(v) ? v : 0;
}

function windowCls(w: string): string {
  const l = (w || "").toLowerCase();
  if (l.includes("contend") || l.includes("win-now") || l.includes("champion")) return "text-accent-green border-accent-green/30 bg-accent-green/10";
  if (l.includes("rebuild") || l.includes("tear")) return "text-accent-red border-accent-red/30 bg-accent-red/10";
  if (l.includes("rising") || l.includes("pivot")) return "text-gold border-gold/30 bg-gold/10";
  return "text-accent-blue border-accent-blue/30 bg-accent-blue/10";
}

function valCls(v: number): string {
  if (v >= 5000) return "text-gold";
  if (v >= 2000) return "text-secondary";
  return "text-dim";
}

function rankCls(rank: number, total: number): string {
  if (rank <= 3) return "text-accent-green";
  if (rank <= Math.ceil(total / 2)) return "text-gold";
  return "text-accent-red";
}

// ── Badge ────────────────────────────────────────────────────────

function Badge({ text, cls }: { text: string; cls?: string }) {
  return (
    <span className={`font-mono text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded border whitespace-nowrap ${cls || "text-dim border-border bg-[rgba(255,255,255,0.06)]"}`}>
      {text}
    </span>
  );
}

// ── Collapsible Section ──────────────────────────────────────────

function Section({ label, count, children, onFirstOpen, defaultOpen }: {
  label: string; count?: number | null; children: React.ReactNode;
  onFirstOpen?: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  const [fired, setFired] = useState(defaultOpen || false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !fired && onFirstOpen) { onFirstOpen(); setFired(true); }
  };

  return (
    <div className="border-t border-border">
      <div onClick={toggle} className="flex items-center justify-between py-2.5 cursor-pointer select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-extrabold tracking-widest text-gold">{label}</span>
          {count != null && count > 0 && (
            <span className="font-mono text-[9px] font-bold text-dim">{count}</span>
          )}
        </div>
        <span className={`text-[10px] text-dim transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}>▼</span>
      </div>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ── Stat Row ─────────────────────────────────────────────────────

function Stat({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="font-sans text-[11px] text-dim">{label}</span>
      <span className={`font-mono text-[11px] font-bold ${cls || "text-primary"}`}>{value}</span>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══════════════════════════════════════════════

export default function OwnerQuickViewModal() {
  const { isOpen, ownerName, ownerUserId, close } = useOwnerQuickViewStore();
  const { currentLeagueId, currentLeagueSlug, currentOwnerId } = useLeagueStore();
  const router = useRouter();
  const qc = useQueryClient();
  const track = useTrack();

  const [roster, setRoster] = useState<any>(null);
  const [picks, setPicks] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [picksLoading, setPicksLoading] = useState(false);
  const [tradingLoading, setTradingLoading] = useState(false);

  const lid = currentLeagueId;
  const slug = currentLeagueSlug;
  const isSelf = !!(ownerUserId && currentOwnerId && ownerUserId === currentOwnerId);

  // ── Read league-intel from react-query cache (instant, no fetch) ──
  const intelData = qc.getQueryData<{ owners: LeagueIntelOwner[] }>(["league-intel", lid]);
  const ownerIntel = intelData?.owners?.find(
    (o) => o.owner === ownerName || o.owner.toLowerCase() === ownerName.toLowerCase()
  );
  const totalTeams = intelData?.owners?.length || 12;

  // Self → navigate to intel
  useEffect(() => {
    if (isOpen && isSelf && slug) {
      close();
      router.push(`/l/${slug}/intel/${encodeURIComponent(ownerName)}`);
    }
  }, [isOpen, isSelf, slug, ownerName, close, router]);

  // Reset state on open + track
  useEffect(() => {
    if (!isOpen) return;
    setRoster(null); setPicks(null); setRecord(null); setProfile(null);
    if (!isSelf) track("owner_quick_view_opened", { league_id: currentLeagueId, owner_viewed: ownerName });
  }, [isOpen, ownerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy loaders
  const loadRoster = useCallback(() => {
    if (roster || rosterLoading || !lid) return;
    track("owner_quick_view_roster_expanded", { league_id: lid, owner_viewed: ownerName });
    setRosterLoading(true);
    getRoster(lid, ownerName, ownerUserId)
      .then((res: any) => setRoster(res))
      .catch(() => setRoster({ by_position: {} }))
      .finally(() => setRosterLoading(false));
  }, [roster, rosterLoading, lid, ownerName, ownerUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPicks = useCallback(() => {
    if (picks || picksLoading || !lid) return;
    track("owner_quick_view_picks_expanded", { league_id: lid, owner_viewed: ownerName });
    setPicksLoading(true);
    getPicks(lid, ownerName, ownerUserId)
      .then((res: any) => setPicks(res))
      .catch(() => setPicks({ by_year: {}, picks: [] }))
      .finally(() => setPicksLoading(false));
  }, [picks, picksLoading, lid, ownerName, ownerUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrading = useCallback(() => {
    if (record || tradingLoading || !lid) return;
    setTradingLoading(true);
    Promise.allSettled([
      getTradeRecord(lid, ownerName, ownerUserId),
      getOwnerProfile(lid, ownerName, ownerUserId),
    ]).then(([rRes, pRes]) => {
      if (rRes.status === "fulfilled") setRecord(rRes.value);
      if (pRes.status === "fulfilled") setProfile(pRes.value);
      setTradingLoading(false);
    });
  }, [record, tradingLoading, lid, ownerName, ownerUserId]);

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, close]);

  if (!isOpen || isSelf) return null;

  // ── Extract cached intel (instant) ──
  const leagueRank = ownerIntel?.sha_rank;
  const dynastyRank = ownerIntel?.dynasty_rank;
  const winNowRank = ownerIntel?.win_now_rank;
  const totalSha = ownerIntel?.total_sha;
  const window_ = ownerIntel?.window;
  const windowLabel = typeof window_ === "string" ? window_ : (window_ as any)?.title || (window_ as any)?.label || (window_ as any)?.description || "";
  const tradeCount = ownerIntel?.trade_count || 0;
  const posGrades = ownerIntel?.positional_grades || {};

  // ── Trading data (lazy) ──
  const trading = profile?.trading || {};
  const meta = profile?.meta || {};
  const wr = record?.hindsight;
  const wrRate = safe(wr?.win_rate);
  const wrWon = safe(wr?.won);
  const wrLost = safe(wr?.lost);
  const wrEven = safe(wr?.even);
  const wrDecided = safe(wr?.decided);
  const rawArchetype = trading.archetype;
  const archetype = typeof rawArchetype === "string" ? rawArchetype : rawArchetype?.title || rawArchetype?.label || "";
  const avgGrade = trading.grades?.avg_letter || "";
  const avgScore = safe(trading.grades?.avg_score);
  const rawTrust = meta.trade_trust?.label ?? meta.trade_trust;
  const trustLabel = typeof rawTrust === "string" ? rawTrust : rawTrust?.title || rawTrust?.label || "";
  const rawBadges: unknown[] = trading.badges || [];
  const badges: string[] = rawBadges.map((b: any) => typeof b === "string" ? b : b?.title || b?.label || String(b)).filter(Boolean);

  // ── Roster/picks data (lazy) ──
  const rosterByPos = roster?.by_position || {};
  const rosterCount = roster ? (["QB", "RB", "WR", "TE"] as const).reduce((a, p) => a + (rosterByPos[p]?.length || 0), 0) : null;
  const picksByYear: Record<string, any[]> = picks?.by_year || {};
  const pickCount = picks?.total_picks ?? null;

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-5 bg-black/65 backdrop-blur-[4px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[85vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_1px_rgba(212,165,50,0.15)]"
      >
        {/* ── HEADER (instant from cache) ── */}
        <div className="px-5 pt-5 pb-4 relative">
          <button
            onClick={close}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-elevated border border-border text-dim hover:text-primary text-sm transition-colors"
          >✕</button>

          {/* Avatar + name */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/15 to-gold/5 border-2 border-gold-border flex items-center justify-center font-sans text-lg font-extrabold text-gold shrink-0">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[17px] font-extrabold text-primary truncate pr-8">
                {ownerName}
              </div>
              {slug && (
                <button
                  onClick={() => { close(); router.push(`/l/${slug}/intel/${encodeURIComponent(ownerName)}`); }}
                  className="font-sans text-[11px] text-gold hover:underline mt-0.5"
                >View Full Profile →</button>
              )}
            </div>
          </div>

          {/* ── Rankings row (instant) ── */}
          {ownerIntel && (
            <div className="flex items-center gap-3 mb-3">
              {leagueRank && (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[8px] font-extrabold tracking-widest text-dim">LEAGUE</span>
                  <span className={`font-mono text-base font-black ${rankCls(leagueRank, totalTeams)}`}>#{leagueRank}</span>
                </div>
              )}
              {dynastyRank && (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[8px] font-extrabold tracking-widest text-dim">DYNASTY</span>
                  <span className={`font-mono text-base font-black ${rankCls(dynastyRank, totalTeams)}`}>#{dynastyRank}</span>
                </div>
              )}
              {winNowRank && (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[8px] font-extrabold tracking-widest text-dim">WIN-NOW</span>
                  <span className={`font-mono text-base font-black ${rankCls(winNowRank, totalTeams)}`}>#{winNowRank}</span>
                </div>
              )}
              {totalSha != null && (
                <div className="flex flex-col items-center ml-auto">
                  <span className="font-mono text-[8px] font-extrabold tracking-widest text-dim">VALUE</span>
                  <span className="font-mono text-base font-black text-gold">{(totalSha / 1000).toFixed(1)}k</span>
                </div>
              )}
            </div>
          )}

          {/* ── Window + positional grades (instant) ── */}
          <div className="flex gap-1.5 flex-wrap">
            {windowLabel && <Badge text={windowLabel} cls={windowCls(windowLabel)} />}
            {Object.entries(posGrades).map(([pos, grade]) => (
              <Badge key={pos} text={`${pos}: ${grade}`} cls={POS_CLS[pos] ? `${POS_CLS[pos]} border-border bg-[rgba(255,255,255,0.04)]` : undefined} />
            ))}
          </div>
        </div>

        {/* ── SCROLLABLE SECTIONS ── */}
        <div className="px-5 pb-4 overflow-y-auto flex-1">

          {/* ── ROSTER (lazy on expand) ── */}
          <Section label="ROSTER" count={rosterCount} onFirstOpen={loadRoster}>
            {rosterLoading ? (
              <span className="font-mono text-[10px] text-dim tracking-widest">LOADING...</span>
            ) : !roster ? (
              <span className="font-sans text-xs text-dim">Expand to load</span>
            ) : (
              <div className="flex flex-col gap-2.5">
                {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                  const players = rosterByPos[pos] || [];
                  if (!players.length) return null;
                  return (
                    <div key={pos}>
                      <div className={`font-mono text-[9px] font-extrabold tracking-widest mb-1 ${POS_CLS[pos] || "text-dim"}`}>{pos}</div>
                      {[...players].sort((a: any, b: any) => (b.sha_value || 0) - (a.sha_value || 0)).map((p: any, i: number) => (
                        <div key={`${p.name}-${i}`} className={`flex items-center gap-1.5 py-0.5 ${i < players.length - 1 ? "border-b border-border" : ""}`}>
                          <span className="font-sans text-xs font-medium text-primary flex-1 truncate">{p.name}</span>
                          {p.age && <span className="font-mono text-[9px] text-dim shrink-0">{p.age}</span>}
                          <span className={`font-mono text-[10px] font-bold w-10 text-right shrink-0 ${valCls(p.sha_value || 0)}`}>{fmt(p.sha_value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {roster.total_sha != null && (
                  <div className="flex justify-between pt-1.5 border-t border-border-lt">
                    <span className="font-mono text-[10px] font-extrabold text-dim">TOTAL</span>
                    <span className="font-mono text-xs font-black text-gold">{fmt(roster.total_sha)}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── DRAFT CAPITAL (lazy on expand) ── */}
          <Section label="DRAFT CAPITAL" count={pickCount} onFirstOpen={loadPicks}>
            {picksLoading ? (
              <span className="font-mono text-[10px] text-dim tracking-widest">LOADING...</span>
            ) : !picks ? (
              <span className="font-sans text-xs text-dim">Expand to load</span>
            ) : Object.keys(picksByYear).length === 0 ? (
              <span className="font-sans text-xs text-dim">No picks owned</span>
            ) : (
              <div className="flex flex-col gap-2.5">
                {Object.keys(picksByYear).sort().map((year) => {
                  const yearPicks = picksByYear[year] || [];
                  if (!yearPicks.length) return null;
                  return (
                    <div key={year}>
                      <div className="font-mono text-[9px] font-extrabold tracking-widest text-gold mb-1">{year}</div>
                      {[...yearPicks].sort((a: any, b: any) => (a.round || 99) - (b.round || 99) || (a.slot || 99) - (b.slot || 99)).map((p: any, i: number) => (
                        <div key={`${year}-${p.round}-${i}`} className={`flex items-center justify-between py-0.5 ${i < yearPicks.length - 1 ? "border-b border-border" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-xs font-medium text-primary">
                              {p.slot_label || `Round ${p.round}`}
                            </span>
                            {!p.is_own_pick && p.original_owner && (
                              <span className="font-mono text-[8px] text-dim">via {p.original_owner}</span>
                            )}
                          </div>
                          {p.sha_value ? (
                            <span className="font-mono text-[10px] font-bold text-dim">{fmt(p.sha_value)}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {picks.total_sha_value != null && picks.total_sha_value > 0 && (
                  <div className="flex justify-between pt-1.5 border-t border-border-lt">
                    <span className="font-mono text-[10px] font-extrabold text-dim">TOTAL CAPITAL</span>
                    <span className="font-mono text-xs font-black text-gold">{fmt(picks.total_sha_value)}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── TRADING (lazy on expand — heaviest call) ── */}
          <Section label="TRADING" count={tradeCount || null} onFirstOpen={loadTrading}>
            {tradingLoading ? (
              <span className="font-mono text-[10px] text-dim tracking-widest">LOADING...</span>
            ) : !record && !profile ? (
              <span className="font-sans text-xs text-dim">Expand to load</span>
            ) : (
              <div>
                {wrDecided > 0 && (
                  <>
                    <Stat label="Record (Hindsight)" value={`${wrWon}-${wrLost}-${wrEven}`} cls={wrRate >= 50 ? "text-accent-green" : "text-accent-red"} />
                    <Stat label="Win Rate" value={`${wrRate.toFixed(1)}%`} cls={wrRate >= 55 ? "text-accent-green" : wrRate >= 45 ? "text-gold" : "text-accent-red"} />
                  </>
                )}
                {avgGrade && <Stat label="Avg Grade" value={`${avgGrade} (${avgScore})`} cls={avgScore >= 80 ? "text-accent-green" : avgScore >= 70 ? "text-gold" : "text-accent-red"} />}
                {archetype && <Stat label="Archetype" value={archetype} cls="text-accent-blue" />}
                {trustLabel && <Stat label="Trust Label" value={trustLabel} cls={trustLabel.toLowerCase().includes("shark") || trustLabel.toLowerCase().includes("sharp") ? "text-accent-green" : trustLabel.toLowerCase().includes("average") ? "text-gold" : "text-accent-red"} />}
                {!wrDecided && !avgGrade && !archetype && (
                  <span className="font-sans text-xs text-dim">No trade history</span>
                )}
                {badges.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {badges.slice(0, 5).map((b, i) => <Badge key={i} text={b} />)}
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
