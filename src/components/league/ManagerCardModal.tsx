"use client";
/**
 * MANAGER CARD MODAL — full-screen expanded card with score breakdown,
 * career stats, scouting report, and share functionality.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import type { Championships, OwnerRecord } from "@/lib/types";
import { X } from "lucide-react";

const C = {
  bg: "#0c1019", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
  purple: "#b39ddb", pink: "#f48fb1", cyan: "#80deea",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": "#7dd3a0", "Sharp": "#6bb8e0", "Solid": C.gold,
  "Average": C.primary, "Needs Work": "#e09c6b", "Taco": "#e47272",
};

const COMPONENT_META: Record<string, { label: string; color: string }> = {
  trade_win_rate: { label: "Trade Skill", color: C.gold },
  value_extraction: { label: "Value Extraction", color: C.blue },
  roster_construction: { label: "Roster Build", color: C.purple },
  draft_capital: { label: "Draft Capital", color: C.red },
  behavioral_intelligence: { label: "Consistency", color: C.cyan },
  activity: { label: "Activity", color: C.pink },
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
  const tierColor = TIER_COLORS[myScore.tier.label] || C.dim;

  // Prevent body scroll when modal is open
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
        backgroundColor: "#06080d",
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], "dynastygpt-manager-card.png", { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ files: [file], title: `${owner} — DynastyGPT Manager Card` });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }
    } catch { /* user cancelled */ }
    setSharing(false);
  }, [sharing, owner]);

  // Build badge pills
  const champCount = champs?.championships || 0;
  const badgePills: { text: string; bg: string; fg: string }[] = [];
  if (champCount > 0) badgePills.push({ text: `${champCount}x CHAMP`, bg: `${C.green}18`, fg: C.green });
  if (leagueRank && leagueRank <= 2) badgePills.push({ text: "TOP DOG", bg: `${C.gold}18`, fg: C.gold });
  for (const b of badges.slice(0, 2)) {
    badgePills.push({ text: b.toUpperCase(), bg: `${C.gold}18`, fg: C.gold });
  }

  // Score breakdown sorted by percentage
  const components = Object.entries(myScore.components)
    .map(([key, comp]) => ({
      key,
      label: COMPONENT_META[key]?.label || key,
      color: COMPONENT_META[key]?.color || C.dim,
      score: comp.score,
      max: comp.max,
      pct: comp.max > 0 ? (comp.score / comp.max) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Scouting pills
  const strengths = components.filter(c => c.pct >= 65).slice(0, 3);
  const weaknesses = components.filter(c => c.pct < 40).slice(-3).reverse();

  // Career stats
  const totalWins = record?.all_time_wins || 0;
  const totalLosses = record?.all_time_losses || 0;
  const playoffApp = champs?.playoff_appearances || 0;
  const seasonsPlayed = record?.seasons_played || 0;
  const winPct = record?.win_pct != null ? `.${Math.round(record.win_pct * 1000).toString().padStart(3, "0")}` : "—";

  // Gold divider helper
  const Divider = () => (
    <div style={{
      height: 1, margin: "14px 0",
      background: "linear-gradient(90deg, transparent 0%, rgba(212,165,50,0.25) 30%, rgba(212,165,50,0.25) 70%, transparent 100%)",
    }} />
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column", alignItems: "center",
        overflowY: "auto", padding: "40px 16px 32px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* ═══ SHAREABLE CARD (captured by html2canvas) ═══ */}
        <div
          ref={captureRef}
          style={{
            borderRadius: 18, overflow: "hidden",
            background: "linear-gradient(170deg, #0d1117 0%, #0c1019 50%, #0e1320 100%)",
            border: `2px solid ${C.goldBorder}`,
            padding: "16px 18px 14px",
          }}
        >
          {/* Top: label + url */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase" }}>
              DynastyGPT
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 600, color: `${C.gold}60` }}>
              dynastygpt.com
            </span>
          </div>

          {/* Owner + score circle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: SANS, fontSize: 28, fontWeight: 800,
                color: C.primary, lineHeight: 1.05,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{owner}</div>
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim, marginTop: 3 }}>{leagueName}</div>

              {/* Badge pills */}
              {badgePills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {badgePills.map((bp, i) => (
                    <span key={i} style={{
                      fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
                      padding: "3px 8px", borderRadius: 4,
                      color: bp.fg, background: bp.bg, border: `1px solid ${bp.fg}30`,
                    }}>{bp.text}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Score circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginLeft: 12 }}>
              <div style={{
                width: 76, height: 76, borderRadius: "50%",
                border: `3px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                padding: "3px 10px", borderRadius: 5,
                color: tierColor, background: `${tierColor}15`,
                border: `1px solid ${tierColor}30`, textTransform: "uppercase",
              }}>{myScore.tier.label}</span>
            </div>
          </div>

          <Divider />

          {/* Rankings row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
            {[
              { label: "LEAGUE", value: leagueRank ? `#${leagueRank}` : "—" },
              { label: "GLOBAL", value: globalRank ? `#${globalRank.toLocaleString()}` : "—" },
              { label: "TOP", value: topPct != null ? `${topPct}%` : "—" },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1, textAlign: "center", padding: "6px 4px",
                borderRadius: 8, background: "rgba(212,165,50,0.04)",
                border: `1px solid rgba(212,165,50,0.15)`,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.gold }}>{s.value}</div>
              </div>
            ))}
          </div>

          <Divider />

          {/* SCORE BREAKDOWN */}
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase" }}>
              Score Breakdown
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {components.map((comp) => (
                <div key={comp.key} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <span style={{ fontFamily: SANS, fontSize: 10, color: C.dim, width: 90, flexShrink: 0 }}>{comp.label}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.elevated, overflow: "hidden", margin: "0 8px" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${Math.max(comp.pct, 3)}%`,
                      background: comp.color,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: comp.color, width: 32, textAlign: "right" }}>
                    {comp.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* CAREER STATS */}
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase" }}>
              Career Stats
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
              {[
                { label: "RECORD", value: `${totalWins}-${totalLosses}`, color: C.primary },
                { label: "PLAYOFFS", value: `${playoffApp}/${seasonsPlayed}`, color: C.primary },
                { label: "TITLES", value: String(champCount), color: champCount > 0 ? C.gold : C.primary },
                { label: "WIN%", value: winPct, color: C.primary },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", color: C.dim, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* SCOUTING REPORT */}
          <div>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase" }}>
              Scouting Report
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
              {strengths.map((s) => (
                <span key={s.key} style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 4,
                  color: C.green, background: `${C.green}12`, border: `1px solid ${C.green}30`,
                }}>{s.label} {Math.round(s.pct)}%</span>
              ))}
              {weaknesses.map((w) => (
                <span key={w.key} style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 4,
                  color: C.red, background: `${C.red}12`, border: `1px solid ${C.red}30`,
                }}>{w.label} {Math.round(w.pct)}%</span>
              ))}
              {badges.slice(0, 3).map((b, i) => (
                <span key={i} style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 4,
                  color: C.gold, background: `${C.gold}12`, border: `1px solid ${C.gold}30`,
                }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Branding footer */}
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: `${C.dim}50`, letterSpacing: "0.10em" }}>
              powered by dynastygpt.com
            </span>
          </div>
        </div>

        {/* ═══ ACTION BUTTONS (outside capture area) ═══ */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              flex: 1, padding: "14px 0", borderRadius: 10,
              fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: "0.10em",
              color: "#06080d",
              background: sharing ? C.dim : "linear-gradient(135deg, #8b6914, #d4a532)",
              border: "none", cursor: sharing ? "wait" : "pointer",
            }}
          >
            {sharing ? "CAPTURING..." : "SHARE CARD"}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 50, height: 50, borderRadius: 10, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: `1.5px solid ${C.gold}40`, cursor: "pointer",
            }}
          >
            <X size={18} style={{ color: C.gold }} />
          </button>
        </div>
      </div>
    </div>
  );
}
