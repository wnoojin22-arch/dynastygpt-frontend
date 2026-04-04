import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#06080d",
};

export const metadata: Metadata = {
  title: "DynastyGPT — AI-Powered Dynasty Intelligence",
  description:
    "The smartest dynasty fantasy football analytics platform. AI-powered trade analysis, roster intelligence, and owner profiling for your league.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang="en" className="dark h-full">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,900&family=Inter:wght@400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen bg-bg text-primary font-sans antialiased">
          <ClerkProvider appearance={{ variables: { colorPrimary: "#d4a532", colorBackground: "#06080d", colorText: "#eeeef2" } }}>
            <Providers>{children}</Providers>
          </ClerkProvider>
          <Analytics />
        </body>
      </html>
    </>
  );
}
