import { SignUp } from "@clerk/nextjs";

/* ═══════════════════════════════════════════════════════════════
   DESIGN SYSTEM — matched to dynastygpt.com
   ═══════════════════════════════════════════════════════════════ */
const GOLD = "#d4a532";
const GOLD_BRIGHT = "#f5e6a3";
const GOLD_DARK = "#8b6914";
const BG = "#06080d";
const CARD = "#0d1117";
const BORDER = "#1a1e30";
const TEXT = "#eeeef2";
const TEXT_SEC = "#b0b2c8";
const TEXT_DIM = "#9596a5";
const TEXT_MUTED = "#4a4b5a";
const DISPLAY = "'Archivo Black', sans-serif";
const SANS = "'Inter', -apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

/* ═══════════════════════════════════════════════════════════════
   CLERK APPEARANCE — dark gold elite theme
   ═══════════════════════════════════════════════════════════════ */
const clerkAppearance = {
  variables: {
    colorPrimary: GOLD,
    colorBackground: "#0d1117",
    colorText: TEXT,
    colorTextSecondary: "#b0b2c8",
    colorInputBackground: "#06080d",
    colorInputText: "#eeeef2",
    borderRadius: "8px",
    fontFamily: SANS,
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
  },
  elements: {
    rootBox: { width: "100%", maxWidth: 480 },
    cardBox: { boxShadow: "none", background: "transparent" },
    card: {
      background: CARD,
      border: `1px solid rgba(212, 165, 50, 0.35)`,
      borderRadius: "14px",
      boxShadow: "0 0 60px rgba(212,165,50,0.15), 0 0 0 1px rgba(212,165,50,0.3)",
      padding: "36px 40px",
      fontFamily: SANS,
    },
    headerTitle: { fontFamily: SANS, fontWeight: "700", fontStyle: "normal", fontSize: "22px", color: TEXT, letterSpacing: "-0.3px" },
    headerSubtitle: { fontFamily: SANS, fontSize: "14px", color: "#b0b2c8", marginTop: "4px" },
    formFieldLabel: { fontFamily: SANS, fontSize: "12px", fontWeight: "500", color: "#b0b2c8", letterSpacing: "0.01em" },
    formFieldInput: {
      fontFamily: SANS, fontSize: "15px",
      background: BG, border: `1px solid ${BORDER}`, color: TEXT,
      borderRadius: "8px", padding: "12px 14px",
      transition: "border-color 0.15s ease",
    },
    formFieldInputFocused: { borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}` },
    otpCodeFieldInput: { background: BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: "8px" },
    formButtonPrimary: {
      fontFamily: SANS, fontSize: "14px", fontWeight: "700",
      background: GOLD, color: "#000",
      padding: "13px 0", borderRadius: "8px",
      transition: "background 0.15s ease",
      letterSpacing: "0.01em",
    },
    formButtonPrimaryHover: { background: GOLD_BRIGHT },
    footerActionLink: { color: GOLD, fontFamily: SANS, fontSize: "13px" },
    footer: { background: "transparent", borderTop: "none" },
    footerAction: { fontFamily: SANS, fontSize: "13px", color: "#b0b2c8" },
    socialButtonsBlockButton: {
      fontFamily: SANS, fontSize: "13px", fontWeight: "500",
      background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: TEXT,
      padding: "11px 16px", borderRadius: "8px",
      transition: "border-color 0.15s ease, background 0.15s ease",
    },
    socialButtonsBlockButtonHover: { borderColor: "rgba(212, 165, 50, 0.5)", background: "rgba(212, 165, 50, 0.04)" },
    dividerLine: { background: BORDER },
    dividerText: { color: "#b0b2c8", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.05em" },
    identityPreview: { background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: "8px" },
    identityPreviewText: { color: TEXT, fontFamily: SANS },
    identityPreviewEditButton: { color: GOLD, fontFamily: SANS },
    formFieldInputShowPasswordButton: { color: TEXT_DIM },
    formFieldErrorText: { color: "#e47272", fontFamily: SANS, fontSize: "12px" },
    alertText: { color: "#e47272", fontFamily: SANS },
    badge: { background: "rgba(212, 165, 50, 0.12)", color: GOLD, fontFamily: MONO, fontSize: "10px" },
  },
};

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function SignUpPage() {
  return (
    <div style={{
      minHeight: "100vh", background: BG,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Radial glow behind card */}
      <div style={{
        position: "absolute", top: "42%", left: "50%", transform: "translate(-50%, -50%)",
        width: 700, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(212,165,50,0.06) 0%, transparent 65%)",
      }} />

      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", backgroundSize: "256px 256px",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Logo — exact match to dynastygpt.com */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
          <svg width={40} height={44} viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 12px rgba(212,168,67,0.4))" }}>
            <defs>
              <linearGradient id="suGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={GOLD_DARK} /><stop offset="30%" stopColor={GOLD} />
                <stop offset="50%" stopColor={GOLD_BRIGHT} /><stop offset="70%" stopColor={GOLD} />
                <stop offset="100%" stopColor={GOLD_DARK} />
              </linearGradient>
              <linearGradient id="suText" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD_BRIGHT} /><stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
            <path d="M26,2 L48,14 L48,34 Q48,50 26,56 Q4,50 4,34 L4,14 Z" fill="none" stroke="url(#suGold)" strokeWidth="2.5" />
            <path d="M26,8 L42,17 L42,33 Q42,46 26,51 Q10,46 10,33 L10,17 Z" fill="url(#suGold)" opacity="0.08" />
            <text x="26" y="40" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="30" fill="url(#suText)">D</text>
          </svg>
          <span style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", color: TEXT }}>
            Dynasty<span style={{ color: GOLD }}>GPT</span>
          </span>
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em",
          color: GOLD, textTransform: "uppercase", marginTop: -36, marginBottom: 40,
        }}>
          The Platform That Knows Your League
        </div>

        {/* Clerk card */}
        <SignUp
          appearance={clerkAppearance}
          forceRedirectUrl="/onboarding"
        />

        {/* Footer */}
        <div style={{
          marginTop: 40, display: "flex", alignItems: "center", gap: 16,
          fontFamily: SANS, fontSize: 11, color: TEXT_MUTED,
        }}>
          <span>&copy; DynastyGPT</span>
          <span style={{ color: BORDER }}>|</span>
          <a href="https://dynastygpt.com" style={{ color: TEXT_MUTED, textDecoration: "none", transition: "color 0.15s" }}>Home</a>
          <a href="https://dynastygpt.com/faq" style={{ color: TEXT_MUTED, textDecoration: "none", transition: "color 0.15s" }}>FAQ</a>
        </div>
      </div>
    </div>
  );
}
