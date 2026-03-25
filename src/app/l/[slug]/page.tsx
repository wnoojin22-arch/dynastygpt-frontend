"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getRankings, getRecentTrades, getTrending, getOwnerProfiles, getOverview } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  goldGlow: "rgba(212,165,50,0.06)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function posColor(pos: string) {
  return pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : pos === "TE" ? "#e09c6b" : C.dim;
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEAD
   ═══════════════════════════════════════════════════════════════ */
function SectionHead({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: C.primary, fontFamily: SANS }}>{title}</span>
      {badge && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{badge}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI INSIGHT STRIP — rotating one-liner, crossfade
   ═══════════════════════════════════════════════════════════════ */
const INSIGHTS = [
  "WacoRides2Glory is riding a 5-game win streak — longest active in the league",
  "Kris Pringle won the 2024 title — back-to-back incoming?",
  "MonkeyEpoxy has the youngest roster in the league — avg age 23.8",
  "#1 and #2 in power rankings separated by less than 3K SHA",
  "jpinola just hit 10 wins for the first time since 2022",
  "medianrare hasn't made a trade in 14 months — the quietest GM in the league",
  "85 trades across 7 seasons — DLP Dynasty League is one of the most active in the platform",
  "Silentclock has traded with every owner in the league at least once",
];

function InsightStrip() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % INSIGHTS.length);
        setVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: 36, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 24px", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
          color: C.gold, fontFamily: MONO, flexShrink: 0,
        }}>AI INSIGHT</span>
        <div style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
        <span style={{
          fontSize: 13, fontWeight: 500, color: C.secondary,
          fontFamily: SANS, fontStyle: "italic",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {INSIGHTS[idx]}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET MOVERS TICKER (league-specific)
   ═══════════════════════════════════════════════════════════════ */
function MarketTicker({ risers, fallers }: { risers: { player: string; sha_delta: number; position?: string }[]; fallers: { player: string; sha_delta: number; position?: string }[] }) {
  const items = [
    ...risers.slice(0, 8).map((r) => ({ ...r, dir: "up" as const })),
    ...fallers.slice(0, 6).map((f) => ({ ...f, dir: "down" as const })),
  ];
  if (!items.length) return null;

  const renderSet = (prefix: string) => items.map((p, i) => (
    <span key={`${prefix}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, whiteSpace: "nowrap" }}>
      {p.position && <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.04em", color: posColor(p.position), fontFamily: SANS, background: posColor(p.position) + "18", padding: "1px 4px", borderRadius: 2 }}>{p.position}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>{p.player}</span>
      <span style={{ fontSize: 10, fontWeight: 900, color: p.dir === "up" ? C.green : C.red }}>
        {p.dir === "up" ? "▲" : "▼"} {p.dir === "up" ? "+" : ""}{fmt(p.sha_delta)}
      </span>
    </span>
  ));

  return (
    <div style={{ height: 32, background: C.card, borderBottom: `1px solid ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: `linear-gradient(90deg, ${C.card} 80%, transparent 100%)` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse-gold 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, fontFamily: SANS }}>MARKET MOVERS</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, whiteSpace: "nowrap", width: "max-content", paddingLeft: 180, animation: "tickerScroll 70s linear infinite" }}>
        {renderSet("a")}
        <span style={{ display: "inline-block", width: 40 }} />
        {renderSet("b")}
        <span style={{ display: "inline-block", width: 40 }} />
        {renderSet("c")}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED ARTICLE (hero card — ESPN top-story energy)
   ═══════════════════════════════════════════════════════════════ */
function FeaturedArticle({ leagueName }: { leagueName: string }) {
  return (
    <div style={{
      borderRadius: 10, cursor: "pointer",
      background: `linear-gradient(160deg, ${C.card} 0%, #0d1020 50%, ${C.card} 100%)`,
      border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.005)"; e.currentTarget.style.borderColor = C.gold + "40"; e.currentTarget.style.boxShadow = `0 8px 40px rgba(212,165,50,0.06)`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}20, transparent)` }} />
      {/* Image placeholder */}
      <div style={{ height: 180, background: `linear-gradient(135deg, ${C.elevated}, ${C.card}, ${C.panel})`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 20, left: 30, width: "38%", height: 110, borderRadius: 8, background: C.panel, border: `1px solid ${C.border}`, transform: "rotate(-3deg)", opacity: 0.7 }} />
        <div style={{ position: "absolute", top: 15, left: "50%", transform: "translateX(-50%)", width: "38%", height: 110, borderRadius: 8, background: C.panel, border: `1px solid ${C.borderLt}`, opacity: 0.85 }} />
        <div style={{ position: "absolute", top: 25, right: 30, width: "38%", height: 110, borderRadius: 8, background: C.panel, border: `1px solid ${C.borderLt}`, transform: "rotate(3deg)", opacity: 0.9 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, background: `linear-gradient(180deg, transparent, ${C.card})`, zIndex: 4 }} />
      </div>
      <div style={{ padding: "16px 24px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>FEATURED</span>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.dim, fontFamily: SANS }}>MOCK DRAFT</span>
        </div>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 22, color: C.primary, margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          {leagueName} — First Mock Draft
        </h3>
        <p style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
          AI-generated mock draft based on team needs, draft capital, and historical tendencies. See who your league-mates are likely to target.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, fontWeight: 500 }}>DynastyGPT</span>
          <span style={{ color: C.dim, fontSize: 11 }}>·</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.dim, fontWeight: 500 }}>5 min read</span>
          <span style={{ fontFamily: SANS, fontSize: 13, color: C.dim, marginLeft: 4 }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE INTEL ARTICLE CARDS
   ═══════════════════════════════════════════════════════════════ */
function LeagueArticle({ cat, catColor, title, desc, date }: { cat: string; catColor: string; title: string; desc: string; date: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLt; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColor }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: C.dim, fontFamily: SANS }}>{cat}</span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: `${C.dim}80`, fontFamily: MONO }}>{date}</span>
      </div>
      <div style={{ padding: 14, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, fontFamily: SANS, lineHeight: 1.35, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: SANS, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POWER RANKINGS WIDGET (compact sidebar)
   ═══════════════════════════════════════════════════════════════ */
function PowerRankingsWidget({ rankings }: { rankings: { owner: string; rank: number; total_sha: number }[] }) {
  if (!rankings.length) return null;
  const topScore = rankings[0]?.total_sha || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {rankings.map((r, i) => {
        const pct = (r.total_sha / topScore) * 100;
        const color = i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? C.secondary : C.red;
        return (
          <div key={r.owner} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 4,
            background: i === 0 ? C.goldDim : "transparent",
            border: i === 0 ? `1px solid ${C.goldBorder}` : "1px solid transparent",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { if (i > 0) e.currentTarget.style.background = C.elevated; }}
          onMouseLeave={(e) => { if (i > 0) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ width: 18, fontSize: 11, fontWeight: 900, color, fontFamily: MONO, textAlign: "right" }}>{i + 1}</span>
            {i === 0 && <span style={{ fontSize: 11 }}>👑</span>}
            <span style={{ fontSize: 13, fontWeight: i < 4 ? 700 : 500, color: i < 4 ? C.primary : C.secondary, fontFamily: SANS, width: 64, flexShrink: 0 }}>{r.owner}</span>
            <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: i === 0 ? C.gold : i < 4 ? C.green : i < 8 ? "#2563eb" : C.red, transition: "width 0.8s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, fontFamily: MONO, width: 46, textAlign: "right", flexShrink: 0 }}>{(r.total_sha / 1000).toFixed(1)}k</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT TRADES (compact, verdict badges)
   ═══════════════════════════════════════════════════════════════ */
function getVerdictStyle(v: string) {
  if (!v) return null;
  const o = v.toLowerCase();
  if (o.includes("win-win")) return { label: "WIN-WIN", color: "#7dd3a0", bg: "rgba(125,211,160,0.12)" };
  if (o.includes("robbery")) return { label: "ROBBERY", color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
  if (o.includes("push")) return { label: "PUSH", color: "#b0b2c8", bg: "rgba(176,178,200,0.10)" };
  if (o.includes("won")) return { label: "ONE WINNER", color: C.gold, bg: C.goldDim };
  if (o.includes("lost")) return { label: "LOST", color: C.red, bg: "rgba(255,68,68,0.10)" };
  return null;
}

function RecentTradesWidget({ trades, basePath }: { trades: { owner: string; counter_party: string; verdict?: string | null; date?: string | null; players_sent?: string[] | null; players_received?: string[] | null; trade_id?: string | null }[]; basePath: string }) {
  const router = useRouter();
  if (!trades.length) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: C.primary, fontFamily: SANS }}>RECENT TRADES</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.gold, fontFamily: SANS, padding: "2px 8px", borderRadius: 3, background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{trades.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {trades.slice(0, 7).map((t, i) => {
          const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
          const sent = Array.isArray(t.players_sent) ? t.players_sent.slice(0, 2).join(", ") : "";
          const got = Array.isArray(t.players_received) ? t.players_received.slice(0, 2).join(", ") : "";
          return (
            <div key={t.trade_id || i}
              style={{ padding: "8px 14px", cursor: "pointer", transition: "background 0.12s", borderBottom: i < 6 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO, width: 38, flexShrink: 0 }}>{formatDate(t.date)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: SANS, marginBottom: 1 }}>
                  <span style={{ fontWeight: 700, color: C.primary }}>{t.owner}</span>
                  <span style={{ color: C.dim, fontWeight: 500, margin: "0 5px" }}>↔</span>
                  <span style={{ fontWeight: 700, color: C.primary }}>{t.counter_party}</span>
                </div>
                {(sent || got) && (
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sent} ← → {got}
                  </div>
                )}
              </div>
              {vs && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "2px 7px", borderRadius: 3, fontFamily: SANS, flexShrink: 0 }}>{vs.label}</span>}
            </div>
          );
        })}
      </div>
      <div onClick={() => router.push(`${basePath}/trades`)}
        style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, cursor: "pointer", textAlign: "center", transition: "background 0.12s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: SANS }}>View All Trades →</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE HOME PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LeagueHome() {
  const pathname = usePathname();
  const { currentLeagueId: lid } = useLeagueStore();
  const slug = pathname.split("/")[2] || "";
  const basePath = `/l/${slug}`;

  const { data: overview } = useQuery({ queryKey: ["overview", lid], queryFn: () => getOverview(lid!), enabled: !!lid, staleTime: 60 * 60 * 1000 });
  const { data: rankings } = useQuery({ queryKey: ["rankings", lid], queryFn: () => getRankings(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: recentTrades } = useQuery({ queryKey: ["recent-trades", lid], queryFn: () => getRecentTrades(lid!, 10), enabled: !!lid });
  const { data: trending } = useQuery({ queryKey: ["trending", lid], queryFn: () => getTrending(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });
  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid!), enabled: !!lid, staleTime: 10 * 60 * 1000 });

  if (!lid) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p>
    </div>
  );

  const leagueName = overview?.name || "DynastyGPT";
  const numTeams = overview?.format?.num_teams || 0;
  const isSF = overview?.format?.is_superflex;
  const tradeCount = overview?.trade_volume?.total || 0;

  const leagueArticles = [
    { cat: "POWER RANKINGS", catColor: C.gold, title: `${leagueName} Power Rankings Update`, desc: `Fresh SHA rankings across all ${numTeams} teams. See who's rising, who's falling, and where the value gaps are.`, date: "Today" },
    { cat: "TRADE REPORT", catColor: C.green, title: `${tradeCount} Trades Analyzed — Who's Winning?`, desc: "AI-graded trade verdicts for every deal in league history. Win rates, robbery alerts, and owner tendencies revealed.", date: "Today" },
    { cat: "OWNER SPOTLIGHT", catColor: C.blue, title: "Owner Behavioral Profiles Now Available", desc: "Full trade tendency analysis, position biases, seasonal timing patterns, and rival matchup histories for every owner.", date: "Mar 24" },
    { cat: "FRANCHISE INTEL", catColor: "#a78bfa", title: "AI Scouting Reports Are Live", desc: "Personalized buy-low targets, sell-high candidates, trade partner fits, and positional gap analysis for your team.", date: "Mar 23" },
  ];

  return (
    <>
      {/* ── AI Insight Strip ── */}
      <InsightStrip />

      {/* ── Market Movers Ticker ── */}
      {trending && <MarketTicker risers={trending.risers || []} fallers={trending.fallers || []} />}

      {/* ── MAIN GRID — Content Left, Widgets Right ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px 48px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeUp 0.5s ease 0.1s both" }}>
          {/* Hero Article */}
          <FeaturedArticle leagueName={leagueName} />

          {/* League Intel Articles */}
          <div>
            <SectionHead title="LEAGUE INTEL" badge="AI" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {leagueArticles.map((a, i) => <LeagueArticle key={i} {...a} />)}
            </div>
          </div>

          {/* League Snapshot */}
          <div>
            <SectionHead title="LEAGUE SNAPSHOT" badge={`${profiles?.profiles?.length || 0} TEAMS`} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {profiles?.profiles?.map((p) => {
                const tier = p.sha_rank <= 3 ? C.green : p.sha_rank <= 6 ? C.gold : p.sha_rank <= 9 ? C.orange : C.red;
                return (
                  <div key={p.owner} style={{ padding: "8px 12px", borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLt; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{p.owner}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: tier }}>#{p.sha_rank}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.window} · {p.record ? `${p.record.wins}W-${p.record.losses}L` : "—"}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.gold, marginTop: 2 }}>{fmt(p.total_sha)} SHA</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp 0.5s ease 0.2s both" }}>
          {/* Power Rankings */}
          <div>
            <SectionHead title="POWER RANKINGS" badge="SHA" />
            <PowerRankingsWidget rankings={rankings?.rankings || []} />
          </div>

          {/* Recent Trades */}
          <RecentTradesWidget trades={recentTrades?.trades || []} basePath={basePath} />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}
