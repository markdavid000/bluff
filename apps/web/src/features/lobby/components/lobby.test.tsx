import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import type { LobbyTable } from "../lib/tables";
import { Lobby } from "./lobby";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";

function table(id: bigint, players: number, seats: number, buyIn = 0n): LobbyTable {
  return {
    id,
    host: ACCOUNT,
    waiting: true,
    isPrivate: false,
    seatCount: seats,
    playerCount: players,
    buyIn,
    createdAt: Number(id) * 1000,
    closesAt: 0,
  };
}

const sitDown = {
  create: vi.fn(),
  join: vi.fn(),
  playNow: vi.fn(),
  creating: false,
  findingSeat: false,
  working: false,
  confirmInWallet: false,
};

type Lobby = Record<string, unknown>;

const base: Lobby = {
  buyIn: 0n,
  chooseBuyIn: vi.fn(),
  buyInProblem: null,
  problemFor: () => null,
  openTables: { status: "ready", tables: [] },
  myTableId: { status: "ready", id: null },
  joinLink: { text: "", invalid: false, change: vi.fn(), submit: vi.fn() },
  createOpen: false,
  setCreateOpen: vi.fn(),
  tablesOpen: false,
  setTablesOpen: vi.fn(),
  createFromTables: vi.fn(),
  sitDown,
  playNow: vi.fn(),
  createTable: vi.fn(),
};

let lobby: Lobby = base;
vi.mock("../hooks/use-lobby", () => ({ useLobby: () => lobby }));

function show() {
  render(<Lobby greeting={<h1>Ready to play, Brave Otter?</h1>} />);
}

beforeEach(() => {
  lobby = { ...base };
  vi.clearAllMocks();
});

describe("Lobby", () => {
  it("offers Play now, the chips to play, a new table and a link", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: lobbyCopy.playNow }));
    expect(base.playNow).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: lobbyCopy.createTable }));
    expect(base.setCreateOpen).toHaveBeenCalledWith(true);
    expect(screen.getByRole("radiogroup", { name: lobbyCopy.buyIn })).toBeInTheDocument();
    expect(screen.getByLabelText(lobbyCopy.joinWithLink)).toBeInTheDocument();
  });

  it("does not show Play now until it knows whether the player already has a table", () => {
    lobby = { ...base, myTableId: { status: "loading" } };
    show();
    expect(screen.queryByRole("button", { name: lobbyCopy.playNow })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(lobbyCopy.findingYourTable);
  });

  it("offers to try again when the player's table could not be checked", () => {
    const retry = vi.fn();
    lobby = { ...base, myTableId: { status: "failed", retry } };
    show();
    expect(screen.queryByRole("button", { name: lobbyCopy.playNow })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: lobbyCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("says why Play now is held when the chips to play are out of reach", () => {
    lobby = { ...base, buyIn: 25n * ONE_CHIP, buyInProblem: lobbyCopy.notEnough("25") };
    show();
    expect(screen.getByRole("button", { name: lobbyCopy.playNow })).toBeDisabled();
    expect(screen.getByText(lobbyCopy.notEnough("25"))).toBeInTheDocument();
  });

  it("opens the open tables, showing how many are waiting", () => {
    lobby = {
      ...base,
      openTables: { status: "ready", tables: [table(12n, 1, 3), table(13n, 1, 2)] },
    };
    show();
    const button = screen.getByRole("button", {
      name: `${lobbyCopy.openTables}, ${lobbyCopy.openTablesCount(2)}`,
    });
    expect(button.parentElement).toHaveTextContent("2");
    fireEvent.click(button);
    expect(base.setTablesOpen).toHaveBeenCalledWith(true);
  });

  it("keeps the open tables off the lobby card itself", () => {
    lobby = { ...base, openTables: { status: "ready", tables: [table(12n, 1, 3)] } };
    show();
    expect(screen.queryByText(lobbyCopy.tableName("12"))).not.toBeInTheDocument();
  });

  it("sends a seated player back to their table instead of offering another seat", () => {
    lobby = { ...base, myTableId: { status: "ready", id: 12n } };
    show();
    expect(screen.queryByRole("button", { name: lobbyCopy.playNow })).not.toBeInTheDocument();
    expect(screen.getByText(lobbyCopy.seatedAt("12"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: lobbyCopy.backToTable })).toHaveAttribute(
      "href",
      "/table/12"
    );
  });
});
