"use client";

import { useState, useCallback, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";
import SuggestionCardMobile from "./cards/SuggestionCardMobile";
import type { SuggestedPackage, TradeAsset } from "./types";

const SWIPE_THRESHOLD = 120;
const ROTATION_FACTOR = 15; // max degrees of rotation at full drag
const TRACK_URL = "/api/swipes/track";

/** Fire-and-forget swipe tracking — never blocks UI */
function trackSwipe(
  pkg: SuggestedPackage,
  action: "right" | "left",
  ctx: { leagueId: string; owner: string; ownerId?: string | null; mode?: string; style?: string },
) {
  const give = (pkg.i_give || []) as TradeAsset[];
  const receive = (pkg.i_receive || []) as TradeAsset[];
  const payload = {
    league_id: ctx.leagueId,
    owner_name: ctx.owner,
    owner_user_id: ctx.ownerId || null,
    partner_name: pkg.partner,
    mode: ctx.mode || null,
    style: ctx.style || null,
    action,
    give_assets: give.map((a) => ({ name: a.name, position: a.position, value: a.sha ?? a.dynasty ?? 0 })),
    receive_assets: receive.map((a) => ({ name: a.name, position: a.position, value: a.sha ?? a.dynasty ?? 0 })),
    give_total: give.reduce((s, a) => s + (a.sha ?? a.dynasty ?? 0), 0),
    receive_total: receive.reduce((s, a) => s + (a.sha ?? a.dynasty ?? 0), 0),
    acceptance_score: pkg.acceptance_likelihood || 0,
    rationale: pkg.narrative || pkg.pitch || null,
  };
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_URL, JSON.stringify(payload));
    } else {
      fetch(TRACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Tracking is best-effort
  }
}

interface Props {
  packages: SuggestedPackage[];
  startIndex?: number;
  leagueId: string;
  owner: string;
  ownerId?: string | null;
  mode?: string;
  style?: string;
  onSwipeRight: (pkg: SuggestedPackage, cardIndex: number) => void;
  onSwipeLeft: (pkg: SuggestedPackage) => void;
  onComplete: (built: number, skipped: number) => void;
}

export default function SwipeStack({ packages, startIndex = 0, leagueId, owner, ownerId, mode, style, onSwipeRight, onSwipeLeft, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [builtCount, setBuiltCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Sync with startIndex when returning from build preview
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-ROTATION_FACTOR, 0, ROTATION_FACTOR]);
  const buildOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const current = packages[currentIndex];
  const next = packages[currentIndex + 1];

  const advance = useCallback(
    (direction: "left" | "right") => {
      const pkg = packages[currentIndex];
      if (!pkg) return;

      setExitDirection(direction);
      trackSwipe(pkg, direction, { leagueId, owner, ownerId, mode, style });
      if (direction === "right") {
        onSwipeRight(pkg, currentIndex);
        setBuiltCount((c) => c + 1);
      } else {
        onSwipeLeft(pkg);
        setSkippedCount((c) => c + 1);
      }

      // Small delay so exit animation plays
      setTimeout(() => {
        setExitDirection(null);
        const nextIdx = currentIndex + 1;
        if (nextIdx >= packages.length) {
          onComplete(
            builtCount + (direction === "right" ? 1 : 0),
            skippedCount + (direction === "left" ? 1 : 0),
          );
        }
        setCurrentIndex(nextIdx);
        x.set(0);
      }, 300);
    },
    [currentIndex, packages, onSwipeRight, onSwipeLeft, onComplete, builtCount, skippedCount, x],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) {
        advance("right");
      } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
        advance("left");
      }
    },
    [advance],
  );

  // All cards swiped — summary
  if (currentIndex >= packages.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center px-8 text-center"
      >
        <div className="text-5xl mb-4">&#9889;</div>
        <h2 className="font-['Archivo_Black'] text-xl text-[#eeeef2] tracking-wide mb-2">
          ALL CAUGHT UP
        </h2>
        <p className="font-sans text-sm text-[#b0b2c8] leading-relaxed mb-6">
          You reviewed {packages.length} trade{packages.length !== 1 ? "s" : ""}
          {builtCount > 0 && <> &middot; Built <span className="text-[#d4a532] font-bold">{builtCount}</span></>}
          {skippedCount > 0 && <> &middot; Skipped {skippedCount}</>}
        </p>
        <div className="font-mono text-[10px] text-[#9596a5] tracking-widest">
          TAP A BUTTON ABOVE TO FIND MORE
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Card stack */}
      <div className="flex-1 relative mx-4 my-3">
        {/* Background card (next) — slightly scaled down for depth */}
        {next && (
          <div
            className="absolute inset-0 rounded-2xl border border-[#1a1e30] bg-[#10131d] overflow-hidden"
            style={{ transform: "scale(0.95) translateY(8px)", opacity: 0.5 }}
          >
            <SuggestionCardMobile pkg={next} />
          </div>
        )}

        {/* Active card */}
        <AnimatePresence mode="wait">
          {current && !exitDirection && (
            <motion.div
              key={currentIndex}
              className="absolute inset-0 rounded-2xl border border-[#252a3e] bg-[#10131d] overflow-y-auto overflow-x-hidden shadow-2xl"
              style={{ x, rotate, touchAction: "pan-y" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Swipe overlay labels */}
              <motion.div
                className="absolute inset-0 rounded-2xl z-10 pointer-events-none flex items-center justify-start pl-8"
                style={{ opacity: skipOpacity }}
              >
                <div className="px-4 py-2 rounded-lg border-2 border-[#e47272] bg-[#e4727220] -rotate-12">
                  <span className="font-['Archivo_Black'] text-lg text-[#e47272] tracking-wider">SKIP</span>
                </div>
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-2xl z-10 pointer-events-none flex items-center justify-end pr-8"
                style={{ opacity: buildOpacity }}
              >
                <div className="px-4 py-2 rounded-lg border-2 border-[#d4a532] bg-[#d4a53220] rotate-12">
                  <span className="font-['Archivo_Black'] text-lg text-[#d4a532] tracking-wider">BUILD</span>
                </div>
              </motion.div>

              <SuggestionCardMobile pkg={current} />
            </motion.div>
          )}

          {/* Exit animation */}
          {current && exitDirection && (
            <motion.div
              key={`exit-${currentIndex}`}
              className="absolute inset-0 rounded-2xl border border-[#252a3e] bg-[#10131d] overflow-hidden shadow-2xl"
              initial={{ x: 0, rotate: 0, opacity: 1 }}
              animate={{
                x: exitDirection === "right" ? 400 : -400,
                rotate: exitDirection === "right" ? 20 : -20,
                opacity: 0,
              }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              {/* Gold flash on build */}
              {exitDirection === "right" && (
                <motion.div
                  className="absolute inset-0 rounded-2xl z-20 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 0.3 }}
                  style={{ background: "radial-gradient(circle, #d4a53240 0%, transparent 70%)" }}
                />
              )}
              <SuggestionCardMobile pkg={current} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-4 pt-1">
        {packages.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === currentIndex ? 16 : 6,
              height: 6,
              background: i === currentIndex ? "#d4a532" : i < currentIndex ? "#d4a53240" : "#1a1e30",
            }}
          />
        ))}
      </div>

      {/* Manual swipe buttons (accessibility fallback) */}
      <div className="flex gap-3 px-6 pb-4">
        <button
          onClick={() => advance("left")}
          className="flex-1 py-3 rounded-xl border border-[#1a1e30] bg-[#0a0d15] font-['Archivo_Black'] text-sm tracking-wider text-[#9596a5] active:bg-[#171b28] transition-colors"
        >
          SKIP
        </button>
        <button
          onClick={() => advance("right")}
          className="flex-1 py-3 rounded-xl font-['Archivo_Black'] text-sm tracking-wider text-[#06080d] active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
        >
          BUILD THIS TRADE
        </button>
      </div>
    </div>
  );
}
