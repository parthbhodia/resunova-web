import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

// STATIC EXPORT IS NOW OPT-IN, and this flag is the migration seam.
//
// The app is moving from GitHub Pages to Vercel. Pages can only serve a static
// export, Vercel runs the real Next server — and until DNS points at Vercel,
// Pages is the live site and must keep building. So the export is behind a flag
// that only .github/workflows/deploy.yml sets, and every other build (Vercel,
// local, CI) gets a normal server build.
//
// ⚠️ DELETE THIS FLAG, basePath, assetPrefix and deploy.yml together once DNS
// has moved — a rollback path nobody can roll back to is just dead config. The
// export is also what forces `dynamicParams = false` on app/jobs/[id], which is
// why the public job pages have to be a committed snapshot of URLs rather than
// live data; dropping it is what lets that whole apparatus go.
const staticExport = process.env.STATIC_EXPORT === "1";

// Pages-only. It serves at a custom-domain root, but a repo basePath would point
// assets at /repo/_next/... and break on www.example.com/, so the workflow passes
// an absolute asset URL. Vercel serves from the domain root and needs neither.
const basePath = isProd && staticExport ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "") : "";
const assetPrefix = isProd && staticExport ? (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? basePath) : "";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  // Keep: every indexed URL on this site ends in a slash. Changing it would
  // redirect or 404 the entire existing index.
  trailingSlash: true,
  // Kept as-is through the host move so nothing about rendering changes in the
  // same step as the hosting. Vercel can optimize these; that is a separate,
  // visually-verifiable change.
  images: { unoptimized: true },
  basePath,
  assetPrefix,
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
