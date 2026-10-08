import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Set NEXT_DIST_DIR to build or test somewhere else without touching the folder a running `next dev` is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    qualities: [75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "www.nrmu.net" },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
