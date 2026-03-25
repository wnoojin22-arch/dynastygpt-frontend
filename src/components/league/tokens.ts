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
  if (o.includes("win-win")) return { label: "WIN-WIN", color: "#7dd3a0", bg: "rgba(125,211,160,0.12)" };
  if (o.includes("robbery")) return { label: "ROBBERY", color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
  if (o.includes("push")) return { label: "PUSH", color: "#b0b2c8", bg: "rgba(176,178,200,0.10)" };
  if (o.includes("won") || o.includes("slight edge")) return { label: "WON", color: C.gold, bg: C.goldDim };
  if (o.includes("lost") || o.includes("slight loss")) return { label: "LOST", color: C.red, bg: "rgba(255,68,68,0.10)" };
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

/** Derive short league prefix from name for rank labels. "DLP Dynasty League" → "DLP" */
export function leaguePrefix(name: string): string {
  const words = name.replace(/\s+League$/i, "").split(/\s+/);
  const dynIdx = words.findIndex((w) => w.toLowerCase() === "dynasty");
  if (dynIdx > 0) return words.slice(0, dynIdx).join(" ");
  if (words.length <= 2) return words[0];
  return words[0];
}
