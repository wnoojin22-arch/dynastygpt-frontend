"use client";

import React, { useState, useRef, useEffect } from "react";
import { Shield, MessageSquare, Zap, CheckCircle, Copy, Loader2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   BETA APPLICATION PAGE — DynastyGPT Private Beta
   Premium, exclusive, personal. First impression for dynasty degens.
   ═══════════════════════════════════════════════════════════════ */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Shield Logo (no triangles — just shield + D) ── */
function ShieldLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(212,165,50,0.3))" }}>
      <defs>
        <linearGradient id="beta-gs1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b6914" /><stop offset="30%" stopColor="#d4a532" />
          <stop offset="50%" stopColor="#f5e6a3" /><stop offset="70%" stopColor="#d4a532" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="beta-gs2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6a3" /><stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#beta-gs1)" strokeWidth="2.5" />
      <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#beta-gs1)" opacity="0.08" />
      <text x="26" y="40" textAnchor="middle" fontFamily="'Playfair Display', serif" fontWeight="900" fontStyle="italic" fontSize="32" fill="url(#beta-gs2)">D</text>
    </svg>
  );
}

/* ── Fade-in on mount ── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} ${className}`}>
      {children}
    </div>
  );
}

/* ── Button group field ── */
function ButtonGroup({ options, value, onChange, wide }: {
  options: string[]; value: string; onChange: (v: string) => void; wide?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
            ${wide ? "px-8" : "px-4"} py-2.5
            ${value === opt
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/50"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ── Multi-select pills ── */
function PillSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`rounded-full text-sm font-medium transition-all duration-200 cursor-pointer px-4 py-2
            ${selected.includes(opt)
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/50"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function BetaPage() {
  const [email, setEmail] = useState("");
  const [sleeperUsername, setSleeperUsername] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [seasons, setSeasons] = useState("");
  const [tradesPerSeason, setTradesPerSeason] = useState("");
  const [isCommissioner, setIsCommissioner] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !leagueId.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/beta/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          sleeper_username: sleeperUsername.trim(),
          league_id: leagueId.trim(),
          seasons_running: seasons,
          trades_per_season: tradesPerSeason,
          is_commissioner: isCommissioner === "Yes",
          priorities,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFadeOut(true);
        setTimeout(() => setSubmitted(true), 350);
      } else {
        setError(data.message || "Something went wrong. Try again or email billy@dynastygpt.com");
      }
    } catch {
      setError("Something went wrong. Try again or email billy@dynastygpt.com");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://dynastygpt.com/beta");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 focus:outline-none transition-all duration-200";

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Subtle bg texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,165,50,0.03), transparent 70%)",
      }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4">

        {/* ═══ SECTION 1: HERO ═══ */}
        <FadeIn className="pt-12 md:pt-16 pb-8 text-center">
          <div className="flex justify-center mb-8">
            <ShieldLogo size={48} />
          </div>
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 font-bold">DynastyGPT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Private <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", color: "#d4a532" }}>Beta</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-3">
            We&apos;re hand-selecting 10-15 leagues for our first wave. Active dynasty leagues with real trade history. Commissioners who want to shape the product.
          </p>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            We&apos;re starting small and adding leagues every week. First wave gets in now — everyone else joins as we expand through the offseason.
          </p>
          {/* Gold divider */}
          <div className="flex justify-center mt-8">
            <div className="w-24 h-px" style={{ background: "linear-gradient(90deg, transparent, #d4a532, transparent)" }} />
          </div>
        </FadeIn>

        {/* ═══ SECTION 2: STATS RIBBON ═══ */}
        <FadeIn delay={150} className="py-6 border-b border-zinc-800">
          <div className="flex justify-center gap-12 md:gap-16">
            {[
              { value: "500,000+", label: "TRADES ANALYZED" },
              { value: "36,000+", label: "LEAGUES" },
              { value: "114,000+", label: "DYNASTY MANAGERS" },
              { value: "70M+", label: "BEHAVIORAL DATA POINTS" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-amber-400 tabular-nums">{stat.value}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-1 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="w-full text-center mt-3">
            <p className="text-[11px] text-zinc-600 italic">...and counting</p>
          </div>
        </FadeIn>

        {/* ═══ SECTION 3: VALUE PROPS ═══ */}
        <FadeIn delay={300} className="py-10">
          <div className="text-center mb-8">
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-bold">What beta testers get</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                icon: <Shield size={20} />,
                title: "Full Platform Access",
                body: "Dashboard, trade builder, AI trade advisor, opponent scouting, franchise intelligence. Everything we've built, no restrictions.",
              },
              {
                icon: <MessageSquare size={20} />,
                title: "Direct Line to the Founder",
                body: "Your feedback goes directly to me. Bug reports, feature requests, \"this is stupid\" — all of it shapes what DynastyGPT becomes.",
              },
              {
                icon: <Zap size={20} />,
                title: "First to Every Feature",
                body: "Beta testers get every new feature first. Trade engine upgrades, new intel surfaces, AI improvements — you see it before anyone.",
              },
            ].map((card) => (
              <div key={card.title}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all duration-200">
                <div className="text-amber-400 mb-3">{card.icon}</div>
                <div className="text-white font-semibold text-sm mb-2">{card.title}</div>
                <div className="text-zinc-400 text-sm leading-relaxed">{card.body}</div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ═══ SECTION 4: THE FORM ═══ */}
        <FadeIn delay={450} className="pt-4 pb-10">
          <div className="max-w-2xl mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 md:p-10">

            {!submitted ? (
              <div className={`transition-opacity duration-300 ${fadeOut ? "opacity-0" : "opacity-100"}`}>
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white">Apply for Access</h2>
                  <div className="border-b border-zinc-800 mt-3" />
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Email */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com" className={inputClass} />
                  </div>

                  {/* Sleeper Username */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Sleeper Username</label>
                    <input type="text" required value={sleeperUsername} onChange={(e) => setSleeperUsername(e.target.value)}
                      placeholder="Your Sleeper display name" className={inputClass} />
                  </div>

                  {/* League ID */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Sleeper League ID</label>
                    <input type="text" required value={leagueId} onChange={(e) => setLeagueId(e.target.value)}
                      placeholder="Paste your league ID" className={inputClass} />
                    <p className="text-[11px] text-zinc-600 mt-1">Open Sleeper &rarr; Your League &rarr; Settings &rarr; General &rarr; League ID</p>
                  </div>

                  {/* Seasons Running */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">How many seasons has your league been running?</label>
                    <ButtonGroup options={["1", "2", "3", "4", "5+"]} value={seasons} onChange={setSeasons} />
                  </div>

                  {/* Trades Per Season */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Roughly how many trades per season?</label>
                    <ButtonGroup options={["Under 10", "10-25", "25-50", "50-100", "100+"]} value={tradesPerSeason} onChange={setTradesPerSeason} />
                  </div>

                  {/* Commissioner */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Are you the commissioner?</label>
                    <ButtonGroup options={["Yes", "No"]} value={isCommissioner} onChange={setIsCommissioner} wide />
                  </div>

                  {/* Priorities */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">What matters most to you?</label>
                    <PillSelect
                      options={["Trade Grades", "Trade Suggestions", "Owner Scouting", "Power Rankings", "Draft Analysis", "AI Advisor"]}
                      selected={priorities} onChange={setPriorities}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2 block">Anything else we should know?</label>
                    <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about your league, what you're looking for, or just say hi"
                      className={`${inputClass} resize-none`} />
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={submitting || !email.trim() || !leagueId.trim()}
                    className="w-full mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold text-sm tracking-wider uppercase py-4 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> SUBMITTING...
                      </span>
                    ) : "APPLY FOR BETA ACCESS"}
                  </button>

                  {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
                </form>
              </div>
            ) : (
              /* ═══ SUCCESS STATE ═══ */
              <div className="text-center py-6 animate-in fade-in duration-500">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={48} className="text-emerald-400" style={{ animation: "scaleIn 0.4s ease-out" }} />
                </div>
                <h3 className="text-xl font-bold text-white mt-4">Application Received</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mt-3 max-w-md mx-auto">
                  We review every application personally. First wave selections go out within 48 hours.
                </p>
                <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
                  Not in the first wave? No stress — we&apos;re adding new leagues every week through the offseason. You&apos;ll get an email when your league is live.
                </p>
                <div className="border-t border-zinc-800 my-6 w-24 mx-auto" />
                <p className="text-zinc-500 text-sm mb-3">Not the commissioner? Share this with them.</p>
                <button onClick={copyLink}
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer">
                  <Copy size={14} className={copied ? "text-emerald-400" : "text-zinc-400"} />
                  <span className={copied ? "text-emerald-400" : "text-zinc-400"}>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            )}
          </div>
        </FadeIn>

        {/* ═══ SECTION 5: FOOTER ═══ */}
        <div className="text-center py-8">
          <p className="text-zinc-600 text-xs">Built by a dynasty degenerate who got tired of bad tools.</p>
          <a href="https://dynastygpt.com" className="text-amber-400/60 hover:text-amber-400 text-xs mt-1 inline-block transition-colors">
            &larr; Back to DynastyGPT
          </a>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
