"use client";
/**
 * MANAGER CARD MODAL — premium gold collectible brag card.
 * One screen. Screenshotable. No scrolling needed.
 */
import { useRef, useCallback, useState, useEffect } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import type { Championships, OwnerRecord } from "@/lib/types";
import { Download } from "lucide-react";

const MONO = "'JetBrains Mono','SF Mono',monospace";
const SANS = "-apple-system,'SF Pro Display','Inter',system-ui,sans-serif";

const TIER_COLORS: Record<string, string> = {
  "Elite Manager": "#7dd3a0", "Sharp": "#6bb8e0", "Solid": "#d4a532",
  "Average": "#eeeef2", "Needs Work": "#e09c6b", "Taco": "#e47272",
};

const COMP_META: Record<string, { label: string; color: string }> = {
  championship_pedigree: { label: "Championships", color: "#d4a532" },
  roster_construction:   { label: "Roster",        color: "#b39ddb" },
  winning_record:        { label: "Winning",       color: "#7dd3a0" },
  points_dominance:      { label: "Points",        color: "#6bb8e0" },
  trade_acumen:          { label: "Trades",        color: "#d4a532" },
  behavioral_iq:         { label: "Behavioral IQ", color: "#80deea" },
  draft_capital:         { label: "Draft Capital", color: "#e47272" },
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
  const tierColor = TIER_COLORS[myScore.tier.label] || "#9596a5";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", h); };
  }, [onClose]);

  const handleShare = useCallback(async () => {
    if (!captureRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, { backgroundColor: "#1a1505", scale: 2, useCORS: true, logging: false });
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
    } catch { /* cancelled */ }
    setSharing(false);
  }, [sharing, owner]);

  const champCount = champs?.championships || 0;
  const totalW = record?.all_time_wins || 0;
  const totalL = record?.all_time_losses || 0;
  const winPct = (totalW + totalL) > 0 ? (totalW / (totalW + totalL)).toFixed(3).slice(1) : "—";
  const playoffStr = champs ? `${champs.playoff_appearances}/${record?.seasons_played || "—"}` : "—";

  const bars = Object.entries(myScore.components)
    .map(([k, v]) => ({
      key: k,
      label: COMP_META[k]?.label || k.replace(/_/g, " "),
      color: COMP_META[k]?.color || "#9596a5",
      score: v.score, max: v.max,
      pct: v.max > 0 ? (v.score / v.max) * 100 : 0,
    }))
    .sort((a, b) => b.max - a.max);

  const insight = bullets.slice(0, 3).map(b => b.text.replace(/\s*\(\d+%?\)/, "")).join(" · ");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8,
      }}>

        {/* ═══ THE CARD ═══ */}
        <div ref={captureRef} style={{
          borderRadius: 14, overflow: "hidden", position: "relative",
          background: "linear-gradient(150deg, #1a1505 0%, #2a1f0a 30%, #1c1608 60%, #251c08 100%)",
          border: "2px solid #d4a017",
          boxShadow: "0 0 40px rgba(212,165,50,0.12), inset 0 0 60px rgba(212,165,50,0.04)",
        }}>

          {/* Close button */}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
            position: "absolute", top: 8, right: 8, zIndex: 10,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,165,50,0.3)",
            borderRadius: 8, cursor: "pointer", color: "#d4a532",
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, lineHeight: 1,
          }}>✕</button>

          {/* ── TOP: Title centered + branding right ── */}
          <div style={{ padding: "12px 14px 0", textAlign: "center", position: "relative" }}>
            <div style={{
              fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: 3,
              color: "#d4a532",
            }}>
              DYNASTYGPT MANAGER CARD
            </div>
            <div style={{
              position: "absolute", top: 14, right: 14,
              fontFamily: MONO, fontSize: 7, color: "rgba(212,165,50,0.5)",
            }}>
              dynastygpt.com
            </div>
          </div>

          {/* ── OWNER NAME ── */}
          <div style={{ textAlign: "center", padding: "4px 14px 0" }}>
            <div style={{
              fontFamily: SANS, fontSize: 22, fontWeight: 800, color: "#eeeef2",
              lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{owner}</div>
            <div style={{ fontFamily: SANS, fontSize: 10, color: "#9596a5", marginTop: 2 }}>{leagueName}</div>
          </div>

          {/* ── SCORE RING ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 6px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: "3px solid #d4a532",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "radial-gradient(circle, rgba(212,165,50,0.10) 0%, transparent 70%)",
              boxShadow: "0 0 24px rgba(212,165,50,0.15)",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 900, color: "#eeeef2" }}>{myScore.score}</span>
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 800, marginTop: 5,
              padding: "2px 10px", borderRadius: 4,
              color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}30`,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{myScore.tier.label}</span>
          </div>

          {/* ── RANKINGS — 3 big boxes (THE MOST IMPORTANT STAT) ── */}
          <div style={{ display: "flex", gap: 6, padding: "6px 14px 8px" }}>
            {[
              { val: leagueRank ? `#${leagueRank}` : "—", label: "LEAGUE", color: "#d4a532" },
              { val: globalRank ? `#${globalRank.toLocaleString()}` : "—", label: "GLOBAL", color: "#6bb8e0" },
              { val: topPct != null ? `${topPct}%` : "—", label: "TOP", color: "#7dd3a0" },
            ].map((r) => (
              <div key={r.label} style={{
                flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: 8,
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,165,50,0.15)",
              }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: r.color, lineHeight: 1 }}>{r.val}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: "#9596a5", marginTop: 3 }}>{r.label}</div>
              </div>
            ))}
          </div>

          {/* Gold divider */}
          <div style={{ height: 1, margin: "0 14px", background: "linear-gradient(90deg, transparent, rgba(212,165,50,0.3), transparent)" }} />

          {/* ── TITLES — full width hero pill, gold glow, centered ── */}
          <div style={{
            margin: "8px 14px", textAlign: "center", padding: "10px 0", borderRadius: 8,
            background: "linear-gradient(135deg, rgba(139,105,20,0.2), rgba(212,165,50,0.12))",
            border: "1.5px solid rgba(212,165,50,0.3)",
            boxShadow: "0 0 24px rgba(212,165,50,0.10), inset 0 0 30px rgba(212,165,50,0.05)",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "#9596a5", marginBottom: 2 }}>CHAMPIONSHIPS</div>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 900, color: "#d4a532", lineHeight: 1 }}>
              {champCount > 0 ? `${champCount}x CHAMPION` : "0 TITLES"}
            </div>
          </div>

          {/* ── RECORD / PLAYOFFS / WIN% — 3 boxes in one row ── */}
          <div style={{ display: "flex", gap: 6, padding: "0 14px 8px" }}>
            {[
              { val: `${totalW}-${totalL}`, label: "RECORD" },
              { val: playoffStr, label: "PLAYOFFS" },
              { val: winPct, label: "WIN%" },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 6,
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,165,50,0.12)",
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: "#9596a5", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: "#eeeef2", lineHeight: 1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Gold divider */}
          <div style={{ height: 1, margin: "0 14px", background: "linear-gradient(90deg, transparent, rgba(212,165,50,0.3), transparent)" }} />

          {/* ── SCORE BREAKDOWN — horizontal bars ── */}
          <div style={{ padding: "8px 14px 4px" }}>
            {bars.map((b) => (
              <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#9596a5", width: 72, textAlign: "right", flexShrink: 0 }}>
                  {b.label}
                </span>
                <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.4)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.max(2, b.pct)}%`,
                    background: b.color, borderRadius: 3,
                  }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: b.color, width: 24, textAlign: "right", flexShrink: 0 }}>
                  {b.score}
                </span>
              </div>
            ))}
          </div>

          {/* ── INSIGHT — gold, prominent ── */}
          {insight && (
            <div style={{ textAlign: "center", padding: "2px 14px 8px" }}>
              <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: "#d4a532", lineHeight: 1.4 }}>
                {insight}
              </div>
            </div>
          )}

          {/* ── SHARE FOR BRAGGING RIGHTS — inside card, at bottom ── */}
          <div style={{ padding: "4px 14px 10px" }}>
            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} disabled={sharing} style={{
              width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
              background: sharing ? "#9596a5" : "linear-gradient(135deg, #8b6914, #d4a532)",
              fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
              color: "#0c1019", cursor: sharing ? "wait" : "pointer",
              textAlign: "center",
            }}>
              {sharing ? "GENERATING..." : "SHARE FOR BRAGGING RIGHTS ↗"}
            </button>
          </div>

          {/* ── FOOTER watermark ── */}
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(212,165,50,0.3)", letterSpacing: "0.12em" }}>
              POWERED BY DYNASTYGPT.COM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
