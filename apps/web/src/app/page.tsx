import type { Metadata } from "next";
import { ScreenControls } from "@/components/shared/screen-controls";
import { StreetBackdrop } from "@/components/shared/street-backdrop";
import { Hero } from "@/features/landing";
import { DemoGame } from "@/features/table";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: null,
  description: siteConfig.description,
  path: "/",
});

export default function HomePage() {
  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 glow-backdrop" />
      <StreetBackdrop />
      <ScreenControls className="absolute top-4 right-4 z-10" />
      <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Hero table={<DemoGame />} />
      </main>
    </div>
  );
}
