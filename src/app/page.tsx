import Link from "next/link";

const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

export default function HomePage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#06080d",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 48, fontWeight: 900, fontStyle: "italic",
          background: "linear-gradient(135deg, #f5e6a3, #d4a532)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: 0, lineHeight: 1.1,
        }}>
          DynastyGPT
        </h1>
        <p style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em",
          color: "#9596a5", marginTop: 8,
        }}>
          AI-POWERED DYNASTY INTELLIGENCE
        </p>

        <h2 style={{
          fontFamily: SANS, fontSize: 22, fontWeight: 700,
          color: "#eeeef2", marginTop: 48, marginBottom: 12,
        }}>
          Welcome to the Beta
        </h2>
        <p style={{
          fontFamily: SANS, fontSize: 15, color: "#b0b2c8",
          lineHeight: 1.6, margin: "0 0 32px",
        }}>
          Sign in to access your league.
        </p>

        <Link href="/sign-in" style={{
          display: "inline-block", padding: "14px 48px", borderRadius: 8,
          background: "linear-gradient(135deg, #d4a532, #8b6914)",
          color: "#06080d", fontFamily: MONO, fontSize: 14, fontWeight: 800,
          letterSpacing: "0.06em", textDecoration: "none",
          transition: "opacity 0.15s",
        }}>
          SIGN IN
        </Link>
      </div>
    </div>
  );
}
