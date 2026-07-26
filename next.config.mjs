/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    cpus: 1,
    memoryBasedWorkersCount: false,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
