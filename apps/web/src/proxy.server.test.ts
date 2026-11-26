import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/route-guard";
import { config } from "./proxy";

describe("route coverage", () => {
  const gameRoutes = readdirSync(path.join(__dirname, "app/(game)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/${entry.name}`);

  it("protects every page in the game route group", () => {
    expect(gameRoutes.length).toBeGreaterThan(0);
    for (const route of gameRoutes) {
      expect(isProtectedPath(route), route).toBe(true);
      expect(config.matcher, route).toContain(`${route}/:path*`);
    }
  });

  it("guards only pages that exist in the game route group", () => {
    const guarded = config.matcher.filter((entry) => entry.endsWith("/:path*"));
    expect(guarded.map((entry) => entry.replace("/:path*", "")).sort()).toEqual(
      [...gameRoutes].sort()
    );
  });

  it("runs the proxy on exactly the protected pages and the sign-in pages", () => {
    expect([...config.matcher].sort()).toEqual(
      [
        "/play/:path*",
        "/table/:path*",
        "/history/:path*",
        "/welcome/:path*",
        "/sign-in",
        "/refresh",
      ].sort()
    );
  });
});
