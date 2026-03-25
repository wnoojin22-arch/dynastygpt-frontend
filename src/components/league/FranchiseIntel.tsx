"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFranchiseIntel, getCoachesCorner, getGmVerdict, getActions } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, posColor, leaguePrefix } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   FRANCHISE INTEL — Full render of all API data
   Tabs: Franchise Report | Coaches Corner
   ═══════════════════════════════════════════════════════════════ */

function SectionCard({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: accent ? `${accent}10` : C.goldDim }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", color: accent || C.gold }}>{label}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
      <span style={{ fontFamily: SANS, fontSize: 12, color: C.dim }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: color || C.primary }}>{value}</span>
    </div>
  );
}

export default function FranchiseIntel({ leagueId, owner, leagueName }: {
  leagueId: string; owner: string; leagueName: string;
}) {
  const [tab, setTab] = useState<"report" | "coaches">("report");
  const prefix = leaguePrefix(leagueName);

  const { data: intel, isLoading } = useQuery({
    queryKey: ["franchise-intel", leagueId, owner],
    queryFn: () => getFranchiseIntel(leagueId, owner),
    enabled: !!owner,
  });

  const { data: coaches } = useQuery({
    queryKey: ["coaches-corner", leagueId, owner],
    queryFn: () => getCoachesCorner(leagueId, owner),
    enabled: !!owner && tab === "coaches",
  });

  const { data: gmVerdict } = useQuery({
    queryKey: ["gm-verdict", leagueId, owner],
    queryFn: () => getGmVerdict(leagueId, owner),
    enabled: !!owner,
  });

  const { data: actions } = useQuery({
    queryKey: ["actions", leagueId, owner],
    queryFn: () => getActions(leagueId, owner),
    enabled: !!owner,
  });

  const i = intel as Record<string, unknown> | undefined;
  const window = i?.window as Record<string, unknown> | undefined;
  const roster = i?.roster_strength as Record<string, unknown> | undefined;
  const moveable = i?.moveable_assets as Array<Record<string, unknown>> | undefined;
  const aiReport = i?.ai_report as Record<string, unknown> | undefined;
  const cc = coaches as Record<string, unknown> | undefined;
  const gm = gmVerdict as Record<string, unknown> | undefined;

  if (!owner) return (
    <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 12, color: C.dim }}>Select an owner to view franchise intel.</div>
  );

  if (isLoading) return (
    <div style={{ padding: 32, textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING FRANCHISE INTEL...</div>
  );

  return (
    <div style={{ padding: "12px 16px" }}>
      {/* TAB BAR */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}`, marginBottom: 16 }}>
        {(["report", "coaches"] as const).map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", fontFamily: MONO, fontSize: 11, fontWeight: 800,
            letterSpacing: "0.08em", color: tab === t ? C.gold : C.dim, cursor: "pointer",
            borderBottom: tab === t ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: tab === t ? `0 3px 12px ${C.gold}40` : "none", transition: "all 0.2s",
          }}>{t === "report" ? "FRANCHISE REPORT" : "COACHES CORNER"}</div>
        ))}
      </div>

      {tab === "report" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* GM VERDICT — hero card */}
          <div style={{
            padding: "18px 20px", borderRadius: 8,
            background: `linear-gradient(135deg, ${C.goldGlow}, ${C.card})`,
            border: `1px solid ${C.goldBorder}`,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: C.gold, marginBottom: 8 }}>GM VERDICT</div>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: C.primary, lineHeight: 1.6 }}>
              {(gm as Record<string, unknown>)?.verdict
                ? String((gm as Record<string, unknown>).verdict)
                : aiReport?.verdict
                  ? String(aiReport.verdict)
                  : "Franchise intel is being computed. Check back after full league analysis."}
            </div>
          </div>

          {/* WINDOW + ROSTER STRENGTH */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Window */}
            <SectionCard label="COMPETITIVE WINDOW">
              {window ? (
                <>
                  <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.primary, marginBottom: 6 }}>
                    {String(window.window || window.label || "—")}
                  </div>
                  {window.win_now_rank && <StatRow label="Win-Now Rank" value={`#${window.win_now_rank}`} color={C.green} />}
                  {window.dynasty_rank && <StatRow label="Dynasty Rank" value={`#${window.dynasty_rank}`} color={C.blue} />}
                  {window.mismatch_type && (
                    <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: C.orange, padding: "4px 8px", borderRadius: 4, background: `${C.orange}12`, border: `1px solid ${C.orange}25` }}>
                      ⚠ {String(window.mismatch_type).replace(/_/g, " ").toUpperCase()}
                    </div>
                  )}
                </>
              ) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
            </SectionCard>

            {/* Roster Strength */}
            <SectionCard label="ROSTER STRENGTH">
              {roster?.positions ? (
                Object.entries(roster.positions as Record<string, Record<string, unknown>>).map(([pos, data]) => (
                  <div key={pos} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: posColor(pos), width: 24 }}>{pos}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>
                      {String(data.positional_grade || "—")}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{String(data.elite_count || 0)} elite</span>
                  </div>
                ))
              ) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>—</span>}
            </SectionCard>
          </div>

          {/* STOP / START / KEEP */}
          {actions && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "STOP", items: actions.stop || [], color: C.red },
                { label: "START", items: actions.start || [], color: C.green },
                { label: "KEEP", items: actions.keep || [], color: C.gold },
              ].map(({ label, items, color }) => (
                <SectionCard key={label} label={label} accent={color}>
                  {(items as string[]).length > 0 ? (items as string[]).map((item, j) => (
                    <div key={j} style={{ fontFamily: SANS, fontSize: 12, color: C.secondary, padding: "4px 0", borderBottom: `1px solid ${C.white08}`, lineHeight: 1.45 }}>
                      {item}
                    </div>
                  )) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
                </SectionCard>
              ))}
            </div>
          )}

          {/* MOVEABLE ASSETS */}
          {moveable && moveable.length > 0 && (
            <SectionCard label="MOVEABLE ASSETS">
              {moveable.map((a, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.white08}` }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>{String(a.name || a.player || "—")}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold }}>{fmt(a.sha_value as number)}</span>
                  <span style={{
                    fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.04em",
                    color: String(a.status) === "SHOP_NOW" ? C.red : C.green,
                    padding: "1px 6px", borderRadius: 3,
                    background: String(a.status) === "SHOP_NOW" ? C.redDim : C.greenDim,
                  }}>{String(a.status || "AVAILABLE")}</span>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      ) : (
        /* COACHES CORNER TAB */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cc ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "MOVE NOW", items: (cc.move_now || []) as Array<Record<string, unknown>>, color: C.red },
                  { label: "HOLD ON TO", items: (cc.hold || []) as Array<Record<string, unknown>>, color: C.green },
                  { label: "LISTEN TO OFFERS", items: (cc.listen || []) as Array<Record<string, unknown>>, color: C.gold },
                ].map(({ label, items, color }) => (
                  <SectionCard key={label} label={label} accent={color}>
                    {items.length > 0 ? items.map((p, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: posColor(String(p.position || "")), fontFamily: SANS, background: posColor(String(p.position || "")) + "18", padding: "1px 4px", borderRadius: 2 }}>{String(p.position || "")}</span>
                        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>{String(p.name || p.player || "—")}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold }}>{fmt(p.sha_value as number)}</span>
                      </div>
                    )) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
                  </SectionCard>
                ))}
              </div>

              {/* BUY LOW / SELL HIGH */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "BUY LOW TARGETS", items: (cc.buy_low || []) as Array<Record<string, unknown>>, color: C.green },
                  { label: "SELL HIGH CANDIDATES", items: (cc.sell_high || []) as Array<Record<string, unknown>>, color: C.red },
                ].map(({ label, items, color }) => (
                  <SectionCard key={label} label={label} accent={color}>
                    {items.length > 0 ? items.map((p, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: `1px solid ${C.white08}` }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: posColor(String(p.position || "")), fontFamily: SANS, background: posColor(String(p.position || "")) + "18", padding: "1px 4px", borderRadius: 2 }}>{String(p.position || "")}</span>
                        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.primary, flex: 1 }}>{String(p.name || p.player || "—")}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{String(p.owner || "")}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold }}>{fmt(p.sha_value as number)}</span>
                      </div>
                    )) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
                  </SectionCard>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>LOADING COACHES CORNER...</div>
          )}
        </div>
      )}
    </div>
  );
}
