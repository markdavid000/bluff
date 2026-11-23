import Link from "next/link";
import { PatternBand } from "@/components/shared/pattern-band";
import { ScreenControls } from "@/components/shared/screen-controls";
import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="w-full">
      <PatternBand className="h-3 w-full" />
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 font-heading text-2xl sm:text-3xl">
          {siteConfig.name}
        </Link>
        <ScreenControls />
      </div>
    </header>
  );
}
