"use client";

/**
 * MARKET INTEL — "Real trades · your players"
 * Extracted from DashboardView for use on both desktop and mobile dashboards.
 * Shows your roster players that are being traded across matching leagues.
 * Expandable rows show individual trade details (gave/got, format, sold/acquired).
 */
import { useState } from "react";

const C = {
  card: "#10131d", elevated: "#171b28",
  border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)",
  green: "#7dd3a0", red: "#e47272",
  white08: "rgba(255,255,255,0.06)",
};
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

function Skel({ h = 20 }: { h?: number }) {
  return <div style={{ height: h, width: "100%", background: C.elevated, borderRadius: 4, animation: "pulse 1.5s ease infinite" }} />;
}

export default function MarketIntelSection({ feed, loading }: { feed: any; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = (feed?.market_feed || []) as any[];
  const totalTrades = items.reduce((s: number, i: any) => s + (i.recent_trades || 0), 0);

  if (loading) {
    return (
      <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>Real trades · your players</span>
        </div>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={36} />)}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>Real trades · your players</span>
        </div>
        <div style={{ padding: 12 }}>
          <p style={{ fontFamily: SANS, fontSize: 12, color: C.dim }}>No recent market activity for your roster in matching formats.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>Real trades · your players</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>
          {feed?.players_with_activity || 0} players · {feed?.format || ""} · last {feed?.days || 90} days
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, padding: "0 8px 6px", borderBottom: `1px solid ${C.white08}`, marginBottom: 4 }}>
          {totalTrades} trades across matching leagues
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.slice(0, 8).map((item: any) => {
            const isExpanded = expanded === item.player;
            const pc = POS[item.position] || C.dim;
            const mostRecent = item.trades?.[0]?.days_ago;
            return (
              <div key={item.player}>
                <div
                  onClick={() => setExpanded(isExpanded ? null : item.player)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                    borderRadius: 4, cursor: "pointer", transition: "background 0.12s",
                    borderLeft: `3px solid ${pc}`,
                    background: isExpanded ? C.elevated : "transparent",
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: pc, width: 22 }}>{item.position}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.player}
                    </span>
                    {mostRecent != null && <span style={{ fontFamily: SANS, fontSize: 10, color: C.dim }}>Last traded {mostRecent} days ago</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>{item.pos_rank || ""}</span>
                  <span style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                    color: item.recent_trades >= 5 ? C.green : item.recent_trades >= 3 ? C.gold : C.secondary,
                    background: item.recent_trades >= 5 ? "rgba(125,211,160,0.12)" : item.recent_trades >= 3 ? C.goldDim : C.white08,
                  }}>
                    {item.recent_trades} trades
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>▸</span>
                </div>

                {isExpanded && (
                  <div style={{ marginLeft: 33, padding: "4px 0 8px", borderLeft: `1px solid ${C.border}`, marginBottom: 4 }}>
                    {(item.trades || []).slice(0, 4).map((t: any, j: number) => {
                      const fmtA = (assets: any[]) => (assets || []).slice(0, 3).map((a: any) => {
                        if (typeof a === "string") return a;
                        const name = (a.name || "").replace(/\s*\([^)]*\)/g, "");
                        const rank = a.pos_rank ? ` (${a.pos_rank})` : "";
                        return `${name}${rank}`;
                      }).join(", ");
                      const fmtLabel = (t.format || "").replace(/NoneT\s*/i, "").replace(/^(\d+)T/, "$1-team ·").replace("SF", "SF ·").trim() || "Unknown format";
                      const tierTag = t.match_tier && t.match_tier > 1
                        ? t.match_tier === 2 ? "similar format" : t.match_tier === 3 ? "similar size" : "broader match"
                        : null;
                      return (
                        <div key={j} style={{ padding: "4px 12px", borderBottom: `1px solid ${C.white08}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{t.days_ago}d ago</span>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: C.secondary }}>{fmtLabel}</span>
                            {tierTag && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, fontStyle: "italic" }}>{tierTag}</span>}
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: t.was_sold ? C.red : C.green }}>{t.was_sold ? "SOLD" : "ACQUIRED"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, fontFamily: SANS, fontSize: 11 }}>
                            <span style={{ color: `${C.red}cc` }}>Gave</span>
                            <span style={{ color: C.secondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtA(t.gave)}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, fontFamily: SANS, fontSize: 11 }}>
                            <span style={{ color: `${C.green}cc` }}>Got&nbsp;</span>
                            <span style={{ color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtA(t.got)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, padding: "8px 8px 2px", borderTop: `1px solid ${C.white08}`, textAlign: "center", letterSpacing: "0.04em" }}>
          Powered by 1,039,859 real dynasty trades
        </div>
      </div>
    </div>
  );
}
