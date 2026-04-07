"use client";

import { useEffect, useState, useRef } from "react";
import { redirect } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";

export default function DebugPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/dashboard");
  }
  const renderCount = useRef(0);
  renderCount.current += 1;

  const { currentLeagueId, currentOwner, currentOwnerId, currentLeagueSlug, savedLeagues, setLeague, setOwner } = useLeagueStore();

  const [mounted, setMounted] = useState(false);
  const [setLeagueCalled, setSetLeagueCalled] = useState(false);
  const [apiResult, setApiResult] = useState("not tested");

  // HARDCODED — no params, no parsing, just jam it in
  useEffect(() => {
    console.log("DEBUG: useEffect firing, calling setLeague hardcoded");
    setLeague("1312047513884184576", "big-jer-dynasty-ffl", "Big Jer Dynasty FFL");
    setOwner("Duke Nukem", "679906771438989312");
    setSetLeagueCalled(true);
    setMounted(true);
    console.log("DEBUG: setLeague called, store now:", useLeagueStore.getState().currentLeagueId);
  }, [setLeague, setOwner]);

  const testApi = async () => {
    setApiResult("fetching...");
    try {
      const r = await fetch("/api/league/1312047513884184576/overview");
      setApiResult(`HTTP ${r.status}`);
    } catch (e) {
      setApiResult("ERROR: " + String(e));
    }
  };

  const isClient = typeof window !== "undefined";

  return (
    <div style={{ padding: 16, background: "#06080d", color: "#eeeef2", fontFamily: "monospace", fontSize: 13, minHeight: "100vh", lineHeight: 2 }}>
      <h1 style={{ fontSize: 20, color: "#d4a532", marginBottom: 16 }}>NUCLEAR DEBUG</h1>

      <div style={{ background: "#10131d", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #1a1e30" }}>
        <div style={{ color: "#d4a532", fontWeight: 700 }}>ENVIRONMENT</div>
        <div>typeof window: <b style={{ color: isClient ? "#7dd3a0" : "#e47272" }}>{typeof window}</b></div>
        <div>render count: <b>{renderCount.current}</b></div>
        <div>mounted (useEffect ran): <b style={{ color: mounted ? "#7dd3a0" : "#e47272" }}>{String(mounted)}</b></div>
        <div>setLeague called: <b style={{ color: setLeagueCalled ? "#7dd3a0" : "#e47272" }}>{String(setLeagueCalled)}</b></div>
      </div>

      <div style={{ background: "#10131d", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #1a1e30" }}>
        <div style={{ color: "#d4a532", fontWeight: 700 }}>ZUSTAND STORE VALUES</div>
        <div>currentLeagueId: <b style={{ color: currentLeagueId ? "#7dd3a0" : "#e47272" }}>{currentLeagueId || "(null)"}</b></div>
        <div>currentLeagueSlug: <b>{currentLeagueSlug || "(null)"}</b></div>
        <div>currentOwner: <b style={{ color: currentOwner ? "#7dd3a0" : "#e47272" }}>{currentOwner || "(null)"}</b></div>
        <div>currentOwnerId: <b>{currentOwnerId || "(null)"}</b></div>
        <div>savedLeagues.length: <b>{savedLeagues.length}</b></div>
      </div>

      <div style={{ background: "#10131d", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #1a1e30" }}>
        <div style={{ color: "#d4a532", fontWeight: 700 }}>DIRECT getState() CHECK</div>
        <div>getState().currentLeagueId: <b style={{ color: "#6bb8e0" }}>{useLeagueStore.getState().currentLeagueId || "(null)"}</b></div>
        <div>getState().currentOwner: <b style={{ color: "#6bb8e0" }}>{useLeagueStore.getState().currentOwner || "(null)"}</b></div>
      </div>

      <button onClick={testApi} style={{ width: "100%", padding: 14, background: "#1a1e30", color: "#eeeef2", border: "1px solid #252a3e", borderRadius: 8, fontSize: 13, marginBottom: 8 }}>
        TEST API → {apiResult}
      </button>

      <a href="/l/big-jer-dynasty-ffl/dashboard?lid=1312047513884184576&owner=Duke+Nukem&oid=679906771438989312"
        style={{ display: "block", padding: 14, background: "linear-gradient(135deg, #8b6914, #d4a532)", color: "#06080d", borderRadius: 8, fontSize: 14, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>
        GO TO DASHBOARD →
      </a>
    </div>
  );
}
