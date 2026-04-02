"use client";
/**
 * PlayerHeadshot — Sleeper CDN headshot with fallback to position circle.
 * Pass sleeperIdMap (built from roster data) to resolve player names to IDs.
 */
import { useState } from "react";

const POS_COLORS: Record<string, string> = {
  QB: "#e47272", RB: "#6bb8e0", WR: "#7dd3a0", TE: "#e09c6b", PICK: "#9596a5",
};

interface Props {
  name: string;
  position: string;
  size?: number;
  sleeperId?: string | null;
  sleeperIdMap?: Record<string, string>;
}

export default function PlayerHeadshot({ name, position, size = 28, sleeperId, sleeperIdMap }: Props) {
  const [err, setErr] = useState(false);
  const id = sleeperId || sleeperIdMap?.[name] || sleeperIdMap?.[name.toLowerCase()] || null;
  const posCol = POS_COLORS[position] || "#9596a5";
  const initials = name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase();

  if (id && !err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        overflow: "hidden", border: `2px solid ${posCol}40`,
        background: `${posCol}15`,
      }}>
        <img
          src={`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`}
          alt={name}
          onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  // Fallback: position-colored circle with initials
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${posCol}20`, border: `2px solid ${posCol}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size * 0.35, fontWeight: 900, color: posCol }}>
        {initials}
      </span>
    </div>
  );
}
