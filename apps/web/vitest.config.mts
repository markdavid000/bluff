import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const SERVER_TESTS = ["src/**/*.server.test.ts"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    css: false,
    projects: [
      {
        extends: true,
        test: {
          name: "browser",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: SERVER_TESTS,
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: SERVER_TESTS,
        },
      },
    ],
  },
});
