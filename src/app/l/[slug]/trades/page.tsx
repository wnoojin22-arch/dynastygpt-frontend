"use client";

import { useState } from "react";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getGradedTrades, getGradedTradesByOwner, gradeTrade, getOwners } from "@/lib/api";
import type { GradedTrade } from "@/lib/types";

const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", white08: "rgba(255,255,255,0.06)",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function getVerdictStyle(v: string) {
  if (v === "Win-Win") return { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" };
  if (v === "ROBBERY") return { color: "#ff4444", bg: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.30)" };
  if (v?.includes("Won")) return { color: C.gold, bg: C.goldDim, border: C.goldBorder };
  if (v?.includes("Lost")) return { color: C.red, bg: "rgba(255,68,68,0.10)", border: "rgba(255,68,68,0.25)" };
  return { color: C.dim, bg: "transparent", border: C.border };
}

function DCard({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
        {right}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

export default function TradesPage() {
  const { currentLeagueId: lid, currentOwner: owner } = useLeagueStore();
  const [tab, setTab] = useState<"league" | "mine" | "grade">("league");
  const [gradeForm, setGradeForm] = useState({ ownerA: "", assetsA: "", ownerB: "", assetsB: "" });

  const { data: ownersData } = useQuery({ queryKey: ["owners", lid], queryFn: () => getOwners(lid!), enabled: !!lid });
  const { data: leagueTrades } = useQuery({ queryKey: ["graded-trades", lid], queryFn: () => getGradedTrades(lid!), enabled: !!lid && tab === "league" });
  const { data: myTrades } = useQuery({ queryKey: ["my-trades", lid, owner], queryFn: () => getGradedTradesByOwner(lid!, owner!), enabled: !!lid && !!owner && tab === "mine" });

  const gradeM = useMutation({
    mutationFn: () => gradeTrade(lid!, {
      side_a: { owner: gradeForm.ownerA, assets: gradeForm.assetsA.split(",").map(s => s.trim()).filter(Boolean) },
      side_b: { owner: gradeForm.ownerB, assets: gradeForm.assetsB.split(",").map(s => s.trim()).filter(Boolean) },
    }),
  });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const tabs = [
    { key: "league" as const, label: "LEAGUE LOG" },
    { key: "mine" as const, label: "MY TRADES" },
    { key: "grade" as const, label: "GRADE A TRADE" },
  ];
  const trades = tab === "league" ? leagueTrades?.trades : tab === "mine" ? myTrades?.trades : [];

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
            padding: "6px 12px", borderRadius: 4, cursor: "pointer", border: "none",
            background: tab === t.key ? C.goldDim : "transparent",
            color: tab === t.key ? C.gold : C.dim,
            outline: tab === t.key ? `1px solid ${C.goldBorder}` : "none",
          }}>{t.label}</button>
        ))}
        {tab === "mine" && owner && myTrades && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontFamily: MONO, fontSize: 12 }}>
            <span style={{ color: C.green }}>W: {myTrades.wins}</span>
            <span style={{ color: C.red }}>L: {myTrades.losses}</span>
            <span style={{ color: C.gold }}>Rate: {myTrades.win_rate ? `${(myTrades.win_rate * 100).toFixed(0)}%` : "—"}</span>
          </div>
        )}
      </div>

      {/* Trade Log */}
      {(tab === "league" || tab === "mine") && (
        <DCard label={tab === "league" ? "ALL TRADES" : `${(owner || "").toUpperCase()} TRADES`} right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{trades?.length || 0} trades</span>}>
          <div style={{ maxHeight: 700, overflowY: "auto" }}>
            {trades?.map((t: GradedTrade, i: number) => {
              const vs = t.verdict ? getVerdictStyle(t.verdict) : null;
              const sent = Array.isArray(t.players_sent) ? t.players_sent.join(", ") : "—";
              const got = Array.isArray(t.players_received) ? t.players_received.join(", ") : "—";
              return (
                <div key={`${t.trade_id}-${i}`} style={{
                  padding: "8px", borderRadius: 4, borderBottom: `1px solid ${C.white08}`,
                  borderLeft: vs ? `3px solid ${vs.color}` : "3px solid transparent",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.owner}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>↔</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{t.counter_party}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {vs && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}` }}>{t.verdict}</span>}
                      {t.sha_balance != null && !isNaN(t.sha_balance) && (
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: t.sha_balance > 0 ? C.green : t.sha_balance < 0 ? C.red : C.dim }}>{t.sha_balance > 0 ? "+" : ""}{fmt(t.sha_balance)}</span>
                      )}
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{t.date?.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontFamily: MONO, fontSize: 11 }}>
                    <div><span style={{ color: C.dim }}>Sent: </span><span style={{ color: C.secondary }}>{sent}</span></div>
                    <div><span style={{ color: C.dim }}>Got: </span><span style={{ color: C.secondary }}>{got}</span></div>
                  </div>
                </div>
              );
            })}
            {(!trades || trades.length === 0) && (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 16, textAlign: "center" }}>
                {tab === "mine" && !owner ? "Select an owner to see their trades" : "No trades found"}
              </p>
            )}
          </div>
        </DCard>
      )}

      {/* Grade a Trade */}
      {tab === "grade" && (
        <DCard label="TRADE GRADER">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "SIDE A", owner: gradeForm.ownerA, assets: gradeForm.assetsA, setOwner: (v: string) => setGradeForm({ ...gradeForm, ownerA: v }), setAssets: (v: string) => setGradeForm({ ...gradeForm, assetsA: v }) },
              { label: "SIDE B", owner: gradeForm.ownerB, assets: gradeForm.assetsB, setOwner: (v: string) => setGradeForm({ ...gradeForm, ownerB: v }), setAssets: (v: string) => setGradeForm({ ...gradeForm, assetsB: v }) },
            ].map((side) => (
              <div key={side.label}>
                <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, display: "block", marginBottom: 4 }}>{side.label} OWNER</label>
                <select value={side.owner} onChange={(e) => side.setOwner(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, fontFamily: MONO, fontSize: 12, background: C.elevated, border: `1px solid ${C.border}`, color: C.primary, cursor: "pointer" }}>
                  <option value="">Select owner...</option>
                  {ownersData?.owners?.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
                </select>
                <label style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.dim, display: "block", marginBottom: 4, marginTop: 8 }}>ASSETS (comma separated)</label>
                <input value={side.assets} onChange={(e) => side.setAssets(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, fontFamily: MONO, fontSize: 12, background: C.elevated, border: `1px solid ${C.border}`, color: C.primary }}
                  placeholder="Patrick Mahomes, 2026 Mid 1st" />
              </div>
            ))}
          </div>
          <button onClick={() => gradeM.mutate()} disabled={gradeM.isPending}
            style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", padding: "8px 16px", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.goldBorder}`, background: C.goldDim, color: C.gold }}>
            {gradeM.isPending ? "GRADING..." : "GRADE TRADE"}
          </button>
          {gradeM.data && (() => {
            const d = gradeM.data as any;
            return (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: C.elevated, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.primary }}>RESULT</span>
                  <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: C.gold }}>{d.grade}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontFamily: MONO, fontSize: 12 }}>
                  <div><span style={{ color: C.dim }}>{d.side_a?.owner}:</span> <span style={{ fontWeight: 700, color: C.gold }}>{fmt(d.side_a?.total_sha)}</span></div>
                  <div><span style={{ color: C.dim }}>{d.side_b?.owner}:</span> <span style={{ fontWeight: 700, color: C.gold }}>{fmt(d.side_b?.total_sha)}</span></div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.green, marginTop: 8 }}>Winner: {d.winner}</div>
              </div>
            );
          })()}
        </DCard>
      )}
    </div>
  );
}
