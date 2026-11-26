import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Physics from "@/lib/dice-physics";
import { tableCopy } from "../copy";
import type { DemoStep } from "../hooks/use-demo-round";
import { DemoGame } from "./demo-game";

vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => false }));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => null }));

const physicsLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/lib/dice-physics", async (importOriginal) => {
  physicsLoads.count += 1;
  return importOriginal<typeof Physics>();
});

let step: DemoStep = "deal";
const demoRunning: boolean[] = [];
vi.mock("../hooks/use-demo-round", () => ({
  useDemoRound: (onScreen: boolean) => {
    demoRunning.push(onScreen);
    return { step, round: 1 };
  },
}));

type Report = (entries: { isIntersecting: boolean }[]) => void;
let startsOnScreen = true;
let report: Report = () => undefined;

beforeEach(() => {
  startsOnScreen = true;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Report) {
        report = callback;
      }
      observe() {
        if (startsOnScreen) report([{ isIntersecting: true }]);
      }
      disconnect() {
        report = () => undefined;
      }
    }
  );
});

afterEach(() => {
  board = null;
  demoRunning.length = 0;
  vi.unstubAllGlobals();
});

interface BoardProps {
  paused?: boolean;
  revealed: boolean;
  ownSeat?: number | null;
  throwState: { kind: string };
  othersShaking?: boolean;
  revealedDice?: readonly ({ faces: number[]; counting: boolean[] } | null)[] | null;
}
let board: BoardProps | null = null;
vi.mock("./board/game-board", () => ({
  GameBoard: (props: BoardProps) => {
    board = props;
    return <div data-testid="board" />;
  },
  BoardPlaceholder: () => <div data-testid="board-placeholder" />,
}));

function show(at: DemoStep) {
  step = at;
  return render(<DemoGame />);
}

describe("DemoGame", () => {
  it("leaves the dice roll unloaded until the demo has been seen", async () => {
    startsOnScreen = false;
    show("deal");
    await act(async () => undefined);
    expect(physicsLoads.count).toBe(0);
    act(() => report([{ isIntersecting: true }]));
    await waitFor(() => expect(physicsLoads.count).toBe(1));
  });

  it("keeps the board unloaded and the round still until the demo is on screen", () => {
    startsOnScreen = false;
    show("deal");
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
    expect(screen.getByTestId("board-placeholder")).toBeInTheDocument();
    expect(demoRunning.at(-1)).toBe(false);
    act(() => report([{ isIntersecting: true }]));
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(board?.paused).toBe(false);
    expect(board?.throwState.kind).toBe("shaking");
    expect(demoRunning.at(-1)).toBe(true);
  });

  it("pauses the board and the round while the demo is scrolled away", () => {
    show("bid1");
    act(() => report([{ isIntersecting: false }]));
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(board?.paused).toBe(true);
    expect(demoRunning.at(-1)).toBe(false);
  });

  it("gives the loser their dice back when the next round starts", () => {
    const { rerender } = show("result");
    step = "deal";
    rerender(<DemoGame />);
    expect(
      screen.getByRole("figure", {
        name: new RegExp(`${tableCopy.demoNames.right}, ${tableCopy.diceLeft(2)}`),
        hidden: true,
      })
    ).toBeInTheDocument();
  });

  it("describes the whole round in words for screen readers", () => {
    show("deal");
    expect(screen.getByRole("img", { name: tableCopy.demoLabel })).toBeInTheDocument();
  });

  it("deals by shaking every cup and throwing your dice onto the real board", () => {
    show("deal");
    expect(board?.othersShaking).toBe(true);
    expect(board?.ownSeat).toBe(0);
    expect(board?.throwState.kind).toBe("shaking");
    expect(board?.revealed).toBe(false);
  });

  it("shows your own dice at your seat", () => {
    show("bid1");
    expect(
      screen.getByRole("img", { name: tableCopy.faceWords[4], hidden: true })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: tableCopy.faceWords[2], hidden: true })
    ).toBeInTheDocument();
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
