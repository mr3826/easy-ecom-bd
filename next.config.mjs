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
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
