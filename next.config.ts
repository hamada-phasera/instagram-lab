import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project. Without it, stray lockfiles in
  // ~/ and the parent dir make Turbopack misdetect the home directory as root
  // and scan/cache the entire tree (dev requests hang ~90s on cache compaction).
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
    ],
  },
};

export default nextConfig;
