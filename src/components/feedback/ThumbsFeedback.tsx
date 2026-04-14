"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { authHeaders } from "@/lib/api";

interface Props {
  prompt: string;
  tradeId?: string;
  suggestionId?: string;
  context?: Record<string, unknown>;
}

export default function ThumbsFeedback({ prompt, tradeId, suggestionId, context }: Props) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const { user } = useUser();
  const { currentLeagueId, currentOwner } = useLeagueStore();

  const submit = useCallback(async (vote: "up" | "down") => {
    if (voted) return;
    setVoted(vote);
    try {
      const hdrs = await authHeaders();
      // Post to thread endpoint (primary)
      await fetch("/api/user/feedback/thread/message", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          feedback_type: "thumbs",
          message: `${vote === "up" ? "\u{1F44D}" : "\u{1F44E}"} ${prompt}`,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          device: typeof navigator !== "undefined" && /Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
          trade_id: tradeId,
          suggestion_id: suggestionId,
          context,
        }),
      });
    } catch {
      // silent — micro-feedback is non-critical
    }
  }, [voted, user, currentLeagueId, currentOwner, prompt, tradeId, suggestionId, context]);

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="font-mono text-[10px] text-[#9596a5]">{prompt}</span>
      <button
        onClick={() => submit("up")}
        disabled={!!voted}
        className={`rounded px-2 py-0.5 text-sm transition-all ${voted === "up" ? "bg-[rgba(125,211,160,0.12)] border border-[#7dd3a0]" : "bg-transparent border border-transparent hover:border-[#1a1e30]"} ${voted && voted !== "up" ? "opacity-30" : ""} ${voted ? "cursor-default" : "cursor-pointer"}`}
      >
        {"\u{1F44D}"}
      </button>
      <button
        onClick={() => submit("down")}
        disabled={!!voted}
        className={`rounded px-2 py-0.5 text-sm transition-all ${voted === "down" ? "bg-[rgba(228,114,114,0.12)] border border-[#e47272]" : "bg-transparent border border-transparent hover:border-[#1a1e30]"} ${voted && voted !== "down" ? "opacity-30" : ""} ${voted ? "cursor-default" : "cursor-pointer"}`}
      >
        {"\u{1F44E}"}
      </button>
      {voted && <span className="font-mono text-[9px] text-[#9596a5]">Thanks!</span>}
    </div>
  );
}
