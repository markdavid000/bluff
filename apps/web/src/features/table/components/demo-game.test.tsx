import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import type { DemoStep } from "../hooks/use-demo-round";
import { DemoGame } from "./demo-game";

vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => false }));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => null }));

let step: DemoStep = "deal";
vi.mock("../hooks/use-demo-round", () => ({ useDemoRound: () => step }));

interface BoardProps {
  revealed: boolean;
  othersShaking?: boolean;
  revealedDice?: readonly ({ faces: number[]; counting: boolean[] } | null)[] | null;
}
let board: BoardProps | null = null;
vi.mock("./board/game-board", () => ({
  GameBoard: (props: BoardProps) => {
    board = props;
    return <div data-testid="board" />;
  },
}));

function show(at: DemoStep) {
  step = at;
  return render(<DemoGame />);
}

describe("DemoGame", () => {
  it("describes the whole round in words for screen readers", () => {
    show("deal");
    expect(screen.getByRole("img", { name: tableCopy.demoLabel })).toBeInTheDocument();
  });

  it("deals by shaking every cup on the real board", () => {
    show("deal");
    expect(board?.othersShaking).toBe(true);
    expect(board?.revealed).toBe(false);
  });

  it("raises the bid each turn, then you call the bluff", () => {
    const { unmount } = show("bid3");
    expect(screen.getAllByText(/4/).length).toBeGreaterThan(0);
    unmount();
    show("call");
    expect(screen.getByText(tableCopy.demoCall)).toBeInTheDocument();
  });

  it("lifts the cups and lights the three dice that count, then shows who lost", () => {
    const { unmount } = show("reveal");
    expect(board?.revealed).toBe(true);
    const counting = (board?.revealedDice ?? []).flatMap((seat) => seat?.counting ?? []);
    expect(counting.filter(Boolean)).toHaveLength(3);
    unmount();
    show("result");
    expect(screen.getByText(tableCopy.demoResult)).toBeInTheDocument();
  });
});
