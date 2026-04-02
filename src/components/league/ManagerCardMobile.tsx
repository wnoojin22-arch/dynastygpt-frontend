"use client";
/**
 * MANAGER CARD — premium mobile card.
 * Layout: Hero bar (name + score + tags) → Big owner stats → Color-coded scoring pills.
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
  purple: "#b39ddb", pink: "#f48fb1", cyan: "#80deea",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": C.green, "Sharp": C.blue, "Solid": C.gold,
  "Average": C.primary, "Needs Work": C.orange, "Taco": C.red,
};

const COMP_META: Record<string, { label: string; color: string }> = {
  trade_win_rate:           { label: "TRADES",   color: C.gold },
  value_extraction:         { label: "VALUE",    color: C.blue },
  roster_construction:      { label: "ROSTER",   color: C.purple },
  draft_capital:            { label: "PICKS",    color: C.red },
  behavioral_intelligence:  { label: "IQ",       color: C.cyan },
  activity:                 { label: "ACTIVITY", color: C.pink },
};

interface Props {
  myScore: DynastyScoreResponse;
  leagueName: string;
  owner: string;
  leagueRank: number | null;
  globalRank: number | null;
  topPct: number | null;
  bullets: { type: string; text: string }[];
  record?: any;
  champs?: any;
  badges?: string[];
  onTap: () => void;
  onLongPress: () => void;
}

export default function ManagerCardMobile({
  myScore, leagueName, owner, leagueRank, globalRank, topPct,
  bullets, record, champs, badges, onTap, onLongPress,
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

  /* ── Derived data ── */
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
  const tags: { text: string; fg: string }[] = [];
  if (champCount > 0) tags.push({ text: `${champCount}x CHAMP`, fg: C.green });
  if (leagueRank) tags.push({ text: `#${leagueRank} LEAGUE`, fg: C.gold });
  if (globalRank) tags.push({ text: `#${globalRank.toLocaleString()} GLOBAL`, fg: C.blue });
  if (topPct != null) tags.push({ text: `TOP ${topPct}%`, fg: C.secondary });
  for (const b of (badges || []).slice(0, 2)) tags.push({ text: b.toUpperCase(), fg: C.gold });

  // Scoring pills
  const comps = Object.entries(myScore.components).map(([k, v]) => ({
    key: k,
    label: COMP_META[k]?.label || k.replace(/_/g, " ").toUpperCase(),
    color: COMP_META[k]?.color || C.dim,
    score: v.score,
    max: v.max,
    pct: v.max > 0 ? (v.score / v.max) * 100 : 0,
  }));

  return (
    <div
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        margin: "0 12px", borderRadius: 14, overflow: "hidden", cursor: "pointer",
        background: C.bg,
        border: `1.5px solid ${C.goldBorder}`,
        boxShadow: "0 0 24px rgba(212,165,50,0.04)",
        position: "relative",
      }}
    >
      {/* Subtle gold glow */}
      <div style={{
        position: "absolute", top: -30, right: -30, width: 100, height: 100,
        background: "radial-gradient(circle, rgba(212,165,50,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ═══ HERO BAR ═══ */}
      <div style={{ padding: "12px 14px 10px" }}>
        {/* Header label */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: C.gold }}>
            DYNASTYGPT MANAGER CARD
          </span>
          <Share2 size={11} style={{ color: C.dim, opacity: 0.35 }} />
        </div>

        {/* Owner + Score */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: SANS, fontSize: 22, fontWeight: 800,
              color: C.primary, lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{owner}</div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginTop: 3 }}>{leagueName}</div>
            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {tags.map((t, i) => (
                  <span key={i} style={{
                    fontFamily: MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.04em",
                    padding: "2px 6px", borderRadius: 4,
                    color: t.fg, background: `${t.fg}12`, border: `1px solid ${t.fg}22`,
                  }}>{t.text}</span>
                ))}
              </div>
            )}
          </div>
          {/* Score + tier */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 12 }}>
            <div style={{
              width: 58, height: 58, borderRadius: "50%",
              border: `2.5px solid ${C.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)",
              boxShadow: "0 0 16px rgba(212,165,50,0.08)",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
              padding: "2px 7px", borderRadius: 4,
              color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}30`,
              textTransform: "uppercase",
            }}>{myScore.tier.label}</span>
          </div>
        </div>
      </div>

      {/* ═══ DIVIDER ═══ */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.goldBorder} 20%, ${C.goldBorder} 80%, transparent)` }} />

      {/* ═══ OWNER STATS ═══ */}
      <div style={{ display: "flex", padding: "10px 14px", gap: 6 }}>
        {[
          { label: "RECORD",   value: `${totalW}-${totalL}`, color: C.primary },
          { label: "PLAYOFFS", value: playoffStr,             color: C.primary },
          { label: "TITLES",   value: String(champCount),     color: champCount > 0 ? C.gold : C.primary },
          { label: "WIN%",     value: winPct,                 color: C.primary },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: MONO, fontSize: 6, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ DIVIDER ═══ */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.goldBorder} 20%, ${C.goldBorder} 80%, transparent)` }} />

      {/* ═══ SCORING BREAKDOWN — color-coded pills ═══ */}
      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {comps.map((c) => (
            <div key={c.key} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 8,
              background: `${c.color}10`, border: `1px solid ${c.color}25`,
            }}>
              {/* Color dot */}
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.04em" }}>{c.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: c.color }}>{c.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={{
        textAlign: "center", fontFamily: MONO, fontSize: 7,
        color: C.gold, opacity: 0.3, letterSpacing: "0.10em",
        paddingBottom: 8,
      }}>
        TAP TO VIEW FULL CARD
      </div>
    </div>
  );
}
