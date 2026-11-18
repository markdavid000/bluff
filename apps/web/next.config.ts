import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  transpilePackages: ["@bluff/contracts", "@bluff/game"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
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
