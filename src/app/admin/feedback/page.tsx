"use client";

import React, { useState, useEffect, useCallback } from "react";

const API = "";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'Inter', -apple-system, sans-serif";

type Tab = "feedback" | "activity" | "errors" | "pipeline";
type PipelineSub = "active" | "ready" | "needs_work";

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

export default function AdminFeedbackPage() {
  const [tab, setTab] = useState<Tab>("feedback");
  const [data, setData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<{ active: any[]; ready: any[]; needs_work: any[] }>({ active: [], ready: [], needs_work: [] });
  const [pipelineSub, setPipelineSub] = useState<PipelineSub>("active");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "pipeline") {
        const res = await fetch(`${API}/api/admin/pipeline`);
        if (res.ok) setPipelineData(await res.json());
      } else {
        const endpoint = tab === "feedback" ? "/api/admin/feedback"
          : tab === "activity" ? "/api/admin/activity"
          : "/api/admin/errors";
        const res = await fetch(`${API}${endpoint}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.rows || []);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
    setLastRefresh(new Date());
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabStyle = (t: Tab) => ({
    fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    padding: "8px 20px", cursor: "pointer", border: "none",
    borderBottom: tab === t ? "2px solid #d4a532" : "2px solid transparent",
    background: "transparent", color: tab === t ? "#d4a532" : "#9596a5",
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

  return (
    <div style={{ background: "#0f1021", minHeight: "100vh", color: "#eeeef2", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: "#d4a532" }} />
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, letterSpacing: "0.14em", color: "#d4a532" }}>BETA MONITOR</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: "#6b6d7e", marginLeft: "auto" }}>
          Last refresh: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
        </span>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2b3a", marginBottom: 16 }}>
        <button style={tabStyle("feedback")} onClick={() => setTab("feedback")}>FEEDBACK</button>
        <button style={tabStyle("activity")} onClick={() => setTab("activity")}>ACTIVITY</button>
        <button style={tabStyle("errors")} onClick={() => setTab("errors")}>ERRORS</button>
        <button style={tabStyle("pipeline")} onClick={() => setTab("pipeline")}>PIPELINE</button>
      </div>

      {loading ? (
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#6b6d7e", padding: 40, textAlign: "center" }}>Loading...</div>
      ) : tab === "pipeline" ? (
        <PipelineView data={pipelineData} sub={pipelineSub} setSub={setPipelineSub} cellStyle={cellStyle} headerStyle={headerStyle} />
      ) : data.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#6b6d7e", padding: 40, textAlign: "center" }}>No data</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #2a2b3a" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              {tab === "feedback" && (
                <tr>
                  <th style={headerStyle}>TIME</th>
                  <th style={headerStyle}>EMAIL</th>
                  <th style={headerStyle}>PAGE</th>
                  <th style={headerStyle}>TYPE</th>
                  <th style={headerStyle}>MESSAGE</th>
                  <th style={headerStyle}>IMAGES</th>
                </tr>
              )}
              {tab === "activity" && (
                <tr>
                  <th style={headerStyle}>TIME</th>
                  <th style={headerStyle}>USER</th>
                  <th style={headerStyle}>EVENT</th>
                  <th style={headerStyle}>PAGE</th>
                  <th style={headerStyle}>LEAGUE</th>
                  <th style={headerStyle}>OWNER</th>
                </tr>
              )}
              {tab === "errors" && (
                <tr>
                  <th style={headerStyle}>TIME</th>
                  <th style={headerStyle}>PAGE</th>
                  <th style={headerStyle}>ENDPOINT</th>
                  <th style={headerStyle}>STATUS</th>
                  <th style={headerStyle}>ERROR</th>
                </tr>
              )}
            </thead>
            <tbody>
              {tab === "feedback" && data.map((r, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{fmtDate(r.created_at)}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontSize: 11 }}>{r.email || r.clerk_user_id?.slice(0, 12) || "—"}</td>
                  <td style={{ ...cellStyle, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.page_url || "—"}</td>
                  <td style={cellStyle}><Badge text={r.feedback_type || "general"} color={r.feedback_type === "bug" ? "#e47272" : r.feedback_type === "suggestion" ? "#6bb8e0" : "#d4a532"} /></td>
                  <td style={{ ...cellStyle, maxWidth: 400, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{r.message || "—"}</td>
                  <td style={cellStyle}>{(r.image_urls || []).length > 0 ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {(r.image_urls as string[]).map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noreferrer" style={{ color: "#d4a532", fontSize: 10 }}>IMG {j + 1}</a>
                      ))}
                    </div>
                  ) : "—"}</td>
                </tr>
              ))}
              {tab === "activity" && data.map((r, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{fmtDate(r.created_at)}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontSize: 11 }}>{r.sleeper_username || r.clerk_user_id?.slice(0, 12) || "—"}</td>
                  <td style={cellStyle}><Badge text={r.event_type || "—"} color={r.event_type?.includes("view") ? "#7dd3a0" : r.event_type?.includes("click") ? "#6bb8e0" : "#d4a532"} /></td>
                  <td style={{ ...cellStyle, fontSize: 11 }}>{r.page || "—"}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontSize: 10 }}>{r.league_id?.slice(0, 10) || "—"}</td>
                  <td style={{ ...cellStyle, fontSize: 11 }}>{r.owner_name || "—"}</td>
                </tr>
              ))}
              {tab === "errors" && data.map((r, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{fmtDate(r.created_at)}</td>
                  <td style={{ ...cellStyle, fontSize: 11 }}>{r.page || "—"}</td>
                  <td style={{ ...cellStyle, fontFamily: MONO, fontSize: 10, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.endpoint || "—"}</td>
                  <td style={cellStyle}>{r.status_code ? <Badge text={String(r.status_code)} color={r.status_code >= 500 ? "#e47272" : r.status_code >= 400 ? "#e09c6b" : "#6b6d7e"} /> : "—"}</td>
                  <td style={{ ...cellStyle, maxWidth: 400, fontSize: 11, whiteSpace: "pre-wrap", lineHeight: 1.4, color: "#e47272" }}>{r.error_message?.slice(0, 300) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab !== "pipeline" && (
        <div style={{ fontFamily: MONO, fontSize: 10, color: "#6b6d7e", marginTop: 12, textAlign: "center" }}>
          {data.length} rows · {tab === "feedback" ? "Last 100" : "Last 200"}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE VIEW — 3 sub-sections for beta league management
   ═══════════════════════════════════════════════════════════════════════════ */

function PipelineView({
  data,
  sub,
  setSub,
  cellStyle,
  headerStyle,
}: {
  data: { active: any[]; ready: any[]; needs_work: any[] };
  sub: PipelineSub;
  setSub: (s: PipelineSub) => void;
  cellStyle: React.CSSProperties;
  headerStyle: React.CSSProperties;
}) {
  const subStyle = (s: PipelineSub) => {
    const colors: Record<PipelineSub, string> = { active: "#7dd3a0", ready: "#d4a532", needs_work: "#6b6d7e" };
    const c = colors[s];
    return {
      fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      padding: "5px 14px", cursor: "pointer" as const, border: "none", borderRadius: 4,
      background: sub === s ? `${c}20` : "transparent",
      color: sub === s ? c : "#6b6d7e",
    };
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <button style={subStyle("active")} onClick={() => setSub("active")}>IN BETA ({data.active.length})</button>
        <button style={subStyle("ready")} onClick={() => setSub("ready")}>READY TO INVITE ({data.ready.length})</button>
        <button style={subStyle("needs_work")} onClick={() => setSub("needs_work")}>NEEDS WORK ({data.needs_work.length})</button>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #2a2b3a" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          {sub === "active" && (
            <>
              <thead>
                <tr>
                  <th style={headerStyle}>LEAGUE</th>
                  <th style={headerStyle}>EMAIL</th>
                  <th style={headerStyle}>SIGNED UP</th>
                  <th style={headerStyle}>TRADES</th>
                  <th style={headerStyle}>LAST ACTIVITY</th>
                </tr>
              </thead>
              <tbody>
                {data.active.map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || "—"}</td>
                    <td style={{ ...cellStyle, fontSize: 11 }}>{r.email || "—"}</td>
                    <td style={cellStyle}>{r.signed_up ? <Badge text="YES" color="#7dd3a0" /> : <Badge text="NO" color="#6b6d7e" />}</td>
                    <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                    <td style={cellStyle}>{fmtDate(r.last_event)}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {sub === "ready" && (
            <>
              <thead>
                <tr>
                  <th style={headerStyle}>LEAGUE</th>
                  <th style={headerStyle}>EMAIL</th>
                  <th style={headerStyle}>USERNAME</th>
                  <th style={headerStyle}>SEASONS</th>
                  <th style={headerStyle}>TRADES/SZN</th>
                  <th style={headerStyle}>COMM</th>
                  <th style={headerStyle}>TRADES</th>
                  <th style={headerStyle}>ARTICLE</th>
                </tr>
              </thead>
              <tbody>
                {data.ready.length === 0 ? (
                  <tr><td colSpan={8} style={{ ...cellStyle, textAlign: "center", color: "#6b6d7e" }}>No leagues ready to invite</td></tr>
                ) : data.ready.map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || r.league_id}</td>
                    <td style={{ ...cellStyle, fontSize: 11 }}>{r.email}</td>
                    <td style={{ ...cellStyle, fontFamily: MONO }}>{r.sleeper_username}</td>
                    <td style={cellStyle}>{r.seasons_running || "—"}</td>
                    <td style={cellStyle}>{r.trades_per_season || "—"}</td>
                    <td style={cellStyle}>{r.is_commissioner ? <Badge text="YES" color="#7dd3a0" /> : "—"}</td>
                    <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                    <td style={cellStyle}><Badge text="✅" color="#7dd3a0" /></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {sub === "needs_work" && (
            <>
              <thead>
                <tr>
                  <th style={headerStyle}>LEAGUE</th>
                  <th style={headerStyle}>EMAIL</th>
                  <th style={headerStyle}>USERNAME</th>
                  <th style={headerStyle}>TRADES</th>
                  <th style={headerStyle}>MISSING</th>
                </tr>
              </thead>
              <tbody>
                {data.needs_work.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...cellStyle, textAlign: "center", color: "#6b6d7e" }}>All applicants are ready</td></tr>
                ) : data.needs_work.map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...cellStyle, color: "#eeeef2", fontWeight: 600 }}>{r.league_name || r.league_id}</td>
                    <td style={{ ...cellStyle, fontSize: 11 }}>{r.email}</td>
                    <td style={{ ...cellStyle, fontFamily: MONO }}>{r.sleeper_username}</td>
                    <td style={{ ...cellStyle, fontFamily: MONO, fontWeight: 700 }}>{(r.trade_count || 0).toLocaleString()}</td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(r.missing || []).map((m: string, j: number) => (
                          <Badge key={j} text={m.toUpperCase()} color="#e47272" />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 10, color: "#6b6d7e", marginTop: 12, textAlign: "center" }}>
        {data.active.length} in beta · {data.ready.length} ready · {data.needs_work.length} needs work
      </div>
    </div>
  );
}
