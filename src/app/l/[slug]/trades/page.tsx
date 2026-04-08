"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import TradeBuilderView from "@/components/league/trade-builder/TradeBuilderView";
import MyTradesView from "@/components/league/MyTradesView";
import LeagueTradesView from "@/components/league/LeagueTradesView";

const TABS = [
  { id: "builder", label: "Builder" },
  { id: "my-trades", label: "My trades" },
  { id: "league", label: "League trades" },
] as const;

export default function TradesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId } = useLeagueStore();
  const activeTab = searchParams.get("tab") || "builder";

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "builder") {
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

  // Builder tab gets full width (no tab bar visible)
  const showTabs = true;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      {showTabs && (
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
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "builder" && (
          owner ? (
            <TradeBuilderView leagueId={lid} owner={owner} ownerId={currentOwnerId} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="font-sans text-sm text-dim">Select an owner from the header to use the trade builder.</p>
            </div>
          )
        )}
        {activeTab === "my-trades" && (
          owner ? (
            <MyTradesView leagueId={lid} owner={owner} ownerId={currentOwnerId} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="font-sans text-sm text-dim">Select an owner from the header to view your trades.</p>
            </div>
          )
        )}
        {activeTab === "league" && (
          <LeagueTradesView leagueId={lid} />
        )}
      </div>
    </div>
  );
}
