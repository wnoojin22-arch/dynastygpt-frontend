"use client";
/**
 * TRADE ADVISOR — DOWN FOR MAINTENANCE.
 * Functionality disabled while we ship a smarter version. Keep visual placeholder
 * (collapsed tab + expanded panel) so users know the surface still exists.
 */

const C = {
  elevated: '#171b28',
  border: '#1a1e30',
  primary: '#eeeef2', dim: '#9596a5',
  gold: '#d4a532', goldBright: '#f5e6a3',
};
const MONO = "'JetBrains Mono','SF Mono',monospace";
const SERIF = "'Playfair Display',Georgia,serif";
const SANS = "-apple-system,'Inter',system-ui,sans-serif";

interface ChatPanelProps {
  leagueId?: string;
  owner?: string;
  ownerId?: string | null;
  activeTrade?: unknown | null;
  suggestedPackages?: unknown[] | null;
  partner?: string;
  collapsed: boolean;
  onToggle: () => void;
  injectedMessage?: string | null;
}

export default function ChatPanel({ collapsed, onToggle }: ChatPanelProps) {
  // ── COLLAPSED: visible tab on right edge — MAINTENANCE state ──
  if (collapsed) {
    return (
      <div onClick={onToggle} style={{
        width: 48, height: '100%', flexShrink: 0, cursor: 'pointer',
        background: `linear-gradient(180deg, ${C.gold}06 0%, ${C.gold}03 50%, ${C.gold}06 100%)`,
        borderLeft: `2px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.elevated, border: `1px solid ${C.gold}40`,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 900, color: C.gold }}>AI</span>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: '0.15em',
          writingMode: 'vertical-rl',
        }}>TRADE ADVISOR</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: C.dim, writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>DOWN — IMPROVEMENTS COMING</span>
      </div>
    );
  }

  // ── EXPANDED: maintenance state ──
  return (
    <div style={{
      width: 340, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0,
      background: 'linear-gradient(180deg, rgba(10,13,21,0.97) 0%, rgba(6,8,13,0.98) 100%)',
      borderLeft: `1px solid ${C.gold}30`,
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
    }}>
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: `1px solid ${C.gold}20`,
        background: `linear-gradient(135deg, rgba(16,19,29,0.9) 0%, rgba(23,27,40,0.9) 100%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${C.gold}15`, border: `1px solid ${C.gold}40`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 900, color: C.gold }}>AI</span>
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: C.goldBright, letterSpacing: '0.03em' }}>TRADE ADVISOR</span>
        </div>
        <button onClick={onToggle} style={{
          background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontFamily: MONO, fontSize: 15, lineHeight: 1,
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = C.gold}
          onMouseLeave={e => e.currentTarget.style.color = C.dim}
        >&rarr;</button>
      </div>

      {/* ── MAINTENANCE BODY ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', gap: 14, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.elevated, border: `1px solid ${C.gold}35`,
          boxShadow: `0 0 20px ${C.gold}15`,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 900, color: C.gold }}>AI</span>
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
          color: '#000', background: C.gold,
          padding: '4px 10px', borderRadius: 4,
        }}>
          DOWN FOR MAINTENANCE
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.goldBright, lineHeight: 1.3 }}>
          Improvements coming
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim, lineHeight: 1.55, maxWidth: 260 }}>
          The AI Trade Advisor is offline while we ship a smarter version. Check back soon.
        </div>
      </div>
    </div>
  );
}
