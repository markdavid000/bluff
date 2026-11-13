import Link from "next/link";
import { GameIcon } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { tablePath } from "@/lib/table-links";
import { lobbyCopy } from "../copy";

export function BackToTableCard({ id }: { id: bigint }) {
  return (
    <PatternFrame className="w-full">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <h2 className="text-3xl">{lobbyCopy.yourTable}</h2>
        <p className="text-base text-muted-foreground">{lobbyCopy.seatedAt(id.toString())}</p>
        <Link
          href={tablePath(id)}
          className="relative inline-flex min-h-16 items-center gap-2 rounded-xl bg-seat-red px-8 py-4 font-game text-2xl text-seat-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_7px_0_0_var(--color-seat-red-edge),0_13px_14px_-4px_rgb(0_0_0/0.35)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-[5px] active:shadow-[0_2px_0_0_var(--color-seat-red-edge)]"
        >
          <GameIcon name="play" size={34} />
          {lobbyCopy.backToTable}
        </Link>
      </div>
    </PatternFrame>
  );
}
