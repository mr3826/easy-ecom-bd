/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/health/ready",
        destination: "/api/health?ready=1",
      },
    ];
  },
  experimental: {
    cpus: 1,
    memoryBasedWorkersCount: false,
    serverActions: {
      // Product/brand/landing images are posted inline through server actions,
      // so the whole gallery shares one request body. Next's 1 MB default
      // rejected a single phone photo with a 413 before the action ever ran,
      // which surfaced as the generic "That did not go through" error page.
      // ponytail: the body is buffered in memory; move uploads to a route
      // handler with streaming if admins start posting galleries near this cap.
      bodySizeLimit: "25mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
