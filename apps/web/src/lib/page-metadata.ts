import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const SHARE_IMAGE = "/opengraph-image";

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string | null;
  description: string;
  path: string;
}): Metadata {
  const shared = title === null ? siteConfig.name : `${title} | ${siteConfig.name}`;
  return {
    ...(title === null ? {} : { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: shared,
      description,
      url: path,
      images: [{ url: SHARE_IMAGE, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: shared, description, images: [SHARE_IMAGE] },
  };
}
