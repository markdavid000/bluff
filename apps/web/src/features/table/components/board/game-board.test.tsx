import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../../copy";
import { seatLayout } from "../../lib/seat-layout";
import { GameBoard } from "./game-board";

let flat = true;
vi.mock("../../hooks/use-board-choice", () => ({
  useBoardChoice: () => ({ flat, reportSlow: vi.fn() }),
}));
vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => false }));

const props = {
  colors: null,
  seats: seatLayout(2, 0),
  throwState: { kind: "idle" } as const,
  chipsEach: 0,
  revealed: false,
  label: tableCopy.boardLabel,
};

describe("GameBoard", () => {
  it("draws the flat board when the device calls for it, even before the theme is read", () => {
    flat = true;
    const { container } = render(<GameBoard {...props} />);
    expect(screen.getByRole("img", { name: tableCopy.boardLabel })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-cup]")).toHaveLength(2);
  });

  it("waits for the theme before drawing the 3D board", () => {
    flat = false;
    render(<GameBoard {...props} />);
    expect(screen.getByText(tableCopy.loadingBoard)).toBeInTheDocument();
  });
});
