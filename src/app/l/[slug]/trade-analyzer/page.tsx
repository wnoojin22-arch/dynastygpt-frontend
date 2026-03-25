"use client";

const C = {
  bg: "#06080d", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", borderLt: "#252a3e",
  primary: "#eeeef2", dim: "#9596a5",
  gold: "#d4a532", goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  blue: "#6bb8e0",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace";
const DISPLAY = "'Archivo Black', sans-serif";

export default function TradeAnalyzerPage() {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.3em",
          color: C.gold, marginBottom: 8,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 20, height: 1, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
          TRADE ANALYZER
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 28, color: C.primary, letterSpacing: "-0.02em" }}>
          Evaluate Any Trade
        </div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
          Grade trades with full league context — SHA & KTC valuations, win probability, and owner-aware analysis.
        </div>
      </div>

      {/* Placeholder */}
      <div style={{
        padding: "48px 32px", borderRadius: 10,
        background: C.card, border: `1px solid ${C.border}`,
        textAlign: "center",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, margin: "0 auto 16px",
          background: `${C.blue}12`, border: `1px solid ${C.blue}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: C.blue,
        }}>⇌</div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 8 }}>
          Trade Analyzer Coming Soon
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, maxWidth: 400, margin: "0 auto" }}>
          Build and evaluate trades with AI-powered analysis. Select two owners, choose assets, and get instant grades.
        </div>
        <div style={{
          display: "inline-block", marginTop: 20,
          padding: "6px 16px", borderRadius: 4,
          background: C.goldDim, border: `1px solid ${C.goldBorder}`,
          fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
          color: C.gold,
        }}>
          PHASE 2
        </div>
      </div>
    </div>
  );
}
