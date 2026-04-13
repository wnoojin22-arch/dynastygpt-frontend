"use client";
/**
 * MANAGER CARD COMPACT — premium shareable card on the dashboard.
 * Tap → opens ManagerCardModal. Long press → direct share.
 */
import { useRef, useCallback } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import { Share2 } from "lucide-react";

const C = {
  bg: "#0c1019", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.15)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": "#7dd3a0", "Sharp": "#6bb8e0", "Solid": C.gold,
  "Average": C.primary, "Needs Work": "#e09c6b", "Taco": "#e47272",
};

interface Props {
  myScore: DynastyScoreResponse;
  leagueName: string;
  owner: string;
  leagueRank: number | null;
  globalRank: number | null;
  topPct: number | null;
  bullets: { type: string; text: string }[];
  onTap: () => void;
  onLongPress: () => void;
}

export default function ManagerCardMobile({
  myScore, leagueName, owner, leagueRank, globalRank, topPct, bullets, onTap, onLongPress,
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const tierColor = TIER_COLORS[myScore.tier.label] || C.dim;

  const onTouchStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onClick = useCallback(() => {
    if (!didLongPress.current) onTap();
  }, [onTap]);

  return (
    <div
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        margin: "0 12px", borderRadius: 14, overflow: "hidden", cursor: "pointer",
        background: `linear-gradient(135deg, rgba(212,165,50,0.10) 0%, rgba(212,165,50,0.05) 50%, rgba(212,165,50,0.08) 100%)`,
        border: `1.5px solid ${C.gold}40`,
        boxShadow: `0 0 20px rgba(212,165,50,0.15), 0 0 60px rgba(212,165,50,0.06), inset 0 0 30px rgba(212,165,50,0.03)`,
        position: "relative",
        padding: "8px 14px 6px",
      }}
    >
      {/* Gold glow — top-right and bottom-left for depth */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 140, height: 140,
        background: "radial-gradient(circle, rgba(212,165,50,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -30, left: -30, width: 100, height: 100,
        background: "radial-gradient(circle, rgba(212,165,50,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Top row: label + share hint */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{
          fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
          color: C.bg, textTransform: "uppercase",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`,
          padding: "3px 10px", borderRadius: 4,
        }}>
          DynastyGPT Manager Card
        </span>
        <Share2 size={11} style={{ color: C.dim, opacity: 0.35 }} />
      </div>

      {/* Owner info + score circle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: SANS, fontSize: 22, fontWeight: 800,
            color: C.primary, lineHeight: 1.1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{owner}</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginTop: 3 }}>{leagueName}</div>
        </div>

        {/* Score circle */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 12 }}>
          <div style={{
            width: 50, height: 50, borderRadius: "50%",
            border: `2.5px solid ${C.gold}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
          </div>
          <span style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
            padding: "2px 8px", borderRadius: 4,
            color: tierColor, background: `${tierColor}15`,
            border: `1px solid ${tierColor}30`, textTransform: "uppercase",
          }}>{myScore.tier.label}</span>
        </div>
      </div>

      {/* Three stat boxes */}
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {[
          { label: "LEAGUE", value: leagueRank ? `#${leagueRank}` : "—", accent: true },
          { label: "GLOBAL", value: globalRank ? `#${globalRank.toLocaleString()}` : "—", accent: true },
          { label: "TOP", value: topPct != null ? `${topPct}%` : "—", accent: false },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, textAlign: "center", padding: "4px 4px",
            borderRadius: 8, background: "rgba(212,165,50,0.04)",
            border: `1px solid rgba(212,165,50,0.15)`,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.12em",
              color: C.dim, textTransform: "uppercase", marginBottom: 2,
            }}>{s.label}</div>
            <div style={{
              fontFamily: MONO, fontSize: 14, fontWeight: 800,
              color: s.accent ? C.gold : C.primary,
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* One-line insight */}
      {bullets.length > 0 && (
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.secondary, lineHeight: 1.4, marginBottom: 4 }}>
          {bullets.slice(0, 2).map((b, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span style={{ color: b.type === "strength" || b.type === "highlight" ? C.green : b.type === "weakness" || b.type === "warning" ? C.red : C.gold }}>
                {b.type === "strength" || b.type === "highlight" ? "▲" : b.type === "weakness" || b.type === "warning" ? "▼" : "●"}
              </span>{" "}{b.text}
            </span>
          ))}
        </div>
      )}

      {/* Hint */}
      <div style={{
        textAlign: "center", fontFamily: MONO, fontSize: 10, fontWeight: 700,
        color: C.gold, letterSpacing: "0.12em", marginTop: 4, paddingTop: 6,
        borderTop: `1px solid ${C.gold}20`,
        animation: "pulse-gold 2.5s ease-in-out infinite",
      }}>
        TAP TO VIEW FULL CARD
      </div>
    </div>
  );
}
