"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function PlatformUpdateModal({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date?: string;
}) {
  const dateLabel = date || "[INSERT DATE]";

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-xl border border-gold/40 bg-panel shadow-[0_0_40px_rgba(212,165,50,0.18)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-panel/95 px-5 py-3 backdrop-blur-sm sm:px-6">
              <span className="font-mono text-[10px] font-black tracking-[0.14em] text-gold">
                PLATFORM UPDATE
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-elevated text-dim transition-colors hover:text-primary cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <article className="px-5 py-5 sm:px-7 sm:py-7">
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-gold-bright leading-tight mb-2">
                Week in Review
                <span className="block text-dim text-[11px] sm:text-xs font-mono font-bold tracking-[0.14em] mt-2">
                  {dateLabel.toUpperCase()}
                </span>
              </h1>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                Couple of weeks since the last update. Here&apos;s what shipped, what&apos;s broken, and what&apos;s next.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Draft HQ — Now Live
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The first pieces of Draft HQ shipped this week. Find both inside Draft HQ on the home page.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                <strong className="font-bold text-primary">ADP.</strong>{" "}
                Built on 10K+ real dynasty drafts and format-aware for your specific league. Whatever your scoring, league size, SF/1QB, TEP/non-TEP — the ADP you see reflects how players are actually drafted in leagues like yours, not a generic consensus board.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                <strong className="font-bold text-primary">My Picks.</strong>{" "}
                Live as a v1 — early, rough, but in your hands for feedback. Looks at your draft picks and tells you who&apos;s likely to be available, what to consider doing with each pick based on your roster needs and window. It needs work and I know it. Wanted to get v1 out so you can use it during the rookie draft window and tell me what&apos;s missing or wrong. Hit the feedback button on anything that&apos;s off.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Also New This Week
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                <strong className="font-bold text-primary">Thumbs Up / Thumbs Down on suggestions.</strong>{" "}
                Two seconds of feedback per trade tells me more than any survey. The reason picker on 👎 helps me pinpoint exactly what&apos;s broken. Every tap directly shapes the next version of the engine. Please use it.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Trade Suggestions — Rebuilding This Week
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The biggest thing on my plate. The survey was clear: some of you said suggestions are sharp, plenty said hit-or-miss. I agree, and I&apos;m not patching this — I&apos;m rebuilding it.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                When suggestions miss, they miss in specific ways. Telling a contender to ship picks for an aging vet. Suggesting two no-name rookie WRs in exchange for a coveted young RB. Recommending trades the partner would never accept. The fix isn&apos;t a better prompt — it&apos;s a foundational rebuild.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                This is where my time is going this week. Trade suggestions are the foundation of a lot of what DynastyGPT does, and the rest of the platform compounds from getting this right.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                AI Trade Advisor — Still Offline
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                Coming back when the new suggestion engine is ready, with the same foundation underneath. Pulling it down was the right call — the hallucinations weren&apos;t acceptable for a tool you&apos;re trusting with real trade decisions.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Trade Grades — Next Up After Suggestions
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                Once suggestions are in a good place, trade grades are next. They&apos;re inconsistent right now and I know it. The grades you see today depend on a few factors that aren&apos;t always weighted right, which is why the same trade can sometimes feel graded differently than it should. Taking a deep look at the whole grading model is on the roadmap — not this week, but soon after suggestions ship.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Draft HQ — What&apos;s Coming
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                ADP and My Picks are the foundation. What&apos;s coming next:
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                A simulated draft board for your league — see how your draft is likely to play out before it happens, with picks projected based on ADP from similar leagues plus your own league&apos;s history and individual owner tendencies.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                A full mock simulator with a trade layer — run a mock with your actual leaguemates picking based on how they behave. At any point, explore moving up or back. The simulator tells you which owners would realistically engage and what they&apos;d take. Accept a hypothetical trade and keep the mock running from your new slot.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                That&apos;s the roadmap for Draft HQ. Trade suggestions come first, but the draft pieces are next in queue.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] font-semibold text-primary">
                More soon.
              </p>
            </article>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
