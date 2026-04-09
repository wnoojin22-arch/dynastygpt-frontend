"use client";

/**
 * WelcomeArticleCard — vertical news-card hero for the league homepage.
 *
 * Layout (vertical):
 *   ┌─────────────────────────────┐
 *   │     hero mock image (120)   │
 *   │  distinct per variant       │
 *   ├─────────────────────────────┤
 *   │ KICKER · DATE               │
 *   │                             │
 *   │ Article Headline            │
 *   │ continues onto two lines    │
 *   │                             │
 *   │ Subheadline truncated       │
 *   │                     READ → │
 *   └─────────────────────────────┘
 *
 * Two variants:
 *   - league   → reads from getLeagueNewsWelcome
 *   - my       → reads from getMyNewsFirstReport
 *
 * NEVER use italic styling. Image is on top so the text has room to breathe.
 * Each variant has its own mock SVG so cards don't all look identical.
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import {
  getLeagueNewsWelcome,
  getMyNewsFirstReport,
  type WelcomeArticleResponse,
  type WelcomeArticle,
} from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF } from "./tokens";

const HOUR = 1000 * 60 * 60;

// Fixed card dimensions — image on top, content below
const CARD_HEIGHT_PX = 240;
const HERO_HEIGHT_PX = 116;

interface BaseProps {
  leagueId: string;
}
interface LeagueProps extends BaseProps {
  variant: "league";
  leagueName?: string;
}
interface MyProps extends BaseProps {
  variant: "my";
  ownerName: string | null;
  ownerUserId?: string | null;
}
type Props = LeagueProps | MyProps;

export default function WelcomeArticleCard(props: Props) {
  const { leagueId, variant } = props;

  const queryKey =
    variant === "league"
      ? ["welcome-league-news", leagueId]
      : ["welcome-my-news", leagueId, (props as MyProps).ownerName, (props as MyProps).ownerUserId];

  const queryFn = (): Promise<WelcomeArticleResponse> => {
    if (variant === "league") return getLeagueNewsWelcome(leagueId);
    const { ownerName, ownerUserId } = props as MyProps;
    if (!ownerName) {
      return Promise.resolve({ available: false, league_id: leagueId } as WelcomeArticleResponse);
    }
    return getMyNewsFirstReport(leagueId, ownerName, ownerUserId);
  };

  const enabled =
    variant === "league" || (variant === "my" && Boolean((props as MyProps).ownerName));

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 6 * HOUR,
  });

  if (isLoading) return <CardSkeleton />;

  if (!data?.available || !data.article) {
    return <ComingSoonCard variant={variant} hasOwner={variant === "league" || Boolean((props as MyProps).ownerName)} />;
  }

  return <ArticleCard variant={variant} response={data} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ARTICLE CARD — vertical layout, image on top, text below
   ═══════════════════════════════════════════════════════════════════════════ */
function ArticleCard({
  variant,
  response,
}: {
  variant: "league" | "my";
  response: WelcomeArticleResponse;
}) {
  const article = response.article!;
  const [open, setOpen] = useState(false);
  const generatedAt = response.generated_at ? new Date(response.generated_at) : null;
  const dateStr = generatedAt
    ? generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const kicker = variant === "league" ? "LEAGUE FEATURE" : "DYNASTY REPORT";

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="group rounded-lg overflow-hidden flex flex-col w-full text-left transition-all hover:border-gold/40 hover:shadow-[0_4px_24px_rgba(212,165,50,0.08)] cursor-pointer"
        style={{
          height: CARD_HEIGHT_PX,
          background: `linear-gradient(180deg, ${C.card} 0%, #0a0d15 100%)`,
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-[2px] flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDark})` }}
        />

        {/* Hero image — distinct per variant */}
        <HeroMockImage variant={variant} />

        {/* Content area */}
        <div className="flex-1 min-h-0 px-4 py-3 flex flex-col">
          {/* Top meta: kicker + date */}
          <div className="flex items-center gap-2 mb-1.5 flex-shrink-0" style={{ fontFamily: MONO }}>
            <span
              className="text-[8px] font-black tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
              style={{
                color: C.gold,
                background: `${C.gold}15`,
                border: `1px solid ${C.gold}30`,
              }}
            >
              {kicker}
            </span>
            {dateStr && <span className="text-[9px] text-dim">· {dateStr}</span>}
          </div>

          {/* Headline — 2 line max with line clamp */}
          <h3
            className="text-primary leading-[1.18] tracking-tight text-[14px] line-clamp-2 mb-1 flex-shrink-0"
            style={{ fontFamily: DISPLAY }}
          >
            {article.headline}
          </h3>

          {/* Subheadline — 2 lines truncated, sans for readability */}
          <p
            className="text-secondary text-[13px] leading-snug line-clamp-2 flex-1 min-h-0"
            style={{ fontFamily: SANS, fontWeight: 400 }}
          >
            {article.subheadline}
          </p>

          {/* Read CTA — pinned to bottom */}
          <div className="flex items-center justify-end mt-1.5 flex-shrink-0">
            <span
              className="flex items-center gap-1 text-[9px] font-black tracking-[0.1em] text-gold group-hover:text-gold-bright transition-colors"
              style={{ fontFamily: MONO }}
            >
              READ
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </motion.button>

      {/* Full article modal */}
      <AnimatePresence>
        {open && (
          <ArticleModal
            article={article}
            variant={variant}
            kicker={kicker}
            dateStr={dateStr}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FULL ARTICLE MODAL — opens when READ is clicked
   ═══════════════════════════════════════════════════════════════════════════ */
function ArticleModal({
  article,
  variant,
  kicker,
  dateStr,
  onClose,
}: {
  article: WelcomeArticle;
  variant: "league" | "my";
  kicker: string;
  dateStr: string | null;
  onClose: () => void;
}) {
  // Body lock + ESC to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const paragraphs = (article.body || "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.article
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[760px] h-full sm:h-auto sm:max-h-[90vh] rounded-t-xl sm:rounded-xl overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${C.card} 0%, #0a0d15 100%)`,
          border: `1px solid ${C.goldBorder}`,
          boxShadow: `0 0 0 1px ${C.goldBorder}, 0 24px 80px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Close button — 44px touch target on mobile, 36px on desktop */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close article"
          className="absolute top-3 right-3 z-10 w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gold/15"
          style={{
            background: "rgba(6,8,13,0.85)",
            border: `1px solid ${C.goldBorder}`,
            color: C.gold,
          }}
        >
          <X size={18} />
        </button>

        {/* Top accent bar */}
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldBright}, ${C.gold}, ${C.goldDark})` }}
        />

        {/* Hero image */}
        <HeroMockImage variant={variant} />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-5 sm:py-8 overscroll-contain">
          {/* Meta strip */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap" style={{ fontFamily: MONO }}>
            <span
              className="text-[9px] font-black tracking-[0.14em] px-2 py-1 rounded-sm"
              style={{
                color: C.gold,
                background: `${C.gold}15`,
                border: `1px solid ${C.gold}30`,
              }}
            >
              {kicker}
            </span>
            <span className="text-[10px] text-dim">DYNASTYGPT</span>
            {dateStr && <span className="text-[10px] text-dim">· {dateStr}</span>}
          </div>

          {/* Headline */}
          <h1
            className="text-primary leading-[1.08] tracking-tight mb-3 text-[22px] sm:text-[34px]"
            style={{ fontFamily: DISPLAY }}
          >
            {article.headline}
          </h1>

          {/* Subheadline */}
          <p
            className="text-secondary leading-snug mb-5 sm:mb-6 text-[14px] sm:text-[17px]"
            style={{ fontFamily: SANS, fontWeight: 400 }}
          >
            {article.subheadline}
          </p>

          {/* Body paragraphs */}
          <div className="space-y-4 border-t border-border pt-5">
            {paragraphs.map((p, i) => (
              <ModalParagraph
                key={i}
                text={p}
                index={i}
                totalCount={paragraphs.length}
              />
            ))}
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

/**
 * Render one paragraph in the modal. First paragraph (hardcoded opening) gets
 * a quieter style; last paragraph (hardcoded closing) gets a quieter style;
 * middle AI paragraphs are the main body. NEVER italic.
 */
function ModalParagraph({
  text,
  index,
  totalCount,
}: {
  text: string;
  index: number;
  totalCount: number;
}) {
  const isOpening = index === 0;
  const isClosing = index === totalCount - 1;

  if (isOpening) {
    return (
      <p
        className="text-[13px] sm:text-[14px] leading-relaxed pl-3 border-l-2"
        style={{
          fontFamily: SANS,
          color: C.secondary,
          borderColor: C.gold,
          fontWeight: 500,
        }}
      >
        {text}
      </p>
    );
  }

  if (isClosing) {
    return (
      <p
        className="text-[12px] sm:text-[13px] leading-relaxed text-dim pt-2 border-t border-border"
        style={{ fontFamily: SANS }}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      className="text-[14px] sm:text-[15px] leading-[1.7] text-primary"
      style={{ fontFamily: SANS, fontWeight: 400 }}
    >
      {text}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO MOCK IMAGE — distinct per variant. NEVER uses the same image twice.
   ═══════════════════════════════════════════════════════════════════════════ */
function HeroMockImage({ variant }: { variant: "league" | "my" }) {
  if (variant === "league") return <LeagueHeroMock />;
  return <MyDynastyHeroMock />;
}

/**
 * LEAGUE feature mock — stadium spotlight beam + bottom-aligned shield
 * Vibe: "the league as a whole, all owners under one roof"
 */
function LeagueHeroMock() {
  return (
    <div
      className="relative w-full overflow-hidden flex-shrink-0"
      style={{
        height: HERO_HEIGHT_PX,
        background: `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(212,165,50,0.22) 0%, rgba(212,165,50,0.06) 40%, transparent 75%), linear-gradient(180deg, #06080d 0%, #0a0d15 100%)`,
        borderBottom: `1px solid ${C.goldBorder}`,
      }}
    >
      {/* Field stripes — simulate end zone perspective */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <pattern id="field-lines" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="100" y2="10" stroke={C.gold} strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#field-lines)" />
      </svg>

      {/* Spotlight beams — two diagonal cones from upper corners */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 30%, rgba(212,165,50,0.06) 50%, transparent 70%), linear-gradient(225deg, transparent 30%, rgba(212,165,50,0.06) 50%, transparent 70%)`,
        }}
      />

      {/* Crowd dots row across the bottom */}
      <svg className="absolute bottom-2 left-0 right-0 h-3 opacity-30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin slice">
        <g fill={C.gold}>
          <circle cx="8%" cy="6" r="1" />
          <circle cx="14%" cy="4" r="1" />
          <circle cx="20%" cy="6" r="1" />
          <circle cx="26%" cy="5" r="1" />
          <circle cx="32%" cy="6" r="1" />
          <circle cx="38%" cy="4" r="1" />
          <circle cx="44%" cy="6" r="1" />
          <circle cx="50%" cy="5" r="1" />
          <circle cx="56%" cy="6" r="1" />
          <circle cx="62%" cy="4" r="1" />
          <circle cx="68%" cy="6" r="1" />
          <circle cx="74%" cy="5" r="1" />
          <circle cx="80%" cy="6" r="1" />
          <circle cx="86%" cy="4" r="1" />
          <circle cx="92%" cy="6" r="1" />
        </g>
      </svg>

      {/* Centered: trophy silhouette OR centered shield */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="56" height="62" viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 16px rgba(212,165,50,0.55))" }}>
          <defs>
            <linearGradient id="lg-shield-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="30%" stopColor="#d4a532" />
              <stop offset="50%" stopColor="#f5e6a3" />
              <stop offset="70%" stopColor="#d4a532" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
            <linearGradient id="lg-shield-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5e6a3" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
          <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#lg-shield-1)" strokeWidth="2.5" />
          <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#lg-shield-1)" opacity="0.1" />
          <text x="26" y="40" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#lg-shield-2)">D</text>
        </svg>
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
          THE LEAGUE
        </span>
      </div>
    </div>
  );
}

/**
 * MY DYNASTY mock — radar / stat-card vibe
 * Vibe: "personal scouting report — your dynasty, your numbers"
 */
function MyDynastyHeroMock() {
  return (
    <div
      className="relative w-full overflow-hidden flex-shrink-0"
      style={{
        height: HERO_HEIGHT_PX,
        background: `radial-gradient(ellipse 70% 70% at 30% 50%, rgba(125,211,160,0.14) 0%, rgba(125,211,160,0.03) 50%, transparent 80%), linear-gradient(135deg, #06080d 0%, #0a0d15 100%)`,
        borderBottom: `1px solid ${C.goldBorder}`,
      }}
    >
      {/* Grid lines simulating a stat sheet */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="my-grid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M14,0 L0,0 0,14" fill="none" stroke={C.gold} strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#my-grid)" />
      </svg>

      {/* Bar chart silhouettes on the left — fake stat bars */}
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" width="56" height="64" viewBox="0 0 56 64" xmlns="http://www.w3.org/2000/svg">
        <g fill={C.gold} fillOpacity="0.55">
          <rect x="0" y="40" width="6" height="22" rx="0.5" />
          <rect x="10" y="30" width="6" height="32" rx="0.5" />
          <rect x="20" y="14" width="6" height="48" rx="0.5" />
          <rect x="30" y="22" width="6" height="40" rx="0.5" />
          <rect x="40" y="34" width="6" height="28" rx="0.5" />
          <rect x="50" y="48" width="6" height="14" rx="0.5" />
        </g>
        {/* Trend line on top of bars */}
        <polyline
          points="3,42 13,32 23,16 33,24 43,36 53,50"
          fill="none"
          stroke="#7dd3a0"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Trend dots */}
        <g fill="#7dd3a0">
          <circle cx="3" cy="42" r="1.5" />
          <circle cx="13" cy="32" r="1.5" />
          <circle cx="23" cy="16" r="1.5" />
          <circle cx="33" cy="24" r="1.5" />
          <circle cx="43" cy="36" r="1.5" />
          <circle cx="53" cy="50" r="1.5" />
        </g>
      </svg>

      {/* Right side: shield + "you" tag stacked */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
        <svg width="48" height="54" viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 14px rgba(212,165,50,0.5))" }}>
          <defs>
            <linearGradient id="my-shield-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="30%" stopColor="#d4a532" />
              <stop offset="50%" stopColor="#f5e6a3" />
              <stop offset="70%" stopColor="#d4a532" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
            <linearGradient id="my-shield-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5e6a3" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
          <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#my-shield-1)" strokeWidth="2.5" />
          <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#my-shield-1)" opacity="0.1" />
          <text x="26" y="40" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#my-shield-2)">D</text>
        </svg>
      </div>

      {/* Variant tag — top-left, distinct color from league variant */}
      <div className="absolute top-2 left-2">
        <span
          className="inline-block px-1.5 py-0.5 rounded-sm text-[7px] font-black tracking-[0.14em]"
          style={{
            fontFamily: MONO,
            color: "#7dd3a0",
            background: "rgba(6,8,13,0.85)",
            border: `1px solid rgba(125,211,160,0.35)`,
          }}
        >
          YOUR DYNASTY
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMING SOON — same vertical dimensions as the real card
   ═══════════════════════════════════════════════════════════════════════════ */
function ComingSoonCard({ variant, hasOwner }: { variant: "league" | "my"; hasOwner: boolean }) {
  if (variant === "my" && !hasOwner) {
    return (
      <div
        className="rounded-lg flex items-center justify-center px-4"
        style={{
          height: CARD_HEIGHT_PX,
          background: C.card,
          border: `1px solid ${C.border}`,
        }}
      >
        <div className="text-center">
          <div className="text-xs text-dim mb-1" style={{ fontFamily: SANS }}>
            Sign in to unlock your personalized report
          </div>
          <div className="text-[10px] text-dim/60" style={{ fontFamily: SANS }}>
            Link your Sleeper account to get started
          </div>
        </div>
      </div>
    );
  }

  const headline =
    variant === "league"
      ? "Your league's first article is being written"
      : "Your personalized report is being written";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        height: CARD_HEIGHT_PX,
        background: `linear-gradient(180deg, ${C.card} 0%, #0a0d15 100%)`,
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        className="h-[2px] flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldDark})` }}
      />
      <HeroMockImage variant={variant} />
      <div className="flex-1 min-h-0 px-4 py-3 flex flex-col justify-center">
        <div
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm self-start mb-2"
          style={{
            background: `${C.gold}15`,
            border: `1px solid ${C.gold}30`,
            fontFamily: MONO,
          }}
        >
          <Sparkles size={9} style={{ color: C.gold }} />
          <span className="text-[8px] font-black tracking-[0.12em] text-gold">
            GENERATING
          </span>
        </div>
        <h3
          className="text-primary text-[13px] sm:text-[14px] leading-tight line-clamp-2"
          style={{ fontFamily: DISPLAY }}
        >
          {headline}
        </h3>
        <p className="text-dim text-[10px] mt-1" style={{ fontFamily: SANS }}>
          Drops as soon as your league finishes syncing.
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */
function CardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col border border-border bg-card"
      style={{ height: CARD_HEIGHT_PX }}
    >
      <div
        className="bg-elevated animate-pulse flex-shrink-0"
        style={{ height: HERO_HEIGHT_PX }}
      />
      <div className="px-4 py-3 space-y-2 flex-1">
        <div className="h-2 w-20 bg-elevated rounded animate-pulse" />
        <div className="h-4 w-full bg-elevated rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-elevated rounded animate-pulse" />
        <div className="h-2 w-3/5 bg-elevated rounded animate-pulse" />
      </div>
    </div>
  );
}
