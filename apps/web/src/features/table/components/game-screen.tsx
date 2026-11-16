"use client";

import { Appear } from "@/components/shared/appear";
import { useGame } from "../hooks/use-game";
import { GameView } from "./game-view";
import { ResultsCard } from "./results-card";
import { SCREEN_FRAME } from "./screen-frame";
import { TableLoading } from "./table-loading";

export function GameScreen({ id }: { id: bigint }) {
  const { view } = useGame(id);
  const screen = !view ? "loading" : view.showResults ? "results" : "game";
  return (
    <Appear show swapKey={screen} className={SCREEN_FRAME}>
      {!view ? (
        <TableLoading />
      ) : view.showResults ? (
        <ResultsCard game={view} />
      ) : (
        <GameView game={view} />
      )}
    </Appear>
  );
}
