"use client";

/**
 * useTrack — fire-and-forget event tracking hook.
 *
 * Usage:
 *   const track = useTrack();
 *   track("dashboard_viewed");
 *   track("trade_evaluated", { league_id, partner: "Duke Nukem" });
 *
 * The track() call is intentionally cheap:
 *   - Does NOT await — returns immediately
 *   - Never throws
 *   - Never shows errors to the user
 *   - Silently swallows network failures
 *   - In dev bypass mode, logs to console instead of POSTing
 *
 * Add it anywhere. If it fails, it fails quietly. Analytics must never
 * break the user experience.
 */

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { authHeaders } from "@/lib/api";
import { DEV_BYPASS_ACTIVE } from "@/hooks/useDevUser";

type TrackMetadata = Record<string, unknown>;

export type TrackFn = (eventType: string, metadata?: TrackMetadata) => void;

export function useTrack(): TrackFn {
  const pathname = usePathname();

  return useCallback(
    (eventType: string, metadata?: TrackMetadata) => {
      // Dev bypass — log to console instead of hitting the API
      if (DEV_BYPASS_ACTIVE) {
        // eslint-disable-next-line no-console
        console.log(`[track] ${eventType}`, { page: pathname, ...metadata });
        return;
      }

      // Fire and forget — no await, no error handling visible to caller
      (async () => {
        try {
          const headers = await authHeaders();
          await fetch("/api/events", {
            method: "POST",
            headers,
            keepalive: true,
            body: JSON.stringify({
              event_type: eventType,
              page: pathname,
              metadata: metadata || {},
            }),
          });
        } catch {
          // Silent — analytics never blocks
        }
      })();
    },
    [pathname],
  );
}
