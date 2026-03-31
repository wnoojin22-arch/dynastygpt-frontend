"use client";

import { useState, useCallback } from "react";
import { useUser } from "@/lib/clerk-stub";
import { useLeagueStore } from "@/lib/stores/league-store";

const API = "";

const C = {
  dim: "#9596a5", green: "#7dd3a0", red: "#e47272",
  greenDim: "rgba(125,211,160,0.12)", redDim: "rgba(228,114,114,0.12)",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

interface Props {
  /** Question shown to user */
  prompt: string;
  /** What are they rating? */
  tradeId?: string;
  suggestionId?: string;
  /** Extra context to store */
  context?: Record<string, unknown>;
}

export default function ThumbsFeedback({ prompt, tradeId, suggestionId, context }: Props) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const { user } = useUser();
  const { currentLeagueId, currentOwner } = useLeagueStore();

  const submit = useCallback(async (vote: "up" | "down") => {
    if (voted) return; // already voted
    setVoted(vote);
    try {
      await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_user_id: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          feedback_type: vote === "up" ? "thumbs_up" : "thumbs_down",
          message: prompt,
          trade_id: tradeId,
          suggestion_id: suggestionId,
          device: typeof navigator !== "undefined" && /Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          context,
        }),
      });
    } catch {
      // silent — micro-feedback is non-critical
    }
  }, [voted, user, currentLeagueId, currentOwner, prompt, tradeId, suggestionId, context]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{prompt}</span>
      <button
        onClick={() => submit("up")}
        disabled={!!voted}
        style={{
          background: voted === "up" ? C.greenDim : "transparent",
          border: `1px solid ${voted === "up" ? C.green : "transparent"}`,
          borderRadius: 4, padding: "3px 8px", cursor: voted ? "default" : "pointer",
          fontSize: 14, opacity: voted && voted !== "up" ? 0.3 : 1,
          transition: "all 0.2s",
        }}
      >
        👍
      </button>
      <button
        onClick={() => submit("down")}
        disabled={!!voted}
        style={{
          background: voted === "down" ? C.redDim : "transparent",
          border: `1px solid ${voted === "down" ? C.red : "transparent"}`,
          borderRadius: 4, padding: "3px 8px", cursor: voted ? "default" : "pointer",
          fontSize: 14, opacity: voted && voted !== "down" ? 0.3 : 1,
          transition: "all 0.2s",
        }}
      >
        👎
      </button>
      {voted && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>Thanks!</span>}
    </div>
  );
}
