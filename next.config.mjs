// CatMorph deploys as a fully static site to GitHub Pages. The original
// `/api/transform` server route has been removed; the browser now talks to
// Replicate directly (see lib/replicate.ts) using a token the user pastes
// into the UI. NEXT_PUBLIC_BASE_PATH is set by the Pages workflow to the
// repository name, so assets resolve correctly under https://<user>.github.io/<repo>/.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
