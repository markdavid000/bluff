import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/how-to-play`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/fairness`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
