import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  external: ["@zama-fhe/sdk", "@zama-fhe/sdk/*", "viem", "viem/*"],
  logLevel: "warning",
});
