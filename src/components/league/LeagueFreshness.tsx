"use client";

/**
 * LeagueFreshness — the "Synced X ago" chip.
 *
 * Companion to the API-side fleet-rotation cadence restoration shipped
 * 2026-08-10. Renders leagues.last_synced_at as an honest freshness
 * label so users can distinguish "the app is quiet" from "the data is
 * stale." Answers the Aug 5 "how often does it update?" beta report
 * passively.
 *
 * Copy is deliberately about the FULL bulletproof_sync cadence (which
 * is what leagues.last_synced_at tracks — the hourly trades cron does
 * NOT bump this column). Do not label it "Trades synced" — the two
 * cadences are different.
 *
 * Threshold colors (v0, will be recalibrated once sync_runs percentiles
 * are in):
 *   normal (<48h)   → dim
 *   >48h            → gold — starting to drift
 *   >7d             → red — commitment window blown
 *
 * Idiom matched to FreshnessBadge in AnalyzeModal.tsx:288-301 (MONO,
 * 9-10px, dim border chip). Same look-and-feel so users learn it once.
 */

import React from "react";

export function LeagueFreshness({ lastSyncedAt }: { lastSyncedAt: string | null | undefined }) {
  if (!lastSyncedAt) return null;

  const now = Date.now();
  const then = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(then)) return null;
  const ageHours = (now - then) / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  // Copy — precise about what "synced" means at each grain
  let label: string;
  if (ageHours < 1) {
    label = "Synced <1h ago";
  } else if (ageHours < 24) {
    label = `Synced ${Math.round(ageHours)}h ago`;
  } else if (ageHours < 48) {
    label = "Synced yesterday";
  } else {
    // Formatted date after 48h — "Synced Aug 6"
    const d = new Date(lastSyncedAt);
    const month = d.toLocaleString("en-US", { month: "short" });
    label = `Synced ${month} ${d.getDate()}`;
  }

  // Threshold colors — dim / gold / red
  let color: string;
  let borderColor: string;
  if (ageDays > 7) {
    color = "#e57373";           // red — commitment window blown
    borderColor = "#e5737340";
  } else if (ageHours > 48) {
    color = "#d4a532";           // gold — drifting
    borderColor = "#d4a53240";
  } else {
    color = "#8b8ea0";           // dim — normal
    borderColor = "#8b8ea040";
  }

  return (
    <span
      title={`Last full sync: ${new Date(lastSyncedAt).toLocaleString()}`}
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color,
        border: `1px solid ${borderColor}`,
        borderRadius: 3,
        padding: "2px 6px",
        display: "inline-block",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
