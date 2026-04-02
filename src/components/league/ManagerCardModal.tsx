"use client";
/**
 * MANAGER CARD MODAL — the screenshot-worthy shareable card.
 * Clean boxes, bold numbers, zero bar charts. Built to brag.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import type { Championships, OwnerRecord } from "@/lib/types";
import { X, Download } from "lucide-react";

const C = {
  bg: "#0c1019", elevated: "#171b28", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDark: "#8b6914", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0",
  purple: "#b39ddb", pink: "#f48fb1", cyan: "#80deea", orange: "#e09c6b",
};
const MONO = "'JetBrains Mono','SF Mono',monospace";
const SANS = "-apple-system,'SF Pro Display','Inter',system-ui,sans-serif";
const TIER_COLORS: Record<string, string> = {
  "Elite Manager": C.green, "Sharp": C.blue, "Solid": C.gold,
  "Average": C.primary, "Needs Work": C.orange, "Taco": C.red,
};
const COMP: Record<string, { label: string; color: string }> = {
  trade_win_rate:          { label: "TRADES",   color: C.gold },
  value_extraction:        { label: "VALUE",    color: C.blue },
  roster_construction:     { label: "ROSTER",   color: C.purple },
  draft_capital:           { label: "PICKS",    color: C.red },
  behavioral_intelligence: { label: "IQ",       color: C.cyan },
  activity:                { label: "ACTIVITY", color: C.pink },
};

interface Props {
  myScore: DynastyScoreResponse;
  leagueName: string;
  owner: string;
  leagueRank: number | null;
  globalRank: number | null;
  topPct: number | null;
  bullets: { type: string; text: string }[];
  record: OwnerRecord | null;
  champs: Championships | null;
  badges: string[];
  onClose: () => void;
}

export default function ManagerCardModal({
  myScore, leagueName, owner, leagueRank, globalRank, topPct,
  bullets, record, champs, badges, onClose,
}: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const tierColor = TIER_COLORS[myScore.tier.label] || C.dim;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleShare = useCallback(async () => {
    if (!captureRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, { backgroundColor: "#06080d", scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) { setSharing(false); return; }
      const file = new File([blob], "dynastygpt-card.png", { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${owner} — DynastyGPT` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "dynastygpt-card.png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }
      setShared(true);
    } catch { /* cancelled */ }
    setSharing(false);
    setTimeout(() => setShared(false), 2000);
  }, [sharing, owner]);

  const champCount = champs?.championships || 0;
  const totalW = record?.all_time_wins || 0;
  const totalL = record?.all_time_losses || 0;
  const winPct = record?.win_pct != null
    ? `.${Math.round(record.win_pct * 1000).toString().padStart(3, "0")}`
    : "—";
  const playoffStr = champs
    ? `${champs.playoff_appearances}/${record?.seasons_played || "—"}`
    : "—";

  // Hero tags
  const pills: { text: string; fg: string }[] = [];
  if (champCount > 0) pills.push({ text: `${champCount}x CHAMP`, fg: C.green });
  if (leagueRank && leagueRank <= 2) pills.push({ text: "TOP DOG", fg: C.gold });
  for (const b of badges.slice(0, 2)) pills.push({ text: b.toUpperCase(), fg: C.gold });

  // Scoring components
  const comps = Object.entries(myScore.components).map(([k, v]) => ({
    key: k,
    label: COMP[k]?.label || k.replace(/_/g, " ").toUpperCase(),
    color: COMP[k]?.color || C.dim,
    score: v.score,
    max: v.max,
  }));

  const Div = () => (
    <div style={{ height: 1, margin: "0", background: `linear-gradient(90deg, transparent, ${C.goldBorder} 20%, ${C.goldBorder} 80%, transparent)` }} />
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "12px 14px 16px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 8 }}>

        {/* ═══ THE CARD ═══ */}
        <div ref={captureRef} style={{
          borderRadius: 14, overflow: "hidden", position: "relative",
          background: "linear-gradient(170deg, #0d1117 0%, #0c1019 50%, #0e1320 100%)",
          border: `1.5px solid ${C.goldBorder}`,
        }}>
          {/* Glow */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "radial-gradient(circle, rgba(212,165,50,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* ── HERO ── */}
          <div style={{ padding: "14px 16px 12px" }}>
            {/* Header + close X */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: C.gold }}>DYNASTYGPT MANAGER CARD</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 7, color: `${C.gold}50` }}>dynastygpt.com</span>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
              </div>
            </div>

            {/* Owner + Score */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 800, color: C.primary, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner}</div>
                <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 3 }}>{leagueName}</div>
                {pills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {pills.map((p, i) => (
                      <span key={i} style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, padding: "2px 6px", borderRadius: 3, color: p.fg, background: `${p.fg}12`, border: `1px solid ${p.fg}22` }}>{p.text}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  border: `2.5px solid ${C.gold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)",
                  boxShadow: "0 0 20px rgba(212,165,50,0.10)",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 4, color: tierColor, background: `${tierColor}12`, border: `1px solid ${tierColor}25`, textTransform: "uppercase" }}>{myScore.tier.label}</span>
              </div>
            </div>
          </div>

          <Div />

          {/* ── OWNER STATS — big boxes ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, padding: "12px 16px" }}>
            {[
              { label: "RECORD",   value: `${totalW}-${totalL}`, color: C.primary },
              { label: "PLAYOFFS", value: playoffStr,             color: C.primary },
              { label: "TITLES",   value: String(champCount),     color: champCount > 0 ? C.gold : C.primary },
              { label: "WIN%",     value: winPct,                 color: C.primary },
            ].map((s) => (
              <div key={s.label} style={{
                textAlign: "center", padding: "8px 4px", borderRadius: 8,
                background: C.elevated, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: MONO, fontSize: 6, fontWeight: 700, letterSpacing: "0.08em", color: C.dim, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Div />

          {/* ── SCORING — color-coded boxes with # value ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "12px 16px" }}>
            {comps.map((c) => (
              <div key={c.key} style={{
                textAlign: "center", padding: "10px 4px 8px", borderRadius: 10,
                background: `${c.color}10`,
                border: `1px solid ${c.color}25`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.score}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: `${c.color}90`, marginTop: 5 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <Div />

          {/* ── SCOUTING TAGS — 3 across grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "10px 16px 12px" }}>
            {bullets.slice(0, 6).map((b, i) => {
              const isGood = b.type === "strength" || b.type === "highlight";
              const fg = isGood ? C.green : b.type === "weakness" || b.type === "warning" ? C.red : C.gold;
              // Truncate to fit 3-across
              const short = b.text.length > 18 ? b.text.slice(0, 16) + "…" : b.text;
              return (
                <div key={i} style={{
                  textAlign: "center", padding: "3px 2px", borderRadius: 4,
                  background: `${fg}08`, border: `1px solid ${fg}15`,
                  overflow: "hidden",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: fg, lineHeight: 1.2 }}>
                    {isGood ? "▲" : "▼"} {short}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", paddingBottom: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: `${C.dim}35`, letterSpacing: "0.12em" }}>POWERED BY DYNASTYGPT.COM</span>
          </div>
        </div>

        {/* ── BUTTONS ── */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} disabled={sharing} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
            color: shared ? C.green : "#06080d",
            background: shared ? `${C.green}12` : sharing ? C.dim : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
            border: shared ? `1px solid ${C.green}30` : "none", cursor: sharing ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {shared ? "SAVED" : sharing ? "..." : <><Download size={13} /> SAVE & SHARE</>}
          </button>
          <button onClick={onClose} style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: `1.5px solid ${C.gold}25`, cursor: "pointer",
          }}>
            <X size={15} style={{ color: C.gold }} />
          </button>
        </div>
      </div>
    </div>
  );
}
