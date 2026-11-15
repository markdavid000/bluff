import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { useGame } from "../hooks/use-game";
import { BackToLobby } from "./back-to-lobby";

type Game = NonNullable<ReturnType<typeof useGame>["view"]>;

export function ResultsCard({ game }: { game: Game }) {
  const { end, winnerNames, myShare, table, iWon } = game;
  const heading =
    end.status !== "ready"
      ? tableCopy.gameOver
      : iWon && winnerNames.length === 1
        ? tableCopy.youWin
        : winnerNames.length === 1
          ? tableCopy.winner(winnerNames[0] ?? tableCopy.unnamed)
          : tableCopy.winners(winnerNames.join(", "));
  return (
    <PatternFrame className="w-full max-w-xl">
      <div className="flex flex-col items-center gap-6 py-2 text-center">
        <h1 className="text-3xl">{heading}</h1>
        {end.status === "failed" ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-base text-muted-foreground">{tableCopy.winnerProblem}</p>
            <ActionButton tone="quiet" size="small" icon="target" onClick={end.retry}>
              {tableCopy.tryAgain}
            </ActionButton>
          </div>
        ) : null}
        {end.status === "unknown" ? (
          <p className="text-base text-muted-foreground">{tableCopy.winnerUnknown}</p>
        ) : null}
        {end.status === "loading" ? (
          <span
            role="status"
            className="h-6 w-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
          >
            <span className="sr-only">{tableCopy.loading}</span>
          </span>
        ) : null}
        {myShare !== null && table.buyIn > 0n ? (
          <p className="font-game text-2xl">{tableCopy.youWon(formatChips(myShare))}</p>
        ) : null}
        <section className="flex w-full flex-col gap-3">
          <h2 className="font-game text-lg">{tableCopy.finalDice}</h2>
          <ul className="flex flex-col gap-2">
            {game.seats.map((seat) => (
              <li
                key={seat.player}
                className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2"
              >
                <span>{seat.isMe ? tableCopy.you : seat.name}</span>
                <span className="font-game">
                  {seat.isActive && seat.dice > 0 ? tableCopy.diceLeft(seat.dice) : tableCopy.out}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <BackToLobby />
      </div>
    </PatternFrame>
  );
}
