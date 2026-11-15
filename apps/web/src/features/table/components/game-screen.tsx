"use client";

import { useGame } from "../hooks/use-game";
import { GameView } from "./game-view";
import { ResultsCard } from "./results-card";
import { TableLoading } from "./table-loading";

export function GameScreen({ id }: { id: bigint }) {
  const { view } = useGame(id);
  if (!view) return <TableLoading />;
  return view.showResults ? <ResultsCard game={view} /> : <GameView game={view} />;
}
