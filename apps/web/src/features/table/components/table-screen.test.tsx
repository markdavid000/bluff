import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Table, TableStatus } from "@bluff/game";
import { TableScreen } from "./table-screen";

const ME = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";

const notFound = vi.fn(() => {
  throw new Error("not found");
});
let read: Record<string, unknown> = {};
let me: string = ME;

vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: me } } }),
}));
vi.mock("../hooks/use-table", () => ({ useTable: () => read }));
vi.mock("./game-screen", () => ({ GameScreen: () => <p>game screen</p> }));
vi.mock("./waiting-screen", () => ({ WaitingScreen: () => <p>waiting screen</p> }));

function table(status: TableStatus): Table {
  return {
    id: 12n,
    host: ME,
    status,
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: 0,
    ...NO_GAME,
    seats: [ME, KOLA].map((player) => ({
      player: player as `0x${string}`,
      ready: true,
      isHost: player === ME,
      isActive: true,
      ...NO_DICE,
    })),
  };
}

beforeEach(() => {
  me = ME;
  vi.clearAllMocks();
});

describe("TableScreen", () => {
  it("shows a tumbling die while the table loads", () => {
    read = { status: "loading" };
    render(<TableScreen id={12n} />);
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.loading);
  });

  it("sends an unknown table to the not-found page", () => {
    read = { status: "not-found" };
    expect(() => render(<TableScreen id={12n} />)).toThrow("not found");
    expect(notFound).toHaveBeenCalled();
  });

  it("offers a retry when the table cannot be read", () => {
    const retry = vi.fn();
    read = { status: "failed", retry };
    render(<TableScreen id={12n} />);
    expect(screen.getByText(tableCopy.problem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.tryAgain }));
    expect(retry).toHaveBeenCalled();
  });

  it.each<TableStatus>(["playing", "revealing", "finished"])(
    "takes a seated player to the game while it is %s",
    (status) => {
      read = { status: "ready", table: table(status), readAt: 1n };
      render(<TableScreen id={12n} />);
      expect(screen.getByText("game screen")).toBeInTheDocument();
    }
  );

  it.each<TableStatus>(["waiting", "verifying", "cancelled"])(
    "keeps a seated player on the waiting screen while it is %s",
    (status) => {
      read = { status: "ready", table: table(status), readAt: 1n };
      render(<TableScreen id={12n} />);
      expect(screen.getByText("waiting screen")).toBeInTheDocument();
    }
  );

  it("shows a visitor the waiting screen, which explains the game has started", () => {
    me = "0x0000000000000000000000000000000000009f9f";
    read = { status: "ready", table: table("playing"), readAt: 1n };
    render(<TableScreen id={12n} />);
    expect(screen.getByText("waiting screen")).toBeInTheDocument();
  });
});
