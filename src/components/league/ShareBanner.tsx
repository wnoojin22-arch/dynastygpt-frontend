"use client";

import { useState, useEffect } from "react";

const KEY = "dgpt_share_dismissed";

export default function ShareBanner() {
  const [gone, setGone] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setGone(localStorage.getItem(KEY) === "1"); }, []);
  if (gone) return null;

  return (
    <div className="flex px-4 sm:px-8 py-px border-b border-gold/30 bg-gold/[0.08] shadow-[0_0_20px_rgba(212,165,50,0.15),0_0_40px_rgba(212,165,50,0.08),inset_0_0_30px_rgba(212,165,50,0.06)]">
      <span className="flex-1 min-w-0 text-[10px] sm:text-[13px] text-dim [line-height:13px] sm:[line-height:18px] py-[2px]">Don&apos;t forget — DynastyGPT is open to your entire league. <span className="text-gold font-semibold">Drop the link in your group chat!</span> · <span onClick={() => { navigator.clipboard.writeText("https://app.dynastygpt.com/sign-in").catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-gold underline !min-h-0">{copied ? "Copied!" : "Copy link"}</span></span>
      <span onClick={() => { localStorage.setItem(KEY, "1"); setGone(true); }} className="shrink-0 self-center text-[10px] text-gold/60 hover:text-gold pl-2 !min-h-0">✕</span>
    </div>
  );
}
