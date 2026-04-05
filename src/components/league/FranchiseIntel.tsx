"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getFranchiseIntel, getCoachesCorner, getGmVerdict, getActions } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { ChevronDown } from "lucide-react";
import CoachesCorner from "./CoachesCorner";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function safeText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    for (const key of ["raw_response", "text", "verdict", "report", "summary", "content"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    if (Array.isArray(v)) return v.filter(x => typeof x === "string").join("\n");
  }
  return "";
}

// Strip ALL position ranks (WR11, QB5, RB15, TE1 etc) from any string
const _stripRanks = (s: string) => s.replace(/\b(?:QB|RB|WR|TE)\d{1,3}\b/g, "").replace(/\s{2,}/g, " ").trim();

function parseActionItem(item: unknown): { action: string; dataPoint: string; detail: string } {
  if (typeof item === "string") return { action: _stripRanks(item), dataPoint: "", detail: "" };
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    return {
      action: _stripRanks(String(o.action || o.title || o.text || "")),
      dataPoint: _stripRanks(String(o.data_point || "")),
      detail: _stripRanks(String(o.detail || o.reason || o.description || "")),
    };
  }
  return { action: _stripRanks(String(item)), dataPoint: "", detail: "" };
}

/* ═══════════════════════════════════════════════════════════════
   GM VERDICT — Hero card with gold gradient
   ═══════════════════════════════════════════════════════════════ */

function GmVerdict({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const clean = _stripRanks((text || "").trim());

  if (!clean) return (
    <div style={{
      borderRadius: 10, padding: "20px 18px", textAlign: "center",
      background: `linear-gradient(135deg, rgba(212,165,50,0.12), rgba(212,165,50,0.04), ${C.card})`,
      border: `1px solid ${C.goldBorder}`, boxShadow: `0 0 60px rgba(212,165,50,0.06)`,
    }}>
      <div style={{ fontFamily: SANS, fontSize: 14, fontStyle: "italic", color: C.gold }}>Franchise intel is being computed...</div>
    </div>
  );

  const render = (t: string) => ({
    __html: t
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f5e6a3;font-weight:700">$1</strong>')
      .replace(/\n/g, "<br/>"),
  });

  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      background: `linear-gradient(135deg, rgba(212,165,50,0.10), rgba(212,165,50,0.04), ${C.card})`,
      border: `1px solid ${C.goldBorder}`,
      boxShadow: `0 0 60px rgba(212,165,50,0.06)`,
    }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold, marginBottom: 8 }}>GM VERDICT</div>
        {/* Collapsed: CSS clamp to 3 lines max. Expanded: full text */}
        {!open ? (
          <div style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
          }} dangerouslySetInnerHTML={render(clean)} />
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, lineHeight: 1.5 }}
            dangerouslySetInnerHTML={render(clean)} />
        )}
      </div>
      <div onClick={() => setOpen(!open)} style={{
        padding: "8px 16px", borderTop: `1px solid ${C.goldBorder}`, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: `rgba(212,165,50,0.05)`,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.gold }}>
          {open ? "COLLAPSE" : "SEE FULL VERDICT"}
        </span>
        <ChevronDown size={12} style={{ color: C.gold, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WINDOW + ROSTER — Scoreboard feel
   ═══════════════════════════════════════════════════════════════ */

function WindowRoster({ windowData, positions, rosterData }: {
  windowData: Record<string, unknown> | undefined;
  positions: Record<string, Record<string, unknown>> | undefined;
  rosterData: Record<string, unknown> | undefined;
}) {
  const window = String(windowData?.window || "—");
  const winNow = windowData?.win_now_rank as string | number | undefined;
  const dynasty = windowData?.dynasty_rank as string | number | undefined;
  const needs = (rosterData?.positional_needs as string[]) || [];

  const gradeColor = (g: string) =>
    g === "ELITE" ? C.gold : g === "STRONG" ? C.green : g === "AVERAGE" ? "#6bb8e0" : g === "WEAK" ? C.orange : C.red;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
    }}>
      {/* Window */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.dim, marginBottom: 6 }}>WINDOW</div>
        <div style={{
          fontFamily: DISPLAY, fontSize: 28, color: C.gold, lineHeight: 1.1, marginBottom: 8,
          textShadow: "0 0 20px rgba(212,165,50,0.15)",
        }}>{window}</div>
        <div style={{ display: "flex", gap: 12 }}>
          {winNow && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.green, lineHeight: 1 }}>#{String(winNow)}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 2 }}>WIN-NOW</div>
            </div>
          )}
          {dynasty && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: "#6bb8e0", lineHeight: 1 }}>#{String(dynasty)}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.dim, marginTop: 2 }}>DYNASTY</div>
            </div>
          )}
        </div>
      </div>

      {/* Roster Grades */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.dim, marginBottom: 8 }}>ROSTER GRADES</div>
        {positions ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
              const grade = String(positions[pos]?.positional_grade || "—");
              const gc = gradeColor(grade);
              return (
                <div key={pos} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                  borderRadius: 5, background: `${gc}0a`, border: `1px solid ${gc}20`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: posColor(pos) }}>{pos}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: gc }}>{grade}</span>
                </div>
              );
            })}
          </div>
        ) : <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>—</span>}
        {needs.length > 0 && (
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.red }}>
            NEEDS: {needs.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STOP / START / KEEP — Command center
   ═══════════════════════════════════════════════════════════════ */

function ActionItem({ item, borderColor }: { item: unknown; borderColor: string }) {
  const [open, setOpen] = useState(false);
  const { action, dataPoint, detail } = parseActionItem(item);
  const headline = action.replace(/^(Start |Stop |Keep |Consider )/i, "").replace(/\s+right\s+now/i, "");
  const cap = headline.charAt(0).toUpperCase() + headline.slice(1);
  const expandContent = detail || dataPoint;

  return (
    <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `rgba(255,255,255,0.02)`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div style={{
        padding: "8px 10px 8px 12px",
        borderLeft: open ? `3px solid ${C.gold}` : `3px solid ${borderColor}25`,
      }}>
        <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.primary, lineHeight: 1.35 }}>{cap}</div>
        {!open && expandContent && (
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.gold, marginTop: 3, opacity: 0.7 }}>Tap to expand</div>
        )}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
              {dataPoint && (
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.3, marginTop: 4 }}>{dataPoint}</div>
              )}
              {detail && (
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.55, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.white08}` }}>
                  {detail}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StopStartKeep({ stop, start, keep }: { stop: unknown[]; start: unknown[]; keep: unknown[] }) {
  if (!stop.length && !start.length && !keep.length) return null;

  const cols = [
    { label: "STOP", items: stop, color: C.red },
    { label: "START", items: start, color: C.green },
    { label: "KEEP", items: keep, color: C.gold },
  ];

  return (
    <>
      <style>{`
        .ssk-grid { display: flex; flex-direction: column; gap: 6px; }
        @media (min-width: 768px) { .ssk-grid { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 6px !important; } }
      `}</style>
      <div className="ssk-grid">
        {cols.map(({ label, items, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{
              padding: "5px 12px", borderBottom: `1px solid ${C.border}`,
              background: `${color}08`, borderLeft: `3px solid ${color}`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color }}>{label}</span>
            </div>
            <div>
              {items.length > 0 ? items.slice(0, 3).map((rawItem, j) => (
                <div key={j} style={{ borderBottom: j < Math.min(items.length, 3) - 1 ? `1px solid ${C.white08}` : "none" }}>
                  <ActionItem item={rawItem} borderColor={color} />
                </div>
              )) : (
                <div style={{ padding: "10px 12px", fontFamily: SANS, fontSize: 12, color: C.dim }}>—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOVEABLE ASSETS
   ═══════════════════════════════════════════════════════════════ */

function MoveableAssets({ assets }: { assets: Array<Record<string, unknown>> }) {
  if (!assets || !assets.length) return null;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "5px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>MOVEABLE ASSETS</span>
      </div>
      <div style={{ padding: "4px 12px" }}>
        {assets.slice(0, 8).map((a, j) => {
          const status = String(a.status || "AVAILABLE");
          const isShop = status === "SHOP_NOW";
          const isSell = status === "SELL_HIGH";
          const pillColor = isShop || isSell ? C.orange : C.dim;
          const pillLabel = isShop ? "shop now" : isSell ? "sell high" : "available";
          return (
            <div key={j} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
              borderBottom: j < Math.min(assets.length, 8) - 1 ? `1px solid ${C.white08}` : "none",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: posColor(String(a.position || "")),
                background: posColor(String(a.position || "")) + "18", padding: "2px 5px", borderRadius: 3,
                fontFamily: SANS,
              }}>{String(a.position || "")}</span>
              <PlayerName name={String(a.name || a.player || "—")} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, flex: 1 }} />
              <span style={{
                fontFamily: SANS, fontSize: 11, fontWeight: 600, color: pillColor,
                padding: "2px 8px", borderRadius: 10, background: `${pillColor}12`, border: `1px solid ${pillColor}25`,
              }}>{pillLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */

function Skeleton() {
  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ height: 14, width: 120, background: C.elevated, borderRadius: 4, marginBottom: 12 }} />
          <div style={{ height: 16, width: "100%", background: C.elevated, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 16, width: "75%", background: C.elevated, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function FranchiseIntel({ leagueId, owner, ownerId }: {
  leagueId: string; owner: string; ownerId?: string | null; leagueName?: string;
}) {
  const [tab, setTab] = useState<"report" | "coaches">("report");

  const { data: intel, isLoading } = useQuery({
    queryKey: ["franchise-intel", leagueId, owner],
    queryFn: () => getFranchiseIntel(leagueId, owner, ownerId),
    enabled: !!owner,
  });
  const { data: gmVerdict } = useQuery({
    queryKey: ["gm-verdict", leagueId, owner],
    queryFn: () => getGmVerdict(leagueId, owner, ownerId),
    enabled: !!owner,
  });
  const { data: actions } = useQuery({
    queryKey: ["actions", leagueId, owner],
    queryFn: () => getActions(leagueId, owner, ownerId),
    enabled: !!owner,
  });

  const i = intel as Record<string, unknown> | undefined;
  const windowData = i?.window as Record<string, unknown> | undefined;
  const rosterData = i?.roster_strength as Record<string, unknown> | undefined;
  const positions = rosterData?.positions as Record<string, Record<string, unknown>> | undefined;
  const moveable = i?.moveable_assets as Array<Record<string, unknown>> | undefined;

  const aiReportRaw = i?.ai_report;
  const aiReport: Record<string, unknown> | null = (() => {
    if (!aiReportRaw) return null;
    if (typeof aiReportRaw === "object" && !Array.isArray(aiReportRaw)) return aiReportRaw as Record<string, unknown>;
    if (typeof aiReportRaw === "string") {
      try {
        const parsed = JSON.parse(aiReportRaw);
        if (parsed?.ai_report && typeof parsed.ai_report === "object") return parsed.ai_report;
        if (typeof parsed === "object") return parsed;
      } catch { /* */ }
    }
    return null;
  })();

  const gm = gmVerdict as Record<string, unknown> | undefined;
  const act = actions as Record<string, unknown> | undefined;

  const gmText = _stripRanks(safeText(gm?.verdict) || safeText(aiReport?.verdict) || "");
  const actionsData = {
    stop: (act?.stop || aiReport?.stop || []) as unknown[],
    start: (act?.start || aiReport?.start || []) as unknown[],
    keep: (act?.keep || aiReport?.keep || []) as unknown[],
  };

  if (!owner) return <div style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 14, color: C.dim }}>Select an owner to view franchise intel.</div>;
  if (isLoading) return <Skeleton />;

  return (
    <div style={{ padding: "10px 14px" }}>
      {/* TAB BAR */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
        {(["report", "coaches"] as const).map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", fontFamily: SANS, fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? C.gold : C.dim, cursor: "pointer",
            borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent",
            transition: "all 0.15s",
          }}>{t === "report" ? "Franchise Report" : "Coaches Corner"}</div>
        ))}
      </div>

      {tab === "report" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GmVerdict text={gmText} />
          <WindowRoster windowData={windowData} positions={positions} rosterData={rosterData} />
          <StopStartKeep stop={actionsData.stop} start={actionsData.start} keep={actionsData.keep} />
          <MoveableAssets assets={moveable || []} />
        </div>
      ) : (
        <CoachesCorner leagueId={leagueId} owner={owner} ownerId={ownerId} />
      )}
    </div>
  );
}
