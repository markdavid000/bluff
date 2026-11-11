import type { KnipConfig } from "knip";

const SOLIDITY_IMPORT = /import\s+(?:[^"';]*\s+from\s+)?["']([^"']+)["']/g;

function solidityImports(source: string): string {
  return [...source.matchAll(SOLIDITY_IMPORT)].map(([, path]) => `import "${path}";`).join("\n");
}

const config: KnipConfig = {
  compilers: { sol: solidityImports },
  workspaces: {
    ".": {
      entry: ["scripts/*.mjs"],
    },
    "packages/contracts": {
      entry: [
        "contracts/**/*.sol",
        "tasks/**/*.ts",
        "scripts/*.mjs",
        "test/**/*.test.ts",
        ".solcover.js",
      ],
      project: ["**/*.{ts,sol}"],
    },
  },
};

export default config;
