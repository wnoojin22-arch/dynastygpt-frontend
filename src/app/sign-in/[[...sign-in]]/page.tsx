import { SignIn } from "@clerk/nextjs";

const clerkAppearance = {
  variables: {
    colorPrimary: "#d4a532",
    colorBackground: "#10131d",
    colorText: "#eeeef2",
    colorTextSecondary: "#9596a5",
    colorInputBackground: "#06080d",
    colorInputText: "#eeeef2",
    borderRadius: "8px",
  },
  elements: {
    card: { background: "#10131d", border: "1px solid #1a1e30", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" },
    headerTitle: { color: "#eeeef2" },
    headerSubtitle: { color: "#9596a5" },
    formFieldLabel: { color: "#b0b2c8" },
    formFieldInput: { background: "#06080d", border: "1px solid #1a1e30", color: "#eeeef2" },
    formButtonPrimary: { background: "linear-gradient(135deg, #d4a532, #8b6914)", color: "#06080d", fontWeight: "700" },
    footerActionLink: { color: "#d4a532" },
    socialButtonsBlockButton: { background: "#171b28", border: "1px solid #1a1e30", color: "#eeeef2" },
    dividerLine: { background: "#1a1e30" },
    dividerText: { color: "#9596a5" },
  },
};

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#06080d",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 24,
    }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36, fontWeight: 900, fontStyle: "italic",
          background: "linear-gradient(135deg, #f5e6a3, #d4a532)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: 0,
        }}>
          DynastyGPT
        </h1>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: "0.12em", color: "#9596a5", marginTop: 6,
        }}>
          AI-POWERED DYNASTY INTELLIGENCE
        </p>
      </div>
      <SignIn appearance={clerkAppearance} forceRedirectUrl="/dashboard" />
    </div>
  );
}
