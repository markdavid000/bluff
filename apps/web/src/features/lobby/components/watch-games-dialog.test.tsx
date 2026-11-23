import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { lobbyCopy } from "../copy";
import type { GamesInPlay } from "../hooks/use-games-in-play";
import type { LiveGame } from "../lib/live-games";
import { WatchGamesButton } from "./watch-games-button";
import { WatchGamesDialog } from "./watch-games-dialog";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

function game(id: bigint, change: Partial<LiveGame> = {}): LiveGame {
  return {
    id,
    seatCount: 2,
    players: 2,
    round: 3,
    diceInPlay: 6,
    buyIn: 0n,
    hasComputer: false,
    ...change,
  };
}

function show(games: GamesInPlay) {
  render(<WatchGamesDialog open onOpenChange={vi.fn()} games={games} />);
  return screen.getByRole("dialog");
}

describe("WatchGamesButton", () => {
  it("counts the games being played", () => {
    const onOpen = vi.fn();
    render(
      <WatchGamesButton games={{ status: "ready", games: [game(1n), game(2n)] }} onOpen={onOpen} />
    );
    const button = screen.getByRole("button", {
      name: `${lobbyCopy.watchGame}, ${lobbyCopy.gamesInPlayCount(2)}`,
    });
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("WatchGamesDialog", () => {
  it("lists each game with its round and a way to watch it", () => {
    const dialog = show({ status: "ready", games: [game(7n, { hasComputer: true })] });
    const name = lobbyCopy.tableName("7");
    expect(within(dialog).getByText(name)).toBeInTheDocument();
    expect(within(dialog).getByText(lobbyCopy.roundOf(3))).toBeInTheDocument();
    expect(within(dialog).getByText(lobbyCopy.computerPlaying)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: `${lobbyCopy.watch} ${name}` })
    ).toHaveAttribute("href", "/table/7");
  });

  it("says when nobody is playing", () => {
    const dialog = show({ status: "ready", games: [] });
    expect(within(dialog).getByText(lobbyCopy.noGamesInPlay)).toBeInTheDocument();
  });

  it("shows it's looking while the games load", () => {
    const dialog = show({ status: "loading" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(lobbyCopy.gamesInPlayLoading);
  });

  it("offers to try again when the games can't be loaded", () => {
    const retry = vi.fn();
    const dialog = show({ status: "failed", retry });
    expect(within(dialog).getByText(lobbyCopy.gamesInPlayProblem)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: lobbyCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
