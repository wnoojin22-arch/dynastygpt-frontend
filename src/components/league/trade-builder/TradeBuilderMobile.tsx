"use client";

/**
 * TRADE BUILDER MOBILE — "Tinder for Trades"
 * Full-screen card-based experience with swipe gestures.
 *
 * States:
 *   1. Entry — action buttons (Suggest, Find QB/RB/WR/TE) + style toggle
 *   2. Loading — skeleton card with animated scanning text
 *   3. Swipe stack — swipeable suggestion cards
 *   4. Build — pre-loaded trade preview from a selected suggestion
 *   5. Complete — summary after all cards swiped
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ShoppingCart, Trash2 } from "lucide-react";
import SwipeStack from "./SwipeStack";
import TapToBuild from "./TapToBuild";
import type { SuggestedPackage, TradeAsset } from "./types";
import type { UseTradeBuilderReturn } from "@/hooks/useTradeBuilder";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import { useOwnerClick } from "@/hooks/useOwnerClick";

const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
const MODES = ["conservative", "balanced", "aggressive"] as const;
const MODE_COLORS: Record<string, string> = {
  conservative: "#7dd3a0",
  balanced: "#d4a532",
  aggressive: "#e47272",
};

const LOADING_MESSAGES = [
  "Scanning your roster...",
  "Profiling your opponents...",
  "Analyzing 500K+ trades...",
  "Matching behavioral patterns...",
  "Building packages...",
  "Finalizing suggestions...",
];

/* ── helpers ── */
function posColor(pos: string) {
  if (pos === "QB") return "#e47272";
  if (pos === "RB") return "#6bb8e0";
  if (pos === "WR") return "#7dd3a0";
  if (pos === "TE") return "#e09c6b";
  return "#9596a5";
}

function acceptColor(s: number) {
  if (s >= 70) return "#7dd3a0";
  if (s >= 50) return "#d4a532";
  if (s >= 30) return "#e09c6b";
  return "#e47272";
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Skeleton card */}
        <div
          className="rounded-2xl border border-[#d4a53225] bg-[#10131d] p-6 space-y-5"
          style={{ animation: "pulse-gold 2s ease infinite" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1a1e30]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[#1a1e30]" />
              <div className="h-2.5 w-20 rounded bg-[#1a1e30]" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[#1a1e30]" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-2 w-10 rounded bg-[#e4727220]" />
              <div className="h-3.5 w-full rounded bg-[#1a1e30]" />
              <div className="h-3.5 w-3/4 rounded bg-[#1a1e30]" />
            </div>
            <div className="w-px bg-[#1a1e30]" />
            <div className="flex-1 space-y-2">
              <div className="h-2 w-10 rounded bg-[#7dd3a020]" />
              <div className="h-3.5 w-full rounded bg-[#1a1e30]" />
              <div className="h-3.5 w-3/4 rounded bg-[#1a1e30]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-[#1a1e30]" />
            <div className="h-1.5 w-3/4 rounded-full bg-[#1a1e30]" />
          </div>
          <div className="h-3 w-full rounded bg-[#1a1e30]" />
          <div className="h-3 w-2/3 rounded bg-[#1a1e30]" />
        </div>
        <div className="mt-6 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-xs font-bold tracking-widest text-[#d4a532]"
            >
              {LOADING_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN MOBILE VIEW
   ══════════════════════════════════════════════════ */
type MobileState = "entry" | "loading" | "results" | "build" | "queue";

export default function TradeBuilderMobile({
  tb,
  leagueId,
  owner,
  ownerId,
}: {
  tb: UseTradeBuilderReturn;
  leagueId: string;
  owner: string;
  ownerId?: string | null;
}) {
  const {
    mode,
    setMode,
    suggestedPkgs,
    suggestLoading,
    suggestQuery,
    error,
    setError,
    handleFindPosition,
    handleSuggestWithPartner,
    buildPackage,
    handleClear,
  } = tb;

  const { queuedTrades, addToQueue, removeFromQueue, clearQueue } = useTradeBuilderStore();
  const onOwnerClick = useOwnerClick();

  const [mobileState, setMobileState] = useState<MobileState>("entry");
  const [selectedPkg, setSelectedPkg] = useState<SuggestedPackage | null>(null);
  // Track which card index to resume at when returning from build preview
  const [resumeIndex, setResumeIndex] = useState(0);
  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  // Track loading → results transitions
  useEffect(() => {
    if (suggestLoading) {
      setMobileState("loading");
      setResumeIndex(0);
    } else if (suggestedPkgs.length > 0 && mobileState === "loading") {
      setMobileState("results");
    }
  }, [suggestLoading, suggestedPkgs.length, mobileState]);

  // Handle error — go back to entry
  useEffect(() => {
    if (error && mobileState === "loading") {
      setMobileState("entry");
    }
  }, [error, mobileState]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAction = useCallback(
    (action: "suggest" | "QB" | "RB" | "WR" | "TE") => {
      setError(null);
      if (action === "suggest") {
        handleSuggestWithPartner();
      } else {
        handleFindPosition(action);
      }
    },
    [handleSuggestWithPartner, handleFindPosition, setError],
  );

  // Swipe right: store package and go to build preview — do NOT call buildPackage yet
  const handleSwipeRight = useCallback(
    (pkg: SuggestedPackage, cardIndex: number) => {
      setSelectedPkg(pkg);
      setResumeIndex(cardIndex + 1); // next card when they come back
      setMobileState("build");
    },
    [],
  );

  const handleSwipeLeft = useCallback((_pkg: SuggestedPackage) => {
    // No-op for skip — just advance the stack
  }, []);

  // Save from TapToBuild: build a modified package and add to queue
  const handleSaveBuild = useCallback(
    (giveNames: string[], receiveNames: string[], partnerName: string) => {
      if (selectedPkg) {
        const modified: SuggestedPackage = {
          ...selectedPkg,
          partner: partnerName,
          i_give_names: giveNames,
          i_receive_names: receiveNames,
        };
        addToQueue(modified);
        setToast(`Trade saved (${queuedTrades.length + 1} in queue)`);
      }
      setSelectedPkg(null);
      setMobileState("results");
    },
    [selectedPkg, addToQueue, queuedTrades.length],
  );

  // Back from build preview: return to swipe stack at the next card
  const handleBackToStack = useCallback(() => {
    setSelectedPkg(null);
    setMobileState("results");
  }, []);

  const handleComplete = useCallback((_built: number, _skipped: number) => {
    // All cards reviewed — go to queue if trades saved, else back to entry
    if (queuedTrades.length > 0) {
      setMobileState("queue");
    } else {
      setMobileState("entry");
    }
  }, [queuedTrades.length]);

  const handleBack = useCallback(() => {
    handleClear();
    setSelectedPkg(null);
    setResumeIndex(0);
    setMobileState("entry");
  }, [handleClear]);

  return (
    <div className="flex flex-col h-full bg-[#06080d]">
      <style>{`@keyframes pulse-gold{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1e30] shrink-0">
        {mobileState !== "entry" && (
          <button
            onClick={mobileState === "build" ? handleBackToStack : mobileState === "queue" ? () => setMobileState(suggestedPkgs.length > 0 ? "results" : "entry") : handleBack}
            className="p-1 -ml-1 text-[#9596a5] active:text-[#eeeef2] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-['Archivo_Black'] text-base text-[#eeeef2] tracking-wider">
            {mobileState === "build" ? "BUILD TRADE" : mobileState === "queue" ? "TRADE QUEUE" : "TRADE BUILDER"}
          </h1>
          {owner && mobileState === "entry" && (
            <p className="font-mono text-[10px] text-[#9596a5] tracking-wide truncate">{owner}</p>
          )}
          {mobileState === "build" && selectedPkg && (
            <p className="font-mono text-[10px] text-[#d4a532] tracking-wide truncate">with {selectedPkg.partner}</p>
          )}
          {suggestQuery && mobileState !== "entry" && mobileState !== "build" && (
            <p className="font-mono text-[10px] text-[#d4a532] tracking-wide truncate">{suggestQuery}</p>
          )}
        </div>
        {suggestedPkgs.length > 0 && mobileState === "results" && (
          <span className="font-mono text-[10px] font-bold text-[#9596a5] tracking-wider">
            {suggestedPkgs.length} TRADE{suggestedPkgs.length !== 1 ? "S" : ""}
          </span>
        )}
        {/* Queue badge — always visible when trades are queued */}
        {queuedTrades.length > 0 && mobileState !== "queue" && (
          <button
            onClick={() => setMobileState("queue")}
            className="relative p-1.5 active:opacity-70 transition-opacity"
          >
            <ShoppingCart size={18} className="text-[#d4a532]" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#d4a532] text-[#06080d] font-mono text-[9px] font-black flex items-center justify-center">
              {queuedTrades.length}
            </span>
          </button>
        )}
      </div>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-14 left-4 right-4 z-50"
          >
            <div className="px-4 py-2.5 rounded-xl bg-[#d4a53218] border border-[#d4a53240] text-center">
              <span className="font-mono text-xs font-bold text-[#d4a532] tracking-wide">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR BANNER ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-[#e4727212] border border-[#e4727240] flex items-center gap-2">
              <span className="font-sans text-xs text-[#e47272] flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-[#9596a5] text-sm">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STATE 1: ENTRY ── */}
      {mobileState === "entry" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col px-5 pt-6 pb-4"
        >
          <button
            onClick={() => handleAction("suggest")}
            className="w-full py-4 rounded-2xl font-['Archivo_Black'] text-base tracking-widest text-[#06080d] active:opacity-80 transition-opacity mb-4"
            style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
          >
            SUGGEST TRADES
          </button>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {POSITIONS.map((pos) => {
              const pc =
                pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : "#e09c6b";
              return (
                <button
                  key={pos}
                  onClick={() => handleAction(pos)}
                  className="py-3.5 rounded-xl font-['Archivo_Black'] text-sm tracking-wider border active:scale-95 transition-transform"
                  style={{ color: pc, borderColor: `${pc}40`, background: `${pc}08` }}
                >
                  FIND {pos}
                </button>
              );
            })}
          </div>
          <div className="mt-auto">
            <span className="font-mono text-[9px] font-bold tracking-widest text-[#9596a5] block mb-2">
              TRADE STYLE
            </span>
            <div className="flex rounded-xl border border-[#1a1e30] overflow-hidden">
              {MODES.map((m) => {
                const isActive = mode === m;
                const mc = MODE_COLORS[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      color: isActive ? mc : "#9596a5",
                      background: isActive ? `${mc}15` : "transparent",
                      borderRight: m !== "aggressive" ? "1px solid #1a1e30" : "none",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STATE 2: LOADING ── */}
      {mobileState === "loading" && <LoadingSkeleton />}

      {/* ── STATE 3: SWIPE STACK ── */}
      {mobileState === "results" && suggestedPkgs.length > 0 && (
        <SwipeStack
          packages={suggestedPkgs}
          startIndex={resumeIndex}
          leagueId={leagueId}
          owner={owner}
          ownerId={ownerId}
          mode={tb.suggestQuery?.includes("Finding") ? "shop" : tb.suggestQuery?.includes("Selling") ? "sell" : "coach"}
          style={mode}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          onComplete={handleComplete}
        />
      )}

      {/* ── STATE 3b: No results ── */}
      {mobileState === "results" && suggestedPkgs.length === 0 && !suggestLoading && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-sans text-sm text-[#9596a5] mb-2">
            No viable trades found at this aggression level.
          </p>
          <p className="font-mono text-xs text-[#d4a532]">Try AGGRESSIVE mode for more options.</p>
          <button
            onClick={handleBack}
            className="mt-6 px-6 py-2.5 rounded-xl border border-[#1a1e30] font-mono text-xs font-bold tracking-wider text-[#9596a5] active:bg-[#171b28] transition-colors"
          >
            GO BACK
          </button>
        </div>
      )}

      {/* ── STATE 4: TAP-TO-BUILD ── */}
      {mobileState === "build" && selectedPkg && (
        <TapToBuild
          pkg={selectedPkg}
          leagueId={leagueId}
          owner={owner}
          ownerId={ownerId}
          ownerRoster={tb.myRoster}
          mode={tb.mode}
          myWindow={tb.myWindow}
          theirWindow={tb.theirWindow}
          onSave={handleSaveBuild}
          onBack={handleBackToStack}
        />
      )}

      {/* ── STATE 5: TRADE QUEUE ── */}
      {mobileState === "queue" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1e30]">
            <div>
              <h2 className="font-['Archivo_Black'] text-base text-[#eeeef2] tracking-wider">TRADE QUEUE</h2>
              <p className="font-mono text-[10px] text-[#9596a5] tracking-wide">{queuedTrades.length} trade{queuedTrades.length !== 1 ? "s" : ""} saved</p>
            </div>
            {queuedTrades.length > 0 && (
              <button
                onClick={clearQueue}
                className="font-mono text-[10px] font-bold tracking-wider text-[#e47272] active:opacity-60 transition-opacity"
              >
                CLEAR ALL
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {queuedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart size={32} className="text-[#9596a540] mb-3" />
                <p className="font-sans text-sm text-[#9596a5]">No trades in queue</p>
                <p className="font-mono text-xs text-[#9596a560] mt-1">Swipe right on trades you like</p>
              </div>
            ) : (
              queuedTrades.map((pkg, idx) => {
                const give = (pkg.i_give || []) as TradeAsset[];
                const recv = (pkg.i_receive || []) as TradeAsset[];
                const acc = pkg.acceptance_likelihood || 0;
                const accClr = acceptColor(acc);
                return (
                  <div key={idx} className="rounded-xl border border-[#1a1e30] bg-[#10131d] p-3">
                    {/* Partner + acceptance */}
                    <div className="flex items-center justify-between mb-2">
                      <span onClick={(e) => { e.stopPropagation(); onOwnerClick(pkg.partner); }} className="font-['Archivo_Black'] text-sm text-[#eeeef2] tracking-wide cursor-pointer border-b border-dotted border-[#1a1e30]">{pkg.partner}</span>
                      <span className="font-mono text-sm font-black" style={{ color: accClr }}>{acc}%</span>
                    </div>
                    {/* Send / Get summary */}
                    <div className="flex gap-3 mb-2">
                      <div className="flex-1">
                        <span className="font-mono text-[8px] font-black tracking-widest text-[#e47272]">SEND</span>
                        {give.map((a, i) => (
                          <div key={i} className="font-sans text-[11px] text-[#b0b2c8] truncate">
                            <span className="font-mono text-[9px] font-bold mr-1" style={{ color: posColor(a.position) }}>{a.position}</span>
                            {a.name}
                          </div>
                        ))}
                      </div>
                      <div className="w-px bg-[#1a1e30]" />
                      <div className="flex-1">
                        <span className="font-mono text-[8px] font-black tracking-widest text-[#7dd3a0]">GET</span>
                        {recv.map((a, i) => (
                          <div key={i} className="font-sans text-[11px] text-[#b0b2c8] truncate">
                            <span className="font-mono text-[9px] font-bold mr-1" style={{ color: posColor(a.position) }}>{a.position}</span>
                            {a.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPkg(pkg);
                          removeFromQueue(idx);
                          setMobileState("build");
                        }}
                        className="flex-1 py-2 rounded-lg font-mono text-[10px] font-bold tracking-wider text-[#06080d]"
                        style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
                      >
                        CUSTOMIZE
                      </button>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="px-3 py-2 rounded-lg border border-[#e4727240] active:bg-[#e4727215] transition-colors"
                      >
                        <Trash2 size={14} className="text-[#e47272]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom action */}
          <div className="px-5 pb-4 pt-2 border-t border-[#1a1e30] shrink-0">
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-xl font-['Archivo_Black'] text-sm tracking-wider text-[#06080d] active:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(135deg, #8b6914, #d4a532)" }}
            >
              BACK TO SUGGESTIONS
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
