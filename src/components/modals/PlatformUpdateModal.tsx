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
                A week and a half since the last update. Two big systems got rebuilt this stretch. Both are live in beta now.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Trade Engine — Rebuilt
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The old engine computed a target value for the player(s) you wanted and searched a partner&apos;s roster for packages hitting that value. Reasonable but generic — every trade got the same math regardless of who was sending what or who was on the other side. You&apos;d get a package that &ldquo;matched on value&rdquo; but didn&apos;t always feel right.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The new engine grounds every suggestion in actual market data. Over six million dynasty trades sit underneath, and for every player and pick that flows through the engine, there&apos;s a market profile built from real trades involving that asset. Not theoretical values — what actual leagues paid, who paid it, and what came back.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                What that means in practice: the engine scans each partner&apos;s full roster against your needs and surfaces packages that mirror trades that have actually happened. If a Ja&apos;Marr Chase typically goes for &ldquo;elite RB plus a first&rdquo; in your scoring format, those archetypes show up. If your league trades picks at a 15% premium versus the rest of the dynasty world, the engine picks that up. It reads behavioral signals about your partners — a contender with weak WR depth gets different package suggestions than a rebuilder hoarding picks.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                <strong className="font-bold text-primary">Up front:</strong>{" "}
                it will never be perfect. Engines that promise the optimal trade are lying. These are conversation starters with real precedent. Use them as a starting point, not a verdict.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Trade Grading — Rebuilt
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The old hindsight grader scored each trade as a single zero-sum number. One side &ldquo;won,&rdquo; the other &ldquo;lost.&rdquo; Intuitive on the surface, but it falls apart in real dynasty trades where both sides can legitimately win — one team needed a WR and got production, the other flipped a pick for a QB who became a starter. Both came out ahead in their context. The old grader couldn&apos;t say that.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                The new grader scores each side independently. Components like production return, chain value, and flip profit get computed for your side based on what YOU did with the assets you received — fully independent of what the other side did with theirs. You can both win. You can both lose. You can land somewhere in the middle.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                A few other changes that came with the rebuild:
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                Verdicts use plainer language now — Won, Lost, Even. The old &ldquo;Push&rdquo; label was vague.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                You see grades way sooner. A trade gets graded after 90 days instead of waiting 18 months. In the trade log, trades under a year still show as &ldquo;Pending&rdquo; to keep that view clean — open the trade detail and you&apos;ll see the actual grade with a confidence label (Low, Medium, High) for how mature it is.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                Grades update every sync. They&apos;re living, not frozen — as production comes in, picks get used, players get flipped, the grade reflects the latest state.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                <strong className="font-bold text-primary">Up front on this one too:</strong>{" "}
                hindsight grading is hard and this version still has rough edges. The grader has to make calls about asset chains, production attribution, and championship context. I&apos;ve tested it against plenty of real trades and the grades are landing right, but there&apos;s no way I&apos;ve covered every weird dynasty scenario. If you see a verdict that feels obviously wrong on one of your trades, please flag it — that&apos;s exactly the feedback that makes it better.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                What&apos;s Next
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                With those two cores rebuilt, focus shifts to draft. Within the next day or so, Draft HQ is getting an update that adds two pieces:
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                A Draft Board that attempts to predict how your draft will play out — pick by pick, based on ADP, your specific league&apos;s history, and individual owner tendencies.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                Owner Intel for each leaguemate — their draft tendencies, what positions they prioritize, where they reach, where they wait. Useful both for predicting their picks and for finding trade angles around draft day.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                Draft season is in full swing, so I&apos;m shipping this fast. It won&apos;t be perfect on day one and I&apos;ll iterate as feedback comes in — but for anyone prepping for a draft this month, I want something in your hands now rather than polished in three weeks.
              </p>

              <h2 className="font-display text-lg sm:text-xl tracking-tight text-gold mt-6 mb-3">
                Keep the Feedback Coming
              </h2>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-3">
                Thumbs up / thumbs down on trade suggestions and analyzed trades is the highest-signal feedback I get. Two seconds of a tap tells me more than any survey, and the reason picker on a 👎 helps me pinpoint exactly what&apos;s broken. Every tap shapes the next version of the engine.
              </p>

              <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-secondary mb-6">
                Beyond that, shoot me a note on anything — things that feel off, things you love, anything missing that could make the site better. Chances are I can make it happen.
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
