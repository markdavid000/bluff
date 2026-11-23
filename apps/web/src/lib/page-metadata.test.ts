import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { SHARE_IMAGE, pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  it("gives a public page its own title, description, address and share preview", () => {
    const meta = pageMetadata({
      title: "Why it's fair",
      description: "How every die stays secret.",
      path: "/fairness",
    });
    expect(meta.title).toBe("Why it's fair");
    expect(meta.description).toBe("How every die stays secret.");
    expect(meta.alternates).toEqual({ canonical: "/fairness" });
    expect(meta.openGraph).toMatchObject({
      title: `Why it's fair | ${siteConfig.name}`,
      description: "How every die stays secret.",
      url: "/fairness",
      siteName: siteConfig.name,
      images: [{ url: SHARE_IMAGE, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: `Why it's fair | ${siteConfig.name}`,
      description: "How every die stays secret.",
      images: [SHARE_IMAGE],
    });
  });

  it("uses the plain name for the home page", () => {
    const meta = pageMetadata({ title: null, description: siteConfig.description, path: "/" });
    expect(meta.title).toBeUndefined();
    expect(meta.openGraph).toMatchObject({ title: siteConfig.name, url: "/" });
    expect(meta.alternates).toEqual({ canonical: "/" });
  });
});
