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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/play" className="font-heading text-3xl">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-3">
          <ChipBalance />
          <ScreenControls />
          <PlayerBadge />
        </div>
      </div>
    </header>
  );
}
