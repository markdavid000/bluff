import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { PatternFrame } from "@/components/shared/pattern-band";
import { useSoundOn } from "@/hooks/use-sound-on";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { useGame } from "../hooks/use-game";
import { usePlayAgain } from "../hooks/use-play-again";
import { BackToLobby } from "./back-to-lobby";
import { CowriePour } from "./cowrie-pour";

type Game = NonNullable<ReturnType<typeof useGame>["view"]>;

export function ResultsCard({ game }: { game: Game }) {
  const { end, winnerNames, myShare, table, iWon } = game;
  const again = usePlayAgain({
    last: {
      id: table.id,
      seatCount: table.seatCount,
      buyIn: table.buyIn,
      isPrivate: table.isPrivate,
      startedAt: table.startedAt,
    },
    players: game.seats,
  });
  const label = (working: string) => (again.confirm ? tableCopy.confirmInWallet : working);
  const offer = again.offer;
  const goesOn = game.left && table.status !== "finished";
  useSoundOn("celebration", !goesOn && end.status === "ready" && iWon ? 1 : null);
  const heading = goesOn
    ? tableCopy.youLeft
    : end.status !== "ready"
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
        <Appear show={game.left && (goesOn || (end.status === "ready" && winnerNames.length > 0))}>
          <p className="text-base text-muted-foreground">
            {goesOn ? tableCopy.othersPlayOn : tableCopy.youLeftWinner(winnerNames.join(", "))}
          </p>
        </Appear>
        <Appear show={!goesOn && end.status === "failed"}>
          {end.status === "failed" ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-base text-muted-foreground">{tableCopy.winnerProblem}</p>
              <ActionButton tone="quiet" size="small" icon="target" onClick={end.retry}>
                {tableCopy.tryAgain}
              </ActionButton>
            </div>
          ) : null}
        </Appear>
        <Appear show={!goesOn && end.status === "unknown"}>
          <p className="text-base text-muted-foreground">{tableCopy.winnerUnknown}</p>
        </Appear>
        <Appear show={!goesOn && end.status === "loading"}>
          <span
            role="status"
            className="h-6 w-48 animate-pulse rounded-md bg-muted calm:animate-none"
          >
            <span className="sr-only">{tableCopy.loading}</span>
          </span>
        </Appear>
        <Appear show={myShare !== null && table.buyIn > 0n}>
          {myShare !== null ? (
            <CowriePour>
              <p className="font-game text-2xl">{tableCopy.youWon(formatChips(myShare))}</p>
            </CowriePour>
          ) : null}
        </Appear>
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
        <Appear show={!game.watching && offer?.isPrivate === true}>
          {offer ? (
            <p className="text-base text-muted-foreground">
              {tableCopy.newPrivateTable(offer.hostName)}
            </p>
          ) : null}
        </Appear>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Appear show={!game.watching && offer !== null && !offer.isPrivate}>
            {offer ? (
              <ActionButton
                tone="green"
                icon={offer.buyIn > 0n ? "cowrie" : "rocket"}
                disabled={again.busy && !again.joining}
                working={again.joining}
                workingLabel={label(tableCopy.joining)}
                onClick={again.joinOffer}
              >
                {offer.buyIn > 0n
                  ? tableCopy.payAndJoinNewTable(formatChips(offer.buyIn), offer.hostName)
                  : tableCopy.joinNewTable(offer.hostName)}
              </ActionButton>
            ) : null}
          </Appear>
          {game.watching ? null : (
            <ActionButton
              tone={offer && !offer.isPrivate ? "quiet" : "red"}
              icon="play"
              sound="drum"
              disabled={again.busy && !again.playing}
              working={again.playing}
              workingLabel={label(tableCopy.playingAgain)}
              onClick={again.playAgain}
            >
              {tableCopy.playAgain}
            </ActionButton>
          )}
          <BackToLobby />
        </div>
      </div>
    </PatternFrame>
  );
}
