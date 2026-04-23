"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tradedb-release-banner-dismissed";

export default function TradeDBReleaseBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "8px 16px", gap: 10,
        background: "rgba(212,165,50,0.12)",
        border: "1px solid rgba(212,165,50,0.32)",
        borderLeft: "none", borderRight: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex", alignItems: "center",
          padding: "2px 7px", borderRadius: 4,
          background: "#d4a532", color: "#06080d",
          fontFamily: "'JetBrains Mono','SF Mono',monospace",
          fontSize: 9, fontWeight: 900, letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        NEW
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono','SF Mono',monospace",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
          color: "#eeeef2", textAlign: "center", flex: 1,
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: "#f5e6a3", fontWeight: 800 }}>Feature Release:</span>{" "}
        TradeDB is live — search millions of real dynasty trades before public release.
      </span>
      <span
        onClick={dismiss}
        style={{
          color: "rgba(212,165,50,0.55)", cursor: "pointer",
          fontSize: 12, padding: "0 4px", flexShrink: 0,
        }}
        role="button"
        aria-label="Dismiss"
      >
        ✕
      </span>
    </div>
  );
}
