"use client";

/*
 * LeagueSwitcher — the header's league-name area IS the switcher trigger.
 *
 * Renders the league name EXACTLY as HeaderBar used to (same spans,
 * same classes, same gradient). When the user has ≥2 ACTIVE leagues
 * (season === current NFL season), a chevron sits to the immediate
 * right of the name and a "SWITCH LEAGUES" glyph sits in the slot the
 * owner-name used to occupy — rendered through the same white-first,
 * gold-gradient-rest pipeline as the league name so it visually matches.
 * Clicking anywhere on the trigger opens a dropdown that anchors
 * DIRECTLY BELOW the league name (top: 100% + 6px, left: 0 of the
 * container that includes the name). Single-active-league users get
 * the plain name — no chevron, no hint, no dropdown.
 *
 * Contract:
 *  - Reads `savedLeagues` + `currentLeagueId` from the league store.
 *  - Filters to season === CURRENT_NFL_SEASON before deciding trigger vs plain.
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
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)",
  red: "#e47272",
};
// Kept in sync with dashboard/page.tsx. Sleeper's `season` string for a
// wrapped league stays frozen at the year it completed, so an equality
// check against the active NFL season cleanly hides last year's leagues
// from the dropdown without a BE `status` column (see league-store.ts
// SavedLeague.season comment).
const CURRENT_NFL_SEASON = "2026";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace";
const DISPLAY = "'Archivo Black', sans-serif";
const GOLD_GRADIENT = "linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)";

// League-name glyph — must render pixel-identical to what HeaderBar
// used to inline. Words: gradient the word DYNASTY where it appears;
// otherwise gradient the trailing words after the first. Also reused
// for the "SWITCH LEAGUES" hint so it matches the league-name style
// exactly ("SWITCH" white, "LEAGUES" gold).
function DisplayGlyph({ text }: { text: string }) {
  const stripped = (text || "").replace(/\s+League$/i, "");
  const words = stripped.split(/\s+/);
  const dynIdx = words.findIndex((w) => w.toLowerCase() === "dynasty");
  const whiteStyle = {
    fontFamily: DISPLAY,
    color: "#fff",
    letterSpacing: "-0.5px",
  } as const;
  const goldStyle = {
    fontFamily: DISPLAY,
    letterSpacing: "-0.5px",
    background: GOLD_GRADIENT,
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
  };
  if (dynIdx >= 0) {
    const before = words.slice(0, dynIdx).join(" ");
    return (
      <>
        {before && (
          <span className="text-base sm:text-lg" style={{ ...whiteStyle, marginRight: 4 }}>
            {before.toUpperCase()}
          </span>
        )}
        <span className="text-base sm:text-lg" style={goldStyle}>DYNASTY</span>
      </>
    );
  }
  const first = words[0] || "";
  const rest = words.slice(1).join(" ");
  return (
    <>
      <span className="text-base sm:text-lg" style={{ ...whiteStyle, marginRight: rest ? 4 : 0 }}>
        {first.toUpperCase()}
      </span>
      {rest && (
        <span className="text-base sm:text-lg" style={goldStyle}>
          {rest.toUpperCase()}
        </span>
      )}
    </>
  );
}

interface Props {
  leagueName: string | null;
}

export default function LeagueSwitcher({ leagueName }: Props) {
  const { user } = useUser();
  const router = useRouter();
  const { currentLeagueId, savedLeagues, setLeague } = useLeagueStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape. Wired unconditionally to keep hook
  // order stable across the single-league branch below.
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

  // Filter out inactive (wrapped) leagues before deciding trigger vs
  // plain. Season match beats a BE status column: Sleeper freezes a
  // league's `season` at completion, so `!== CURRENT_NFL_SEASON`
  // cleanly hides last year's leagues. Missing/undefined = treated as
  // inactive (old persisted-store shape).
  const activeLeagues = (savedLeagues || []).filter(
    (l) => String(l.season || "") === CURRENT_NFL_SEASON
  );
  const hasMultiple = activeLeagues.length > 1;
  const others = activeLeagues.filter((l) => l.id !== currentLeagueId);

  // Single-active-league branch: JUST the league name, pixel-identical
  // to what HeaderBar used to inline. No chevron, no hint, no wrapper
  // styling that could shift its position.
  if (!hasMultiple) {
    return (
      <div className="flex items-baseline leading-none shrink-0">
        <DisplayGlyph text={leagueName || "DynastyGPT"} />
      </div>
    );
  }

  const handleSwitch = async (target: SavedLeague) => {
    if (target.id === currentLeagueId || switching) return;
    // The endpoint keys off sleeper_user_id (stable) rather than clerk_user_id
    // (which drifts if Clerk re-mints an id — see the 2026-07-03 400 regression
    // documented in docs/audits/MULTI_LEAGUE_AUDIT_2026-07-03.md). Read the
    // Sleeper id from Clerk unsafeMetadata — the same source of truth the
    // layout uses for its getUserLeagues fetch.
    const sleeperUserId = user?.unsafeMetadata?.sleeper_user_id as string | undefined;
    if (!user?.id || !sleeperUserId) {
      setError("No Sleeper account linked");
      return;
    }
    setError(null);
    setSwitching(true);
    setOpen(false);
    try {
      await setActiveLeague(user.id, sleeperUserId, target.id);
      // Ensure Clerk's client-side snapshot picks up the new
      // unsafeMetadata.approved_league_id we just wrote server-side.
      // Without this, a race between our redirect + Clerk's stale metadata
      // could bounce the user back to the previous league on the gate check.
      await user.reload();
      setLeague(target.id, target.slug, target.name);
      // After 2026-07-23 rename: LeagueSwitcher lands on MY TEAM (`/team`)
      // instead of League Home. Bare `/l/[slug]` also redirects to
      // `/team`, so this stays consistent even if the URL is bookmarked.
      router.push(`/l/${target.slug}/team?league_id=${target.id}`);
    } catch (e) {
      setError((e as Error).message || "Switch failed");
    } finally {
      setSwitching(false);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  // Multi-active-league branch. The container carries `position:
  // relative` so the dropdown panel anchors to it (i.e. drops UNDER
  // the league name, not next to the chevron). The trigger row itself
  // uses baseline alignment so the chevron and hint text sit on the
  // same baseline as the DisplayGlyph — no vertical shift on the name.
  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Switch league"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !switching && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          cursor: switching ? "wait" : "pointer",
          opacity: switching ? 0.6 : 1,
          userSelect: "none",
        }}
      >
        {/* League name — pixel-identical to HeaderBar's old inline render */}
        <div className="flex items-baseline leading-none shrink-0">
          <DisplayGlyph text={leagueName || "DynastyGPT"} />
        </div>

        {/* Chevron — center-aligned with siblings by the parent's
            alignItems: center. No translateY hack needed. */}
        <ChevronDown
          size={18}
          strokeWidth={2.5}
          style={{
            color: open ? C.gold : "#fff",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.12s, color 0.12s",
          }}
        />

        {/* "Switch Leagues" — formatted EXACTLY like the owner/team-name
            span it replaces in HeaderBar: text-xs sm:text-sm, Archivo
            Black, secondary muted color, -0.3px letter-spacing, natural
            case. No gradient, not uppercase. */}
        <span
          className="text-sm sm:text-sm"
          style={{ fontFamily: DISPLAY, color: C.secondary, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}
        >
          Switch Leagues
        </span>
      </div>

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
