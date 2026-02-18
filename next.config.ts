import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'books.google.com' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
    ],
  },
  // Playwright requires Node.js APIs — exclude from edge/client bundling
  serverExternalPackages: ['playwright'],
};

export default nextConfig;
