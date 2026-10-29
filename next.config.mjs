/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    return {
      // Only used when no file in /public matched (e.g. images uploaded after `next build`).
      fallback: [
        { source: "/screens/:file", destination: "/api/media/screens/:file" },
        { source: "/thumbs/:file", destination: "/api/media/thumbs/:file" },
      ],
    };
  },
  async headers() {
    return [
      { source: "/thumbs/:file", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/screens/:file", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};
export default nextConfig;
