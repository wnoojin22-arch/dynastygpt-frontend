/* ═══════════════════════════════════════════════════════════════
   DYNASTYGPT DESIGN TOKENS — ported from Shadynasty
   ═══════════════════════════════════════════════════════════════ */

export const colors = {
  bg:        '#06080d',
  panel:     '#0a0d15',
  card:      '#10131d',
  elevated:  '#171b28',

  border:    '#1a1e30',
  borderLt:  '#252a3e',

  primary:   '#eeeef2',
  secondary: '#b0b2c8',
  dim:       '#9596a5',

  gold:       '#d4a532',
  goldBright: '#f5e6a3',
  goldDark:   '#8b6914',
  goldDim:    'rgba(212,165,50,0.10)',
  goldBorder: 'rgba(212,165,50,0.22)',
  goldGlow:   'rgba(212,165,50,0.06)',

  blue:      '#6bb8e0',
  green:     '#7dd3a0',
  red:       '#e47272',
  redBright: '#ff4444',
  orange:    '#e09c6b',

  white08:   'rgba(255,255,255,0.06)',
} as const;

export const POS_COLORS: Record<string, string> = {
  QB: '#EF4444', RB: '#3B82F6', WR: '#22C55E', TE: '#F59E0B', PICK: colors.gold,
};

export function rankToGrade(rank: number): { grade: string; color: string } {
  if (rank <= 1) return { grade: 'A+', color: colors.green };
  if (rank === 2) return { grade: 'A',  color: colors.green };
  if (rank === 3) return { grade: 'A-', color: colors.green };
  if (rank === 4) return { grade: 'B+', color: colors.blue };
  if (rank === 5) return { grade: 'B',  color: colors.blue };
  if (rank === 6) return { grade: 'B-', color: colors.blue };
  if (rank === 7) return { grade: 'C+', color: colors.gold };
  if (rank === 8) return { grade: 'C',  color: colors.gold };
  if (rank === 9) return { grade: 'C-', color: colors.orange };
  if (rank === 10) return { grade: 'D+', color: colors.orange };
  if (rank === 11) return { grade: 'D',  color: colors.red };
  return { grade: 'F', color: colors.red };
}

export function getWindow(rank: number): { label: string; color: string } {
  if (rank <= 4) return { label: 'CONTENDER', color: colors.green };
  if (rank <= 8) return { label: 'MIDDLE OF PACK', color: colors.gold };
  return { label: 'REBUILDING', color: colors.red };
}

export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function ordinal(n: number | null | undefined): string {
  if (!n || isNaN(n)) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function posRankColor(pos: string, rank: number): string {
  if (pos === 'QB' || pos === 'TE') {
    if (rank <= 4) return colors.gold;
    if (rank <= 12) return colors.green;
    if (rank <= 24) return colors.secondary;
    return colors.red;
  }
  if (rank <= 8) return colors.gold;
  if (rank <= 24) return colors.green;
  if (rank <= 48) return colors.secondary;
  return colors.red;
}

export function getVerdictStyle(v: string): { color: string; bg: string; border: string } {
  if (v === 'Win-Win') return { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' };
  if (v === 'ROBBERY') return { color: '#ff4444', bg: 'rgba(255,68,68,0.15)', border: 'rgba(255,68,68,0.30)' };
  if (v === 'Push') return { color: colors.secondary, bg: 'rgba(176,178,200,0.10)', border: 'rgba(176,178,200,0.20)' };
  if (v.includes('Won')) return { color: colors.gold, bg: colors.goldDim, border: colors.goldBorder };
  if (v.includes('Lost')) return { color: colors.red, bg: 'rgba(255,68,68,0.10)', border: 'rgba(255,68,68,0.25)' };
  return { color: colors.dim, bg: 'transparent', border: colors.border };
}

export function tierBadge(rank: number): { label: string; color: string; bg: string; borderColor: string } {
  if (!rank || rank === 0) return { label: '—', color: colors.dim, bg: colors.elevated, borderColor: colors.border };
  if (rank <= 3) return { label: 'TOP DOG', color: colors.green, bg: 'rgba(125,211,160,0.10)', borderColor: colors.green + '30' };
  if (rank <= 6) return { label: 'CONTENDER', color: colors.gold, bg: colors.goldDim, borderColor: colors.goldBorder };
  if (rank <= 9) return { label: 'FEISTY', color: colors.orange, bg: 'rgba(224,156,107,0.10)', borderColor: colors.orange + '30' };
  return { label: 'BASEMENT', color: colors.red, bg: 'rgba(228,114,114,0.10)', borderColor: colors.red + '30' };
}

export function safe(v: unknown): string {
  if (v == null || v === 'nan' || v === 'null' || v === '' || (typeof v === 'number' && isNaN(v))) return '—';
  return String(v);
}
