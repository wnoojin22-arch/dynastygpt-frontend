"use client";

import { usePlayerCardStore } from "@/lib/stores/player-card-store";

/**
 * Clickable player name — opens the PlayerCardModal on click.
 * Drop this anywhere a player name appears. Renders as inline span.
 */
export default function PlayerName({
  name,
  className = "",
  style = {},
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const open = usePlayerCardStore((s) => s.openPlayerCard);

  if (!name) return null;

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        open(name);
      }}
      className={className}
      style={{
        cursor: "pointer",
        transition: "color 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#d4a532";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = style.color as string || "";
      }}
      title={`View ${name}`}
    >
      {name}
    </span>
  );
}
