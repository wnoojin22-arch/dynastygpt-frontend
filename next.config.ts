import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname || "."),
  },
  async rewrites() {
    // Use 127.0.0.1 explicitly — "localhost" can resolve to ::1 (IPv6)
    // which uvicorn doesn't bind to, causing proxy timeouts from LAN clients.
    const backend =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
        "://localhost:",
        "://127.0.0.1:",
      );
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
