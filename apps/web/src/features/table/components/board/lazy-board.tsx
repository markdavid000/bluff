"use client";

import dynamic from "next/dynamic";
import { tableCopy } from "../../copy";

export function BoardPlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center font-game text-lg text-muted-foreground">
      {tableCopy.loadingBoard}
    </div>
  );
}

export const LazyBoardScene = dynamic(
  () => import("./board-scene").then((module) => module.BoardScene),
  { ssr: false, loading: () => <BoardPlaceholder /> }
);
