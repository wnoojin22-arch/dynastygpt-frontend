import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DynastyGPT — AI-Powered Dynasty Intelligence",
  description:
    "The smartest dynasty fantasy football analytics platform. AI-powered trade analysis, roster intelligence, and owner profiling for your league.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,900&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-primary font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
