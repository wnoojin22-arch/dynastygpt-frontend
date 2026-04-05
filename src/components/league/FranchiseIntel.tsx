"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getFranchiseIntel, getCoachesCorner, getGmVerdict, getActions } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, fmt, posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { ArrowUpRight, Shield, Eye, Target, AlertTriangle } from "lucide-react";
import CoachesCorner from "./CoachesCorner";

/* ═══════════════════════════════════════════════════════════════
   HELPERS — safe text extraction, prevent JSON leaking
   ═══════════════════════════════════════════════════════════════ */

function safeText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    // Try known keys in priority order
    for (const key of ["raw_response", "text", "verdict", "report", "summary", "content"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    // If it's an array, join strings
    if (Array.isArray(v)) return v.filter(x => typeof x === "string").join("\n");
  }
  return "";
}


/** Extract action item — handles both string and {action, data_point} formats */
function parseActionItem(item: unknown): { action: string; detail: string } {
  if (typeof item === "string") return { action: item, detail: "" };
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    return {
      action: String(obj.action || obj.title || obj.name || obj.text || ""),
      detail: String(obj.data_point || obj.detail || obj.reason || obj.description || ""),
    };
  }
  return { action: String(item), detail: "" };
}

/** Derive a display rank from sha_pos_rank or fall back to position + "depth" label */
function posRankLabel(p: Record<string, unknown>): string {
  if (p.sha_pos_rank && typeof p.sha_pos_rank === "string" && p.sha_pos_rank.trim()) {
    return p.sha_pos_rank.trim();
  }
  if (p.sha_pos_rank && typeof p.sha_pos_rank === "number") {
    const pos = String(p.position || "");
    return pos ? `${pos}${p.sha_pos_rank}` : `#${p.sha_pos_rank}`;
  }
  if (p.pos_rank && typeof p.pos_rank === "string") return p.pos_rank.trim();
  if (p.rank) {
    const pos = String(p.position || "");
    const n = String(p.rank).replace(/\D/g, "");
    return pos && n ? `${pos}${n}` : n ? `#${n}` : "";
  }
  const pos = String(p.position || "");
  return pos ? `${pos} depth` : "";
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/** Position badge — small colored pill */
function PosBadge({ pos }: { pos: string }) {
  if (!pos) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: posColor(pos), fontFamily: SANS,
      background: posColor(pos) + "18", padding: "2px 6px", borderRadius: 3,
      minWidth: 28, textAlign: "center", display: "inline-block", flexShrink: 0,
    }}>{pos}</span>
  );
}

/** Position rank pill — e.g. "WR13" */
function PosRankPill({ label }: { label: string }) {
  if (!label || label.endsWith("depth")) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: C.secondary, fontFamily: SANS,
      background: C.elevated, padding: "2px 7px", borderRadius: 10,
      border: `1px solid ${C.borderLt}`, flexShrink: 0,
    }}>{label}</span>
  );
}

function GmVerdictCard({ gmText }: { gmText: string | null }) {
  const [expanded, setExpanded] = React.useState(false);
  const paragraphs = gmText ? gmText.split(/\n\n+/) : [];
  const firstPara = paragraphs[0] || "";
  const hasMore = paragraphs.length > 1;

  const renderPara = (text: string) => ({
    __html: text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#eeeef2;font-weight:700">$1</strong>')
      .replace(/\n/g, "<br/>"),
  });

  return (
    <div style={{
      borderRadius: 8, overflow: "hidden",
      background: `linear-gradient(135deg, ${C.goldGlow}, ${C.card})`,
      border: `1px solid ${C.goldBorder}`,
    }}>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: C.gold, marginBottom: 6 }}>GM VERDICT</div>
        {firstPara ? (
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.primary, lineHeight: 1.5 }}
            dangerouslySetInnerHTML={renderPara(firstPara)}
          />
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 13, fontStyle: "italic", color: C.dim }}>
            Franchise intel is being computed. Check back after sync.
          </div>
        )}
        {expanded && paragraphs.slice(1).map((para, i) => (
          <p key={i} style={{ fontFamily: SANS, fontSize: 13, color: C.primary, lineHeight: 1.5, marginTop: 10 }}
            dangerouslySetInnerHTML={renderPara(para)}
          />
        ))}
      </div>
      {hasMore && (
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: "6px 14px", borderTop: `1px solid ${C.goldBorder}`,
            textAlign: "center", cursor: "pointer",
            fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: C.gold,
          }}
        >
          {expanded ? "HIDE ▴" : "SEE FULL VERDICT ▾"}
        </div>
      )}
    </div>
  );
}

function SectionCard({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: accent ? `${accent}10` : C.goldDim }}>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: accent || C.gold }}>{label}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function GradeBar({ pos, grade, eliteCount, starterCount }: { pos: string; grade: string; eliteCount?: number; starterCount?: number }) {
  const gc = grade === "ELITE" ? C.green : grade === "STRONG" ? "#6bb8e0" : grade === "AVERAGE" ? C.gold : grade === "WEAK" ? C.orange : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.white08}` }}>
      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: posColor(pos), width: 28 }}>{pos}</span>
      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: gc, padding: "2px 8px", borderRadius: 4, background: `${gc}15`, border: `1px solid ${gc}25`, minWidth: 70, textAlign: "center" }}>{grade}</span>
      <span style={{ fontFamily: SANS, fontSize: 13, color: C.dim, flex: 1 }}>
        {eliteCount ? `${eliteCount} elite` : ""}{eliteCount && starterCount ? " · " : ""}{starterCount ? `${starterCount} starter` : ""}
      </span>
    </div>
  );
}

/** Clean card rows for Coaches Corner sections — no table headers */
function CoachesCardList({ label, subtitle, items, accent, max }: {
  label: string; subtitle: string; items: Array<Record<string, unknown>>; accent: string; max: number;
}) {
  const capped = items.slice(0, max);
  return (
    <div>
      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: accent, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim, marginBottom: 10 }}>{subtitle}</div>

      {capped.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, color: C.dim }}>No {label.toLowerCase()} candidates right now.</span>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          {capped.map((p, j) => {
            const pos = String(p.position || "");
            const name = String(p.name || p.player || "—");
            const age = p.age != null ? Number(p.age) : null;
            const rank = posRankLabel(p);
            const reason = p.reason || p.why || p.one_liner || "";
            return (
              <div key={j} style={{ padding: "10px 14px", borderBottom: j < capped.length - 1 ? `1px solid ${C.white08}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <PosBadge pos={pos} />
                  <PlayerName name={name} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: C.primary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                  {age != null && <span style={{ fontFamily: SANS, fontSize: 12, color: C.dim, flexShrink: 0 }}>{age}y</span>}
                  <PosRankPill label={rank} />
                </div>
                {reason && (
                  <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.5, marginTop: 5, marginBottom: 0 }}>{String(reason)}</p>
                )}
              </div>
            );
          })}
          {items.length > max && (
            <div style={{ padding: "8px 14px", fontFamily: SANS, fontSize: 12, color: C.dim }}>+{items.length - max} more</div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
      <div style={{ height: 14, width: 120, background: C.elevated, borderRadius: 4, marginBottom: 12, animation: "pulse-gold 1.5s ease infinite" }} />
      <div style={{ height: 16, width: "100%", background: C.elevated, borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 16, width: "75%", background: C.elevated, borderRadius: 4 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COACHES CORNER — Tailwind-based compact table layout
   ═══════════════════════════════════════════════════════════════ */

function posTagClasses(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red bg-accent-red/10";
    case "RB": return "text-accent-blue bg-accent-blue/10";
    case "WR": return "text-accent-green bg-accent-green/10";
    case "TE": return "text-accent-orange bg-accent-orange/10";
    default: return "text-dim bg-elevated";
  }
}

function posTextClass(pos: string): string {
  switch (pos) {
    case "QB": return "text-accent-red";
    case "RB": return "text-accent-blue";
    case "WR": return "text-accent-green";
    case "TE": return "text-accent-orange";
    default: return "text-dim";
  }
}

function actionPillClasses(action: string): string {
  switch (action) {
    case "SELL": return "text-accent-red bg-accent-red/15 border-accent-red/30";
    case "HOLD": return "text-accent-green bg-accent-green/15 border-accent-green/30";
    case "LISTEN":
    case "CAUTIOUS": return "text-accent-orange bg-accent-orange/15 border-accent-orange/30";
    default: return "text-dim bg-elevated border-border-lt";
  }
}

function gradeTagClasses(grade: string): string {
  switch (grade) {
    case "ELITE": return "text-accent-green bg-accent-green/10 border-accent-green/25";
    case "STRONG": return "text-accent-blue bg-accent-blue/10 border-accent-blue/25";
    case "AVERAGE": return "text-gold bg-gold/10 border-gold/25";
    case "WEAK": return "text-accent-orange bg-accent-orange/10 border-accent-orange/25";
    case "CRITICAL": return "text-accent-red bg-accent-red/10 border-accent-red/25";
    default: return "text-dim bg-elevated border-border-lt";
  }
}

function CoachesRow({ p, isLast }: { p: Record<string, unknown>; isLast: boolean }) {
  const pos = String(p.position || "");
  const name = String(p.name || p.player || "—");
  const age = p.age != null ? String(p.age) : "—";
  const rank = posRankLabel(p);
  const action = String(p.action || "");
  const target = String(p.target || p.reason || "");

  return (
    <div className={`grid grid-cols-[1fr_44px_36px_60px_64px_1fr] gap-2 px-3 py-2 items-center hover:bg-elevated/50 transition-colors ${!isLast ? "border-b border-white/[0.06]" : ""}`}>
      <PlayerName name={name} className="font-sans text-[13px] font-medium text-primary truncate" />
      <span className={`font-sans text-[11px] font-bold text-center rounded px-1 py-0.5 ${posTagClasses(pos)}`}>{pos || "—"}</span>
      <span className="font-sans text-[12px] text-dim text-center tabular-nums">{age}</span>
      <span className="font-sans text-[11px] font-semibold text-secondary text-center bg-elevated rounded-full px-1.5 py-0.5 border border-border-lt truncate">{rank || "—"}</span>
      <span className={`font-sans text-[11px] font-semibold text-center rounded-full px-1.5 py-0.5 border ${actionPillClasses(action)}`}>{action || "—"}</span>
      <span className="font-sans text-[12px] text-secondary truncate" title={target}>{target}</span>
    </div>
  );
}

function CoachesGradeRow({ pos, grade, isWeakest }: { pos: string; grade: string; isWeakest: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded ${isWeakest ? "bg-accent-orange/[0.07]" : ""}`}>
      <span className={`font-sans text-[12px] font-bold w-7 ${posTextClass(pos)}`}>{pos}</span>
      <span className={`font-sans text-[11px] font-semibold rounded px-2 py-0.5 min-w-[64px] text-center border ${gradeTagClasses(grade)}`}>{grade}</span>
      {isWeakest && <AlertTriangle size={11} className="text-accent-orange ml-auto shrink-0" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STOP / START / KEEP — Tappable expandable items
   ═══════════════════════════════════════════════════════════════ */

function ActionItem({ item, color }: { item: unknown; color: string }) {
  const [open, setOpen] = useState(false);
  const parsed = parseActionItem(item);
  // Extract detail from the raw item if it has a "detail" field
  const rawObj = (item && typeof item === "object") ? item as Record<string, unknown> : {};
  const detail = String(rawObj.detail || parsed.detail || "");
  const headline = parsed.action
    .replace(/^(Start |Stop |Keep |Consider )/i, "")
    .replace(/\s+right\s+now/i, "");
  const capitalized = headline.charAt(0).toUpperCase() + headline.slice(1);
  const subtext = String(rawObj.data_point || parsed.detail || "");

  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        cursor: "pointer",
        borderLeft: open ? `3px solid ${C.gold}` : `3px solid transparent`,
        paddingLeft: open ? 11 : 14,
        transition: "all 0.15s",
      }}
    >
      <div style={{ padding: "8px 0" }}>
        <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.primary, lineHeight: 1.35 }}>
          {capitalized}
        </div>
        {subtext && !open && (
          <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, lineHeight: 1.3, marginTop: 2 }}>
            {subtext.length > 65 ? subtext.slice(0, 63) + "…" : subtext}
          </div>
        )}
      </div>
      <AnimatePresence>
        {open && detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.55,
              padding: "4px 0 10px", borderTop: `1px solid ${C.white08}`, marginTop: 2,
            }}>
              {detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionsSections({ stop, start, keep }: { stop: unknown[]; start: unknown[]; keep: unknown[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "STOP", items: stop, color: C.red },
        { label: "START", items: start, color: C.green },
        { label: "KEEP", items: keep, color: C.gold },
      ].map(({ label, items, color }) => (
        <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "6px 14px", borderBottom: `1px solid ${C.border}`, background: `${color}10` }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color }}>{label}</span>
          </div>
          <div style={{ padding: "0 14px" }}>
            {items.length > 0 ? items.slice(0, 3).map((rawItem, j) => (
              <div key={j} style={{ borderBottom: j < Math.min(items.length, 3) - 1 ? `1px solid ${C.white08}` : "none" }}>
                <ActionItem item={rawItem} color={color} />
              </div>
            )) : <div style={{ padding: "10px 0", fontFamily: SANS, fontSize: 13, color: C.dim }}>—</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FRANCHISE INTEL — Two-tab layout matching Shadynasty
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
  const { data: coaches } = useQuery({
    queryKey: ["coaches-corner", leagueId, owner],
    queryFn: () => getCoachesCorner(leagueId, owner, ownerId),
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

  // Parse nested response structures safely
  const i = intel as Record<string, unknown> | undefined;
  const windowData = i?.window as Record<string, unknown> | undefined;
  const rosterData = i?.roster_strength as Record<string, unknown> | undefined;
  const positions = rosterData?.positions as Record<string, Record<string, unknown>> | undefined;
  const moveable = i?.moveable_assets as Array<Record<string, unknown>> | undefined;

  // ai_report can be a string (double-encoded JSON) or a dict — parse it safely
  const aiReportRaw = i?.ai_report;
  const aiReport: Record<string, unknown> | null = (() => {
    if (!aiReportRaw) return null;
    if (typeof aiReportRaw === "object" && !Array.isArray(aiReportRaw)) return aiReportRaw as Record<string, unknown>;
    if (typeof aiReportRaw === "string") {
      try {
        const parsed = JSON.parse(aiReportRaw);
        // Could be double-nested — check if parsed has ai_report inside it
        if (parsed?.ai_report && typeof parsed.ai_report === "object") return parsed.ai_report;
        if (typeof parsed === "object") return parsed;
      } catch { /* not JSON, ignore */ }
    }
    return null;
  })();

  const cc = coaches as Record<string, unknown> | undefined;
  const gm = gmVerdict as Record<string, unknown> | undefined;
  const act = actions as Record<string, unknown> | undefined;

  // GM Verdict — gm-verdict endpoint returns {verdict: "markdown string"}
  // ai_report may also have verdict. Try gm endpoint first (cleanest).
  const gmText = safeText(gm?.verdict) || safeText(aiReport?.verdict) || "";

  // Actions — actions endpoint returns {stop: string[], start: string[], keep: string[]}
  // ai_report may also have structured actions. Merge both sources.
  const actionsData = {
    stop: (act?.stop || aiReport?.stop || []) as unknown[],
    start: (act?.start || aiReport?.start || []) as unknown[],
    keep: (act?.keep || aiReport?.keep || []) as unknown[],
  };

  if (!owner) return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 14, color: C.dim }}>Select an owner to view franchise intel.</div>
  );
  if (isLoading) return (
    <div style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <SkeletonBlock /><SkeletonBlock /><SkeletonBlock />
    </div>
  );

  return (
    <div style={{ padding: "12px 16px" }}>
      <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {/* ═══ TAB BAR ═══ */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.borderLt}`, marginBottom: 16 }}>
        {(["report", "coaches"] as const).map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: "10px 22px", fontFamily: SANS, fontSize: 14, fontWeight: 500,
            color: tab === t ? C.gold : C.dim, cursor: "pointer",
            borderBottom: tab === t ? `3px solid ${C.gold}` : "3px solid transparent",
            boxShadow: tab === t ? `0 3px 12px ${C.gold}40` : "none", transition: "all 0.2s",
          }}>{t === "report" ? "Franchise Report" : "Coaches Corner"}</div>
        ))}
      </div>

      {tab === "report" ? (
        /* ═══════════════════════════════════════════════════════════════
           FRANCHISE REPORT TAB
           ═══════════════════════════════════════════════════════════════ */
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* GM Verdict — collapsible gold pill */}
          <GmVerdictCard gmText={gmText} />

          {/* WINDOW + ROSTER STRENGTH — tight side by side, no SectionCard wrapper */}
          <style>{`.fi-2col { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }`}</style>
          <div className="fi-2col">
            {/* Competitive Window */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.gold }}>WINDOW</span>
              </div>
              <div style={{ padding: "6px 8px" }}>
                {windowData ? (
                  <>
                    <div style={{ fontFamily: DISPLAY, fontSize: 15, color: C.primary, marginBottom: 4 }}>{String(windowData.window || "—")}</div>
                    {[
                      { label: "Win-now", val: windowData.win_now_rank, color: C.green },
                      { label: "Dynasty", val: windowData.dynasty_rank, color: "#6bb8e0" },
                    ].filter(r => r.val).map((r, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{r.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: r.color }}>#{String(r.val)}</span>
                      </div>
                    ))}
                    {windowData.window_mismatch && (
                      <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 8, color: C.orange }}>
                        ⚠ {String(windowData.mismatch_type || "Mismatch").replace(/_/g, " ")}
                      </div>
                    )}
                  </>
                ) : <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>—</span>}
              </div>
            </div>

            {/* Roster Strength — 2x2 grades */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.gold }}>ROSTER</span>
              </div>
              <div style={{ padding: "6px 8px" }}>
                {positions ? (
                  <>
                    <style>{`.fi-pos-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 3px !important; }`}</style>
                    <div className="fi-pos-grid" style={{ marginBottom: 4 }}>
                      {Object.entries(positions).map(([pos, data]) => {
                        const grade = String(data.positional_grade || "—");
                        const gc = grade === "ELITE" ? C.green : grade === "STRONG" ? "#6bb8e0" : grade === "AVERAGE" ? C.gold : grade === "WEAK" ? C.orange : C.red;
                        return (
                          <div key={pos} style={{
                            display: "flex", alignItems: "center", gap: 3, padding: "2px 4px",
                            borderRadius: 3, background: `${gc}08`, border: `1px solid ${gc}20`,
                          }}>
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: posColor(pos) }}>{pos}</span>
                            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: gc }}>{grade}</span>
                          </div>
                        );
                      })}
                    </div>
                    {(rosterData?.positional_needs as string[] || []).length > 0 && (
                      <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 8, color: C.red, fontWeight: 700 }}>
                        NEEDS: {(rosterData?.positional_needs as string[]).join(", ")}
                      </div>
                    )}
                  </>
                ) : <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>—</span>}
              </div>
            </div>
          </div>

          {/* STOP / START / KEEP — tappable, expandable */}
          {(actionsData.stop.length > 0 || actionsData.start.length > 0 || actionsData.keep.length > 0) && (
            <ActionsSections stop={actionsData.stop} start={actionsData.start} keep={actionsData.keep} />
          )}

          {/* MOVEABLE ASSETS */}
          {moveable && moveable.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.gold }}>Moveable assets</span>
              </div>
              <div style={{ padding: 14 }}>
                {moveable.slice(0, 10).map((a, j) => {
                  const status = String(a.status || "AVAILABLE");
                  const isShopNow = status === "SHOP_NOW";
                  const isSellHigh = status === "SELL_HIGH";
                  const pillColor = isShopNow ? C.orange : isSellHigh ? C.orange : C.secondary;
                  const pillBg = isShopNow ? `${C.orange}15` : isSellHigh ? `${C.orange}15` : C.elevated;
                  const pillBorder = isShopNow ? `1px solid ${C.orange}30` : isSellHigh ? `1px solid ${C.orange}30` : `1px solid ${C.borderLt}`;
                  const pillLabel = isShopNow ? "shop now" : isSellHigh ? "sell high" : "available";
                  const rankLabel = posRankLabel(a);
                  return (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: j < moveable.slice(0, 10).length - 1 ? `1px solid ${C.white08}` : "none" }}>
                      <PosBadge pos={String(a.position || "")} />
                      <PlayerName name={String(a.name || a.player || "—")} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: C.primary, flex: 1 }} />
                      {rankLabel && !rankLabel.endsWith("depth") && (
                        <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.secondary, background: C.elevated, padding: "2px 7px", borderRadius: 10, border: `1px solid ${C.borderLt}`, flexShrink: 0 }}>{rankLabel}</span>
                      )}
                      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: pillColor, padding: "2px 9px", borderRadius: 10, background: pillBg, border: pillBorder, flexShrink: 0 }}>{pillLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           COACHES CORNER TAB — Full GM Dashboard (7 sections)
           ═══════════════════════════════════════════════════════════════ */
        <CoachesCorner leagueId={leagueId} owner={owner} ownerId={ownerId} />
      )}
    </div>
  );
}
