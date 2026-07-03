"use client";

/*
 * LeagueSwitcher — compact dropdown that lets a multi-league user jump
 * between leagues from the top nav.
 *
 * Contract:
 *  - Reads `savedLeagues` + `currentLeagueId` from the league store.
 *  - Renders NOTHING if the user has ≤1 league (no clutter, no disabled UI).
 *  - onSelect fires POST /api/user/set-active-league → user.reload() →
 *    setLeague() → router.push(). Server is the source of truth for
 *    landing behavior; we only update client state after the server ack.
 *
 * See docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md (gap F).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import { useLeagueStore, type SavedLeague } from "@/lib/stores/league-store";
import { setActiveLeague } from "@/lib/api";

const C = {
  panel: "#0a0d15", card: "#10131d",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", dim: "#9596a5",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)",
  red: "#e47272",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace";

export default function LeagueSwitcher() {
  const { user } = useUser();
  const router = useRouter();
  const { currentLeagueId, savedLeagues, setLeague } = useLeagueStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape. Wired unconditionally to keep hook
  // order stable across the ≤1-league early return below.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-clear the transient error banner after 4s so it doesn't linger.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // Locked decision: hide entirely for single-league users. Not a disabled
  // dropdown — the trigger itself disappears.
  if (!savedLeagues || savedLeagues.length <= 1) return null;

  const others = savedLeagues.filter((l) => l.id !== currentLeagueId);

  const handleSwitch = async (target: SavedLeague) => {
    if (target.id === currentLeagueId || switching) return;
    if (!user?.id) {
      setError("Not signed in");
      return;
    }
    setError(null);
    setSwitching(true);
    setOpen(false);
    try {
      await setActiveLeague(user.id, target.id);
      // Ensure Clerk's client-side snapshot picks up the new
      // unsafeMetadata.approved_league_id we just wrote server-side.
      // Without this, a race between our redirect + Clerk's stale metadata
      // could bounce the user back to the previous league on the gate check.
      await user.reload();
      setLeague(target.id, target.slug, target.name);
      router.push(`/l/${target.slug}?league_id=${target.id}`);
    } catch (e) {
      setError((e as Error).message || "Switch failed");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        aria-label="Switch league"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "3px 5px", borderRadius: 6,
          background: open ? C.goldDim : "transparent",
          border: `1px solid ${open ? C.gold : C.borderLt}`,
          color: open ? C.gold : C.dim,
          cursor: switching ? "wait" : "pointer",
          opacity: switching ? 0.6 : 1,
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          if (open || switching) return;
          e.currentTarget.style.borderColor = C.gold;
          e.currentTarget.style.color = C.gold;
        }}
        onMouseLeave={(e) => {
          if (open || switching) return;
          e.currentTarget.style.borderColor = C.borderLt;
          e.currentTarget.style.color = C.dim;
        }}
      >
        <ChevronDown
          size={12}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.12s",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: 240, maxWidth: 320,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
            zIndex: 100, padding: 4,
          }}
        >
          <div style={{
            padding: "6px 10px 8px",
            fontFamily: MONO, fontSize: 9, fontWeight: 800,
            letterSpacing: "0.12em", color: C.dim,
            textTransform: "uppercase",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 3,
          }}>
            Switch League
          </div>
          {others.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              onClick={() => handleSwitch(l)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 10px", borderRadius: 6, border: "none",
                background: "transparent", color: C.primary,
                fontFamily: SANS, fontSize: 13, lineHeight: 1.3,
                cursor: "pointer",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.goldDim; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              title={l.name}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            padding: "5px 9px",
            background: C.card, border: `1px solid ${C.red}`,
            borderRadius: 6, color: C.red,
            fontFamily: MONO, fontSize: 10, letterSpacing: "0.04em",
            whiteSpace: "nowrap", zIndex: 100,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
