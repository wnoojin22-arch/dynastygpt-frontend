'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeagueStore } from '@/lib/stores/league-store';
import { syncLeague } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS (inline — matches globals.css / tokens.ts)
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
const SERIF = "'Playfair Display', Georgia, serif";

/* ═══════════════════════════════════════════════════════════════
   SHIELD LOGO SVG
   ═══════════════════════════════════════════════════════════════ */
function ShieldLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 12px rgba(212,165,50,0.3))' }}>
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
      <text x="26" y="40" textAnchor="middle" fontFamily={SERIF} fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#gs2)">D</text>
      <g transform="translate(14, 3)">
        <path d="M0,10 L4,2 L8,7 L12,0 L16,7 L20,2 L24,10" fill="none" stroke="#f5e6a3" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="4" cy="2" r="1.5" fill="#f5e6a3"/><circle cx="12" cy="0" r="1.8" fill="#f5e6a3"/><circle cx="20" cy="2" r="1.5" fill="#f5e6a3"/>
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════ */
function Header({ leagueId, setLeagueId, onSync, syncing, error }: {
  leagueId: string; setLeagueId: (v: string) => void;
  onSync: () => void; syncing: boolean; error: string | null;
}) {
  return (
    <header style={{
      height: 56, background: T.panel, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Logo */}
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

      {/* League Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Enter Sleeper League ID..."
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSync(); }}
            style={{
              width: 260, padding: '8px 14px', borderRadius: 6,
              border: `1px solid ${error ? T.red + '60' : T.borderLt}`,
              background: T.elevated, color: T.text, fontSize: 13,
              fontFamily: MONO, fontWeight: 500, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = T.gold + '60'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = error ? T.red + '60' : T.borderLt; }}
          />
        </div>
        <button
          onClick={onSync}
          disabled={syncing || !leagueId.trim()}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none', cursor: syncing ? 'wait' : 'pointer',
            background: syncing
              ? T.elevated
              : `linear-gradient(135deg, ${T.goldDark}, ${T.gold})`,
            color: syncing ? T.textDim : T.bg,
            fontSize: 12, fontFamily: SANS, fontWeight: 800, letterSpacing: '0.06em',
            transition: 'all 0.2s',
            opacity: !leagueId.trim() ? 0.4 : 1,
          }}
        >
          {syncing ? 'SYNCING...' : 'ENTER LEAGUE'}
        </button>
      </div>
      {error && (
        <span style={{ fontSize: 11, color: T.red, fontFamily: MONO, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {error}
        </span>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE CARDS
   ═══════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: '⚔',
    title: 'War Room',
    desc: 'Owner command center — roster breakdown, draft capital, positional radar, and AI-powered franchise intel.',
    accent: T.gold,
  },
  {
    icon: '⇌',
    title: 'Trade Analyzer',
    desc: 'Grade any trade with full league context. SHA & KTC valuations, win probability, and hindsight tracking.',
    accent: T.blue,
  },
  {
    icon: '◎',
    title: 'Power Rankings',
    desc: 'Three ranking modes — Shadynasty (blended), Dynasty (long-term), and Win-Now — with positional breakdowns.',
    accent: T.green,
  },
  {
    icon: '◉',
    title: 'Owner Intel',
    desc: 'Full behavioral profiling. Trade tendencies, position biases, seasonal timing patterns, and rival analysis.',
    accent: T.orange,
  },
  {
    icon: '⌘',
    title: 'Franchise Intel',
    desc: 'AI-generated scouting reports. Buy-low targets, sell-high candidates, trade partner fits, and roster gaps.',
    accent: '#a78bfa',
  },
  {
    icon: '📊',
    title: 'Draft Room',
    desc: 'Draft history with hit rates, bust rates, round efficiency, and position tendencies for every owner.',
    accent: T.red,
  },
];

function FeatureCard({ icon, title, desc, accent }: typeof FEATURES[number]) {
  return (
    <div
      style={{
        padding: '20px 22px', borderRadius: 10,
        background: T.card, border: `1px solid ${T.border}`,
        cursor: 'default', transition: 'all 0.25s ease',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent + '50';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${accent}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${accent}12`, border: `1px solid ${accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, marginBottom: 14, color: accent,
      }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: SANS, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: T.textDim, fontFamily: SANS, lineHeight: 1.55 }}>
        {desc}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATS STRIP — credibility receipts
   ═══════════════════════════════════════════════════════════════ */
function StatsStrip() {
  const stats = [
    { value: '96,000+', label: 'TRADES ANALYZED' },
    { value: '8,400+', label: 'LEAGUES' },
    { value: '34,000+', label: 'OWNERS' },
    { value: '10,300+', label: 'SYNCED OVERNIGHT' },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: 0,
      background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1, maxWidth: 220, padding: '20px 0', textAlign: 'center',
          borderRight: i < stats.length - 1 ? `1px solid ${T.border}` : 'none',
        }}>
          <div style={{
            fontFamily: DISPLAY, fontSize: 28, color: T.gold, lineHeight: 1,
            letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 0 8px rgba(212,165,50,0.15))',
          }}>{s.value}</div>
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.2em',
            color: T.textDim, marginTop: 6,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Enter Your League ID', desc: 'Paste your Sleeper league ID. We sync rosters, trades, picks, and standings instantly.' },
    { num: '02', title: 'We Crunch Everything', desc: 'SHA valuations, trade grades, behavioral profiling, positional analysis — computed in seconds.' },
    { num: '03', title: 'Dominate Your League', desc: 'War Room command center, AI scouting reports, trade intelligence, and franchise analytics.' },
  ];
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em',
          color: T.gold, marginBottom: 8,
        }}>HOW IT WORKS</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 24, color: T.text, letterSpacing: '-0.02em' }}>
          Three Steps to League Dominance
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {steps.map((s) => (
          <div key={s.num} style={{
            padding: '24px 22px', borderRadius: 10,
            background: T.card, border: `1px solid ${T.border}`,
            position: 'relative',
          }}>
            <div style={{
              fontFamily: DISPLAY, fontSize: 48, color: T.gold, opacity: 0.08,
              position: 'absolute', top: 10, right: 16, lineHeight: 1,
            }}>{s.num}</div>
            <div style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 800, color: T.gold,
              letterSpacing: '0.12em', marginBottom: 10,
            }}>STEP {s.num}</div>
            <div style={{
              fontSize: 16, fontWeight: 800, color: T.text, fontFamily: SANS,
              marginBottom: 8,
            }}>{s.title}</div>
            <div style={{ fontSize: 13, color: T.textDim, fontFamily: SANS, lineHeight: 1.55 }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{
      padding: '32px 28px', borderTop: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldLogo size={18} />
        <span style={{ fontFamily: DISPLAY, fontSize: 13, color: T.textDim }}>
          DYNASTY<span style={{ color: T.gold }}>GPT</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: `${T.textDim}80`, marginLeft: 8 }}>
          v0.1.0 · Sleeper Platform
        </span>
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 10, color: `${T.textDim}60`,
        letterSpacing: '0.04em',
      }}>
        Built for dynasty league managers who want an unfair advantage.
      </div>
    </footer>
  );
}

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
      const slug = res.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-gold { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>

      <Header
        leagueId={leagueId}
        setLeagueId={setLeagueId}
        onSync={handleSync}
        syncing={syncing}
        error={error}
      />

      {/* ═══ HERO ═══ */}
      <div style={{
        padding: '80px 32px 60px',
        background: `linear-gradient(160deg, ${T.panel} 0%, #0c0f1a 40%, #0a0e18 60%, ${T.panel} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Gold accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '32px', right: '32px', height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${T.gold}50 25%, ${T.gold}80 50%, ${T.gold}50 75%, transparent 100%)`,
        }} />
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '-80px', left: '20%', width: 400, height: 200,
          background: `radial-gradient(ellipse, ${T.gold}06 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-40px', right: '15%', width: 300, height: 150,
          background: `radial-gradient(ellipse, rgba(107,184,224,0.03) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative',
          animation: 'fadeUp 0.6s ease both',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 20,
            border: `1px solid ${T.goldBorder}`, background: T.goldGlow,
            marginBottom: 28,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: T.green,
              animation: 'pulse-gold 2s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: T.gold }}>
              AI-POWERED DYNASTY INTELLIGENCE
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: DISPLAY, fontSize: 52, color: T.text, letterSpacing: '-0.02em',
            margin: '0 0 20px', lineHeight: 1.05,
          }}>
            The Platform That<br />
            Actually Knows{' '}
            <span style={{
              background: 'linear-gradient(180deg, #f5e6a3 0%, #d4a532 40%, #8b6914 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(212,165,50,0.2))',
            }}>Your League</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: SANS, fontSize: 17, color: T.textSec, lineHeight: 1.6,
            maxWidth: 600, margin: '0 auto 36px',
          }}>
            Trade grades, power rankings, owner profiling, and AI scouting reports —{' '}
            <span style={{ color: T.gold, fontWeight: 600 }}>all computed from your league&apos;s actual history.</span>
          </p>

          {/* Hero CTA */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '4px 4px 4px 18px', borderRadius: 8,
            background: T.card, border: `1px solid ${T.borderLt}`,
          }}>
            <input
              type="text"
              placeholder="Paste your Sleeper league ID..."
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSync(); }}
              style={{
                width: 300, padding: '10px 0', border: 'none', background: 'transparent',
                color: T.text, fontSize: 14, fontFamily: MONO, fontWeight: 500, outline: 'none',
              }}
            />
            <button
              onClick={handleSync}
              disabled={syncing || !leagueId.trim()}
              style={{
                padding: '10px 24px', borderRadius: 6, border: 'none',
                cursor: syncing ? 'wait' : 'pointer',
                background: syncing
                  ? T.elevated
                  : `linear-gradient(135deg, ${T.goldDark}, ${T.gold}, ${T.goldBright})`,
                color: syncing ? T.textDim : T.bg,
                fontSize: 13, fontFamily: SANS, fontWeight: 800, letterSpacing: '0.04em',
                transition: 'all 0.2s', opacity: !leagueId.trim() ? 0.5 : 1,
              }}
            >
              {syncing ? 'SYNCING...' : 'ANALYZE MY LEAGUE →'}
            </button>
          </div>
          {error && (
            <div style={{
              marginTop: 12, fontFamily: MONO, fontSize: 11, color: T.red,
            }}>
              {error}
            </div>
          )}
          <div style={{
            marginTop: 16, fontFamily: MONO, fontSize: 10, color: `${T.textDim}80`,
            letterSpacing: '0.06em',
          }}>
            Free for all Sleeper leagues · No sign-up required · Syncs in seconds
          </div>
        </div>
      </div>

      {/* ═══ STATS STRIP ═══ */}
      <StatsStrip />

      {/* ═══ FEATURES GRID ═══ */}
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '64px 32px',
        animation: 'fadeUp 0.6s ease 0.15s both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em',
            color: T.gold, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{ width: 20, height: 1, background: `linear-gradient(90deg, transparent, ${T.gold})` }} />
            PLATFORM CAPABILITIES
            <div style={{ width: 20, height: 1, background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.text, letterSpacing: '-0.02em' }}>
            Everything You Need to Win
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <div style={{
        padding: '64px 32px',
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.panel} 50%, ${T.bg} 100%)`,
        animation: 'fadeUp 0.6s ease 0.25s both',
      }}>
        <HowItWorks />
      </div>

      {/* ═══ BOTTOM CTA ═══ */}
      <div style={{
        padding: '64px 32px', textAlign: 'center',
        borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{
          fontFamily: DISPLAY, fontSize: 32, color: T.text, marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Ready to See What You&apos;ve Been Missing?
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 15, color: T.textDim, marginBottom: 28,
          maxWidth: 500, margin: '0 auto 28px',
        }}>
          Every trade. Every roster move. Every owner tendency. Analyzed and waiting for you.
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '4px 4px 4px 18px', borderRadius: 8,
          background: T.card, border: `1px solid ${T.borderLt}`,
        }}>
          <input
            type="text"
            placeholder="Sleeper League ID..."
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSync(); }}
            style={{
              width: 260, padding: '10px 0', border: 'none', background: 'transparent',
              color: T.text, fontSize: 14, fontFamily: MONO, fontWeight: 500, outline: 'none',
            }}
          />
          <button
            onClick={handleSync}
            disabled={syncing || !leagueId.trim()}
            style={{
              padding: '10px 24px', borderRadius: 6, border: 'none',
              cursor: syncing ? 'wait' : 'pointer',
              background: `linear-gradient(135deg, ${T.goldDark}, ${T.gold}, ${T.goldBright})`,
              color: T.bg,
              fontSize: 13, fontFamily: SANS, fontWeight: 800, letterSpacing: '0.04em',
              transition: 'all 0.2s', opacity: !leagueId.trim() ? 0.5 : 1,
            }}
          >
            {syncing ? 'SYNCING...' : 'ENTER LEAGUE →'}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
