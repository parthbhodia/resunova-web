import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep: every indexed URL on this site ends in a slash. Changing it would
  // redirect or 404 the entire existing index.
  trailingSlash: true,
  // Kept as-is through the host move so nothing about rendering changes in the
  // same step as the hosting. Vercel can optimize these; that is a separate,
  // visually-verifiable change.
  images: { unoptimized: true },
  // Allow mobile/LAN access during dev (e.g. phone or tablet on same Wi-Fi)
  allowedDevOrigins: ["192.168.0.104", "192.168.*"],
  transpilePackages: ["react-pdf", "pdfjs-dist", "@react-pdf/renderer", "docx"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      stream: false,
      zlib: false,
    };
    return config;
  },
};

export default nextConfig;
