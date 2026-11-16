import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { Table } from "../lib/table-view";
import { WaitingScreen } from "./waiting-screen";
import { NO_GAME } from "../lib/table-fixture.testing";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => null }));
vi.mock("../hooks/use-board-choice", () => ({
  useBoardChoice: () => ({ flat: false, reportSlow: vi.fn() }),
}));

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";

type Room = Record<string, unknown>;
let state: { read: Record<string, unknown>; view: Room | null };
vi.mock("../hooks/use-waiting-room", () => ({ useWaitingRoom: () => state }));

function table(overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: HOST,
    status: "waiting",
    isPrivate: false,
    seatCount: 3,
    buyIn: 0n,
    deadline: Date.now() + 600_000,
    ...NO_GAME,
    seats: [],
    ...overrides,
  };
}

const actions = {
  toggleReady: vi.fn(),
  start: vi.fn(),
  leave: vi.fn(),
  close: vi.fn(),
  join: vi.fn(),
  copyInvite: vi.fn(),
};

function room(overrides: Room = {}): Room {
  return {
    table: table(),
    role: "host",
    line: "Waiting for Kola to get ready",
    seats: [
      {
        player: HOST,
        ready: false,
        isHost: true,
        isActive: true,
        isMe: true,
        name: "Dave #1A2B",
        avatarSrc: "/a.svg",
      },
      {
        player: KOLA,
        ready: false,
        isHost: false,
        isActive: true,
        isMe: false,
        name: "Kola #3C4D",
        avatarSrc: "/b.svg",
      },
    ],
    freeSeats: 1,
    timeLeft: 500_000,
    timeUp: false,
    myReady: false,
    canStart: false,
    joinProblem: null,
    busy: false,
    confirm: false,
    toggling: false,
    starting: false,
    leaving: false,
    closing: false,
    joining: false,
    joinStep: "seat",
    invite: "ready",
    unlockingInvite: false,
    ...actions,
    ...overrides,
  };
}

function show(view: Room | null, read: Record<string, unknown> = { status: "ready" }) {
  state = { read, view };
  render(<WaitingScreen id={12n} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WaitingScreen", () => {
  it("shows a tumbling die while the table loads", () => {
    show(null, { status: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.loading);
  });

  it.each(["finished", "cancelled"] as const)("says a %s table is closed", (status) => {
    show(room({ table: table({ status }) }));
    expect(screen.getByRole("heading", { name: tableCopy.closed })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tableCopy.backToLobby })).toHaveAttribute(
      "href",
      "/play"
    );
  });

  describe("the waiting room", () => {
    it("names every player with their ready state and the line", () => {
      show(room());
      expect(screen.getByLabelText(new RegExp(`^${tableCopy.you}|Dave #1A2B`))).toBeInTheDocument();
      expect(screen.getByLabelText(/Kola #3C4D/)).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Waiting for Kola to get ready");
    });

    it("sizes the board to the space left, so the buttons always fit on a short screen", () => {
      show(room());
      const board = screen.getByText(tableCopy.loadingBoard).closest("[data-board-space]");
      expect(board).not.toBeNull();
      expect(board).toHaveClass("[container-type:size]", "min-h-0");
    });

    it("holds Start for the host until everyone is ready", () => {
      show(room());
      expect(screen.getByRole("button", { name: tableCopy.start })).toBeDisabled();
    });

    it("lets the host start once everyone is ready", () => {
      show(room({ canStart: true }));
      fireEvent.click(screen.getByRole("button", { name: tableCopy.start }));
      expect(actions.start).toHaveBeenCalled();
    });

    it("gives a guest the ready toggle and no Start", () => {
      show(room({ role: "guest" }));
      expect(screen.queryByRole("button", { name: tableCopy.start })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: tableCopy.readyButton }));
      expect(actions.toggleReady).toHaveBeenCalled();
    });

    it("lets a ready guest stand down", () => {
      show(room({ role: "guest", myReady: true }));
      expect(screen.getByRole("button", { name: tableCopy.notReadyButton })).toBeEnabled();
    });

    it("copies the invite from the dock and from the empty seat", () => {
      show(room());
      const invites = screen.getAllByRole("button", { name: tableCopy.copyInvite });
      expect(invites).toHaveLength(2);
      invites.forEach((invite) => fireEvent.click(invite));
      expect(actions.copyInvite).toHaveBeenCalledTimes(2);
    });

    it("hides the invite when the table is full", () => {
      show(room({ freeSeats: 0, table: table({ seatCount: 2 }) }));
      expect(screen.queryByRole("button", { name: tableCopy.copyInvite })).not.toBeInTheDocument();
    });

    it("offers to close the table once time is up", () => {
      show(room({ timeUp: true }));
      expect(screen.getByRole("status")).toHaveTextContent(tableCopy.timeUp);
      fireEvent.click(screen.getByRole("button", { name: tableCopy.closeTable }));
      expect(actions.close).toHaveBeenCalled();
    });

    it("leaves the table", () => {
      show(room());
      fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
      expect(actions.leave).toHaveBeenCalled();
    });

    it("tells the player to confirm in their wallet while a move waits", () => {
      show(room({ role: "guest", toggling: true, busy: true, confirm: true }));
      expect(screen.getByRole("button", { name: tableCopy.confirmInWallet })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: tableCopy.leave })).toBeDisabled();
    });
  });

  describe("visitors", () => {
    it("joins a free table", () => {
      show(room({ role: "visitor" }));
      expect(screen.getByText(tableCopy.free)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: tableCopy.join }));
      expect(actions.join).toHaveBeenCalled();
    });

    it("pays and joins a paid table", () => {
      show(room({ role: "visitor", table: table({ buyIn: 25n * ONE_CHIP }) }));
      expect(screen.getByRole("button", { name: tableCopy.payAndJoin("25") })).toBeInTheDocument();
    });

    it.each([tableCopy.full, tableCopy.started])("explains why they cannot join: %s", (problem) => {
      show(room({ role: "visitor", joinProblem: problem }));
      expect(screen.getByText(problem)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: tableCopy.join })).not.toBeInTheDocument();
    });
  });

  describe("private tables", () => {
    it("tells a visitor without the invite to ask the host", () => {
      show(room({ role: "visitor", joinProblem: tableCopy.privateTable }));
      expect(screen.getByText(tableCopy.privateTable)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: tableCopy.join })).not.toBeInTheDocument();
    });

    it("says it's checking the invite while a visitor joins", () => {
      show(room({ role: "visitor", joining: true, busy: true, joinStep: "invite" }));
      expect(screen.getByRole("button", { name: tableCopy.checkingInvite })).toBeInTheDocument();
    });

    it("says it's taking the seat once the invite is proven", () => {
      show(room({ role: "visitor", joining: true, busy: true, joinStep: "seat" }));
      expect(screen.getByRole("button", { name: tableCopy.joining })).toBeInTheDocument();
    });

    it("holds the invite buttons while the invite is on its way", () => {
      show(room({ invite: "loading" }));
      expect(screen.getByRole("button", { name: tableCopy.gettingInvite })).toBeDisabled();
      expect(screen.getByRole("button", { name: tableCopy.copyInvite })).toBeDisabled();
    });

    it("offers to show the invite when hidden values are still locked", () => {
      show(room({ invite: "locked" }));
      fireEvent.click(screen.getByRole("button", { name: tableCopy.unlockInvite }));
      expect(actions.copyInvite).toHaveBeenCalled();
    });

    it("offers to try again when the invite couldn't be fetched", () => {
      show(room({ invite: "failed" }));
      fireEvent.click(screen.getByRole("button", { name: tableCopy.tryAgain }));
      expect(actions.copyInvite).toHaveBeenCalled();
    });
  });
});
