"use client";

/**
 * Legacy `/l/[slug]/dashboard` — kept as a redirect to `/l/[slug]/team`
 * so bookmarks, in-app links (war-room, debug), and older tokens keep
 * routing correctly after the 2026-07-23 rename.
 */
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function DashboardLegacyRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Replace the trailing "/dashboard" with "/team", preserving any
    // query string (league_id / owner deep-link params).
    const teamPath = (pathname ?? "").replace(/\/dashboard\/?$/, "/team");
    const qs = searchParams?.toString() ?? "";
    router.replace(`${teamPath}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams]);

  return null;
}
