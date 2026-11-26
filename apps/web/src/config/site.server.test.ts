import { describe, expect, it } from "vitest";
import { isProductionSite, siteUrl } from "./site";

describe("siteUrl", () => {
  it("uses the production address in production", () => {
    expect(
      siteUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "bluff.vercel.app",
        VERCEL_URL: "bluff-abc123.vercel.app",
      })
    ).toBe("https://bluff.vercel.app");
  });

  it("uses staging's own address on staging, so its links and share image point at staging", () => {
    expect(
      siteUrl({
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "bluff.vercel.app",
        VERCEL_BRANCH_URL: "bluff-git-staging.vercel.app",
        VERCEL_URL: "bluff-abc123.vercel.app",
      })
    ).toBe("https://bluff-git-staging.vercel.app");
  });

  it("falls back to the deployment's address on a preview with no branch address", () => {
    expect(siteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "bluff-abc123.vercel.app" })).toBe(
      "https://bluff-abc123.vercel.app"
    );
  });

  it("uses localhost off Vercel", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});

describe("isProductionSite", () => {
  it("is true only on Vercel production", () => {
    expect(isProductionSite({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionSite({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionSite({})).toBe(false);
  });
});
