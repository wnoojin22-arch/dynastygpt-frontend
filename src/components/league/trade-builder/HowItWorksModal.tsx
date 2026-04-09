"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

/* ═══════════════════════════════════════════════════════════════
   SHARED — section label, mode card, style pill
   ═══════════════════════════════════════════════════════════════ */

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="mb-3 mt-6 first:mt-0">
      <h3 className="font-mono text-[9px] font-black tracking-[0.14em] text-gold mb-2">{text}</h3>
      <div className="h-px bg-gold/20" />
    </div>
  );
}

function ModeCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-lg bg-elevated border border-border p-3 hover:border-gold/25 transition-colors">
      <div className="font-mono text-[11px] font-bold text-primary mb-1">{name}</div>
      <div className="font-sans text-[11px] text-dim leading-relaxed">{desc}</div>
    </div>
  );
}

function StylePill({ name, desc, color }: { name: string; desc: string; color: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border p-2.5 text-center" style={{ borderTopColor: color, borderTopWidth: 2 }}>
      <div className="font-mono text-[10px] font-bold mb-0.5" style={{ color }}>{name}</div>
      <div className="font-sans text-[10px] text-dim leading-snug">{desc}</div>
    </div>
  );
}

function CrossPromo({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-lg border border-gold/15 bg-gold/[0.03] p-3.5">
      <div className="font-sans text-[11px] text-dim/80 leading-relaxed">{text}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DESKTOP CONTENT
   ═══════════════════════════════════════════════════════════════ */

function DesktopContent() {
  return (
    <div>
      <SectionLabel text="THREE COLUMNS, ONE WORKFLOW" />
      <div className="space-y-2 font-sans text-[12px] text-secondary leading-relaxed">
        <div><span className="font-mono text-[10px] font-bold text-gold mr-1.5">LEFT</span> Your roster grouped by position. Click any player to add them to the trade. Click multiple to build a package.</div>
        <div><span className="font-mono text-[10px] font-bold text-gold mr-1.5">CENTER</span> The trade tray. See what you're sending and receiving in real time with a live value balance bar.</div>
        <div><span className="font-mono text-[10px] font-bold text-gold mr-1.5">RIGHT</span> Your partner's roster, AI suggestion results, or an explore prompt depending on what's active.</div>
      </div>

      <SectionLabel text="CHOOSE YOUR APPROACH" />
      <div className="grid grid-cols-2 gap-2">
        <ModeCard name="Coach Mode" desc="No partner selected. AI scans all opponents and surfaces the 5 best trades available right now." />
        <ModeCard name="Partner Mode" desc="Select a partner from the dropdown. AI focuses on 2-4 deals based on their tendencies." />
        <ModeCard name="Sell Mode" desc="Click players on your roster to build a package. AI finds the best return across the league." />
        <ModeCard name="Find Position" desc="Hit FIND QB/RB/WR/TE. AI targets the best upgrade at that position from teams with surplus." />
        <ModeCard name="Acquire Mode" desc="Click a player on the partner's roster. AI builds the best package to land them." />
        <ModeCard name="Improve Mode" desc="Assets on both sides? AI refines and optimizes your existing package." />
      </div>

      <SectionLabel text="SET YOUR STYLE" />
      <div className="flex gap-2">
        <StylePill name="CONSERVATIVE" desc="Safest proposals, highest acceptance" color="#7dd3a0" />
        <StylePill name="BALANCED" desc="Default. Solid proposals, realistic odds" color="#d4a532" />
        <StylePill name="AGGRESSIVE" desc="Creative reaches. Lower acceptance, higher upside" color="#e47272" />
      </div>

      <SectionLabel text="MY MODE & THEIR LENS" />
      <p className="font-sans text-[12px] text-secondary leading-relaxed">
        Toggle your win posture (Rebuilder / Balanced / Win-Now) and your partner's perceived window. This shapes how the AI constructs packages — a rebuilder should be receiving picks, a contender shouldn't be sending them.
      </p>

      <SectionLabel text="TRADE ADVISOR CHAT" />
      <p className="font-sans text-[12px] text-secondary leading-relaxed">
        The collapsible chat panel on the right knows your active trade, your roster, and all AI suggestions. Ask it anything — who to target, whether a deal is fair, what a specific owner actually responds to. It gets sharper the more context you give it.
      </p>

      <SectionLabel text="GETTING A GRADE" />
      <p className="font-sans text-[12px] text-secondary leading-relaxed">
        Build a trade on both sides and hit ANALYZE. Returns a letter grade, score, verdict, acceptance likelihood, and a full dimensional breakdown — value return, asset quality, roster impact, positional need, and strategic fit. Share the result as an image directly from the analysis panel.
      </p>

      <CrossPromo text="On mobile? The Trade Builder is a completely different experience — swipe through AI suggestions like Tinder, build trades with a tap, and search any player or owner instantly. Try it on your phone." />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE CONTENT
   ═══════════════════════════════════════════════════════════════ */

function MobileContent() {
  return (
    <div>
      <SectionLabel text="TWO WAYS IN" />
      <div className="space-y-2 font-sans text-[12px] text-secondary leading-relaxed">
        <div>Search for any player or owner from the search bar at the top — tap a player to add them to your trade, tap an owner to set them as your partner.</div>
        <div>Or tap any owner from the grid to start a targeted deal with them.</div>
      </div>

      <SectionLabel text="BUILDING YOUR TRADE" />
      <div className="space-y-2 font-sans text-[12px] text-secondary leading-relaxed">
        <div>Once a partner or player is selected you enter the builder.</div>
        <div>Your <span className="font-mono text-[10px] font-bold text-accent-red">SEND</span> and <span className="font-mono text-[10px] font-bold text-accent-green">GET</span> assets appear as scrollable chips at the top — tap X to remove.</div>
        <div>Browse your roster and your partner's roster using the tabs and position filters. Tap any player to toggle them in or out.</div>
        <div>The balance bar updates in real time showing the value gap.</div>
      </div>

      <SectionLabel text="SWIPE TO EXPLORE" />
      <div className="space-y-2 font-sans text-[12px] text-secondary leading-relaxed">
        <div>Hit <span className="font-mono text-[10px] font-bold text-gold">SUGGEST TRADES</span> to let the AI find the best deals available.</div>
        <div>Suggestions come back as a card stack — <span className="font-bold text-primary">swipe right</span> to save a trade, <span className="font-bold text-primary">swipe left</span> to skip.</div>
        <div>Saved trades go to your queue for review. Tap CUSTOMIZE on any queued trade to load it back into the builder.</div>
      </div>

      <SectionLabel text="WHAT WOULD IT TAKE?" />
      <p className="font-sans text-[12px] text-secondary leading-relaxed">
        Add players to your GET side without setting your SEND side and the AI will figure out what a fair offer looks like. Great for when you know what you want but aren't sure what to give up.
      </p>

      <SectionLabel text="SET YOUR STYLE" />
      <div className="flex gap-2">
        <StylePill name="CONSERVATIVE" desc="Safest proposals, highest acceptance" color="#7dd3a0" />
        <StylePill name="BALANCED" desc="Default" color="#d4a532" />
        <StylePill name="AGGRESSIVE" desc="Creative reaches, lower acceptance" color="#e47272" />
      </div>

      <SectionLabel text="GRADE YOUR TRADE" />
      <p className="font-sans text-[12px] text-secondary leading-relaxed">
        Once assets are on both sides hit ANALYZE. Get a letter grade, score, verdict, acceptance likelihood, and a full breakdown. Hit SHARE to capture and send the result as an image.
      </p>

      <CrossPromo text="On desktop? The Trade Builder has a three-column layout with both rosters visible at once, a live chat advisor, window toggles, and deeper analysis. Worth checking out on a wider screen." />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODAL SHELLS
   ═══════════════════════════════════════════════════════════════ */

function DesktopModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-[96vw] max-w-[580px] max-h-[85vh] overflow-y-auto rounded-xl bg-panel border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-panel/95 backdrop-blur-sm">
          <div>
            <div className="font-['Archivo_Black'] text-base text-primary tracking-wide">Trade Builder</div>
            <div className="font-mono text-[9px] text-dim tracking-[0.12em] mt-0.5">DESKTOP GUIDE</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center text-dim hover:text-primary transition-colors cursor-pointer">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pb-6">
          <DesktopContent />
        </div>
      </motion.div>
    </div>
  );
}

function MobileModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-panel border-t border-border"
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10 bg-panel">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-['Archivo_Black'] text-base text-primary tracking-wide">Trade Builder</div>
              <div className="font-mono text-[9px] text-dim tracking-[0.12em] mt-0.5">MOBILE GUIDE</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center text-dim cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <MobileContent />
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS — Button + Modal
   ═══════════════════════════════════════════════════════════════ */

export function HowItWorksButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-dim hover:text-primary hover:border-gold/30 transition-colors cursor-pointer ${className || ""}`}
      >
        <HelpCircle size={14} />
        {!mobile && <span className="font-mono text-[10px] font-bold tracking-wider">How it works</span>}
      </button>
      <AnimatePresence>
        {open && (mobile ? <MobileModal onClose={() => setOpen(false)} /> : <DesktopModal onClose={() => setOpen(false)} />)}
      </AnimatePresence>
    </>
  );
}
