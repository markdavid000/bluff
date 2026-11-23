import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the public pages, and never a game page", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      siteConfig.url,
      `${siteConfig.url}/how-to-play`,
      `${siteConfig.url}/fairness`,
    ]);
  });
});
