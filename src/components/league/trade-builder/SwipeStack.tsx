"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import SuggestionCardMobile from "./cards/SuggestionCardMobile";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import type { SuggestedPackage } from "./types";

const SWIPE_THRESHOLD = 100;
const ROTATION_FACTOR = 15;

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

export default function SwipeStack({ packages, startIndex = 0, onSwipeRight, onSwipeLeft, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [builtCount, setBuiltCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const advancing = useRef(false);

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
    async (direction: "left" | "right") => {
      if (advancing.current) return;
      const pkg = packages[currentIndex];
      if (!pkg) return;
      advancing.current = true;

      const newBuilt = builtCount + (direction === "right" ? 1 : 0);
      const newSkipped = skippedCount + (direction === "left" ? 1 : 0);

      if (direction === "right") {
        useTradeBuilderStore.getState().addToQueue(pkg);
        onSwipeRight(pkg, currentIndex);
        setBuiltCount(newBuilt);
      } else {
        onSwipeLeft(pkg);
        setSkippedCount(newSkipped);
      }

      // Animate card off screen via the motion value — no state toggle, no AnimatePresence fight
      await animate(x, direction === "right" ? 400 : -400, {
        type: "spring",
        stiffness: 300,
        damping: 30,
      });

      // Reset position and advance
      x.set(0);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      advancing.current = false;

      if (nextIdx >= packages.length) {
        onComplete(newBuilt, newSkipped);
      }
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

  // All cards swiped
  if (currentIndex >= packages.length) {
    return null;
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

        {/* Active card — single element, animate x directly */}
        {current && (
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
            {/* SKIP overlay (drag left) */}
            <motion.div
              className="absolute inset-0 rounded-2xl z-10 pointer-events-none flex items-center justify-start pl-8"
              style={{ opacity: skipOpacity }}
            >
              <div className="px-4 py-2 rounded-lg border-2 border-[#e47272] bg-[#e4727220] -rotate-12">
                <span className="font-['Archivo_Black'] text-lg text-[#e47272] tracking-wider">SKIP</span>
              </div>
            </motion.div>
            {/* BUILD overlay (drag right) */}
            <motion.div
              className="absolute inset-0 rounded-2xl z-10 pointer-events-none flex items-center justify-end pr-8"
              style={{ opacity: buildOpacity }}
            >
              <div className="px-4 py-2 rounded-lg border-2 border-[#d4a532] bg-[#d4a53220] rotate-12">
                <span className="font-['Archivo_Black'] text-lg text-[#d4a532] tracking-wider">SAVE</span>
              </div>
            </motion.div>

            <SuggestionCardMobile pkg={current} />
          </motion.div>
        )}
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

      {/* Manual swipe buttons */}
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
          SAVE TRADE
        </button>
      </div>
    </div>
  );
}
