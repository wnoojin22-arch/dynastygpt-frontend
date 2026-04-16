/* ═══════════════════════════════════════════════════════════════
   SHARED DESIGN TOKENS — single import for all league components
   ═══════════════════════════════════════════════════════════════ */

export const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDark: "#8b6914",
  goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  goldGlow: "rgba(212,165,50,0.06)",
  green: "#7dd3a0", greenDim: "rgba(125,211,160,0.12)",
  red: "#e47272", redDim: "rgba(228,114,114,0.12)", redBright: "#ff4444",
  blue: "#6bb8e0", orange: "#e09c6b",
  white08: "rgba(255,255,255,0.06)",
} as const;

export const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
export const DISPLAY = "'Archivo Black', sans-serif";
export const SERIF = "'Playfair Display', Georgia, serif";

export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function posColor(pos: string): string {
  return pos === "QB" ? "#e47272" : pos === "RB" ? "#6bb8e0" : pos === "WR" ? "#7dd3a0" : pos === "TE" ? "#e09c6b" : C.dim;
}

export function getVerdictStyle(v: string | null | undefined): { label: string; color: string; bg: string } | null {
  if (!v) return null;
  const o = v.toLowerCase();
  if (o.includes("robbery")) return { label: "ROBBERY", color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
  if (o.includes("won") || o.includes("slight edge") || o.includes("win-win")) return { label: "WON", color: C.gold, bg: C.goldDim };
  if (o.includes("lost") || o.includes("slight loss")) return { label: "LOST", color: C.red, bg: "rgba(255,68,68,0.10)" };
  if (o.includes("push") || o.includes("even")) return { label: "EVEN", color: "#b0b2c8", bg: "rgba(176,178,200,0.10)" };
  return null;
}

export function gradeColor(letter: string | null | undefined): string {
  if (!letter) return C.dim;
  if (letter.startsWith("A")) return C.green;
  if (letter.startsWith("B")) return C.blue;
  if (letter.startsWith("C")) return C.gold;
  if (letter.startsWith("D")) return C.orange;
  return C.red;
}

/**
 * Scrub backend-generated grade reasons for user-facing display.
 * Backend emits strings that reference SHA and raw value totals. Remove those.
 * Preserves parenthetical labels like "(RB15)" or "(2027 R1)" — only strips bare numbers.
 */
export function scrubReason(reason: string | null | undefined): string {
  if (!reason) return "";
  let r = String(reason);
  // 0. Full-line rewrites for the two most common SHA-laden patterns so the
  //    user gets a meaningful sentence instead of just "Overpaying by X%."
  const overpayFull = r.match(/^Overpaying by\s+(\d+\.?\d*)%\s*SHA\s*—\s*sending\s+[\d,\.]+\s+to\s+get\s+back\s+[\d,\.]+\.?\s*$/i);
  if (overpayFull) {
    return `You're sending ${overpayFull[1]}% more value than you're getting back.`;
  }
  const gettingMore = r.match(/^Getting\s+(\d+\.?\d*)%\s*more value than you['\u2019]re sending\.?\s*(.*)$/i);
  if (gettingMore) {
    const tail = gettingMore[2] ? ` ${gettingMore[2]}`.trimEnd() : "";
    return `You're getting ${gettingMore[1]}% more value than you're sending.${tail}`;
  }
  // 1. Remove "— sending X to get back Y." segment entirely
  r = r.replace(/\s*—\s*sending\s+[\d,\.]+\s+to\s+get\s+back\s+[\d,\.]+\.?/gi, ".");
  // 2. "X% SHA" → "X% value"
  r = r.replace(/(\d+\.?\d*)\s*%\s*SHA\b/gi, "$1% value");
  // 3. "(9,145 SHA)" parentheticals → strip
  r = r.replace(/\s*\(\s*[\d,\.]+\s*SHA\s*\)/gi, "");
  // 4. Bare "9,145 SHA" (no parens) → "value"
  r = r.replace(/\b[\d,\.]+\s+SHA\b/gi, "value");
  // 5. Standalone SHA → "value points"
  r = r.replace(/\bSHA\b/g, "value points");
  // 6. Bare-number parentheticals like "(9,145)" — keeps "(RB15)", "(2027 R1)", "(2nd)"
  r = r.replace(/\s*\(\s*[\d,\.]+\s*\)/g, "");
  // Clean up whitespace/punctuation artifacts
  r = r.replace(/\s+\./g, ".").replace(/\.\s*\./g, ".").replace(/\s{2,}/g, " ").trim();
  return r;
}

/** Derive short league prefix from name for rank labels. "DLP Dynasty League" → "DLP" */
export function leaguePrefix(name: string): string {
  const words = name.replace(/\s+League$/i, "").split(/\s+/);
  const dynIdx = words.findIndex((w) => w.toLowerCase() === "dynasty");
  if (dynIdx > 0) return words.slice(0, dynIdx).join(" ");
  if (words.length <= 2) return words[0];
  return words[0];
}
