import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function robotsFor(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const { default: robots } = await import("./robots");
  return robots();
}

describe("robots", () => {
  it("lets search engines in on production", async () => {
    const rules = await robotsFor({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "bluff.vercel.app",
    });
    expect(rules.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(rules.sitemap).toBe("https://bluff.vercel.app/sitemap.xml");
  });

  it("keeps staging and previews out of search engines", async () => {
    const rules = await robotsFor({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "bluff-git-staging.vercel.app",
    });
    expect(rules.rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
