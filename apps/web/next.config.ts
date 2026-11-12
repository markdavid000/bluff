import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  experimental: {
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
