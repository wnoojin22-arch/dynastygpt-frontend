"use client";
/**
 * MANAGER CARD MODAL — compact full-screen card optimized for screenshots.
 * Fits on one mobile screen without scrolling. Share downloads PNG or opens native share.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import type { Championships, OwnerRecord } from "@/lib/types";
import { X, Download } from "lucide-react";

const C = {
  bg: "#0c1019", elevated: "#171b28",
  border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDark: "#8b6914",
  goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  purple: "#b39ddb", pink: "#f48fb1", cyan: "#80deea",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": C.green, "Sharp": C.blue, "Solid": C.gold,
  "Average": C.primary, "Needs Work": C.orange, "Taco": C.red,
};

const COMP_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  trade_win_rate:           { label: "Trades",    color: C.gold,   icon: "⚡" },
  value_extraction:         { label: "Value",     color: C.blue,   icon: "💎" },
  roster_construction:      { label: "Roster",    color: C.purple, icon: "🏗" },
  draft_capital:            { label: "Picks",     color: C.red,    icon: "🎯" },
  behavioral_intelligence:  { label: "IQ",        color: C.cyan,   icon: "🧠" },
  activity:                 { label: "Activity",  color: C.pink,   icon: "📊" },
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
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#06080d", scale: 2, useCORS: true,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) { setSharing(false); return; }

      const file = new File([blob], "dynastygpt-manager-card.png", { type: "image/png" });

      // Try native share first (works on mobile HTTPS)
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${owner} — DynastyGPT Manager Card` });
        setShared(true);
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dynastygpt-manager-card.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShared(true);
      }
    } catch { /* user cancelled share */ }
    setSharing(false);
    setTimeout(() => setShared(false), 2000);
  }, [sharing, owner]);

  // Badge pills
  const champCount = champs?.championships || 0;
  const badgePills: { text: string; fg: string }[] = [];
  if (champCount > 0) badgePills.push({ text: `${champCount}x CHAMP`, fg: C.green });
  if (leagueRank && leagueRank <= 2) badgePills.push({ text: "TOP DOG", fg: C.gold });
  for (const b of badges.slice(0, 2)) badgePills.push({ text: b.toUpperCase(), fg: C.gold });

  // Score breakdown — 2x3 grid
  const comps = Object.entries(myScore.components).map(([key, comp]) => ({
    key,
    ...(COMP_LABELS[key] || { label: key.replace(/_/g, " "), color: C.dim, icon: "•" }),
    score: comp.score,
    max: comp.max,
    pct: comp.max > 0 ? Math.round((comp.score / comp.max) * 100) : 0,
  }));

  // Career stats
  const totalW = record?.all_time_wins || 0;
  const totalL = record?.all_time_losses || 0;
  const winPct = record?.win_pct != null ? `.${Math.round(record.win_pct * 1000).toString().padStart(3, "0")}` : "—";

  // Scouting: top 2 strengths + bottom 2 weaknesses
  const sorted = [...comps].sort((a, b) => b.pct - a.pct);
  const scoutPills = [
    ...sorted.slice(0, 2).map(s => ({ text: `${s.label} ${s.pct}%`, fg: C.green })),
    ...sorted.slice(-2).reverse().map(w => ({ text: `${w.label} ${w.pct}%`, fg: C.red })),
    ...badges.slice(0, 2).map(b => ({ text: b, fg: C.gold })),
  ];

  const Div = () => (
    <div style={{
      height: 1, margin: "10px 0",
      background: "linear-gradient(90deg, transparent 0%, rgba(212,165,50,0.2) 30%, rgba(212,165,50,0.2) 70%, transparent 100%)",
    }} />
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "16px 16px 20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10 }}
      >
        {/* ═══ SHAREABLE CARD ═══ */}
        <div
          ref={captureRef}
          style={{
            borderRadius: 16, overflow: "hidden",
            background: "linear-gradient(170deg, #0d1117 0%, #0c1019 50%, #0e1320 100%)",
            border: `2px solid ${C.goldBorder}`,
            padding: "14px 16px 12px",
            position: "relative",
          }}
        >
          {/* Decorative glow */}
          <div style={{
            position: "absolute", top: -40, right: -40, width: 120, height: 120,
            background: "radial-gradient(circle, rgba(212,165,50,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -30, left: -30, width: 80, height: 80,
            background: "radial-gradient(circle, rgba(107,184,224,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase" }}>
              DynastyGPT Manager Card
            </span>
            <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 600, color: `${C.gold}50` }}>dynastygpt.com</span>
          </div>

          {/* Owner + Score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 800, color: C.primary, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner}</div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginTop: 2 }}>{leagueName}</div>
              {badgePills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {badgePills.map((bp, i) => (
                    <span key={i} style={{
                      fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.05em",
                      padding: "2px 6px", borderRadius: 3,
                      color: bp.fg, background: `${bp.fg}15`, border: `1px solid ${bp.fg}25`,
                    }}>{bp.text}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginLeft: 10 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: `2.5px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)`,
                boxShadow: `0 0 20px rgba(212,165,50,0.1)`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.05em",
                padding: "2px 8px", borderRadius: 4,
                color: tierColor, background: `${tierColor}12`, border: `1px solid ${tierColor}25`,
                textTransform: "uppercase",
              }}>{myScore.tier.label}</span>
            </div>
          </div>

          <Div />

          {/* SCORE BREAKDOWN — 2x3 grid of mini cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {comps.map((c) => (
              <div key={c.key} style={{
                textAlign: "center", padding: "6px 4px 5px",
                borderRadius: 8, background: `${c.color}08`,
                border: `1px solid ${c.color}18`,
              }}>
                <div style={{ fontSize: 12, lineHeight: 1, marginBottom: 3 }}>{c.icon}</div>
                <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.score}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: C.dim, marginTop: 2, letterSpacing: "0.04em" }}>{c.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <Div />

          {/* CAREER STATS — compact row */}
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            {[
              { label: "RECORD", value: `${totalW}-${totalL}`, color: C.primary },
              { label: "PLAYOFFS", value: `${champs?.playoff_appearances || 0}/${record?.seasons_played || 0}`, color: C.primary },
              { label: "TITLES", value: String(champCount), color: champCount > 0 ? C.gold : C.primary },
              { label: "WIN%", value: winPct, color: C.primary },
              { label: leagueRank ? "LEAGUE" : "TOP%", value: leagueRank ? `#${leagueRank}` : topPct != null ? `${topPct}%` : "—", color: C.gold },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: MONO, fontSize: 6, fontWeight: 700, color: C.dim, letterSpacing: "0.08em", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Div />

          {/* SCOUTING REPORT — pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {scoutPills.map((p, i) => (
              <span key={i} style={{
                fontFamily: MONO, fontSize: 8, fontWeight: 700,
                padding: "2px 7px", borderRadius: 3,
                color: p.fg, background: `${p.fg}10`, border: `1px solid ${p.fg}20`,
              }}>{p.text}</span>
            ))}
          </div>

          {/* Footer branding */}
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: `${C.dim}40`, letterSpacing: "0.12em" }}>
              POWERED BY DYNASTYGPT.COM
            </span>
          </div>
        </div>

        {/* ═══ BUTTONS (not captured) ═══ */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
              color: shared ? C.green : "#06080d",
              background: shared ? `${C.green}15` : sharing ? C.dim : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
              border: shared ? `1px solid ${C.green}40` : "none",
              cursor: sharing ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {shared ? "✓ SAVED" : sharing ? "CAPTURING..." : <><Download size={14} /> SAVE & SHARE</>}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 46, height: 46, borderRadius: 10, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: `1.5px solid ${C.gold}30`, cursor: "pointer",
            }}
          >
            <X size={16} style={{ color: C.gold }} />
          </button>
        </div>
      </div>
    </div>
  );
}
