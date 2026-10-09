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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" }, // a file is never treated as a different type than it says
          { key: "X-Frame-Options", value: "SAMEORIGIN" }, // no other site can show ours inside a frame (click-jacking)
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera and microphone are left alone on purpose: the video call needs them. Features the site never uses are switched off.
          { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },
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
