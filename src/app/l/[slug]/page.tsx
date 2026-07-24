"use client";

/**
 * Bare `/l/[slug]` redirects to `/l/[slug]/team` — the new MY TEAM route.
 * Keeps portfolio card clicks, LeagueSwitcher, and legacy bookmarks landing
 * on the per-team surface by default. LEAGUE HOME lives at `/l/[slug]/home`,
 * reachable from the sidebar entry.
 */
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function LeagueRootRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString() ?? "";
    const dest = `${pathname}/team${qs ? `?${qs}` : ""}`;
    router.replace(dest);
  }, [router, pathname, searchParams]);

  return null;
}
