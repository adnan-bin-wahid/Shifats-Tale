import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/empty-module.ts",
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://img.youtube.com https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://*.r2.cloudflarestorage.com https://unpkg.com blob: data:; worker-src 'self' blob: https://unpkg.com; frame-src 'self' https://www.youtube.com https://docs.google.com https://res.cloudinary.com https://*.r2.cloudflarestorage.com blob:; object-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
