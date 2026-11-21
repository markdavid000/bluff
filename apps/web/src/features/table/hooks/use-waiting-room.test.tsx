import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableLink } from "@/lib/table-links";
import { tableCopy } from "../copy";
import type { Table } from "@bluff/game";
import { useWaitingRoom } from "./use-waiting-room";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const STRANGER = "0x0000000000000000000000000000000000009f9f";

let me = KOLA;
let tableRead: Record<string, unknown> = {};
let balance: Record<string, unknown> = { status: "ready", amount: 100n * ONE_CHIP };
const sendMove = vi.fn();
const takeSeat = vi.fn();
const proveInvite = vi.fn();
const unlock = vi.fn();
let inviteCode: Record<string, unknown> = { status: "ready", code: null };
const inviteAsked: Record<string, unknown>[] = [];
let linkCode: bigint | null = null;
let myTableId: Record<string, unknown> = { status: "ready", id: null };
const replace = vi.fn();
const router = { replace };

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: me } } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@zama-fhe/sdk/query", () => ({ invalidateBalanceQueries: vi.fn() }));
vi.mock("@/hooks/use-block-clock", () => ({ useFollowChain: vi.fn() }));
vi.mock("@/hooks/use-chip-balance", () => ({ useChipBalance: () => balance }));
vi.mock("@/hooks/use-player-profiles", () => ({
  usePlayerProfiles: () => ({
    status: "ready",
    profileOf: (address: string) => ({
      name: address === KOLA ? "Kola #3C4D" : "Dave #1A2B",
      avatarSrc: "/a.svg",
    }),
  }),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
const forgetMyTable = vi.fn();
vi.mock("@/hooks/use-my-table-id", () => ({
  useMyTableId: () => myTableId,
  useForgetMyTable: () => forgetMyTable,
}));
vi.mock("@/hooks/use-take-seat", () => ({ useTakeSeat: () => takeSeat }));
vi.mock("@/hooks/use-prove-invite", () => ({ useProveInvite: () => proveInvite }));
vi.mock("./use-invite-code", () => ({
  useInviteCode: (args: Record<string, unknown>) => {
    inviteAsked.push(args);
    return inviteCode;
  },
}));
vi.mock("./use-link-invite", () => ({ useLinkInvite: () => linkCode }));
const markLeftTable = vi.fn();
vi.mock("@/hooks/use-left-tables", () => ({ markLeftTable: (id: bigint) => markLeftTable(id) }));
vi.mock("./use-table", () => ({
  useTable: () => tableRead,
  isNotTableRead: () => true,
}));
vi.mock("./use-table-events", () => ({ useTableEvents: vi.fn() }));
vi.mock("./use-table-keeper", () => ({ useTableKeeper: vi.fn() }));

function table(seats: [string, boolean][], overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: HOST,
    status: "waiting",
    isPrivate: false,
    seatCount: 3,
    buyIn: 0n,
    deadline: Date.now() + 600_000,
    ...NO_GAME,
    seats: seats.map(([player, ready]) => ({
      player: player as `0x${string}`,
      ready,
      isHost: player === HOST,
      isActive: true,
      ...NO_DICE,
    })),
    ...overrides,
  };
}

function render() {
  const queryClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useWaitingRoom(12n), { wrapper: Wrapper });
}

function viewOf(result: { current: ReturnType<typeof useWaitingRoom> }) {
  const view = result.current.view;
  if (!view) throw new Error("Expected the waiting room.");
  return view;
}

beforeEach(() => {
  me = KOLA;
  balance = { status: "ready", amount: 100n * ONE_CHIP };
  tableRead = {
    status: "ready",
    table: table([
      [HOST, false],
      [KOLA, false],
    ]),
    readAt: 100n,
  };
  sendMove.mockResolvedValue({ blockNumber: 101n });
  inviteCode = { status: "ready", code: null };
  inviteAsked.length = 0;
  linkCode = null;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useWaitingRoom", () => {
  it("has no room to show until the table is read", () => {
    tableRead = { status: "loading" };
    expect(render().result.current.view).toBeNull();
  });

  it("knows the host, a guest and a visitor apart", () => {
    me = HOST;
    expect(viewOf(render().result).role).toBe("host");
    me = KOLA;
    expect(viewOf(render().result).role).toBe("guest");
    me = STRANGER;
    expect(viewOf(render().result).role).toBe("visitor");
  });

  it("holds the host's start until everyone else is ready", () => {
    me = HOST;
    expect(viewOf(render().result).canStart).toBe(false);
    tableRead = {
      status: "ready",
      table: table([
        [HOST, false],
        [KOLA, true],
      ]),
      readAt: 100n,
    };
    expect(viewOf(render().result).canStart).toBe(true);
  });

  it("flips the player's own mark at once, and keeps it until the table catches up", async () => {
    const { result, rerender } = render();
    act(() => viewOf(result).toggleReady());
    expect(viewOf(result).myReady).toBe(true);
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "setReady", args: [12n, true] }),
      expect.any(Function)
    );
    await waitFor(() => expect(viewOf(result).toggling).toBe(false));
    expect(viewOf(result).myReady).toBe(true);
    tableRead = {
      status: "ready",
      table: table([
        [HOST, false],
        [KOLA, true],
      ]),
      readAt: 101n,
    };
    rerender();
    expect(viewOf(result).myReady).toBe(true);
  });

  it("puts the mark back when the move fails", async () => {
    sendMove.mockRejectedValue(new Error("rejected"));
    const { result } = render();
    act(() => viewOf(result).toggleReady());
    expect(viewOf(result).myReady).toBe(true);
    await waitFor(() => expect(viewOf(result).myReady).toBe(false));
  });

  it("names who the room is waiting for", () => {
    me = HOST;
    expect(viewOf(render().result).line).toBe(tableCopy.waitingOn("Kola #3C4D"));
  });

  it("takes the player back to the lobby after leaving", async () => {
    const { result } = render();
    act(() => viewOf(result).leave());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/play"));
    expect(markLeftTable).toHaveBeenCalledWith(12n);
    expect(forgetMyTable).toHaveBeenCalledWith(12n);
  });

  it("keeps showing the room as it was while leaving, never the screen for someone opening a link", async () => {
    let landed: (value: { blockNumber: bigint }) => void = () => undefined;
    sendMove.mockReturnValue(new Promise((resolve) => (landed = resolve)));
    const { result, rerender } = render();
    expect(viewOf(result).role).toBe("guest");
    act(() => viewOf(result).leave());
    await waitFor(() => expect(sendMove).toHaveBeenCalled());
    tableRead = { ...tableRead, table: table([[HOST, true]]) };
    rerender();
    expect(viewOf(result).role).toBe("guest");
    await act(async () => landed({ blockNumber: 101n }));
    rerender();
    expect(viewOf(result).role).toBe("guest");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/play"));
    expect(viewOf(result).role).toBe("guest");
  });

  it("shows the table as it is again if leaving fails", async () => {
    sendMove.mockRejectedValue(new Error("rejected"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result, rerender } = render();
    act(() => viewOf(result).leave());
    await waitFor(() => expect(viewOf(result).leaving).toBe(false));
    tableRead = { ...tableRead, table: table([[HOST, true]]) };
    rerender();
    expect(viewOf(result).role).toBe("visitor");
  });

  it("keeps showing the room as it was while closing it, never the closed screen", async () => {
    me = HOST;
    let landed: (value: { blockNumber: bigint }) => void = () => undefined;
    sendMove.mockReturnValue(new Promise((resolve) => (landed = resolve)));
    const { result, rerender } = render();
    act(() => viewOf(result).close());
    await waitFor(() => expect(sendMove).toHaveBeenCalled());
    tableRead = { ...tableRead, table: { ...(tableRead.table as Table), status: "cancelled" } };
    rerender();
    expect(viewOf(result).table.status).toBe("waiting");
    await act(async () => landed({ blockNumber: 101n }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/play"));
    expect(viewOf(result).table.status).toBe("waiting");
  });

  it("keeps saying it's starting until the table shows the game has begun", async () => {
    me = HOST;
    sendMove.mockResolvedValue({ blockNumber: 101n });
    const { result, rerender } = render();
    act(() => viewOf(result).start());
    await waitFor(() => expect(sendMove).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    rerender();
    expect(viewOf(result).starting).toBe(true);
    tableRead = { ...tableRead, table: { ...(tableRead.table as Table), status: "playing" } };
    rerender();
    expect(viewOf(result).starting).toBe(false);
  });

  it("forgets the player's seat once the table closes, so the lobby opens without it", () => {
    const { rerender } = render();
    expect(forgetMyTable).not.toHaveBeenCalled();
    tableRead = { ...tableRead, table: { ...(tableRead.table as Table), status: "cancelled" } };
    rerender();
    expect(forgetMyTable).toHaveBeenCalledWith(12n);
  });

  describe("for a visitor", () => {
    beforeEach(() => {
      me = STRANGER;
    });

    it("joins a free table with room", async () => {
      takeSeat.mockResolvedValue(12n);
      const { result } = render();
      expect(viewOf(result).joinProblem).toBeNull();
      act(() => viewOf(result).join());
      await waitFor(() =>
        expect(takeSeat).toHaveBeenCalledWith(
          { kind: "join", tableId: 12n, buyIn: 0n },
          expect.any(Function)
        )
      );
    });

    it("keeps saying it's joining until the table shows the new seat, so Join never comes back", async () => {
      takeSeat.mockResolvedValue(12n);
      const { result, rerender } = render();
      act(() => viewOf(result).join());
      await waitFor(() => expect(takeSeat).toHaveBeenCalled());
      await waitFor(() => expect(viewOf(result).joining).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 50));
      rerender();
      expect(viewOf(result)).toMatchObject({ role: "visitor", joining: true });
      tableRead = {
        status: "ready",
        table: table(
          [
            [HOST, false],
            [KOLA, false],
          ],
          { seatCount: 2 }
        ),
        readAt: 100n,
      };
      rerender();
      expect(viewOf(result).joinProblem).toBeNull();
      tableRead = {
        status: "ready",
        table: table([
          [HOST, false],
          [KOLA, false],
          [STRANGER, false],
        ]),
        readAt: 101n,
      };
      rerender();
      expect(viewOf(result)).toMatchObject({ role: "guest", joining: false });
    });

    it("says when the table is full or has started", () => {
      tableRead = {
        status: "ready",
        table: table(
          [
            [HOST, false],
            [KOLA, false],
          ],
          { seatCount: 2 }
        ),
        readAt: 1n,
      };
      expect(viewOf(render().result).joinProblem).toBe(tableCopy.full);
      tableRead = {
        status: "ready",
        table: table(
          [
            [HOST, false],
            [KOLA, false],
          ],
          { status: "playing" }
        ),
        readAt: 1n,
      };
      expect(viewOf(render().result).joinProblem).toBe(tableCopy.started);
    });

    it("tells a player seated at another table to go back to it, and offers no join", () => {
      myTableId = { status: "ready", id: 99n };
      expect(viewOf(render().result).joinProblem).toBe(tableCopy.seatedElsewhere);
      myTableId = { status: "ready", id: null };
    });

    it("says how many chips a paid table needs", () => {
      balance = { status: "ready", amount: 10n * ONE_CHIP };
      tableRead = {
        status: "ready",
        table: table([[HOST, false]], { buyIn: 25n * ONE_CHIP }),
        readAt: 1n,
      };
      expect(viewOf(render().result).joinProblem).toBe(tableCopy.notEnough("25"));
    });
  });

  describe("at a private table", () => {
    const CODE = 98765n;

    function stubClipboard() {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      return writeText;
    }

    afterEach(() => {
      Reflect.deleteProperty(navigator, "clipboard");
    });

    function privateTable(seats: [string, boolean][] = [[HOST, false]]) {
      tableRead = { status: "ready", table: table(seats, { isPrivate: true }), readAt: 1n };
    }

    it("tells a visitor without the invite to ask the host, and offers no join", () => {
      me = STRANGER;
      privateTable();
      expect(viewOf(render().result).joinProblem).toBe(tableCopy.privateTable);
    });

    it("proves the invite before taking the seat, and says which it's doing", async () => {
      me = STRANGER;
      privateTable();
      linkCode = CODE;
      let finishProving: () => void = () => undefined;
      proveInvite.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finishProving = resolve;
          })
      );
      takeSeat.mockResolvedValue(12n);
      const { result } = render();
      expect(viewOf(result).joinProblem).toBeNull();
      act(() => viewOf(result).join());
      await waitFor(() =>
        expect(proveInvite).toHaveBeenCalledWith(12n, CODE, expect.any(Function))
      );
      expect(viewOf(result).joinStep).toBe("invite");
      expect(takeSeat).not.toHaveBeenCalled();
      await act(async () => finishProving());
      await waitFor(() =>
        expect(takeSeat).toHaveBeenCalledWith(
          { kind: "join", tableId: 12n, buyIn: 0n },
          expect.any(Function)
        )
      );
    });

    it("never takes a seat when the invite doesn't work", async () => {
      me = STRANGER;
      privateTable();
      linkCode = CODE;
      proveInvite.mockRejectedValue(new Error("wrong code"));
      const { result } = render();
      act(() => viewOf(result).join());
      await waitFor(() => expect(viewOf(result).joining).toBe(false));
      expect(takeSeat).not.toHaveBeenCalled();
    });

    it("only asks for the code for players at the table", () => {
      me = STRANGER;
      privateTable();
      render();
      expect(inviteAsked.at(-1)).toMatchObject({ id: 12n, isPrivate: true, canRead: false });
      me = HOST;
      render();
      expect(inviteAsked.at(-1)).toMatchObject({ id: 12n, isPrivate: true, canRead: true });
    });

    it("copies the host's invite with the code", async () => {
      me = HOST;
      privateTable();
      inviteCode = { status: "ready", code: CODE };
      const writeText = stubClipboard();
      const { result } = render();
      expect(viewOf(result).invite).toBe("ready");
      act(() => viewOf(result).copyInvite());
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(tableLink(window.location.origin, 12n, CODE))
      );
    });

    it("unlocks the invite first when hidden values aren't unlocked yet", () => {
      me = HOST;
      privateTable();
      inviteCode = { status: "locked", unlock, unlocking: false };
      const writeText = stubClipboard();
      const { result } = render();
      expect(viewOf(result).invite).toBe("locked");
      act(() => viewOf(result).copyInvite());
      expect(unlock).toHaveBeenCalledOnce();
      expect(writeText).not.toHaveBeenCalled();
    });

    it("copies nothing while the invite is still on its way", () => {
      me = HOST;
      privateTable();
      inviteCode = { status: "loading" };
      const writeText = stubClipboard();
      const { result } = render();
      expect(viewOf(result).invite).toBe("loading");
      act(() => viewOf(result).copyInvite());
      expect(writeText).not.toHaveBeenCalled();
    });
  });
});
