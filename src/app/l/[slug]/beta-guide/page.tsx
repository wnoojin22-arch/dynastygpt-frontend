"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { C, SANS, MONO, DISPLAY } from "@/components/league/tokens";

/* ═══════════════════════════════════════════════════════════════
   BETA GUIDE — hardcoded content, no API calls
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 mt-10 first:mt-0">
      <h2 className="text-[11px] font-black tracking-[0.16em] text-primary uppercase mb-2" style={{ fontFamily: SANS }}>
        {title}
      </h2>
      <div className="h-px bg-gold/30" />
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] text-secondary leading-relaxed mb-4" style={{ fontFamily: SANS }}>
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-[15px] text-secondary leading-relaxed mb-2 pl-1" style={{ fontFamily: SANS }}>
      {children}
    </li>
  );
}

function PageLabel({ name }: { name: string }) {
  return (
    <div className="text-[11px] font-black tracking-[0.14em] text-gold uppercase mt-6 mb-2" style={{ fontFamily: SANS }}>
      {name}
    </div>
  );
}

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="my-6 px-5 py-4 rounded-md"
      style={{
        background: C.goldDim,
        borderLeft: `3px solid ${C.gold}`,
      }}
    >
      <p
        className="text-[16px] sm:text-[17px] leading-relaxed font-semibold"
        style={{ fontFamily: SANS, color: C.primary, letterSpacing: "-0.1px" }}
      >
        {children}
      </p>
    </div>
  );
}

export default function BetaGuidePage() {
  const pathname = usePathname();
  const slug = pathname.split("/")[2] || "";
  const basePath = `/l/${slug}`;

  return (
    <div className="min-h-full" style={{ background: C.bg }}>
      {/* ── Top bar with back button ── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-8 py-3 border-b"
        style={{ background: C.panel, borderColor: C.border }}
      >
        <Link
          href={basePath}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-elevated transition-colors"
          style={{ color: C.dim }}
        >
          <ChevronLeft size={16} />
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ fontFamily: MONO }}>
            Back
          </span>
        </Link>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Tag */}
        <div className="mb-4">
          <span
            className="inline-block text-[9px] font-black tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm"
            style={{
              fontFamily: SANS,
              color: C.gold,
              background: C.goldDim,
              border: `1px solid ${C.goldBorder}`,
            }}
          >
            BETA GUIDE
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
          style={{ fontFamily: DISPLAY, color: C.primary, letterSpacing: "-0.5px" }}
        >
          Welcome to DynastyGPT Beta — Start Here
        </h1>
        <p
          className="text-base sm:text-lg leading-relaxed mb-2"
          style={{ fontFamily: SANS, color: C.secondary }}
        >
          Everything you need to know about the platform, how to use it, and how to help shape what it becomes.
        </p>

        {/* SECTION 1 */}
        <SectionHeader title="What This Is" />
        <P>I built DynastyGPT because I wanted a tool that actually knows my league — not generic fantasy advice, but real analysis grounded in your trades, your leaguemates&apos; tendencies, and your roster history. That&apos;s what this is trying to be. Everything here is calibrated to <em>your</em> league specifically — your scoring, your superflex or 1QB setting, your TE premium, your team count, your full trade history.</P>
        <P>The valuations adjust for your format. The trade grades use point-in-time values from the day each deal happened. The owner scouting reports are built from real behavioral data, not vibes.</P>

        {/* SECTION 2 */}
        <SectionHeader title="Real Talk — This Is a Work in Progress" />
        <P>Fair warning: you&apos;ll see changes almost every day based on feedback from people like you. That&apos;s intentional — this beta is how it gets better.</P>
        <P>Is it perfect? No. Are there some known issues I&apos;m still working through? Absolutely. But at some point you have to stop trying to make it perfect and put it in front of real managers who actually care about this stuff. So here we are.</P>
        <P>Honestly, some of the things I&apos;m worried about — you might not even notice. And the things you notice are probably things I&apos;d never find sitting here by myself. That&apos;s exactly the point.</P>
        <Pullquote>The product you&apos;re looking at today will be meaningfully different in two weeks. That&apos;s a promise, not a disclaimer.</Pullquote>

        {/* SECTION 3 */}
        <SectionHeader title="How to Give Feedback" />
        <P>This is the most important section in this whole guide. There&apos;s a gold <strong className="text-gold">Feedback button</strong> on every page — top-right on mobile, bottom-right on desktop. It captures the page you&apos;re on automatically. Pick a category, type a sentence, attach a screenshot if you can, hit send. That&apos;s it.</P>
        <P>For anything bigger — bug reports, feature requests, half-baked ideas — email <strong className="text-gold">hello@dynastygpt.com</strong> directly. I read everything.</P>
        <P>When something looks off — and something will — that&apos;s not a problem, that&apos;s a data point. Tell me. One message is all I need to start digging.</P>
        <P>If something looks wrong, please give me a chance to fix it before writing it off. I&apos;d much rather hear &quot;this doesn&apos;t seem right&quot; than lose you quietly.</P>
        <P>If you love it, share it — real word-of-mouth from someone who actually plays dynasty means more than any post I could write myself. If something frustrates you, tell me first — I&apos;d way rather fix a problem than defend one.</P>

        {/* SECTION 4 */}
        <SectionHeader title="Where I Need Your Eyes Most" />
        <P>Two areas will get the most scrutiny — and should. <strong className="text-primary">Trade suggestions</strong> and <strong className="text-primary">trade grading</strong> are the most complex things on the platform. The grades are grounded in real data across millions of trades, but dynasty is nuanced and no algorithm captures everything perfectly.</P>
        <P>One thing worth knowing: every dynasty league is different. Different scoring, different formats, different roster settings. The system is built to capture all of that — but how well it handles <em>your</em> specific league&apos;s format is one of the bigger things I&apos;m hoping you&apos;ll help me test. If something feels off relative to how your league actually scores, that&apos;s exactly what I want to hear.</P>

        {/* SECTION 5 */}
        <SectionHeader title="Where to Start" />
        <P>If you&apos;re not sure where to look first, try this order:</P>
        <ol className="list-decimal pl-6 mb-4">
          <Bullet>You&apos;re on the <strong className="text-primary">League Home</strong> page right now. Take a lap. Read the ticker, scroll the Trade Fairness Index, pull up Market Pulse.</Bullet>
          <Bullet>Head to <strong className="text-primary">Intel → My Franchise</strong> to see your GM verdict, contention window, roster grades, and moveable assets.</Bullet>
          <Bullet>Open <strong className="text-primary">Trades → Builder</strong> and try suggesting a trade with a specific partner. Watch what comes back.</Bullet>
          <Bullet>Go to <strong className="text-primary">Trades → My Trades</strong> to see every deal you&apos;ve ever made in this league, graded with hindsight.</Bullet>
          <Bullet>Check <strong className="text-primary">Rankings</strong> to see where every team in your league actually stands.</Bullet>
        </ol>

        {/* SECTION 6 */}
        <SectionHeader title="What Makes This Different" />
        <P><strong className="text-gold">Trade Grading.</strong> Every trade in your league&apos;s entire history has two grades. <strong className="text-primary">Trade Day</strong> is what the value looked like on the exact day the deal happened. <strong className="text-primary">Hindsight</strong> is what actually played out — production, value movement, flip chains, championships. Hindsight is always live and keeps updating as production rolls in, even after a verdict has been called.</P>
        <P><strong className="text-gold">Owner Behavioral Profiles.</strong> Every owner in your league has been profiled across 80+ metrics — what positions they overpay for, when they trade most, their win rate, repeat trade partners, age direction tendencies, blockbuster appetite. Lives in <strong className="text-primary">Intel → Opponents</strong>.</P>
        <P><strong className="text-gold">AI Trade Suggestions.</strong> The Trade Builder doesn&apos;t just match values. It knows your roster needs, your leaguemates&apos; tendencies, point-in-time market data, and behavioral acceptance likelihood. Suggestions are built from mutual fit, not just math.</P>
        <P><strong className="text-gold">Market Pulse.</strong> Real transaction data from across 1.5M+ trades platform-wide. Most-traded assets over the last 120 days, plus players whose actual trade prices are running above or below consensus value.</P>
        <P><strong className="text-gold">Dynasty Score.</strong> A composite score for each owner across the platform — championship history, trade win rate, roster construction, draft hit rates, behavioral intelligence. Cached so you can compare yourself to thousands of other dynasty managers.</P>

        {/* SECTION 7 */}
        <SectionHeader title="Page by Page" />

        <PageLabel name="League Home" />
        <P>What am I seeing? The front page of your league. A scrolling Daily Ticker with real movement, a hero league storyline at the top, then Trade Fairness Index (who deals fair), League Legends (biggest heists, most active dealer, best win-wins), Market Pulse, and League Activity. The League News and My News columns are where weekly matchup reports and league-wide fun engagement content will live once the season starts. I&apos;ve seeded a couple of welcome articles to get you going — more dropping in soon.</P>

        <PageLabel name="Dashboard" />
        <P>What am I seeing? Your franchise control center. Roster &amp; Assets, Positional Radar, Recent Trades involving your players, Season Trajectory, Dynasty vs Win-Now positioning, and a &quot;Your Move&quot; card flagging actions worth taking. There&apos;s also a real-trades panel that scans matching leagues across the platform for deals involving the players you own.</P>

        <PageLabel name="Trades" />
        <P>Three tabs. <strong className="text-primary">Builder</strong> is the trade workshop (full breakdown in the next section). <strong className="text-primary">My Trades</strong> shows every trade you&apos;ve ever made in this league with verdicts and hindsight grades. <strong className="text-primary">League Trades</strong> is the full league activity feed with stat boxes — total trades, most active dealer, best trader, even rate.</P>

        <PageLabel name="Intel" />
        <P>Three tabs. <strong className="text-primary">My Franchise</strong> gives you a GM Verdict, your contention window, roster grades by position, and a list of your moveable assets. <strong className="text-primary">Opponents</strong> is the per-owner scouting grid — every other team in your league with positional grades and behavioral scouting reports. <strong className="text-primary">Draft Room</strong> is also accessible from here as the third tab.</P>

        <PageLabel name="Rankings" />
        <P>Three views. <strong className="text-primary">Team Power</strong> ranks every owner in your league overall and surfaces tier badges (Top Dog, Contender, Feisty, Basement). <strong className="text-primary">Positional</strong> shows each team&apos;s position-room rank — who has the deepest QB room, the best WR corps, etc. <strong className="text-primary">Players</strong> is the full player database for your league&apos;s format.</P>
        <P>Every view has the same three lenses you can toggle between: <strong className="text-primary">{`{Your League}`} Rank</strong> (DynastyGPT&apos;s rank for your specific format), <strong className="text-primary">Dynasty</strong> (long-term value), and <strong className="text-primary">Win-Now</strong> (this-year value). Superflex, scoring type, and TE premium adjustments are baked into every number you see — not bolted on after.</P>

        <PageLabel name="Draft Room" />
        <P>Four tabs. <strong className="text-primary">My Draft Room</strong> shows your personal draft history and pick intel. <strong className="text-primary">League Report</strong> has hit rates by round and position, draft tendencies, draft class grades, and a draft-day trades section. <strong className="text-primary">Owners</strong> shows per-owner draft profiles with hit rate rings. <strong className="text-primary">Draft Board</strong> is the full pick history by season.</P>

        <PageLabel name="Trade Builder" />
        <P>Desktop and mobile are completely different experiences — same engine underneath. <strong className="text-primary">On desktop</strong> you get a 3-column workshop: your roster on the left, your partner&apos;s roster on the right, the build area in the middle, and an AI Trade Advisor chat panel locked to the right edge that knows the trade you&apos;re building. <strong className="text-primary">On mobile</strong> it&apos;s Tinder-style — swipe right to save, swipe left to skip.</P>

        {/* SECTION 8 */}
        <SectionHeader title="Trade Builder — How to Use It" />
        <P>The Trade Builder has five ways to ask for help, and they&apos;re mode-aware — what you have selected determines what kind of suggestion you get back.</P>
        <ul className="list-disc pl-6 mb-4">
          <Bullet><strong className="text-gold">Coach mode:</strong> No partner, no players selected. Tap Suggest and the engine recommends the best trades available to you across the league.</Bullet>
          <Bullet><strong className="text-gold">Partner mode:</strong> Pick a specific owner. Tap Suggest. The engine builds packages mutually fit between your roster and theirs.</Bullet>
          <Bullet><strong className="text-gold">Sell mode:</strong> Click a player on your roster you want to move. The engine looks for the best return packages for that asset.</Bullet>
          <Bullet><strong className="text-gold">Find Position:</strong> Use the FIND QB / RB / WR / TE buttons to find upgrades at a specific position.</Bullet>
          <Bullet><strong className="text-gold">Acquire / What Would It Take (desktop and mobile):</strong> Pick a partner, target a player you want from them with nothing on your side, and the engine answers &quot;what would it take to get this guy.&quot;</Bullet>
        </ul>
        <P>Once you&apos;ve built a trade in the workshop, hit <strong className="text-primary">Analyze</strong>. The engine runs your hypothetical trade through a grading pass and surfaces a few things: a letter grade with dimension scores, a partner-perception read on how they&apos;d see it, a positional impact breakdown, a value balance, and a list of things you could ask them to include to even it out.</P>
        <P><strong className="text-primary">Heads up on the analyzer:</strong> the trade <em>builder</em> is where I&apos;ve put almost all my time so far. There are already a million trade analyzers out there — what nobody else has is a builder that actually knows your league. So that&apos;s what I built first. The analyzer view itself is functional but rough around the edges. It&apos;ll get a real polish pass over the next couple of weeks.</P>
        <P>There&apos;s a <strong className="text-primary">Trade Style</strong> toggle — Conservative, Balanced, Aggressive. This biases what kinds of packages the engine surfaces when you&apos;re asking for suggestions. Conservative leans toward safer fair-value deals. Aggressive will recommend riskier &quot;exploit&quot; packages where you&apos;re pushing for value. Balanced sits in the middle.</P>
        <P>The <strong className="text-primary">Trade Advisor chat panel</strong> (desktop only) knows your active trade. Ask it &quot;is this a good deal?&quot; or &quot;how do I sweeten this&quot; or &quot;who else might want this player&quot; and it will answer with context from your league.</P>

        {/* SECTION 9 */}
        <SectionHeader title="Trade Grades — What Am I Looking At" />
        <P>Every trade in your league shows two scores side by side. Here&apos;s what they actually mean.</P>
        <ul className="list-disc pl-6 mb-4">
          <Bullet><strong className="text-gold">TD (Trade Day):</strong> The format-adjusted value balance on the exact day the deal happened. Built from KTC, FantasyPros, and trade market data at that moment in time. This never changes — it&apos;s a snapshot of the deal as it looked when it was made.</Bullet>
          <Bullet><strong className="text-gold">HS (Hindsight):</strong> What actually played out. Real fantasy production after the trade, value trajectory of every asset involved, flip chains where the assets keep moving, and championship multipliers if the trade contributed to a title. Every hindsight grade is live — it keeps updating as more production rolls in, even after a verdict has been called. Trades less than 18 months old will show as pending because there isn&apos;t enough data yet to lock in a verdict.</Bullet>
        </ul>
        <P>The verdict labels you&apos;ll see: <strong className="text-primary">ROBBERY</strong> (one side took the other to the cleaners), <strong className="text-primary">WON</strong> / <strong className="text-primary">LOST</strong> (clear winner), <strong className="text-primary">EVEN</strong> (push or win-win). These are based on which side extracted more value from the deal.</P>
        <P>If a grade looks wrong — and some will — open the trade, take a screenshot, hit the Feedback button. Tell me the trade and what seems off. This is the part of the platform I&apos;m iterating on the hardest, and your eyes are the best signal I have.</P>

        {/* SECTION 10 — cost / abuse */}
        <SectionHeader title="A Few Things Worth Knowing" />
        <P>This costs me real money to run — and I&apos;m genuinely okay with that as we test this together. I&apos;ve put limits in place to prevent abuse and keep costs manageable, but normal usage will never hit them.</P>
        <P>I also have systems in place to detect misuse. Not aimed at anyone here — just being transparent that unusual behavior gets flagged automatically.</P>

        {/* CLOSING */}
        <SectionHeader title="One Last Thing" />
        <P>Alright — go explore. Break things. Tell me what you find. This only gets good if you&apos;re honest with me.</P>
        <P>Thanks for being part of this.</P>

        {/* Footer */}
        <div className="mt-16 mb-8 pt-8 border-t border-border">
          <div className="flex justify-center">
            <Link
              href={basePath}
              className="text-[11px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-md transition-colors"
              style={{
                fontFamily: MONO,
                color: C.gold,
                background: C.goldDim,
                border: `1px solid ${C.goldBorder}`,
              }}
            >
              Back to League Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
