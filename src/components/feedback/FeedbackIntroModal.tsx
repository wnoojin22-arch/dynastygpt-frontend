"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tb_feedback_intro_dismissed_v1";

export default function FeedbackIntroModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode etc.) — show modal anyway.
      setOpen(true);
    }
  }, []);

  if (!mounted || !open) return null;

  const handleConfirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // best effort
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-5">
      <div className="w-full max-w-[480px] rounded-xl border border-gold/40 bg-bg p-6 sm:p-8 shadow-[0_0_40px_rgba(212,165,50,0.25)]">
        <h2 className="font-serif text-3xl sm:text-4xl font-black text-gold-bright text-center mb-4 sm:mb-5">
          We heard you.
        </h2>
        <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-secondary mb-6 sm:mb-7">
          We&apos;re actively working to improve trade suggestions, and your
          feedback is the fastest way to get us there. After each suggestion you
          see, please tap 👍 or 👎. On 👎, the quick reasons help us pinpoint
          what&apos;s off. Two seconds of feedback per trade is worth more to us
          than any survey.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full min-h-[44px] rounded-lg bg-gradient-to-br from-gold-dark via-gold to-gold-bright text-black font-display tracking-[0.08em] text-sm font-bold transition-opacity hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
