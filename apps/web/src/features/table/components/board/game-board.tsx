"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ThemeColors } from "@/hooks/use-theme-colors";
import { tableCopy } from "../../copy";
import { useBoardChoice } from "../../hooks/use-board-choice";
import type { BoardScene } from "./board-scene";
import { FlatBoard } from "./flat-board";

function BoardPlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center font-game text-lg text-muted-foreground">
      {tableCopy.loadingBoard}
    </div>
  );
}

const LazyBoardScene = dynamic(() => import("./board-scene").then((module) => module.BoardScene), {
  ssr: false,
  loading: () => <BoardPlaceholder />,
});

type SceneProps = ComponentProps<typeof BoardScene>;

export function GameBoard({
  colors,
  ...board
}: Omit<SceneProps, "colors" | "onSlow"> & { colors: ThemeColors | null }) {
  const choice = useBoardChoice();
  if (choice.flat) return <FlatBoard {...board} />;
  if (!colors) return <BoardPlaceholder />;
  return <LazyBoardScene {...board} colors={colors} onSlow={choice.reportSlow} />;
}
