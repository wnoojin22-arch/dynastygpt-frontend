"use client";

/**
 * V3 launch banner — shown on the trade-suggest loading screen across
 * every suggest mode (coach / partner / sell / acquire / find_position),
 * desktop and mobile. Copy is mode-agnostic so feedback covers any
 * suggestion the user is about to see.
 *
 * Render gated only on:
 *   process.env.NEXT_PUBLIC_V3_LAUNCH_BANNER_ENABLED !== "false"
 *   (defaults ON — set the env var to "false" to kill the banner without
 *   a code change)
 */
import React from "react";
import { C, MONO, SANS } from "../tokens";

export const V3_BANNER_FLAG_ON =
  process.env.NEXT_PUBLIC_V3_LAUNCH_BANNER_ENABLED !== "false";

export default function V3LaunchBanner({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const isMobile = variant === "mobile";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        marginBottom: isMobile ? 16 : 18,
        padding: isMobile ? "10px 12px" : "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.gold}55`,
        background:
          "linear-gradient(135deg, rgba(212,165,50,0.10), rgba(212,165,50,0.04))",
        boxShadow: `0 0 18px rgba(212,165,50,0.18)`,
        animation: "v3banner-pulse 2.4s ease-in-out infinite",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes v3banner-pulse {
          0%, 100% { box-shadow: 0 0 18px rgba(212,165,50,0.18); }
          50%      { box-shadow: 0 0 26px rgba(212,165,50,0.32); }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 999,
            background: C.gold,
            color: "#06080d",
            fontFamily: MONO,
            fontSize: isMobile ? 9 : 10,
            fontWeight: 800,
            letterSpacing: "0.18em",
            lineHeight: 1.2,
          }}
        >
          UPDATE
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: isMobile ? 9 : 10,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: C.goldBright,
            textTransform: "uppercase",
          }}
        >
          New trade engine
        </span>
      </div>
      <p
        style={{
          fontFamily: SANS,
          fontSize: isMobile ? 11.5 : 12.5,
          lineHeight: 1.45,
          color: C.primary,
          margin: 0,
        }}
      >
        These trades were built using the new trade engine. Please provide
        feedback using thumbs up/down to help improve suggestions.
      </p>
    </div>
  );
}
