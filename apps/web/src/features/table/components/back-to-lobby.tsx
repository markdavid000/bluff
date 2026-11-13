import Link from "next/link";
import { GameIcon } from "@/components/shared/game-icon";
import { tableCopy } from "../copy";

export function BackToLobby() {
  return (
    <Link
      href="/play"
      className="inline-flex items-center gap-2 rounded-xl bg-tile px-5 py-3 font-game text-lg text-tile-foreground shadow-[0_5px_0_0_var(--color-tile-edge)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-tile-edge)]"
    >
      <GameIcon name="back" size={24} />
      {tableCopy.backToLobby}
    </Link>
  );
}
