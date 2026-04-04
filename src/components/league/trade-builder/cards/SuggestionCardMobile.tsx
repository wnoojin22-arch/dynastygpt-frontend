"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { SuggestedPackage, TradeAsset, NegotiationInsight } from "../types";

/* ── helpers ── */
function acceptColor(s: number) {
  if (s >= 70) return "#7dd3a0";
  if (s >= 50) return "#d4a532";
  if (s >= 30) return "#e09c6b";
  return "#e47272";
}
function gradeColor(g: string) {
  if (g?.startsWith("A")) return "#7dd3a0";
  if (g?.startsWith("B")) return "#6bb8e0";
  if (g?.startsWith("C")) return "#d4a532";
  if (g?.startsWith("D")) return "#e09c6b";
  return "#e47272";
}
function posColor(pos: string) {
  if (pos === "QB") return "#e47272";
  if (pos === "RB") return "#6bb8e0";
  if (pos === "WR") return "#7dd3a0";
  if (pos === "TE") return "#e09c6b";
  return "#9596a5";
}
function windowLabel(w: string | undefined) {
  if (!w) return null;
  const u = w.toUpperCase();
  if (u.includes("REBUILD")) return { text: "REBUILDER", color: "#6bb8e0" };
  if (u.includes("CONTEND") || u.includes("WIN")) return { text: "CONTENDER", color: "#e47272" };
  return { text: "BALANCED", color: "#d4a532" };
}

function AcceptanceRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score / 100, 0), 1);
  const color = acceptColor(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1e30" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-black leading-none" style={{ fontSize: size * 0.3, color }}>
          {score}
        </span>
        <span className="font-mono font-bold text-[7px] tracking-wide" style={{ color: "#9596a5" }}>
          %
        </span>
      </div>
    </div>
  );
}

function AssetPill({ asset }: { asset: TradeAsset }) {
  const pc = posColor(asset.position);
  const val = asset.sha ?? asset.dynasty ?? 0;
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span
        className="font-mono text-[9px] font-black px-1 rounded shrink-0"
        style={{ color: pc, background: `${pc}18` }}
      >
        {asset.position}
      </span>
      <span className="font-sans text-[13px] font-semibold text-[#eeeef2] flex-1">
        {asset.name}
      </span>
      {val > 0 && (
        <span className="font-mono text-[10px] font-bold text-[#d4a532] shrink-0">
          {val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

function BalanceMini({ give, receive }: { give: TradeAsset[]; receive: TradeAsset[] }) {
  const giveTotal = give.reduce((s, a) => s + (a.sha ?? a.dynasty ?? 0), 0);
  const recvTotal = receive.reduce((s, a) => s + (a.sha ?? a.dynasty ?? 0), 0);
  const max = Math.max(giveTotal, recvTotal, 1);
  const gapPct = giveTotal > 0 ? ((recvTotal - giveTotal) / giveTotal) * 100 : 0;
  const gapColor = Math.abs(gapPct) <= 5 ? "#7dd3a0" : Math.abs(gapPct) <= 15 ? "#d4a532" : "#e47272";

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[8px] font-black tracking-wide text-[#e47272] w-7">SEND</span>
        <div className="flex-1 h-1.5 rounded-full bg-[#171b28] overflow-hidden">
          <div className="h-full rounded-full bg-[#e47272] transition-all duration-300" style={{ width: `${(giveTotal / max) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[8px] font-black tracking-wide text-[#7dd3a0] w-7">GET</span>
        <div className="flex-1 h-1.5 rounded-full bg-[#171b28] overflow-hidden">
          <div className="h-full rounded-full bg-[#7dd3a0] transition-all duration-300" style={{ width: `${(recvTotal / max) * 100}%` }} />
        </div>
      </div>
      <div className="text-center">
        <span className="font-mono text-[10px] font-black" style={{ color: gapColor }}>
          {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUGGESTION CARD — MOBILE
   Compact by default, expandable via pull-up / tap
   ═══════════════════════════════════════════════ */
export default function SuggestionCardMobile({ pkg }: { pkg: SuggestedPackage }) {
  const [expanded, setExpanded] = useState(false);
  const g = pkg.owner_trade_grade || { grade: "?", score: 0, verdict: "" };
  const gc = gradeColor(g.grade || "?");
  const acc = pkg.acceptance_likelihood || 0;
  const give = (pkg.i_give || []) as TradeAsset[];
  const receive = (pkg.i_receive || []) as TradeAsset[];
  const insights = (pkg.negotiation_insights || []) as NegotiationInsight[];

  // V2 enrichment data
  const raw = pkg as unknown as Record<string, unknown>;
  const marketBacking = raw.market_backing as { give_total_market?: number; receive_total_market?: number; per_asset?: Array<{ name: string; market_price: number; trades: number; trend: string }> } | undefined;
  const partnerIntel = raw.partner_intel as { archetype?: string; overpay_position?: string; overpay_avg?: number; trust_level?: string; win_rate?: number; badges?: string[] } | undefined;
  const acceptanceFactors = raw.acceptance_factors as { score?: number; modifiers?: Array<{ reason: string }> } | undefined;
  const comps = (raw.comps || []) as string[];

  // Window badge from partner intel (if tier encodes it, or from narrative)
  const wBadge = windowLabel(pkg.tier);

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── COMPACT SECTION (always visible) ── */}
      <div className="flex-1 flex flex-col px-5 pt-5 pb-3">
        {/* Top bar: partner + window badge + acceptance ring */}
        <div className="flex items-center gap-3 mb-4">
          {/* Grade circle */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2"
            style={{ background: `${gc}18`, borderColor: gc }}
          >
            <span className="font-['Archivo_Black'] text-lg leading-none" style={{ color: gc }}>
              {g.grade}
            </span>
          </div>

          {/* Partner name + badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-sans text-lg font-bold text-[#eeeef2] truncate">
                {pkg.partner}
              </span>
              {wBadge && (
                <span
                  className="font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border shrink-0"
                  style={{ color: wBadge.color, background: `${wBadge.color}12`, borderColor: `${wBadge.color}30` }}
                >
                  {wBadge.text}
                </span>
              )}
            </div>
            {pkg.market_comparison && (
              <p className="font-mono text-[10px] text-[#9596a5] mt-0.5 truncate">{pkg.market_comparison}</p>
            )}
          </div>

          {/* Acceptance ring */}
          <AcceptanceRing score={acc} />
        </div>

        {/* Send / Get columns */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9px] font-black tracking-widest text-[#e47272]">SEND</span>
            {give.map((a, i) => (
              <AssetPill key={i} asset={a} />
            ))}
          </div>
          <div className="w-px bg-[#1a1e30] self-stretch mx-1" />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9px] font-black tracking-widest text-[#7dd3a0]">GET</span>
            {receive.map((a, i) => (
              <AssetPill key={i} asset={a} />
            ))}
          </div>
        </div>

        {/* Balance bar */}
        <BalanceMini give={give} receive={receive} />

        {/* DynastyGPT Rationale */}
        {(pkg.narrative || pkg.pitch) && (
          <div className="mt-3">
            <span className="font-mono text-[8px] font-bold tracking-widest text-[#d4a532]">DYNASTYGPT RATIONALE</span>
            <p className="font-sans text-[12px] leading-relaxed text-[#b0b2c8] mt-1">
              {pkg.narrative || pkg.pitch}
            </p>
          </div>
        )}
      </div>

      {/* ── EXPAND TOGGLE ── */}
      <button
        onPointerUp={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        onPointerDownCapture={(e) => e.stopPropagation()}
        className="flex items-center justify-center gap-1 py-3 border-t border-[#1a1e30] text-[#9596a5] active:bg-[#171b28] transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        <span className="font-mono text-[9px] font-bold tracking-widest">
          {expanded ? "COLLAPSE" : "DETAILS"}
        </span>
      </button>

      {/* ── EXPANDED INTEL ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-[#1a1e30]"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Partner intel */}
              {partnerIntel && (partnerIntel.archetype || partnerIntel.trust_level) && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532]">
                    PARTNER INTEL
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {partnerIntel.archetype && (
                      <p className="font-sans text-[12px] text-[#b0b2c8]">
                        <span className="font-mono text-[10px] font-bold text-[#eeeef2]">{partnerIntel.archetype}</span>
                        {partnerIntel.trust_level && <span className="text-[#9596a5]"> · {partnerIntel.trust_level}</span>}
                        {partnerIntel.win_rate != null && <span className="text-[#9596a5]"> · {Math.round(partnerIntel.win_rate * 100)}% win rate</span>}
                      </p>
                    )}
                    {partnerIntel.overpay_position && (
                      <p className="font-sans text-[12px] text-[#7dd3a0]">
                        Overpays for {partnerIntel.overpay_position} by ~{partnerIntel.overpay_avg?.toLocaleString()} avg
                      </p>
                    )}
                    {partnerIntel.badges && partnerIntel.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {partnerIntel.badges.map((b, i) => (
                          <span key={i} className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#171b28] text-[#9596a5] border border-[#1a1e30]">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Market backing */}
              {marketBacking?.per_asset && marketBacking.per_asset.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532]">
                    MARKET PRICES
                  </span>
                  <div className="mt-1.5 space-y-0.5">
                    {marketBacking.per_asset.map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#b0b2c8] truncate flex-1">{a.name}</span>
                        <span className="text-[#d4a532] font-bold ml-2">{a.market_price.toLocaleString()}</span>
                        <span className="text-[#9596a5] ml-1.5 w-12 text-right">{a.trades} trd</span>
                        <span className={`ml-1.5 w-10 text-right ${a.trend.startsWith("+") ? "text-[#7dd3a0]" : a.trend.startsWith("-") ? "text-[#e47272]" : "text-[#9596a5]"}`}>{a.trend}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Negotiation insights */}
              {insights.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532]">
                    NEGOTIATION INTEL
                  </span>
                  <div className="mt-2 space-y-2">
                    {insights.slice(0, 3).map((ins, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[12px] font-sans text-[#b0b2c8]"
                      >
                        <span className="font-mono text-[8px] font-bold tracking-wide mt-0.5 shrink-0 px-1 rounded" style={{
                          color: ins.type === "leverage" ? "#7dd3a0" : ins.type === "warning" ? "#e47272" : "#d4a532",
                          background: ins.type === "leverage" ? "#7dd3a018" : ins.type === "warning" ? "#e4727218" : "#d4a53218",
                        }}>
                          {ins.type === "leverage" ? "LEVERAGE" : ins.type === "warning" ? "WARNING" : "TACTIC"}
                        </span>
                        <span className="leading-snug">{ins.insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade comps */}
              {comps.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532]">
                    SIMILAR TRADES
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {comps.map((c, i) => (
                      <p key={i} className="font-sans text-[11px] text-[#9596a5] leading-snug">{c}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Full narrative */}
              {pkg.narrative && pkg.narrative.length > 80 && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#d4a532]">
                    AI RATIONALE
                  </span>
                  <p className="font-sans text-[12px] leading-relaxed text-[#b0b2c8] mt-1">
                    {pkg.narrative}
                  </p>
                </div>
              )}

              {/* Acceptance factors */}
              {acceptanceFactors?.modifiers && acceptanceFactors.modifiers.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#9596a5]">
                    ACCEPTANCE FACTORS
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {acceptanceFactors.modifiers.map((m, i) => (
                      <p key={i} className="font-sans text-[11px] text-[#9596a5]">· {m.reason}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Verdict */}
              {g.verdict && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black tracking-widest text-[#9596a5]">VERDICT</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: gc }}>
                    {g.verdict}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
