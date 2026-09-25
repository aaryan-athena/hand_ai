import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma ships native query-engine binaries that must stay external to the
  // serverless function bundle rather than get processed by the bundler.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
