"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PlatformUpdateModal from "@/components/modals/PlatformUpdateModal";
import { useTrack } from "@/hooks/useTrack";

const ARTICLE_TITLE = "Weekly Update: New Trade Suggestion & Trade Grading Engine";

export default function BetaWeek3UpdateCard({ leagueId }: { leagueId?: string }) {
  const [open, setOpen] = useState(false);
  const track = useTrack();

  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          track("platform_update_opened", {
            league_id: leagueId || undefined,
            article_title: ARTICLE_TITLE,
            week: 4,
          });
          setOpen(true);
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="group relative block w-full rounded-lg border border-border bg-gradient-to-b from-card to-[#0a0d15] text-left transition-all hover:border-gold/40 hover:shadow-[0_4px_24px_rgba(212,165,50,0.10)] cursor-pointer"
      >
        <span className="absolute -top-2 right-3 z-10 flex items-center gap-1.5">
          <span className="relative inline-flex items-center rounded-full bg-accent-red-bright px-2 py-[3px] font-mono text-[8px] font-black tracking-[0.12em] text-white shadow-[0_0_10px_rgba(255,68,68,0.7)]">
            NEW
          </span>
          <span className="relative inline-flex items-center rounded-full bg-gold-bright px-2 py-[3px] font-mono text-[8px] font-black tracking-[0.12em] text-[#06080d] shadow-[0_0_10px_rgba(212,165,50,0.7)]">
            WEEKLY UPDATE
          </span>
        </span>
        <div className="h-[2px] w-full overflow-hidden rounded-t-lg bg-gradient-to-r from-gold-dark via-gold-bright to-gold-dark" />

        <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <span className="flex-shrink-0 rounded-sm bg-gold px-2 py-1 font-mono text-[8px] font-black tracking-[0.12em] text-[#06080d]">
            WEEK 4 UPDATE
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] sm:text-[17px] leading-tight tracking-tight text-primary">
              Weekly Update: New Trade Suggestion &amp; Trade Grading Engine
            </h3>
          </div>

          <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 rounded border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.10em] text-gold transition-colors group-hover:bg-gold group-hover:text-[#06080d]">
            READ UPDATE
            <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <ArrowRight
            size={14}
            className="sm:hidden flex-shrink-0 text-gold transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </motion.button>

      <PlatformUpdateModal open={open} onClose={() => setOpen(false)} date="May 13, 2026" />
    </>
  );
}
