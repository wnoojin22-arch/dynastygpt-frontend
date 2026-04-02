"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import type { DynastyScoreResponse } from "@/lib/api";
import type { Championships, OwnerRecord } from "@/lib/types";
import { X, Download } from "lucide-react";

const C = {
  bg: "#0c1019", elevated: "#171b28", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDark: "#8b6914", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0",
  purple: "#b39ddb", pink: "#f48fb1", cyan: "#80deea",
};
const MONO = "'JetBrains Mono','SF Mono',monospace";
const SANS = "-apple-system,'SF Pro Display','Inter',system-ui,sans-serif";
const TIER_COLORS: Record<string, string> = {
  "Elite Manager": C.green, "Sharp": C.blue, "Solid": C.gold,
  "Average": C.primary, "Needs Work": "#e09c6b", "Taco": C.red,
};
const COMP: Record<string, { label: string; color: string }> = {
  trade_win_rate: { label: "Trades", color: C.gold },
  value_extraction: { label: "Value", color: C.blue },
  roster_construction: { label: "Roster", color: C.purple },
  draft_capital: { label: "Picks", color: C.red },
  behavioral_intelligence: { label: "IQ", color: C.cyan },
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
  const pills: { text: string; fg: string }[] = [];
  if (champCount > 0) pills.push({ text: `${champCount}x CHAMP`, fg: C.green });
  if (leagueRank && leagueRank <= 2) pills.push({ text: "TOP DOG", fg: C.gold });
  for (const b of badges.slice(0, 2)) pills.push({ text: b.toUpperCase(), fg: C.gold });

  const comps = Object.entries(myScore.components).map(([k, v]) => ({
    key: k, label: COMP[k]?.label || k.replace(/_/g, " "), color: COMP[k]?.color || C.dim,
    score: v.score, max: v.max, pct: v.max > 0 ? (v.score / v.max) * 100 : 0,
  }));

  const sorted = [...comps].sort((a, b) => b.pct - a.pct);
  const scoutPills = [
    ...sorted.slice(0, 2).map(s => ({ text: `${s.label} ${Math.round(s.pct)}%`, fg: C.green })),
    ...sorted.slice(-2).reverse().map(w => ({ text: `${w.label} ${Math.round(w.pct)}%`, fg: C.red })),
    ...badges.slice(0, 2).map(b => ({ text: b, fg: C.gold })),
  ];

  const totalW = record?.all_time_wins || 0;
  const totalL = record?.all_time_losses || 0;
  const winPct = record?.win_pct != null ? `.${Math.round(record.win_pct * 1000).toString().padStart(3, "0")}` : "—";

  const Div = () => <div style={{ height: 1, margin: "8px 0", background: "linear-gradient(90deg, transparent, rgba(212,165,50,0.2) 30%, rgba(212,165,50,0.2) 70%, transparent)" }} />;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "12px 14px 16px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 8 }}>

        {/* ═══ CARD ═══ */}
        <div ref={captureRef} style={{
          borderRadius: 14, overflow: "hidden", position: "relative",
          background: "linear-gradient(170deg, #0d1117 0%, #0c1019 50%, #0e1320 100%)",
          border: `1.5px solid ${C.goldBorder}`, padding: "12px 14px 10px",
        }}>
          {/* Glow */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "radial-gradient(circle, rgba(212,165,50,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: C.gold }}>DYNASTYGPT MANAGER CARD</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: `${C.gold}50` }}>dynastygpt.com</span>
          </div>

          {/* Owner + Score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, color: C.primary, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner}</div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 2 }}>{leagueName}</div>
              {pills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                  {pills.map((p, i) => (
                    <span key={i} style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, padding: "1px 5px", borderRadius: 3, color: p.fg, background: `${p.fg}12`, border: `1px solid ${p.fg}20` }}>{p.text}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginLeft: 10 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", border: `2.5px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `radial-gradient(circle, rgba(212,165,50,0.08) 0%, transparent 70%)`,
                boxShadow: `0 0 16px rgba(212,165,50,0.08)`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.primary }}>{myScore.score}</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 800, padding: "1px 6px", borderRadius: 3, color: tierColor, background: `${tierColor}12`, border: `1px solid ${tierColor}22`, textTransform: "uppercase" }}>{myScore.tier.label}</span>
            </div>
          </div>

          <Div />

          {/* Score Breakdown — horizontal bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {comps.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: C.dim, width: 52, flexShrink: 0 }}>{c.label}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: C.elevated, overflow: "hidden", margin: "0 6px" }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(c.pct, 3)}%`, background: c.color }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: c.color, width: 24, textAlign: "right" }}>{c.score}</span>
              </div>
            ))}
          </div>

          <Div />

          {/* Career Stats — single horizontal row */}
          <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", padding: "0 4px" }}>
            {[
              { l: "RECORD", v: `${totalW}-${totalL}`, c: C.primary },
              { l: "PLAYOFFS", v: `${champs?.playoff_appearances || 0}/${record?.seasons_played || 0}`, c: C.primary },
              { l: "TITLES", v: String(champCount), c: champCount > 0 ? C.gold : C.primary },
              { l: "WIN%", v: winPct, c: C.primary },
              { l: "RANK", v: leagueRank ? `#${leagueRank}` : "—", c: C.gold },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: MONO, fontSize: 6, fontWeight: 600, color: C.dim, letterSpacing: "0.06em", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <Div />

          {/* Scouting — pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {scoutPills.map((p, i) => (
              <span key={i} style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 3, color: p.fg, background: `${p.fg}10`, border: `1px solid ${p.fg}18` }}>{p.text}</span>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: `${C.dim}35`, letterSpacing: "0.12em" }}>POWERED BY DYNASTYGPT.COM</span>
          </div>
        </div>

        {/* Buttons */}
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
