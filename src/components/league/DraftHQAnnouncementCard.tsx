"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { C, SANS, MONO, DISPLAY } from "./tokens";
import { useTrack } from "@/hooks/useTrack";

const HERO_HEIGHT_PX = 116;

export default function DraftHQAnnouncementCard({ slug, leagueId }: { slug: string; leagueId: string }) {
  const track = useTrack();
  const href = `/l/${slug}/draft-hq`;

  return (
    <Link
      href={href}
      onClick={() => track("draft_hq_announcement_clicked", { league_id: leagueId })}
      className="group block"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-lg overflow-hidden flex flex-col w-full transition-all hover:border-gold/40 hover:shadow-[0_4px_24px_rgba(212,165,50,0.10)]"
        style={{
          background: `linear-gradient(180deg, ${C.card} 0%, #0a0d15 100%)`,
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Badge — NEW (gold) */}
        <style>{`@keyframes draftHQPulse{0%,100%{box-shadow:0 0 6px rgba(212,165,50,0.4)}50%{box-shadow:0 0 16px rgba(212,165,50,0.85),0 0 30px rgba(212,165,50,0.35)}}`}</style>
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          <span
            className="px-2.5 py-1 rounded-full text-[8px] font-black tracking-[0.10em]"
            style={{
              fontFamily: MONO,
              color: "#06080d",
              background: C.gold,
              animation: "draftHQPulse 2s ease infinite",
            }}
          >
            NEW — LIVE NOW
          </span>
        </div>

        {/* Top accent bar */}
        <div
          className="h-[2px] flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDark})` }}
        />

        {/* Hero — Draft HQ specific mock */}
        <DraftHQHeroMock />

        {/* Content area */}
        <div className="px-4 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2" style={{ fontFamily: MONO }}>
            <span
              className="text-[8px] font-black tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
              style={{
                color: C.gold,
                background: `${C.gold}15`,
                border: `1px solid ${C.gold}30`,
              }}
            >
              FEATURE LAUNCH
            </span>
          </div>

          <h3
            className="text-primary leading-[1.18] tracking-tight text-[18px] sm:text-[20px]"
            style={{ fontFamily: DISPLAY }}
          >
            New: Draft HQ
          </h3>

          <p
            className="text-primary text-[13px] sm:text-[14px] leading-snug"
            style={{ fontFamily: SANS, fontWeight: 700 }}
          >
            Update: Now Live with Pick Insights + Rookie ADP from real drafts
          </p>

          <p
            className="text-secondary text-[13px] sm:text-[14px] leading-relaxed"
            style={{ fontFamily: SANS, fontWeight: 400 }}
          >
            Your Picks — a roster-aware cheat sheet for every pick you hold. Likely-available players, target recommendations, and trade angles tailored to your draft slot. Plus format-aware ADP from 10,000+ real 2026 rookie drafts. Draft Board, League Draft Intel, and full mock draft simulation coming soon.
          </p>

          {/* CTA button */}
          <div className="flex items-center justify-end mt-1">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-black tracking-[0.10em] transition-all group-hover:bg-gold group-hover:text-[#06080d]"
              style={{
                fontFamily: MONO,
                color: C.gold,
                background: `${C.gold}15`,
                border: `1px solid ${C.gold}50`,
              }}
            >
              OPEN DRAFT HQ
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function DraftHQHeroMock() {
  return (
    <div
      className="relative w-full overflow-hidden flex-shrink-0"
      style={{
        height: HERO_HEIGHT_PX,
        background: `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(212,165,50,0.22) 0%, rgba(212,165,50,0.06) 40%, transparent 75%), linear-gradient(180deg, #06080d 0%, #0a0d15 100%)`,
        borderBottom: `1px solid ${C.goldBorder}`,
      }}
    >
      {/* Draft board grid pattern — vertical pick columns */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <pattern id="draftboard-cols" x="0" y="0" width="28" height="100" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="26" height="100" fill="none" stroke={C.gold} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#draftboard-cols)" />
      </svg>

      {/* ADP curve illustration — mock decreasing-values arc */}
      <svg className="absolute inset-x-0 bottom-2 h-12 opacity-60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 200 40">
        <defs>
          <linearGradient id="adp-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0.9" />
            <stop offset="100%" stopColor={C.gold} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M0,8 Q40,4 60,12 T120,22 T200,34" fill="none" stroke="url(#adp-line)" strokeWidth="1.4" />
        <g fill={C.gold}>
          <circle cx="20" cy="6" r="1.6" />
          <circle cx="60" cy="12" r="1.6" />
          <circle cx="100" cy="18" r="1.6" />
          <circle cx="140" cy="26" r="1.6" />
          <circle cx="180" cy="32" r="1.6" />
        </g>
      </svg>

      {/* Centered: stylized "ADP" mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="px-4 py-2 rounded"
          style={{
            background: "rgba(6,8,13,0.55)",
            border: `1px solid ${C.goldBorder}`,
            boxShadow: `0 0 24px rgba(212,165,50,0.25), inset 0 1px 0 rgba(212,165,50,0.20)`,
            fontFamily: MONO,
            fontSize: 26,
            fontWeight: 900,
            color: C.gold,
            letterSpacing: "0.08em",
            textShadow: `0 0 18px rgba(212,165,50,0.5)`,
          }}
        >
          ADP
        </div>
      </div>

      {/* Variant tag — top-left */}
      <div className="absolute top-2 left-2">
        <span
          className="inline-block px-1.5 py-0.5 rounded-sm text-[7px] font-black tracking-[0.14em]"
          style={{
            fontFamily: MONO,
            color: C.gold,
            background: "rgba(6,8,13,0.85)",
            border: `1px solid ${C.goldBorder}`,
          }}
        >
          DRAFT HQ
        </span>
      </div>
    </div>
  );
}
