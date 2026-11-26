import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import type { OwnDice } from "../hooks/use-own-dice";
import { GameSeat } from "./game-seat";

const play = vi.fn();
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play, stop: vi.fn() }) }));

function show(props: Partial<Parameters<typeof GameSeat>[0]> = {}) {
  return render(
    <GameSeat
      name="Sly Fox #3C4D"
      avatarSrc="/a.svg"
      isMe={false}
      isComputer={false}
      dice={3}
      isActive
      isTurn={false}
      turnFraction={1}
      lastBid={null}
      ownDice={null}
      matching={null}
      holdDice={false}
      {...props}
    />
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GameSeat", () => {
  it("marks a computer player, on screen and for screen readers", () => {
    show({ name: "Baba Dice", isComputer: true });
    expect(screen.getByText(tableCopy.computer)).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: /Baba Dice, Computer/ })).toBeInTheDocument();
  });

  it("shows no computer mark for a person", () => {
    show();
    expect(screen.queryByText(tableCopy.computer)).not.toBeInTheDocument();
  });

  it("names the player and their dice for screen readers", () => {
    show();
    expect(
      screen.getByRole("figure", { name: `Sly Fox #3C4D, ${tableCopy.diceLeft(3)}` })
    ).toBeInTheDocument();
  });

  it("shows another player's dice face down, one tile each", () => {
    show();
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(3) })).toBeInTheDocument();
  });

  it("draws the turn ring only around the player who is thinking, draining from green to red", () => {
    const { container, rerender } = show({ isTurn: true, turnFraction: 1 });
    const ring = () => container.querySelector("[data-turn-ring]");
    expect(ring()?.getAttribute("stroke-dashoffset")).toBe("0");
    expect(ring()?.getAttribute("stroke")).toBe("hsl(130 80% 45%)");
    expect(
      screen.getByRole("figure", { name: new RegExp(tableCopy.thinking) })
    ).toBeInTheDocument();
    rerender(
      <GameSeat
        name="Sly Fox #3C4D"
        avatarSrc="/a.svg"
        isMe={false}
        isComputer={false}
        dice={3}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={null}
        matching={null}
        holdDice={false}
      />
    );
    expect(ring()).toBeNull();
  });

  it("tags the player's own seat when it's their turn, and nobody else's", () => {
    const { unmount } = show({ isMe: true, isTurn: true });
    expect(screen.getByText(tableCopy.yourTurnTag)).toBeInTheDocument();
    unmount();
    show({ isTurn: true });
    expect(screen.queryByText(tableCopy.yourTurnTag)).toBeNull();
  });

  it("turns the ring red as the time runs out", () => {
    const { container } = show({ isTurn: true, turnFraction: 0 });
    const ring = container.querySelector("[data-turn-ring]");
    expect(ring?.getAttribute("stroke")).toBe("hsl(0 80% 45%)");
    expect(Number(ring?.getAttribute("stroke-dashoffset"))).toBeGreaterThan(280);
  });

  it("shows the player's last bid beside their face", () => {
    show({ lastBid: { quantity: 3, face: 4 } });
    expect(
      screen.getByLabelText(tableCopy.lastBidOf("Sly Fox #3C4D", tableCopy.bid(3, "four")))
    ).toBeInTheDocument();
  });

  it("shows the player's own dice face up, lifting the ones that count", () => {
    show({
      isMe: true,
      ownDice: { status: "ready", faces: [5, 1, 3] },
      matching: [true, true, false],
    });
    expect(screen.getByRole("img", { name: "five" })).toHaveClass("-translate-y-1");
    expect(screen.getByRole("img", { name: "three" })).not.toHaveClass("-translate-y-1");
  });

  it("offers to unlock the player's dice rather than asking the wallet out of the blue", () => {
    const unlock = vi.fn();
    show({ isMe: true, ownDice: { status: "locked", unlock, unlocking: false } });
    fireEvent.click(screen.getByRole("button", { name: tableCopy.showMyDice }));
    expect(unlock).toHaveBeenCalledOnce();
  });

  it("keeps a lost die on show while the reveal is open, then sends it tumbling away", async () => {
    const seat = (dice: number, holdDice: boolean) => (
      <GameSeat
        name="Sly Fox #3C4D"
        avatarSrc="/a.svg"
        isMe={false}
        isComputer={false}
        dice={dice}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={null}
        matching={null}
        holdDice={holdDice}
      />
    );
    const { container, rerender } = render(seat(3, true));
    rerender(seat(2, true));
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(3) })).toBeInTheDocument();
    expect(container.querySelector("[data-lost-die]")).toBeNull();
    rerender(seat(2, false));
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(2) })).toBeInTheDocument();
    expect(container.querySelector("[data-lost-die]")).not.toBeNull();
    await waitFor(() => expect(container.querySelector("[data-lost-die]")).toBeNull(), {
      timeout: 3_000,
    });
  });

  it("keeps the player's own dice from this round on show while the reveal is open", () => {
    const mine = (ownDice: OwnDice, holdDice: boolean) => (
      <GameSeat
        name="Me #1A2B"
        avatarSrc="/a.svg"
        isMe
        isComputer={false}
        dice={3}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={ownDice}
        matching={null}
        holdDice={holdDice}
      />
    );
    const { rerender } = render(mine({ status: "ready", faces: [5, 1, 3] }, false));
    rerender(mine({ status: "ready", faces: [5, 1, 3] }, true));
    rerender(mine({ status: "loading" }, true));
    expect(screen.getByRole("img", { name: "five" })).toBeInTheDocument();
    expect(screen.queryByText(tableCopy.rolling)).toBeNull();
    rerender(mine({ status: "ready", faces: [2, 2, 6] }, true));
    expect(screen.getByRole("img", { name: "five" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "six" })).toBeNull();
    rerender(mine({ status: "ready", faces: [2, 2, 6] }, false));
    expect(screen.getByRole("img", { name: "six" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "five" })).toBeNull();
  });

  it("sends the player's own lost die tumbling away too", () => {
    const mine = (dice: number, holdDice: boolean) => (
      <GameSeat
        name="Me #1A2B"
        avatarSrc="/a.svg"
        isMe
        isComputer={false}
        dice={dice}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={{ status: "loading" }}
        matching={null}
        holdDice={holdDice}
      />
    );
    const { container, rerender } = render(mine(4, false));
    rerender(mine(3, false));
    expect(container.querySelector("[data-lost-die]")).not.toBeNull();
  });

  it("lands a lost die with a thud, once, and only when it leaves", () => {
    const { rerender } = show({ dice: 3, holdDice: true });
    const seat = (dice: number, holdDice: boolean) => (
      <GameSeat
        name="Sly Fox #3C4D"
        avatarSrc="/a.svg"
        isMe={false}
        isComputer={false}
        dice={dice}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={null}
        matching={null}
        holdDice={holdDice}
      />
    );
    rerender(seat(2, true));
    expect(play).not.toHaveBeenCalledWith("thud");
    rerender(seat(2, false));
    rerender(seat(2, false));
    expect(play.mock.calls.filter(([name]) => name === "thud")).toHaveLength(1);
  });

  it("fits a phone's opponents row: one dice count instead of a tile each, with the bid beside the picture", () => {
    const { container } = show({ compact: true, dice: 4, lastBid: { quantity: 3, face: 4 } });
    const dice = screen.getByRole("img", { name: tableCopy.hiddenDice(4) });
    expect(dice).toHaveTextContent("4");
    expect(within(dice).getAllByText("?")).toHaveLength(1);
    const top = container.querySelector("[data-seat-bid]")?.closest("[data-seat-top]");
    expect(top).toHaveClass("flex");
    expect(top?.querySelector("img")).not.toBeNull();
  });

  it("draws the player's own seat a little smaller on a phone", () => {
    show({ isMe: true, tight: true, ownDice: { status: "ready", faces: [5, 2] } });
    expect(screen.getByRole("img", { name: tableCopy.faceWords[4] }).firstElementChild).toHaveClass(
      "size-8"
    );
  });

  it("marks a player who is out, with no dice", () => {
    show({ isActive: false, dice: 0 });
    expect(
      screen.getByRole("figure", { name: `Sly Fox #3C4D, ${tableCopy.out}` })
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: tableCopy.hiddenDice(0) })).toBeNull();
  });

  it("holds the name's place quietly while it loads, instead of a stand-in name", () => {
    const { container } = show({ name: "" });
    expect(container.querySelector("figcaption [data-name-loading]")).not.toBeNull();
    expect(screen.queryByText("Player")).toBeNull();
  });
});
