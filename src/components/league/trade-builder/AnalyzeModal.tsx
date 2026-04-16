"use client";

/**
 * ANALYZE MODAL — THE screenshot moment.
 *
 * Portal-rendered, 9:16 optimized for Stories/share.
 * Animated grade reveal, circular acceptance gauge,
 * trade card with send/get columns, AI verdict.
 *
 * html2canvas capture → navigator.share() on mobile.
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { C, SANS, MONO, SERIF, DISPLAY, fmt, posColor, gradeColor } from "../tokens";
import type { TradeEvaluation, TradeAsset, GradeResult, AcceptanceResult } from "./types";

// ── Design tokens specific to this modal ─────────────────────────────────

const M = {
  bg: "#080b12",
  card: "#0e1119",
  cardBorder: "rgba(212,165,50,0.15)",
  cardGlow: "rgba(212,165,50,0.06)",
  market: "#6bb8e0",
};

// ── AI Insight dual-section parser + card ────────────────────────────────
function _scrubLanguage(s: string): string {
  let out = s;
  // Neutralize "Overpaying by X% SHA — sending Y to get back Z"
  out = out.replace(
    /Overpaying by\s+(\d+\.?\d*)%\s*SHA\s*[—\-]\s*sending\s+[\d,\.]+\s+to\s+get\s+back\s+[\d,\.]+\.?/gi,
    (_m, pct) => `Sending ${pct}% more than you're receiving.`
  );
  // Neutralize bare "Overpaying" / "Underpaying" verbs
  out = out.replace(/\bOverpaying\b/g, "Sending more");
  out = out.replace(/\bUnderpaying\b/g, "Receiving more");
  // Strip any remaining "X% SHA" → "X%"
  out = out.replace(/(\d+\.?\d*)\s*%\s*SHA\b/gi, "$1%");
  // Strip standalone SHA → "value"
  out = out.replace(/\bSHA\b/g, "value");
  return out;
}

function parseInsight(text: string | null | undefined): { you: string; them: string } {
  if (!text) return { you: "", them: "" };
  const clean = _scrubLanguage(text.replace(/\*+/g, "").trim());
  const yMatch = clean.match(/YOUR SITUATION\s*:?\s*([\s\S]*?)(?=THEIR SITUATION\s*:|$)/i);
  const tMatch = clean.match(/THEIR SITUATION\s*:?\s*([\s\S]*)$/i);
  const you = (yMatch?.[1] || "").trim();
  const them = (tMatch?.[1] || "").trim();
  if (!you && !them) return { you: clean, them: "" };
  return { you, them };
}

function AIInsightCard({ text }: { text: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;
  const cleaned = _scrubLanguage(text.replace(/\*+/g, "").trim());
  if (!cleaned) return null;

  // Gold glow + label + base frame, shared across bullet/legacy formats
  const cardStyle: React.CSSProperties = {
    marginBottom: 16,
    border: "2px solid rgba(245,162,35,0.6)",
    background: "rgba(245,162,35,0.06)",
    borderRadius: 8,
    padding: 14,
    display: "flex", flexDirection: "column", gap: 6,
    boxShadow: "0 0 20px rgba(245,162,35,0.3), 0 0 40px rgba(245,162,35,0.15)",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, fontWeight: 900,
    letterSpacing: "0.12em", color: "#f5a223", marginBottom: 2,
  };
  const bulletLineStyle: React.CSSProperties = {
    fontFamily: SANS, fontSize: 13, fontWeight: 400,
    color: "#ffffff", lineHeight: 1.45,
  };
  const toggleLinkStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", color: "#f5a223",
    marginTop: 6, cursor: "pointer", userSelect: "none",
    padding: "4px 0",  // larger touch target on mobile
  };

  // Detect bullet format (Haiku v2): lines starting with • or -
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletCount = lines.filter((l) => /^[•\-]\s/.test(l)).length;
  const isBulletFormat = bulletCount >= 2 && bulletCount >= lines.length * 0.6;

  if (isBulletFormat) {
    const visibleLines = expanded ? lines : lines.slice(0, 2);
    const hasMore = lines.length > 2;
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>DYNASTYGPT INSIGHTS</div>
        {visibleLines.map((line, i) => (
          <div key={i} style={bulletLineStyle}>{line}</div>
        ))}
        {hasMore && (
          <div style={toggleLinkStyle} onClick={() => setExpanded((e) => !e)}>
            {expanded
              ? "TAP TO COLLAPSE ▲"
              : `TAP TO EXPAND (+${lines.length - 2} MORE) ▼`}
          </div>
        )}
      </div>
    );
  }

  // Legacy labeled-section fallback (serves cached v1 insights during TTL)
  const { you, them } = parseInsight(cleaned);
  if (!you && !them) return null;
  return (
    <div style={{ ...cardStyle, padding: 16, gap: 14 }}>
      <div style={labelStyle}>DYNASTYGPT INSIGHTS</div>
      {you && (
        <div style={{
          fontFamily: SANS, fontSize: 14, fontWeight: 400,
          color: "#ffffff", lineHeight: 1.6,
        }}>
          {you}
        </div>
      )}
      {expanded && them && (
        <div style={{
          fontFamily: SANS, fontSize: 14, fontWeight: 400,
          color: "#ffffff", lineHeight: 1.6, marginTop: 4,
        }}>
          {them}
        </div>
      )}
      {them && (
        <div style={toggleLinkStyle} onClick={() => setExpanded((e) => !e)}>
          {expanded ? "TAP TO COLLAPSE ▲" : "TAP TO EXPAND ▼"}
        </div>
      )}
    </div>
  );
}

// ── Helper: grade to display ─────────────────────────────────────────────

function gradeDisplay(g: GradeResult | null | undefined) {
  if (!g) return { letter: "?", color: C.dim, label: "" };
  const letter = g.grade || "?";
  const color = gradeColor(letter);
  return { letter, color, label: g.verdict || "" };
}

function acceptanceColor(n: number): string {
  if (n >= 70) return C.green;
  if (n >= 50) return C.gold;
  if (n >= 30) return C.orange;
  return C.red;
}

// ── Circular Gauge SVG ───────────────────────────────────────────────────

function CircularGauge({ value, size = 120, delay = 0.4 }: { value: number; size?: number; delay?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);
  const color = acceptanceColor(pct);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={6} />
        {/* Fill */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut", delay }}
        />
      </svg>
      {/* Center number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.6, duration: 0.3 }}
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: size * 0.25, fontWeight: 800, color }}>{pct}%</span>
        <span style={{ fontFamily: MONO, fontSize: size * 0.09, color: C.dim, letterSpacing: "0.06em" }}>ACCEPTANCE</span>
      </motion.div>
    </div>
  );
}

// ── Grade Badge (animated reveal) ────────────────────────────────────────

function GradeBadge({ grade, delay = 0.2 }: { grade: GradeResult | null | undefined; delay?: number }) {
  // Mobile: verdict phrase IS the grade. No score number, no "/100".
  const label = (grade?.verdict || "").toUpperCase();
  const color =
    label === "SMASH" || label === "WIN" ? "#7dd3a0"        // C.green
    : label === "FAIR" ? "#d4a532"                          // C.gold
    : label === "LEANS AGAINST" ? "#e09c6b"                 // C.orange
    : "#e47272";                                            // C.red

  // Down-scale the font when the phrase is long so "LEANS AGAINST" doesn't
  // wrap on narrow phones. Single-word verdicts stay big and dramatic.
  const verdictSize = label.length > 8 ? 32 : 44;

  return (
    <div style={{ textAlign: "center", position: "relative", minWidth: 180 }}>
      {/* Gold burst behind verdict */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.6, delay, times: [0, 0.3, 1] }}
        style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 180, height: 120, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.gold}30 0%, transparent 70%)`,
        }}
      />
      {/* Verdict phrase — primary and only signal */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
        transition={{ duration: 0.4, delay, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          fontFamily: DISPLAY, fontSize: verdictSize, fontWeight: 900,
          color, lineHeight: 1, position: "relative",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </motion.div>
    </div>
  );
}

// ── Asset Chip ───────────────────────────────────────────────────────────

function AssetChip({ asset }: { asset: TradeAsset }) {
  const pc = posColor(asset.position);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 0",
    }}>
      <span style={{
        fontFamily: MONO, fontSize: 9, fontWeight: 800, color: pc,
        background: `${pc}18`, padding: "2px 6px", borderRadius: 3,
        minWidth: 26, textAlign: "center",
      }}>
        {asset.position}
      </span>
      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.primary, flex: 1 }}>
        {asset.name}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.gold }}>
        {fmt(asset.sha)}
      </span>
    </div>
  );
}

// ── Section Label ────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold,
      letterSpacing: "0.10em", marginBottom: 8, paddingLeft: 10,
      borderLeft: `2px solid ${C.gold}40`,
    }}>
      {text}
    </div>
  );
}

<<<<<<< HEAD
=======
// ── DynastyGPT Insights card — collapsible, gold glow, 2-bullet preview ──

function DynastyGPTInsightsCard({ text }: { text: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const cleaned = scrubInsight(text.replace(/\*+/g, "").trim());
  if (!cleaned) return null;

  const cardStyle: React.CSSProperties = {
    marginBottom: 20,
    border: "2px solid rgba(245,162,35,0.6)",
    background: "rgba(245,162,35,0.06)",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 0 20px rgba(245,162,35,0.3), 0 0 40px rgba(245,162,35,0.15)",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, fontWeight: 900,
    letterSpacing: "0.12em", color: "#f5a223", marginBottom: 2,
  };
  const bulletLineStyle: React.CSSProperties = {
    fontFamily: SANS, fontSize: 13, fontWeight: 400,
    color: "#ffffff", lineHeight: 1.45,
  };
  const toggleLinkStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", color: "#f5a223",
    marginTop: 6, cursor: "pointer", userSelect: "none",
    padding: "4px 0",  // larger touch target for mobile
  };

  // Detect bullet format (Haiku v2): lines starting with • or -
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletCount = lines.filter((l) => /^[•\-]\s/.test(l)).length;
  const isBulletFormat = bulletCount >= 2 && bulletCount >= lines.length * 0.6;

  if (isBulletFormat) {
    const visibleLines = expanded ? lines : lines.slice(0, 1);
    const hasMore = lines.length > 1;
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>DYNASTYGPT INSIGHTS</div>
        {visibleLines.map((line, i) => (
          <div key={i} style={bulletLineStyle}>{line}</div>
        ))}
        {hasMore && (
          <div style={toggleLinkStyle} onClick={() => setExpanded((e) => !e)}>
            {expanded
              ? "TAP TO COLLAPSE ▲"
              : `TAP TO EXPAND (+${lines.length - 1} MORE) ▼`}
          </div>
        )}
      </div>
    );
  }

  // Legacy prose fallback (cached v1 insights during TTL): show first ~120
  // chars collapsed, full text expanded.
  const COLLAPSED_LEN = 160;
  const isLong = cleaned.length > COLLAPSED_LEN;
  const preview = isLong && !expanded
    ? cleaned.slice(0, COLLAPSED_LEN).replace(/\s+\S*$/, "") + "…"
    : cleaned;

  return (
    <div style={{ ...cardStyle, padding: 16, gap: 10 }}>
      <div style={labelStyle}>DYNASTYGPT INSIGHTS</div>
      <div style={{
        fontFamily: SANS, fontSize: 14, fontWeight: 400,
        color: "#ffffff", lineHeight: 1.6,
      }}>
        {preview}
      </div>
      {isLong && (
        <div style={toggleLinkStyle} onClick={() => setExpanded((e) => !e)}>
          {expanded ? "TAP TO COLLAPSE ▲" : "TAP TO EXPAND ▼"}
        </div>
      )}
    </div>
  );
}

>>>>>>> 00b6ec0 (fix: pass pick counts to backend, personal_insights replaces negotiation_insights)
// ── Main Modal ───────────────────────────────────────────────────────────

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: TradeEvaluation | null;
  partner: string;
  owner: string;
  onCounter?: () => void;
}

export default function AnalyzeModal({ isOpen, onClose, evaluation, partner, owner, onCounter }: AnalyzeModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Share via html2canvas ──
  const handleShare = useCallback(async () => {
    if (!contentRef.current) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: M.bg,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png", 1.0),
      );
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "trade-analysis.png")] })) {
        await navigator.share({
          title: "Trade Analysis — DynastyGPT",
          files: [new File([blob], "trade-analysis.png", { type: "image/png" })],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dynastygpt-trade-analysis.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent fail
    } finally {
      setSharing(false);
    }
  }, []);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!mounted) return null;

  const ev = evaluation;
  const grade = ev?.owner_grade;
  const acceptance = ev?.acceptance;
  const acc = acceptance?.acceptance_likelihood ?? 0;
  const giveAssets = ev?.i_give || [];
  const getAssets = ev?.i_receive || [];
  const giveTotal = ev?.sha_balance?.i_give?.sha_total_raw ?? giveAssets.reduce((s, a) => s + a.sha, 0);
  const getTotal = ev?.sha_balance?.i_receive?.sha_total_raw ?? getAssets.reduce((s, a) => s + a.sha, 0);
  const gap = getTotal - giveTotal;
  const gapPct = giveTotal > 0 ? Math.round((gap / giveTotal) * 100) : 0;
  const insights = ev?.negotiation_insights || [];
  const impact = ev?.positional_impact;
  const archetype = ev?.partner_archetype;
  const h2h = ev?.h2h_history;

  // Acceptance factors
  const factors: string[] = [];
  if (acceptance?.roster_fit_detail?.fills?.length) {
    const fillPositions = Array.from(new Set(
      (acceptance.roster_fit_detail.fills as Array<string | { position?: string }>)
        .map(f => typeof f === "string" ? f : f?.position)
        .filter((p): p is string => Boolean(p))
    ));
    if (fillPositions.length > 0) {
      factors.push(`Fills ${fillPositions.join(", ")} need`);
    }
  }
  if (acceptance?.breakdown) {
    const bd = acceptance.breakdown;
    if ((bd.sha_fairness || 0) >= 25) factors.push("Fair value exchange");
    if ((bd.positional_overpay || 0) >= 10) factors.push("Partner tends to overpay here");
  }
  if (acceptance?.modifiers?.length) {
    const top = acceptance.modifiers.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment))[0];
    if (top) factors.push(top.reason);
  }

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="analyze-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              zIndex: 10000,
            }}
          />

          {/* Modal container */}
          <motion.div
            key="analyze-modal"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            style={{
              position: "fixed", zIndex: 10001,
              bottom: 0, left: 0, right: 0,
              maxHeight: "94vh",
              display: "flex", flexDirection: "column",
              background: M.bg, borderRadius: "16px 16px 0 0",
              overflow: "hidden",
            }}
            className="analyze-modal-container"
          >
            <style>{`
              @media (min-width: 640px) {
                .analyze-modal-container {
                  bottom: auto !important; left: 50% !important; right: auto !important;
                  top: 50% !important; transform: translate(-50%, -50%) !important;
                  width: 420px !important; max-height: 90vh !important;
                  border-radius: 12px !important;
                }
              }
            `}</style>

            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px 0", flexShrink: 0 }}>
              <button onClick={onClose} style={{
                background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8,
                cursor: "pointer", padding: "6px 10px", color: C.dim, fontSize: 14, lineHeight: 1,
              }}>✕</button>
            </div>

            {/* Scrollable content — this is what html2canvas captures */}
            <div ref={contentRef} style={{
              flex: 1, overflowY: "auto", overflowX: "hidden",
              WebkitOverflowScrolling: "touch", padding: "0 20px 20px",
              background: M.bg,
            }}>
              {/* ── 1. Gold bar ── */}
              <div style={{
                height: 3, margin: "0 -20px 16px",
                background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDark})`,
              }} />

              {/* ── 2. Header ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: archetype?.line ? 8 : 16 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: C.gold }}>
                  TRADE ANALYSIS
                </span>
                <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: `${C.gold}80` }}>
                  dynastygpt.com
                </span>
              </div>

              {/* ── 2b. Partner archetype banner (only if behavioral_intel data exists) ── */}
              {archetype?.line && (
                <div style={{
                  marginBottom: 14, padding: "6px 10px", borderRadius: 6,
                  background: C.elevated, border: `1px solid ${C.border}`,
                  fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.gold,
                  letterSpacing: "0.04em", textAlign: "center",
                }}>
                  {partner.toUpperCase()} · {archetype.line}
                </div>
              )}

              {/* ── 2c. AI INSIGHT — dual-section GM verdict ── */}
              <AIInsightCard text={ev?.ai_insight} />

              {/* ── 3. Trade Card ── */}
              <div style={{
                background: M.card, borderRadius: 10,
                border: `1px solid ${M.cardBorder}`,
                boxShadow: `0 0 24px ${M.cardGlow}`,
                padding: "16px 14px", marginBottom: 20,
              }}>
                {/* Owner labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.06em" }}>
                    {owner.toUpperCase()} SENDS
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.06em" }}>
                    {partner.toUpperCase()} SENDS
                  </span>
                </div>

                {/* Two columns */}
                <div style={{ display: "flex", gap: 12 }}>
                  {/* SEND side */}
                  <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, paddingRight: 12 }}>
                    {giveAssets.map((a, i) => <AssetChip key={i} asset={a} />)}
                    <div style={{
                      fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold,
                      borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 6,
                    }}>
                      {fmt(giveTotal)}
                    </div>
                  </div>

                  {/* GET side */}
                  <div style={{ flex: 1, paddingLeft: 0 }}>
                    {getAssets.map((a, i) => <AssetChip key={i} asset={a} />)}
                    <div style={{
                      fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold,
                      borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 6,
                    }}>
                      {fmt(getTotal)}
                    </div>
                  </div>
                </div>

                {/* Balance indicator */}
                <div style={{
                  textAlign: "center", marginTop: 10, paddingTop: 8,
                  borderTop: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: C.dim, marginBottom: 4 }}>
                    YOUR VALUE BALANCE
                  </div>
                  <span style={{
                    fontFamily: MONO, fontSize: 12, fontWeight: 800,
                    color: gap >= 0 ? C.green : C.red,
                    background: gap >= 0 ? C.greenDim : C.redDim,
                    padding: "3px 10px", borderRadius: 4,
                  }}>
                    {gap >= 0 ? "+" : ""}{fmt(gap)} ({gapPct >= 0 ? "+" : ""}{gapPct}%)
                  </span>
                  <div style={{ fontFamily: SANS, fontSize: 10, color: C.dim, marginTop: 4 }}>
                    {gap >= 0 ? "You're getting more value than you're sending." : "You're sending more value than you're getting back."}
                  </div>
                </div>
              </div>

              {/* ── 4. Grade + Acceptance side by side ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginBottom: 8 }}>
                <GradeBadge grade={grade} delay={0.2} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <CircularGauge value={acc} size={110} delay={0.4} />
                </div>
              </div>
              {/* Acceptance explanation + H2H history line */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, lineHeight: 1.4 }}>
                  Based on roster fit, trade history, and behavioral patterns.
                </div>
                {h2h && h2h.total_trades > 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.secondary, marginTop: 4 }}>
                    {h2h.total_trades} trade{h2h.total_trades === 1 ? "" : "s"} with {partner} · won {h2h.wins}
                  </div>
                )}
              </div>

              {/* ── 5. Acceptance factors ── */}
              {factors.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel text="WHY THEY ACCEPT" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {factors.slice(0, 3).map((f, i) => (
                      <div key={i} style={{
                        fontFamily: SANS, fontSize: 12, color: C.secondary,
                        paddingLeft: 12, borderLeft: `2px solid ${C.green}30`,
                      }}>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 6. Market Analysis ── */}
              {giveTotal > 0 && getTotal > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel text="VALUE ANALYSIS" />
                  <div style={{
                    background: M.card, borderRadius: 8,
                    border: `1px solid ${C.border}`, padding: "12px 14px",
                    fontFamily: MONO, fontSize: 12, color: C.secondary, lineHeight: 1.8,
                  }}>
                    Sending <span style={{ color: C.gold, fontWeight: 700 }}>{fmt(giveTotal)}</span> in value,
                    getting <span style={{ color: C.gold, fontWeight: 700 }}>{fmt(getTotal)}</span> back.{" "}
                    <span style={{ color: gap >= 0 ? C.green : C.red, fontWeight: 700 }}>
                      {gap >= 0 ? "Favorable" : "Unfavorable"} by {Math.abs(gapPct)}%.
                    </span>
                    {(() => {
                      const nGive = giveAssets.length;
                      const nRecv = getAssets.length;
                      if (nGive === nRecv) return null;
                      const diff = Math.abs(nGive - nRecv);
                      const premiumPct = [0, 25, 65, 85, 95][Math.min(diff, 4)];
                      const concentratedSide = nGive < nRecv ? "you're sending" : "you're receiving";
                      const benefited = nGive < nRecv ? giveTotal : getTotal;
                      const absorbed = nGive < nRecv ? getTotal : giveTotal;
                      const meets = benefited * (1 + premiumPct / 100) <= absorbed;
                      return (
                        <div style={{
                          marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`,
                          fontFamily: SANS, fontSize: 11, color: C.dim, lineHeight: 1.5,
                        }}>
                          Trading {Math.max(nGive, nRecv)} for {Math.min(nGive, nRecv)} typically
                          commands a ~{premiumPct}% premium on the side {concentratedSide}.{" "}
                          <span style={{ color: meets ? C.green : C.orange, fontWeight: 700 }}>
                            This trade {meets ? "accounts for that." : "does not account for that."}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ── 7. Positional Impact ── */}
              {(() => {
                if (!impact) return null;
                // Only show positions actually in the trade (players sent or received)
                const tradedPositions = new Set<string>();
                [...giveAssets, ...getAssets].forEach(a => {
                  if (a.position && ["QB", "RB", "WR", "TE"].includes(a.position)) {
                    tradedPositions.add(a.position);
                  }
                });
                if (tradedPositions.size === 0) return null;

                const ownerData = impact.owner || {};
                const partnerData = impact.partner || {};
                const positions = Array.from(tradedPositions).filter(
                  p => ownerData[p] || partnerData[p]
                );
                if (positions.length === 0) return null;

                const renderRow = (data: { before: string; after: string; direction: string } | undefined, pos: string) => {
                  if (!data) return <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>no change</span>;
                  const dirColor = data.direction === "up" ? C.green : data.direction === "down" ? C.red : C.dim;
                  const arrow = data.direction === "up" ? "↑" : data.direction === "down" ? "↓" : "→";
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{data.before}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: dirColor }}>{arrow}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: dirColor, fontWeight: 700 }}>{data.after}</span>
                    </div>
                  );
                };

                return (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel text="POSITIONAL IMPACT" />
                    <div style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 8 }}>
                      How each side&apos;s depth at the traded position changes after the deal.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {positions.map((pos) => (
                        <div key={pos} style={{
                          background: M.card, border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "8px 12px",
                        }}>
                          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: posColor(pos), marginBottom: 6 }}>
                            {pos}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", alignItems: "center" }}>
                            <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>You</span>
                            {renderRow(ownerData[pos], pos)}
                            <span style={{ fontFamily: SANS, fontSize: 11, color: C.secondary }}>Partner</span>
                            {renderRow(partnerData[pos], pos)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── 8. Personal Insights — owner's trade data scoped to this deal ── */}
              {((ev?.personal_insights?.length ?? 0) > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel text="INSIGHTS" />
<<<<<<< HEAD
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {insights.slice(0, 3).map((ins, i) => (
                      <div key={i} style={{
                        background: M.card, border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: "8px 12px", fontFamily: SANS, fontSize: 12, color: C.secondary, lineHeight: 1.5,
                      }}>
                        {_scrubLanguage(ins.insight)}
                      </div>
                    ))}
=======
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(ev?.personal_insights || []).map((pi, i) => {
                      const tc = pi.tone === "positive" ? C.green : pi.tone === "warning" ? C.red : C.dim;
                      return (
                        <div key={i} style={{
                          padding: "8px 10px", borderRadius: 5,
                          background: `${tc}0a`, borderLeft: `3px solid ${tc}`,
                          fontFamily: SANS, fontSize: 13, color: C.primary, lineHeight: 1.45,
                        }}>
                          {pi.text}
                        </div>
                      );
                    })}
>>>>>>> 00b6ec0 (fix: pass pick counts to backend, personal_insights replaces negotiation_insights)
                  </div>
                </div>
              )}

              {/* AI Insight moved to top of modal (see AIInsightCard above) */}

              {/* ── 10. Watermark ── */}
              <div style={{
                textAlign: "center", paddingTop: 12, marginTop: 8,
                borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: `${C.gold}50`, letterSpacing: "0.04em" }}>
                  powered by DynastyGPT.com
                </span>
              </div>
            </div>

            {/* ── Action bar (excluded from screenshot) ── */}
            <div style={{
              padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
              borderTop: `1px solid ${C.border}`, display: "flex", gap: 8,
              flexShrink: 0, background: M.bg,
            }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 10,
                  background: C.elevated, border: `1px solid ${C.border}`,
                  fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                  color: C.secondary, cursor: "pointer",
                }}
              >
                BACK
              </button>
              {onCounter && (
                <button
                  onClick={onCounter}
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 10,
                    background: C.elevated, border: `1px solid ${C.blue}40`,
                    fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                    color: C.blue, cursor: "pointer",
                  }}
                >
                  ↩ COUNTER
                </button>
              )}
              <button
                onClick={handleShare}
                disabled={sharing}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                  border: "none",
                  fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                  color: M.bg, cursor: sharing ? "wait" : "pointer",
                  opacity: sharing ? 0.6 : 1,
                }}
              >
                {sharing ? "..." : "SHARE ↗"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
