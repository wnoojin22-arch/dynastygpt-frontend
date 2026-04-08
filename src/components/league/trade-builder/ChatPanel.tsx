"use client";
/**
 * TRADE ADVISOR — Bloomberg-grade AI chat panel.
 * Ported 1:1 from Shadynasty. Persistent right column with glass morphism, streaming.
 * Enhanced with DynastyGPT context (cross-league comps, partner history, behavioral data).
 */
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg: '#06080d', panel: '#0a0d15', card: '#10131d', elevated: '#171b28',
  border: '#1a1e30', borderLt: '#252a3e',
  primary: '#eeeef2', secondary: '#b0b2c8', dim: '#9596a5',
  gold: '#d4a532', goldBright: '#f5e6a3', goldDark: '#8b6914',
  goldDim: 'rgba(212,165,50,0.10)', goldBorder: 'rgba(212,165,50,0.22)',
  green: '#7dd3a0', red: '#e47272', blue: '#6bb8e0',
  white08: 'rgba(255,255,255,0.06)',
};
const MONO = "'JetBrains Mono','SF Mono',monospace";
const DISPLAY = "'Archivo Black',sans-serif";
const SERIF = "'Playfair Display',Georgia,serif";
const SANS = "-apple-system,'Inter',system-ui,sans-serif";

const API = "";

interface Message { role: 'user' | 'assistant'; content: string; }

/**
 * Format assistant message for display:
 * - Split into lines, render bullets with spacing
 * - Strip parenthetical values like (9,351) from non-value context lines
 */
function formatAssistantContent(text: string) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return <span>{text}</span>;

  // Lines where values are relevant — contain these keywords
  const VALUE_KEYWORDS = /\b(value|ranked|score|capital|total|worth|sha_value|market price|PPG)\b/i;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => {
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('–');
        let displayLine = line;

        // Strip parenthetical numbers on non-value lines
        // Matches: (9,351) or (4,468) or (12,400.5) — numbers with commas in parens
        if (!VALUE_KEYWORDS.test(line)) {
          displayLine = displayLine.replace(/\s*\(\d[\d,.]*\)/g, '');
        }

        if (isBullet) {
          return (
            <div key={i} style={{
              paddingLeft: 4,
              lineHeight: 1.6,
            }}>
              {displayLine}
            </div>
          );
        }
        // First line (summary) or non-bullet lines
        return (
          <div key={i} style={{
            fontWeight: i === 0 ? 600 : 400,
            lineHeight: 1.6,
          }}>
            {displayLine}
          </div>
        );
      })}
    </div>
  );
}

interface ChatPanelProps {
  leagueId: string;
  owner: string;
  activeTrade: any | null;
  suggestedPackages: any[] | null;
  partner: string;
  collapsed: boolean;
  onToggle: () => void;
  injectedMessage?: string | null;
}

export default function ChatPanel({ leagueId, owner, activeTrade, suggestedPackages, partner, collapsed, onToggle, injectedMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastInjectedRef = useRef<string | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (!collapsed) setTimeout(() => inputRef.current?.focus(), 100); }, [collapsed]);

  // Auto-inject analysis message when trade is analyzed
  useEffect(() => {
    if (injectedMessage && injectedMessage !== lastInjectedRef.current) {
      lastInjectedRef.current = injectedMessage;
      const clean = injectedMessage.replace(/\n\d{13}$/, '').replace(/\*\*/g, '');
      setMessages(prev => [...prev, { role: 'assistant', content: clean }]);
    }
  }, [injectedMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setInput('');
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { authHeaders } = await import("@/lib/api");
      const hdrs = await authHeaders();
      const res = await fetch(`${API}/api/league/${leagueId}/trade-builder/chat`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          owner, message: text.trim(),
          conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
          active_trade: activeTrade,
          suggested_packages: suggestedPackages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: `Error: ${err.error || err.detail || 'Request failed'}` }; return u; });
        setStreaming(false); return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              const clean = parsed.text.replace(/\*\*/g, '');
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + clean };
                return u;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: `Error: ${e.message}` }; return u; });
    } finally { setStreaming(false); }
  }, [leagueId, owner, messages, activeTrade, suggestedPackages, streaming]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const quickPrompts = messages.length === 0 ? (
    activeTrade ? ["Is this a good trade?", "How do I improve it?", "Better partner?", "Negotiation strategy?"]
    : suggestedPackages?.length ? ["Which trade is best?", "Other options?", "Who to target?"]
    : ["Who should I trade with?", "Best trade I can make?", "Who overpays for picks?", "Positions to target?"]
  ) : null;

  // ── COLLAPSED: visible tab on right edge ──
  if (collapsed) {
    return (
      <div onClick={onToggle} style={{
        width: 48, height: '100%', flexShrink: 0, cursor: 'pointer',
        background: `linear-gradient(180deg, ${C.gold}08 0%, ${C.gold}04 50%, ${C.gold}08 100%)`,
        borderLeft: `2px solid ${C.gold}50`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderLeftColor = C.gold; e.currentTarget.style.background = `${C.gold}12`; }}
        onMouseLeave={e => { e.currentTarget.style.borderLeftColor = `${C.gold}50`; e.currentTarget.style.background = `linear-gradient(180deg, ${C.gold}08 0%, ${C.gold}04 50%, ${C.gold}08 100%)`; }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
          boxShadow: `0 0 16px ${C.gold}30`,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 900, color: '#000' }}>AI</span>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: '0.15em',
          writingMode: 'vertical-rl',
        }}>TRADE ADVISOR</span>
        {messages.length > 0 && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, marginTop: 4, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse-gold 2s ease infinite' }} />}
        <span style={{ fontFamily: MONO, fontSize: 8, color: `${C.gold}80`, writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>CLICK TO OPEN</span>
      </div>
    );
  }

  // ── EXPANDED: premium chat panel ──
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
            boxShadow: `0 0 16px ${C.gold}20`,
            animation: streaming ? 'pulse-gold 1.5s ease infinite' : 'none',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 900, color: C.gold }}>AI</span>
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: C.goldBright, letterSpacing: '0.03em' }}>TRADE ADVISOR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {messages.length > 0 && <button onClick={() => { setMessages([]); lastInjectedRef.current = null; }} title="Clear chat" style={{
            background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontFamily: MONO, fontSize: 11, lineHeight: 1,
            transition: 'color 0.15s', padding: '2px',
          }}
            onMouseEnter={e => e.currentTarget.style.color = C.red}
            onMouseLeave={e => e.currentTarget.style.color = C.dim}
          >CLR</button>}
          <button onClick={onToggle} style={{
            background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontFamily: MONO, fontSize: 15, lineHeight: 1,
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = C.gold}
            onMouseLeave={e => e.currentTarget.style.color = C.dim}
          >&rarr;</button>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div className="chat-scroll" style={{
        flex: 1, overflowY: 'auto', padding: '12px 10px',
        display: 'flex', flexDirection: 'column', gap: 10,
        scrollbarWidth: 'thin',
        scrollbarColor: `${C.gold}30 transparent`,
      }}>
        <style>{`
          @keyframes pulse-gold { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          .chat-scroll::-webkit-scrollbar { width: 4px; }
          .chat-scroll::-webkit-scrollbar-track { background: transparent; }
          .chat-scroll::-webkit-scrollbar-thumb { background: ${C.gold}30; border-radius: 2px; }
          .chat-scroll::-webkit-scrollbar-thumb:hover { background: ${C.gold}50; }
        `}</style>

        {messages.length === 0 && !streaming && (
          <div style={{ textAlign: 'center', padding: '20px 8px' }}>
            <div style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', color: C.goldBright, marginBottom: 6 }}>Ready to advise</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
              Ask about trades, player values, or strategy. I know every owner&apos;s roster, tendencies, and trade history.
            </div>
          </div>
        )}

        {/* Quick prompts */}
        {quickPrompts && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)} style={{
                fontFamily: SANS, fontSize: 12, color: C.goldBright, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(212,165,50,0.06)', border: `1px solid rgba(212,165,50,0.18)`,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                backdropFilter: 'blur(10px)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,165,50,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,165,50,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,165,50,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,165,50,0.18)'; }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isStreamingMsg = streaming && i === messages.length - 1 && !isUser;
          return (
            <div key={i} style={{
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '9px 12px',
              borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: isUser
                ? 'rgba(212,165,50,0.08)'
                : 'linear-gradient(135deg, rgba(16,19,29,0.95) 0%, rgba(23,27,40,0.9) 100%)',
              border: isUser
                ? `1px solid rgba(212,165,50,0.2)`
                : `1px solid ${isStreamingMsg ? 'rgba(212,165,50,0.25)' : 'rgba(26,30,48,0.8)'}`,
              borderLeft: !isUser ? `2px solid ${isStreamingMsg ? C.gold : `${C.gold}40`}` : undefined,
              boxShadow: isStreamingMsg ? `0 0 12px rgba(212,165,50,0.08)` : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              <div style={{
                fontFamily: SANS, fontSize: 13, color: C.primary, lineHeight: 1.6,
              }}>
                {msg.content ? (
                  isUser ? msg.content : formatAssistantContent(msg.content)
                ) : (isStreamingMsg ? (
                  <span style={{ color: C.gold, fontFamily: MONO, fontSize: 12 }}>
                    <span style={{ animation: 'pulse-gold 1s ease infinite' }}>●</span> thinking...
                  </span>
                ) : '')}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ── */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex', gap: 8, padding: '10px 10px 12px',
        borderTop: `1px solid ${C.gold}15`,
        background: 'linear-gradient(135deg, rgba(16,19,29,0.95) 0%, rgba(10,13,21,0.95) 100%)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={streaming ? "Generating..." : "Ask about trades..."}
          disabled={streaming}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8,
            background: 'rgba(23,27,40,0.8)',
            border: `1px solid ${C.border}`,
            color: C.primary, fontFamily: SANS, fontSize: 13,
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.boxShadow = `0 0 8px ${C.gold}20`; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          style={{
            padding: '9px 14px', borderRadius: 8, border: 'none',
            background: input.trim() && !streaming
              ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
              : C.elevated,
            color: input.trim() && !streaming ? '#000' : C.dim,
            fontFamily: DISPLAY, fontSize: 11, letterSpacing: '0.08em',
            cursor: input.trim() && !streaming ? 'pointer' : 'default',
            transition: 'all 0.15s',
            boxShadow: streaming ? `0 0 12px ${C.gold}30` : 'none',
            animation: streaming ? 'pulse-gold 1.5s ease infinite' : 'none',
          }}
        >
          {streaming ? '...' : 'SEND'}
        </button>
      </form>
    </div>
  );
}
