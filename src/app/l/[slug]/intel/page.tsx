"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { FranchiseIntel } from "@/components/league";
import OpponentsGrid from "@/components/league/OpponentsGrid";
import DraftRoom from "@/components/league/DraftRoom";

const TABS = [
  { id: "my-franchise", label: "My franchise" },
  { id: "opponents", label: "Opponents" },
  { id: "draft", label: "Draft room" },
] as const;

export default function IntelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { currentLeagueId: lid, currentOwner: owner } = useLeagueStore();
  const activeTab = searchParams.get("tab") || "my-franchise";

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "my-franchise") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  if (!lid) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-sans text-sm text-dim">No league loaded</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-6 px-5 border-b border-zinc-800 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`pb-3 pt-3 font-sans text-sm font-medium transition-colors border-b-2 cursor-pointer
              ${activeTab === tab.id
                ? "text-zinc-100 border-gold"
                : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "my-franchise" && (
          owner ? (
            <FranchiseIntel leagueId={lid} owner={owner} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="font-sans text-sm text-dim">Select an owner from the header to view franchise intel.</p>
            </div>
          )
        )}
        {activeTab === "opponents" && <OpponentsGrid />}
        {activeTab === "draft" && <DraftRoom />}
      </div>
    </div>
  );
}
