import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { seatLayout } from "../../lib/seat-layout";
import { FlatBoard } from "./flat-board";

vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => false }));

const seats = seatLayout(3, 0);
const base = {
  seats,
  throwState: { kind: "idle" } as const,
  chipsEach: 0,
  revealed: false,
  label: "The table",
};

function cups(container: HTMLElement) {
  return [...container.querySelectorAll("[data-cup]")].map((cup) => ({
    side: cup.getAttribute("data-side"),
    color: cup.getAttribute("data-color"),
    state: cup.getAttribute("data-cup"),
  }));
}

describe("FlatBoard", () => {
  it("puts every seat's cup on its side in its colour, labelled as the table", () => {
    const { container, getByRole } = render(<FlatBoard {...base} />);
    expect(getByRole("img", { name: "The table" })).toBeInTheDocument();
    expect(cups(container)).toEqual([
      { side: "bottom", color: "red", state: "still" },
      { side: "left", color: "green", state: "still" },
      { side: "right", color: "yellow", state: "still" },
    ]);
  });

  it("moves the cups by the same rule as the 3D board", () => {
    const { container, rerender } = render(
      <FlatBoard {...base} throwState={{ kind: "shaking", startedAt: 0 }} othersShaking />
    );
    expect(cups(container).map((cup) => cup.state)).toEqual(["shaking", "shaking", "shaking"]);
    rerender(<FlatBoard {...base} revealed />);
    expect(cups(container).map((cup) => cup.state)).toEqual(["lifted", "lifted", "lifted"]);
  });

  it("shows the player's own dice once they are thrown", () => {
    const { container } = render(
      <FlatBoard
        {...base}
        ownSeat={0}
        throwState={{
          kind: "rolling",
          startedAt: 0,
          result: {
            settledAfterSeconds: 1,
            dice: [2, 5].map((landedFace) => ({
              frames: [],
              landedFace: landedFace as 2 | 5,
              faceTurn: [0, 0, 0, 1],
            })),
          },
        }}
      />
    );
    const own = container.querySelector('[data-thrown="bottom"]');
    expect(
      [...(own?.querySelectorAll("[data-face]") ?? [])].map((die) => die.getAttribute("data-face"))
    ).toEqual(["2", "5"]);
  });

  it("lays out everyone's revealed dice, marking the ones that count", () => {
    const { container } = render(
      <FlatBoard
        {...base}
        revealed
        revealedDice={[
          { faces: [4, 1], counting: [true, true] },
          null,
          { faces: [3], counting: [false] },
        ]}
      />
    );
    const row = (side: string) =>
      [...container.querySelectorAll(`[data-revealed="${side}"] [data-face]`)].map((die) => [
        die.getAttribute("data-face"),
        die.getAttribute("data-counting"),
      ]);
    expect(row("bottom")).toEqual([
      ["4", "true"],
      ["1", "true"],
    ]);
    expect(row("left")).toEqual([]);
    expect(row("right")).toEqual([["3", "false"]]);
  });

  it("stacks each player's chips in the pot on a paid table", () => {
    const { container } = render(<FlatBoard {...base} chipsEach={6} />);
    expect(container.querySelectorAll("[data-chip-stack]")).toHaveLength(3);
    expect(
      render(<FlatBoard {...base} />).container.querySelectorAll("[data-chip-stack]")
    ).toHaveLength(0);
  });
});
