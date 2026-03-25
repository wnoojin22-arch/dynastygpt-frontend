"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";

export default function LandingPage() {
  const router = useRouter();
  const { currentLeagueSlug } = useLeagueStore();

  useEffect(() => {
    // Auto-redirect to league if one is loaded
    if (currentLeagueSlug) {
      router.replace(`/l/${currentLeagueSlug}`);
    }
  }, [currentLeagueSlug, router]);

  // Fallback while redirecting (or if no league)
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#06080d" }}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#eeeef2" }}>
          Dynasty<span style={{ color: "#d4a532" }}>GPT</span>
        </h1>
        <p className="font-mono text-sm" style={{ color: "#9596a5" }}>Loading league...</p>
      </div>
    </div>
  );
}
