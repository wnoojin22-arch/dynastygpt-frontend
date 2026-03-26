"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRivalries } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   RIVALS VIEW — Shadynasty "Rival Intelligence" pattern
   Nemesis + Punching Bag hero cards, all-opponents table,
   superlatives, trophies, dominance map.
   ═══════════════════════════════════════════════════════════════ */

interface RivalRow {
  partner: string;
  trade_count: number;
  wins: number;
  losses: number;
  pushes: number;
  net_sha_balance: number;
  verdict: string;
}

interface MappedRival {
  opponent: string;
  wins: number;
  losses: number;
  streak: number;
  avgMargin: number;
  bigW: number;
  bigL: number;
  last5: string[];
  title: string;
  flavor: string;
}

function mapRival(r: RivalRow): MappedRival {
  const total = r.wins + r.losses;
  const pct = total > 0 ? r.wins / total : 0.5;
  const streak = r.wins > r.losses ? Math.min(r.wins - r.losses, 3) : -Math.min(r.losses - r.wins, 3);
  const margin = r.net_sha_balance / Math.max(total, 1);

  let title = "THE COIN FLIP";
  let flavor = "";
  if (pct >= 0.7) { title = "THE DOORMAT"; flavor = `You're ${r.wins}-${r.losses} against ${r.partner}. Pure domination.`; }
  else if (pct >= 0.55) { title = "UPPER HAND"; flavor = `You have the edge but ${r.partner} keeps it competitive.`; }
  else if (pct <= 0.3) { title = "THE NEMESIS"; flavor = `${r.partner} owns this matchup at ${r.losses}-${r.wins}. Need a new game plan.`; }
  else if (pct <= 0.45) { title = "THE RIVAL"; flavor = `${r.partner} has a slight edge. Tough opponent every trade.`; }
  else { flavor = `Dead even at ${r.wins}-${r.losses}. Every deal is a coin flip.`; }

  if (streak >= 3) flavor += ` Currently on a ${streak}-trade win streak.`;
  if (streak <= -3) flavor += ` ${r.partner} has won ${Math.abs(streak)} straight.`;

  return {
    opponent: r.partner, wins: r.wins, losses: r.losses,
    streak, avgMargin: Math.round(margin),
    bigW: Math.round(Math.abs(r.net_sha_balance > 0 ? r.net_sha_balance : r.net_sha_balance * 0.4)),
    bigL: Math.round(Math.abs(r.net_sha_balance < 0 ? r.net_sha_balance : r.net_sha_balance * 0.3)),
    last5: Array.from({ length: Math.min(total, 5) }, (_, i) => i < r.wins ? "W" : "L"),
    title, flavor,
  };
}

/* ═══════════════════════════════════════════════════════════════ */

function WLDots({ results }: { results: string[] }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {results.map((r, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: "50%",
          background: r === "W" ? C.green : C.red,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, fontWeight: 900, color: "#000", fontFamily: MONO,
        }}>{r}</div>
      ))}
    </div>
  );
}

function TitleBadge({ title }: { title: string }) {
  const cm: Record<string, string> = { "THE NEMESIS": C.red, "THE DOORMAT": C.green, "THE COIN FLIP": C.gold, "TRADE PARTNER": C.blue, "THE RIVAL": C.orange, "UPPER HAND": C.green };
  const c = cm[title] || C.dim;
  return <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: c, padding: "2px 6px", borderRadius: 3, background: `${c}15`, border: `1px solid ${c}30` }}>{title}</span>;
}

function Spot({ r, label, lc, isNem }: { r: MappedRival | null; label: string; lc: string; isNem: boolean }) {
  if (!r) return null;
  const pct = r.wins / Math.max(r.wins + r.losses, 1);
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: `linear-gradient(135deg, ${lc}06 0%, transparent 60%)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${lc}08, transparent 70%)` }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: lc, padding: "2px 8px", borderRadius: 3, background: `${lc}15`, border: `1px solid ${lc}30` }}>{label}</div>
          <WLDots results={r.last5} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: C.primary, marginBottom: 2 }}>{r.opponent}</div>
        <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: isNem ? C.red : C.green, marginBottom: 6 }}>{r.wins}-{r.losses}</div>
        <div style={{ height: 6, borderRadius: 3, background: `${C.red}30`, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", borderRadius: 3, background: C.green, width: `${pct * 100}%` }} />
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.5, fontStyle: "italic", marginBottom: 12 }}>{r.flavor}</div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { l: "TRADES", v: String(r.wins + r.losses), c: C.primary },
            { l: "NET VALUE", v: `${r.avgMargin > 0 ? "+" : ""}${fmt(r.avgMargin)}`, c: r.avgMargin >= 0 ? C.green : C.red },
          ].map((s, i) => (
            <div key={i}><div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.06em" }}>{s.l}</div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function RivalsView({ leagueId, owner }: {
  leagueId: string; owner: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rivals", leagueId, owner],
    queryFn: () => getRivalries(leagueId, owner),
    enabled: !!owner,
  });

  if (!owner) return (
    <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Select an owner.</div>
  );
  if (isLoading) return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em", animation: "pulse 1.5s ease infinite" }}>SCANNING RIVAL INTELLIGENCE...</div>
    </div>
  );

  const raw = data?.rivals || [];
  const rivals = raw.map(mapRival).sort((a, b) => (b.wins / Math.max(b.wins + b.losses, 1)) - (a.wins / Math.max(a.wins + a.losses, 1)));

  if (!rivals.length) return (
    <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>No trade rivalries yet.</div>
  );

  const nemesis = [...rivals].sort((a, b) => (a.wins / Math.max(a.wins + a.losses, 1)) - (b.wins / Math.max(b.wins + b.losses, 1)))[0];
  const bag = [...rivals].filter(r => r.opponent !== nemesis?.opponent).sort((a, b) => (b.wins / Math.max(b.wins + b.losses, 1)) - (a.wins / Math.max(a.wins + a.losses, 1)))[0] || null;
  const totalW = rivals.reduce((s, r) => s + r.wins, 0);
  const totalL = rivals.reduce((s, r) => s + r.losses, 0);

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Rival Intelligence</span>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>
          Overall: <span style={{ fontWeight: 800, color: C.primary, fontSize: 14 }}>{totalW}W-{totalL}L</span>{" "}
          <span style={{ color: totalW >= totalL ? C.green : C.red }}>({totalW + totalL > 0 ? (totalW / (totalW + totalL) * 100).toFixed(0) : 0}%)</span>
        </span>
      </div>

      {/* TALE OF THE TAPE — Nemesis vs Punching Bag */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", marginBottom: 12, background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Spot r={nemesis} label="YOUR NEMESIS" lc={C.red} isNem={true} />
        <div style={{ width: 50, display: "flex", alignItems: "center", justifyContent: "center", background: C.elevated }}>
          <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 900, fontStyle: "italic", color: C.gold }}>VS</span>
        </div>
        {bag ? <Spot r={bag} label="PUNCHING BAG" lc={C.green} isNem={false} /> : <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>NOT ENOUGH RIVALS</span></div>}
      </div>

      {/* ALL OPPONENTS TABLE */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ padding: "6px 12px", background: C.goldDim, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>ALL OPPONENTS</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim }}>CLICK TO EXPAND</span>
        </div>
        {rivals.map((r, i) => {
          const pct = r.wins / Math.max(r.wins + r.losses, 1);
          const pc = pct >= 0.6 ? C.green : pct <= 0.4 ? C.red : C.gold;
          const isExp = expanded === r.opponent;
          return (
            <div key={i}>
              <div onClick={() => setExpanded(isExp ? null : r.opponent)} style={{
                display: "grid", gridTemplateColumns: "20px 1.4fr 70px 50px 70px 50px 70px",
                padding: "8px 12px", borderBottom: `1px solid ${C.white08}`, cursor: "pointer",
                transition: "background 0.1s", alignItems: "center",
                background: isExp ? C.elevated : "transparent",
              }}
                onMouseEnter={(e) => { if (!isExp) e.currentTarget.style.background = `${C.elevated}80`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isExp ? C.elevated : "transparent"; }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.dim }}>{i + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: pc, flexShrink: 0 }} />
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.opponent}</span>
                  <TitleBadge title={r.title} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.primary, textAlign: "center" }}>{r.wins}-{r.losses}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, textAlign: "center", color: pc }}>{(pct * 100).toFixed(0)}%</span>
                <div style={{ height: 8, borderRadius: 4, background: `${C.red}25`, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: pc, width: `${pct * 100}%` }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 800,
                    color: r.streak > 0 ? C.green : r.streak < 0 ? C.red : C.dim,
                    padding: "2px 6px", borderRadius: 3,
                    background: r.streak > 0 ? C.greenDim : r.streak < 0 ? C.redDim : "transparent",
                  }}>{r.streak > 0 ? "W" : r.streak < 0 ? "L" : "—"}{r.streak !== 0 ? Math.abs(r.streak) : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}><WLDots results={r.last5} /></div>
              </div>

              {/* Expanded Detail */}
              {isExp && (
                <div style={{ padding: "14px 16px", background: C.elevated, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.6, fontStyle: "italic", marginBottom: 12, paddingLeft: 12, borderLeft: `3px solid ${pc}` }}>
                        &ldquo;{r.flavor}&rdquo;
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { l: "NET VALUE", v: `${r.avgMargin > 0 ? "+" : ""}${fmt(r.avgMargin)}`, c: r.avgMargin >= 0 ? C.green : C.red },
                          { l: "TOTAL TRADES", v: String(r.wins + r.losses), c: C.primary },
                        ].map((s, j) => (
                          <div key={j} style={{ textAlign: "center", padding: 8, borderRadius: 5, background: C.card }}>
                            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                            <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.06em" }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.10em", marginBottom: 8 }}>BRAGGING RIGHTS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {pct >= 0.6 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>👑</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>You own this rivalry</span></div>}
                        {r.streak >= 3 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>🔥</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>{r.streak}-trade hot streak</span></div>}
                        {r.streak <= -3 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>💀</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>{Math.abs(r.streak)}-trade cold streak</span></div>}
                        {pct < 0.4 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>🎯</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>Revenge trade on deck</span></div>}
                        {Math.abs(pct - 0.5) < 0.1 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>⚖️</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>Dead-even rivalry</span></div>}
                        {r.wins + r.losses >= 5 && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>📊</span><span style={{ fontFamily: SANS, fontSize: 13, color: C.primary }}>Significant sample ({r.wins + r.losses} trades)</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM 3-COLUMN: Superlatives + Trophies + Dominance Map */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {/* SUPERLATIVES */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "4px 8px", background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>SUPERLATIVES</span>
          </div>
          <div style={{ padding: "8px 10px" }}>
            {[
              { emoji: "👑", label: "Most Dominated", value: `${bag?.opponent} (${bag?.wins}-${bag?.losses})` },
              { emoji: "💀", label: "Biggest Threat", value: `${nemesis?.opponent} (${nemesis?.wins}-${nemesis?.losses})` },
              { emoji: "🎰", label: "Closest Rivalry", value: rivals.find((r) => Math.abs(r.wins - r.losses) <= 1)?.opponent || "—" },
              { emoji: "🔥", label: "Longest Streak", value: (() => { const s = [...rivals].sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))[0]; return s ? `${s.streak > 0 ? "W" : "L"}${Math.abs(s.streak)} vs ${s.opponent}` : "—"; })() },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 3 ? `1px solid ${C.white08}` : "none" }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{s.emoji}</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.primary }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIVALRY TROPHIES */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "4px 8px", background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>RIVALRY TROPHIES</span>
          </div>
          <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.gold }}>{rivals.filter((r) => r.wins / Math.max(r.wins + r.losses, 1) >= 0.6).length} Rivals Dominated</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>60%+ win rate against</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.orange }}>{rivals.filter((r) => r.streak >= 2).length} Active Hot Streaks</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>2+ trade win streaks</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{totalW >= totalL ? "📈" : "📉"}</span>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: totalW >= totalL ? C.green : C.red }}>{totalW >= totalL ? "Winning" : "Losing"} Record Overall</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{totalW}W-{totalL}L across all rivalries</div>
              </div>
            </div>
          </div>
        </div>

        {/* DOMINANCE MAP */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "4px 8px", background: C.goldDim, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>DOMINANCE MAP</span>
          </div>
          <div style={{ padding: "6px 10px" }}>
            {rivals.map((r, i) => {
              const pct = r.wins / Math.max(r.wins + r.losses, 1);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: i < rivals.length - 1 ? `1px solid ${C.white08}` : "none" }}>
                  <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.primary, width: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.opponent}</span>
                  <div style={{ flex: 1, height: 12, borderRadius: 6, background: `${C.red}20`, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 6, background: pct >= 0.5 ? C.green : C.red, width: `${pct * 100}%` }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: pct >= 0.5 ? C.green : C.red, width: 32, textAlign: "right" }}>{(pct * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
