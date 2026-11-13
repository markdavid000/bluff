import Link from "next/link";
import { PatternBand } from "@/components/shared/pattern-band";
import { ScreenControls } from "@/components/shared/screen-controls";
import { siteConfig } from "@/config/site";
import { PlayerBadge } from "@/features/account";
import { ChipBalance } from "@/features/chips";

export function AppHeader() {
  return (
    <header className="w-full">
      <PatternBand className="h-3 w-full" />
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/play" className="shrink-0 font-heading text-2xl sm:text-3xl">
          {siteConfig.name}
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <ChipBalance />
          <ScreenControls className="hidden sm:flex" />
          <PlayerBadge />
        </div>
      </div>
    </header>
  );
}
