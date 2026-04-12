"use client";

import React, { useState, useEffect, useCallback } from "react";

const API = "";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'Inter', -apple-system, sans-serif";

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 700,
      padding: "2px 6px", borderRadius: 3,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{text}</span>
  );
}

type Section = "active" | "ready" | "needs_work";

export default function AdminPipelinePage() {
  const [section, setSection] = useState<Section>("active");
  const [data, setData] = useState<{ active: any[]; ready: any[]; needs_work: any[] }>({ active: [], ready: [], needs_work: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/pipeline`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* silent */ }
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabStyle = (t: Section) => ({
    fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    padding: "8px 20px", cursor: "pointer" as const, border: "none",
    borderBottom: section === t ? "2px solid #d4a532" : "2px solid transparent",
    background: "transparent", color: section === t ? "#d4a532" : "#9596a5",
  });

  const cellStyle: React.CSSProperties = {
    fontFamily: SANS, fontSize: 12, padding: "8px 10px",
    borderBottom: "1px solid #2a2b3a", verticalAlign: "top",
    color: "#b0b2c8",
  };

  const headerStyle: React.CSSProperties = {
    ...cellStyle, fontFamily: MONO, fontSize: 10, fontWeight: 800,
    letterSpacing: "0.08em", color: "#6b6d7e", background: "#1a1b2e",
    position: "sticky" as const, top: 0, zIndex: 1,
  };

  const counts = {
    active: data.active.length,
    ready: data.ready.length,
    needs_work: data.needs_work.length,
  };

  return (
    <div style={{ background: "#0f1021", minHeight: "100vh", color: "#eeeef2", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: "#d4a532" }} />
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, letterSpacing: "0.14em", color: "#d4a532" }}>PIPELINE</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: "#6b6d7e", marginLeft: "auto" }}>
          Last refresh: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
        </span>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2b3a", marginBottom: 16 }}>
        <button onClick={() => setSection("active")} style={tabStyle("active")}>
          ACTIVE BETA ({counts.active})
        </button>
        <button onClick={() => setSection("ready")} style={tabStyle("ready")}>
          READY TO INVITE ({counts.ready})
        </button>
        <button onClick={() => setSection("needs_work")} style={tabStyle("needs_work")}>
          NEEDS WORK ({counts.needs_work})
        </button>
      </div>

      {loading && <div style={{ fontFamily: MONO, fontSize: 11, color: "#6b6d7e", padding: 20 }}>Loading...</div>}

      {!loading && section === "active" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerStyle}>LEAGUE</th>
                <th style={headerStyle}>LEAGUE ID</th>
                <th style={headerStyle}>WAVE</th>
                <th style={headerStyle}>APPROVED</th>
                <th style={headerStyle}>SYNC</th>
                <th style={headerStyle}>ARTICLES</th>
                <th style={headerStyle}>TRADES</th>
                <th style={headerStyle}>LAST ACTIVITY</th>
              </tr>
            </thead>
            <tbody>
              {data.active.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || "—"}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontSize: 10 }}>{r.league_id}</td>
                  <td style={cellStyle}><Badge text={`W${r.wave || "?"}`} color="#d4a532" /></td>
                  <td style={cellStyle}>{fmtDate(r.approved_at)}</td>
                  <td style={cellStyle}>
                    {r.sync_status === "complete" ? <Badge text="SYNCED" color="#7dd3a0" />
                      : r.sync_status === "syncing" ? <Badge text="SYNCING" color="#e09c6b" />
                      : r.sync_status === "failed" ? <Badge text="FAILED" color="#e47272" />
                      : <Badge text="—" color="#6b6d7e" />}
                  </td>
                  <td style={cellStyle}>
                    {r.has_articles ? <Badge text="YES" color="#7dd3a0" /> : <Badge text="NO" color="#e47272" />}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                  <td style={cellStyle}>{fmtDate(r.last_event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && section === "ready" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerStyle}>LEAGUE</th>
                <th style={headerStyle}>EMAIL</th>
                <th style={headerStyle}>USERNAME</th>
                <th style={headerStyle}>SEASONS</th>
                <th style={headerStyle}>TRADES/SZN</th>
                <th style={headerStyle}>COMM</th>
                <th style={headerStyle}>SYNC</th>
                <th style={headerStyle}>TRADES</th>
                <th style={headerStyle}>ARTICLES</th>
              </tr>
            </thead>
            <tbody>
              {data.ready.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || r.league_id}</td>
                  <td style={{ ...cellStyle, fontSize: 11 }}>{r.email}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO }}>{r.sleeper_username}</td>
                  <td style={cellStyle}>{r.seasons_running || "—"}</td>
                  <td style={cellStyle}>{r.trades_per_season || "—"}</td>
                  <td style={cellStyle}>{r.is_commissioner ? <Badge text="YES" color="#7dd3a0" /> : "—"}</td>
                  <td style={cellStyle}>
                    {r.sync_status === "complete" ? <Badge text="SYNCED" color="#7dd3a0" /> : <Badge text="—" color="#6b6d7e" />}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                  <td style={cellStyle}>
                    {r.has_articles ? <Badge text="YES" color="#7dd3a0" /> : <Badge text="NO" color="#e47272" />}
                  </td>
                </tr>
              ))}
              {data.ready.length === 0 && (
                <tr><td colSpan={9} style={{ ...cellStyle, textAlign: "center", color: "#6b6d7e" }}>No leagues ready to invite</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && section === "needs_work" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerStyle}>LEAGUE</th>
                <th style={headerStyle}>EMAIL</th>
                <th style={headerStyle}>USERNAME</th>
                <th style={headerStyle}>TRADES</th>
                <th style={headerStyle}>WHAT&apos;S MISSING</th>
              </tr>
            </thead>
            <tbody>
              {data.needs_work.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || r.league_id}</td>
                  <td style={{ ...cellStyle, fontSize: 11 }}>{r.email}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO }}>{r.sleeper_username}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                  <td style={cellStyle}>
                    {(r.missing || []).map((m: string, j: number) => (
                      <Badge key={j} text={m.toUpperCase()} color="#e47272" />
                    )).reduce((acc: any[], badge: any, j: number) => j === 0 ? [badge] : [...acc, " ", badge], [])}
                  </td>
                </tr>
              ))}
              {data.needs_work.length === 0 && (
                <tr><td colSpan={5} style={{ ...cellStyle, textAlign: "center", color: "#6b6d7e" }}>All applicants are ready</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
