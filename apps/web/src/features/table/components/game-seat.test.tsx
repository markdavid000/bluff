import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { GameSeat } from "./game-seat";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

function show(props: Partial<Parameters<typeof GameSeat>[0]> = {}) {
  return render(
    <GameSeat
      name="Sly Fox #3C4D"
      avatarSrc="/a.svg"
      isMe={false}
      dice={3}
      isActive
      isTurn={false}
      turnFraction={1}
      lastBid={null}
      ownDice={null}
      matching={null}
      {...props}
    />
  );
}

describe("GameSeat", () => {
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
        dice={3}
        isActive
        isTurn={false}
        turnFraction={1}
        lastBid={null}
        ownDice={null}
        matching={null}
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

  it("marks a player who is out, with no dice", () => {
    show({ isActive: false, dice: 0 });
    expect(
      screen.getByRole("figure", { name: `Sly Fox #3C4D, ${tableCopy.out}` })
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: tableCopy.hiddenDice(0) })).toBeNull();
  });
});
