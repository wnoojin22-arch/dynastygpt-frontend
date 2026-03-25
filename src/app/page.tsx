'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeagueStore } from '@/lib/stores/league-store';
import { syncLeague } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const T = {
  bg:        '#06080d',
  panel:     '#0a0d15',
  card:      '#10131d',
  elevated:  '#171b28',
  border:    '#1a1e30',
  borderLt:  '#252a3e',
  text:      '#eeeef2',
  textSec:   '#b0b2c8',
  textDim:   '#9596a5',
  gold:      '#d4a532',
  goldBright:'#f5e6a3',
  goldDark:  '#8b6914',
  goldDim:   'rgba(212,165,50,0.10)',
  goldBorder:'rgba(212,165,50,0.22)',
  goldGlow:  'rgba(212,165,50,0.06)',
  blue:      '#6bb8e0',
  green:     '#7dd3a0',
  red:       '#e47272',
  orange:    '#e09c6b',
  white08:   'rgba(255,255,255,0.06)',
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";

/* ═══════════════════════════════════════════════════════════════
   SHIELD LOGO
   ═══════════════════════════════════════════════════════════════ */
function ShieldLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(212,165,50,0.3))' }}>
      <defs>
        <linearGradient id="gs1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914"/><stop offset="30%" stopColor="#d4a532"/>
          <stop offset="50%" stopColor="#f5e6a3"/><stop offset="70%" stopColor="#d4a532"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
        <linearGradient id="gs2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3"/><stop offset="100%" stopColor="#b8860b"/>
        </linearGradient>
      </defs>
      <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#gs1)" strokeWidth="2.5"/>
      <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#gs1)" opacity="0.08"/>
      <text x="26" y="40" textAnchor="middle" fontFamily="'Playfair Display', serif" fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#gs2)">D</text>
      <g transform="translate(14, 3)">
        <path d="M0,10 L4,2 L8,7 L12,0 L16,7 L20,2 L24,10" fill="none" stroke="#f5e6a3" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="4" cy="2" r="1.5" fill="#f5e6a3"/><circle cx="12" cy="0" r="1.8" fill="#f5e6a3"/><circle cx="20" cy="2" r="1.5" fill="#f5e6a3"/>
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEADER — Logo + League ID Input (sticky)
   ═══════════════════════════════════════════════════════════════ */
function Header({ leagueId, setLeagueId, onSync, syncing, error }: {
  leagueId: string; setLeagueId: (v: string) => void;
  onSync: () => void; syncing: boolean; error: string | null;
}) {
  return (
    <header style={{
      height: 52, background: T.panel, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14,
      flexShrink: 0, position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ShieldLogo size={28} />
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>DYNASTY</span>
          <span style={{
            fontFamily: DISPLAY, fontSize: 20, letterSpacing: '-0.5px',
            background: 'linear-gradient(180deg, #f5e6a3, #d4a532, #8b6914)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>GPT</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text" placeholder="Enter Sleeper League ID..."
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSync(); }}
          style={{
            width: 240, padding: '7px 12px', borderRadius: 6,
            border: `1px solid ${error ? T.red + '60' : T.borderLt}`,
            background: T.elevated, color: T.text, fontSize: 12,
            fontFamily: MONO, fontWeight: 500, outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = T.gold + '60'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = T.borderLt; }}
        />
        <button onClick={onSync} disabled={syncing || !leagueId.trim()}
          style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            cursor: syncing ? 'wait' : 'pointer',
            background: syncing ? T.elevated : `linear-gradient(135deg, ${T.goldDark}, ${T.gold})`,
            color: syncing ? T.textDim : T.bg,
            fontSize: 11, fontFamily: SANS, fontWeight: 800, letterSpacing: '0.06em',
            transition: 'all 0.2s', opacity: !leagueId.trim() ? 0.4 : 1,
          }}>{syncing ? 'SYNCING...' : 'ENTER LEAGUE'}</button>
      </div>
      {error && <span style={{ fontSize: 10, color: T.red, fontFamily: MONO }}>{error}</span>}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET MOVERS TICKER — CSS-animated (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
const TICKER_ITEMS = [
  { name: 'Bijan Robinson', pos: 'RB', dir: 'up', delta: 312 },
  { name: 'Marvin Harrison Jr', pos: 'WR', dir: 'up', delta: 287 },
  { name: 'Caleb Williams', pos: 'QB', dir: 'up', delta: 245 },
  { name: 'Breece Hall', pos: 'RB', dir: 'down', delta: 198 },
  { name: 'CeeDee Lamb', pos: 'WR', dir: 'down', delta: 156 },
  { name: 'Travis Etienne', pos: 'RB', dir: 'down', delta: 134 },
  { name: 'Drake Maye', pos: 'QB', dir: 'up', delta: 201 },
  { name: 'Malik Nabers', pos: 'WR', dir: 'up', delta: 178 },
  { name: 'Jahmyr Gibbs', pos: 'RB', dir: 'up', delta: 165 },
  { name: 'Trey McBride', pos: 'TE', dir: 'up', delta: 142 },
  { name: 'De\'Von Achane', pos: 'RB', dir: 'down', delta: 189 },
  { name: 'Jayden Daniels', pos: 'QB', dir: 'up', delta: 220 },
];

function posColor(pos: string) {
  return pos === 'QB' ? '#e47272' : pos === 'RB' ? '#6bb8e0' : pos === 'WR' ? '#7dd3a0' : pos === 'TE' ? '#e09c6b' : T.textDim;
}

function MarketTicker() {
  const renderSet = (prefix: string) => TICKER_ITEMS.map((p, i) => (
    <span key={`${prefix}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.04em', color: posColor(p.pos), fontFamily: SANS, background: posColor(p.pos) + '18', padding: '1px 4px', borderRadius: 2 }}>{p.pos}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{p.name}</span>
      <span style={{ fontSize: 10, fontWeight: 900, color: p.dir === 'up' ? T.green : T.red }}>
        {p.dir === 'up' ? '▲' : '▼'} {p.delta}
      </span>
    </span>
  ));

  return (
    <div style={{ height: 32, background: T.card, borderBottom: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
      {/* Label */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: `linear-gradient(90deg, ${T.card} 80%, transparent 100%)` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, animation: 'pulse-gold 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: T.gold, fontFamily: SANS }}>MARKET MOVERS</span>
      </div>
      {/* Scrolling strip — 3x content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, whiteSpace: 'nowrap', width: 'max-content', paddingLeft: 180, animation: 'tickerScroll 80s linear infinite' }}>
        {renderSet('a')}
        <span style={{ display: 'inline-block', width: 40 }} />
        {renderSet('b')}
        <span style={{ display: 'inline-block', width: 40 }} />
        {renderSet('c')}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEAD (Shadynasty pattern)
   ═══════════════════════════════════════════════════════════════ */
function SectionHead({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: T.text, fontFamily: SANS }}>{title}</span>
      {badge && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: T.gold, fontFamily: SANS, padding: '2px 8px', borderRadius: 3, background: T.goldDim, border: `1px solid ${T.goldBorder}` }}>{badge}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ARTICLE CARDS — Editorial content feed (placeholder)
   ═══════════════════════════════════════════════════════════════ */
const ARTICLES = [
  { category: 'TRADE MARKET', categoryColor: T.gold, title: 'Trade Market Heating Up: 96K+ Trades Analyzed', desc: 'DynastyGPT has now processed over 96,000 trades across 8,400+ leagues. Here\'s what the data says about the current market.', time: '5 min read', date: 'Mar 25' },
  { category: 'RANKINGS', categoryColor: T.green, title: '2026 Rookie Rankings: Early Top 10 Preview', desc: 'With the NFL Draft approaching, dynasty managers are already positioning. Our AI-powered rankings break down the top prospects.', time: '8 min read', date: 'Mar 24' },
  { category: 'BUY LOW', categoryColor: T.blue, title: 'Week 12 Dynasty Buy-Lows You\'re Missing', desc: 'These undervalued assets are being moved at historic discounts. Our enriched trade data shows the opportunity window closing fast.', time: '4 min read', date: 'Mar 23' },
  { category: 'ANALYSIS', categoryColor: '#a78bfa', title: 'Owner Behavioral Profiling: How It Works', desc: 'We track 30+ behavioral signals per trade. Learn how DynastyGPT builds owner profiles that predict trade tendencies.', time: '6 min read', date: 'Mar 22' },
  { category: 'SELL HIGH', categoryColor: T.red, title: 'Sell-High Candidates Before the Draft', desc: 'Players whose value peaks before rookie season. Move them now or watch the window close.', time: '3 min read', date: 'Mar 21' },
];

function FeaturedArticle() {
  return (
    <div style={{
      borderRadius: 10, cursor: 'pointer',
      background: `linear-gradient(160deg, ${T.card} 0%, #0d1020 50%, ${T.card} 100%)`,
      border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.borderColor = T.gold + '40'; e.currentTarget.style.boxShadow = `0 8px 40px rgba(212,165,50,0.06)`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.gold}20, transparent)` }} />
      {/* Image placeholder */}
      <div style={{ height: 200, background: `linear-gradient(135deg, ${T.elevated}, ${T.card}, ${T.panel})`, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: 20, left: 30, width: '38%', height: 120, borderRadius: 8, background: T.panel, border: `1px solid ${T.border}`, transform: 'rotate(-3deg)', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', width: '38%', height: 120, borderRadius: 8, background: T.panel, border: `1px solid ${T.borderLt}`, opacity: 0.85 }} />
        <div style={{ position: 'absolute', top: 25, right: 30, width: '38%', height: 120, borderRadius: 8, background: T.panel, border: `1px solid ${T.borderLt}`, transform: 'rotate(3deg)', opacity: 0.9 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(180deg, transparent, ${T.card})`, zIndex: 4 }} />
      </div>
      <div style={{ padding: '16px 24px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: T.gold, fontFamily: SANS, padding: '2px 8px', borderRadius: 3, background: T.goldDim, border: `1px solid ${T.goldBorder}` }}>FEATURED</span>
        </div>
        <h3 style={{ fontFamily: DISPLAY, fontSize: 22, color: T.text, margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
          The Platform That Actually Knows Your League
        </h3>
        <p style={{ fontFamily: SANS, fontSize: 13, color: T.textDim, lineHeight: 1.6, margin: '0 0 14px' }}>
          How DynastyGPT turns trade history, roster data, and behavioral signals into trade grades, power rankings, and owner intelligence.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, color: T.textDim, fontWeight: 500 }}>DynastyGPT</span>
          <span style={{ color: T.textDim, fontSize: 11 }}>·</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: T.textDim, fontWeight: 500 }}>5 min read</span>
          <span style={{ fontFamily: SANS, fontSize: 13, color: T.textDim, marginLeft: 4 }}>→</span>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: typeof ARTICLES[number] }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', background: T.card,
      border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden',
      cursor: 'pointer', transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderLt; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: article.categoryColor }} />
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: T.textDim, fontFamily: SANS }}>{article.category}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: `${T.textDim}80`, fontFamily: MONO }}>{article.date}</span>
      </div>
      <div style={{ padding: 14, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: SANS, lineHeight: 1.35, marginBottom: 6 }}>{article.title}</div>
        <div style={{ fontSize: 12, color: T.textDim, fontFamily: SANS, lineHeight: 1.5 }}>{article.desc}</div>
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 10, color: `${T.textDim}80`, fontFamily: MONO }}>{article.time}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLATFORM STATS — compact credibility bar (not centerpiece)
   ═══════════════════════════════════════════════════════════════ */
function PlatformStats() {
  const stats = [
    { value: '96,731', label: 'TRADES' },
    { value: '8,428', label: 'LEAGUES' },
    { value: '34,335', label: 'OWNERS' },
  ];
  return (
    <div style={{ padding: '14px 16px', borderRadius: 8, background: T.card, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: T.textDim, fontFamily: SANS, marginBottom: 10 }}>PLATFORM STATS</div>
      {stats.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontSize: 12, color: T.textDim, fontFamily: SANS }}>{s.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.gold, fontFamily: MONO }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRENDING PLAYERS WIDGET (right sidebar)
   ═══════════════════════════════════════════════════════════════ */
function TrendingWidget() {
  const risers = [
    { name: 'Bijan Robinson', pos: 'RB', delta: 312 },
    { name: 'Marvin Harrison Jr', pos: 'WR', delta: 287 },
    { name: 'Jayden Daniels', pos: 'QB', delta: 220 },
    { name: 'Drake Maye', pos: 'QB', delta: 201 },
    { name: 'Malik Nabers', pos: 'WR', delta: 178 },
  ];
  const fallers = [
    { name: 'Breece Hall', pos: 'RB', delta: -198 },
    { name: 'De\'Von Achane', pos: 'RB', delta: -189 },
    { name: 'CeeDee Lamb', pos: 'WR', delta: -156 },
    { name: 'Travis Etienne', pos: 'RB', delta: -134 },
  ];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: T.text, fontFamily: SANS }}>TRENDING</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T.gold, fontFamily: SANS, padding: '2px 8px', borderRadius: 3, background: T.goldDim, border: `1px solid ${T.goldBorder}` }}>7D</span>
      </div>
      {/* Risers */}
      <div style={{ padding: '6px 14px 2px' }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: T.green, fontFamily: MONO }}>RISERS</span>
      </div>
      {risers.map((p, i) => (
        <div key={`r-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', transition: 'background 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.elevated; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: posColor(p.pos), fontFamily: SANS, background: posColor(p.pos) + '18', padding: '1px 4px', borderRadius: 2, letterSpacing: '0.04em' }}>{p.pos}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: SANS, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.green, fontFamily: MONO }}>▲ +{p.delta}</span>
        </div>
      ))}
      {/* Fallers */}
      <div style={{ padding: '8px 14px 2px' }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: T.red, fontFamily: MONO }}>FALLERS</span>
      </div>
      {fallers.map((p, i) => (
        <div key={`f-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', transition: 'background 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.elevated; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: posColor(p.pos), fontFamily: SANS, background: posColor(p.pos) + '18', padding: '1px 4px', borderRadius: 2, letterSpacing: '0.04em' }}>{p.pos}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: SANS, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.red, fontFamily: MONO }}>▼ {Math.abs(p.delta)}</span>
        </div>
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CAPABILITIES SECTION (pushed down, compact)
   ═══════════════════════════════════════════════════════════════ */
const CAPS = [
  { icon: '⚔', title: 'War Room', desc: 'Roster intel, draft capital, positional radar, and franchise analytics.', accent: T.gold },
  { icon: '⇌', title: 'Trade Analyzer', desc: 'Grade any trade with SHA & KTC valuations and owner context.', accent: T.blue },
  { icon: '◎', title: 'Power Rankings', desc: 'SHA, Dynasty, and Win-Now modes with positional breakdowns.', accent: T.green },
  { icon: '◉', title: 'Owner Intel', desc: 'Behavioral profiling — trade tendencies, biases, and rival analysis.', accent: T.orange },
  { icon: '⌘', title: 'Franchise Intel', desc: 'AI scouting reports, buy-low targets, and trade partner fits.', accent: '#a78bfa' },
  { icon: '📊', title: 'Draft Room', desc: 'Draft history with hit rates, bust rates, and position tendencies.', accent: T.red },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const { setLeague } = useLeagueStore();
  const [leagueId, setLeagueId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    const id = leagueId.trim();
    if (!id) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await syncLeague(id);
      const slug = res.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setLeague(id, slug, res.name);
      router.push(`/l/${slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync league');
      setSyncing(false);
    }
  }, [leagueId, setLeague, router]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: SANS }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <Header leagueId={leagueId} setLeagueId={setLeagueId} onSync={handleSync} syncing={syncing} error={error} />
      <MarketTicker />

      {/* ═══ HERO (tight — not full viewport) ═══ */}
      <div style={{
        padding: '40px 32px 36px',
        background: `linear-gradient(160deg, ${T.panel} 0%, #0c0f1a 40%, #0a0e18 60%, ${T.panel} 100%)`,
        borderBottom: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 1, background: `linear-gradient(90deg, transparent 0%, ${T.gold}50 25%, ${T.gold}80 50%, ${T.gold}50 75%, transparent 100%)` }} />
        <div style={{ position: 'absolute', top: -60, left: '20%', width: 300, height: 120, background: `radial-gradient(ellipse, ${T.gold}06 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', animation: 'fadeUp 0.5s ease both' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', color: T.gold, fontFamily: MONO, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 20, height: 1, background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />
            AI-POWERED DYNASTY INTELLIGENCE
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: T.text, fontFamily: DISPLAY, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.05 }}>
              The Platform That Actually Knows{' '}
              <span style={{ background: 'linear-gradient(180deg, #f5e6a3 0%, #d4a532 40%, #8b6914 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 24px rgba(212,165,50,0.2))' }}>Your League</span>
            </h1>
            <span style={{ fontSize: 15, fontWeight: 400, fontFamily: SANS, color: T.textSec, marginBottom: 4, lineHeight: 1.4 }}>
              Trade grades, owner profiling, and AI scouting reports — <span style={{ color: T.gold, fontWeight: 600 }}>built from your league&apos;s actual data.</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══ MAIN GRID — Content Left, Widgets Right (Shadynasty layout) ═══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 48px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN — content feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.5s ease 0.1s both' }}>
          {/* Featured Article */}
          <FeaturedArticle />

          {/* Article Grid — 2 columns like Shadynasty news */}
          <div>
            <SectionHead title="DYNASTY INTEL" badge="LATEST" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {ARTICLES.slice(0, 4).map((a, i) => <ArticleCard key={i} article={a} />)}
            </div>
          </div>

          {/* Capabilities — pushed way down */}
          <div>
            <SectionHead title="PLATFORM CAPABILITIES" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {CAPS.map((c) => (
                <div key={c.title} style={{ padding: '16px 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.border}`, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accent + '50'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: c.accent + '12', border: `1px solid ${c.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: c.accent, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: SANS, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: T.textDim, fontFamily: SANS, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.5s ease 0.2s both' }}>
          {/* League Entry CTA */}
          <div style={{ padding: '16px', borderRadius: 8, background: `linear-gradient(135deg, ${T.goldGlow}, ${T.card})`, border: `1px solid ${T.goldBorder}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: SANS, marginBottom: 6 }}>Analyze Your League</div>
            <div style={{ fontSize: 11, color: T.textDim, fontFamily: SANS, marginBottom: 12 }}>Paste your Sleeper league ID to get started. Free, no sign-up.</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="League ID..." value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSync(); }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 4, border: `1px solid ${T.borderLt}`, background: T.elevated, color: T.text, fontSize: 11, fontFamily: MONO, outline: 'none' }}
              />
              <button onClick={handleSync} disabled={syncing || !leagueId.trim()}
                style={{ padding: '7px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.goldDark}, ${T.gold})`, color: T.bg, fontSize: 10, fontWeight: 800, fontFamily: SANS, letterSpacing: '0.04em', opacity: !leagueId.trim() ? 0.4 : 1 }}>
                {syncing ? '...' : 'GO →'}
              </button>
            </div>
          </div>

          {/* Platform Stats */}
          <PlatformStats />

          {/* Trending Players */}
          <div><SectionHead title="TRENDING PLAYERS" badge="7D" /></div>
          <div style={{ marginTop: -12 }}><TrendingWidget /></div>

          {/* Recently Analyzed */}
          <div style={{ padding: '14px 16px', borderRadius: 8, background: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: T.textDim, fontFamily: SANS, marginBottom: 10 }}>RECENTLY SYNCED</div>
            {['DLP Dynasty League', 'Gridiron Kings SF', 'Dynasty Degenerates', 'The League 2.0', 'Touchdown Titans'].map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, opacity: 1 - i * 0.15 }} />
                <span style={{ fontSize: 12, color: i === 0 ? T.text : T.textSec, fontFamily: SANS, fontWeight: i === 0 ? 600 : 400 }}>{name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: `${T.textDim}60`, fontFamily: MONO }}>{i === 0 ? 'just now' : `${i * 3 + 2}m ago`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '24px 28px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldLogo size={16} />
          <span style={{ fontFamily: DISPLAY, fontSize: 12, color: T.textDim }}>DYNASTY<span style={{ color: T.gold }}>GPT</span></span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: `${T.textDim}60`, marginLeft: 8 }}>v0.1.0 · Sleeper Platform</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: `${T.textDim}50` }}>Built for dynasty managers who want an unfair advantage.</span>
      </footer>
    </div>
  );
}
