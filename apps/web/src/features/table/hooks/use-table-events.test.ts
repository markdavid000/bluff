import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetBlocks, newestBlock } from "@/lib/block-clock";
import { onNotice } from "@/lib/notify";
import { tableCopy } from "../copy";
import { useTableEvents } from "./use-table-events";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";

type OnLogs = (logs: unknown[]) => void;
let deliver: OnLogs = () => undefined;
vi.mock("wagmi", () => ({
  useWatchContractEvent: ({ onLogs }: { onLogs: OnLogs }) => {
    deliver = onLogs;
  },
}));

let shown: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
});

afterEach(() => {
  stop();
  forgetBlocks();
});

function log(eventName: string, args: Record<string, unknown>, blockNumber: bigint, logIndex = 0) {
  return {
    eventName,
    args,
    blockNumber,
    logIndex,
    transactionHash: `0x${blockNumber.toString(16)}`,
  };
}

describe("useTableEvents", () => {
  it("tells the player about others at this table and moves the block clock", () => {
    renderHook(() => useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D" }));
    deliver([
      log("PlayerJoined", { id: 12n, player: KOLA }, 100n),
      log("PlayerReady", { id: 12n, player: KOLA, ready: true }, 101n),
    ]);
    expect(shown).toEqual([tableCopy.joined("Kola #3C4D"), tableCopy.isReady("Kola #3C4D")]);
    expect(newestBlock()).toBe(101n);
  });

  it("asks the others to get ready when the table reopens, and only tells the host it reopened", () => {
    renderHook(() => useTableEvents({ id: 12n, me: ME, host: KOLA, nameOf: () => "Kola #3C4D" }));
    deliver([log("TableReopened", { id: 12n }, 100n)]);
    renderHook(() => useTableEvents({ id: 12n, me: ME, host: ME, nameOf: () => "Me" }));
    deliver([log("TableReopened", { id: 12n }, 101n)]);
    expect(shown).toEqual([tableCopy.openAgain, tableCopy.openAgainForHost]);
  });

  it("treats a player who becomes host as the table reopens as the host", () => {
    renderHook(() => useTableEvents({ id: 12n, me: ME, host: KOLA, nameOf: () => "Kola #3C4D" }));
    deliver([
      log("HostChanged", { id: 12n, host: ME }, 100n, 0),
      log("TableReopened", { id: 12n }, 100n, 1),
    ]);
    expect(shown).toEqual([tableCopy.youAreHost, tableCopy.openAgainForHost]);
  });

  it("ignores moves at other tables", () => {
    renderHook(() => useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D" }));
    deliver([log("PlayerJoined", { id: 13n, player: KOLA }, 100n)]);
    expect(shown).toEqual([]);
    expect(newestBlock()).toBe(0n);
  });

  it("keeps quiet about the player's own moves but still moves the block clock", () => {
    renderHook(() => useTableEvents({ id: 12n, me: ME, nameOf: () => "Me" }));
    deliver([log("PlayerReady", { id: 12n, player: ME, ready: true }, 120n)]);
    expect(shown).toEqual([]);
    expect(newestBlock()).toBe(120n);
  });

  it("hands each bid to the screen, without a toast", () => {
    const bid = vi.fn();
    renderHook(() =>
      useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D", onBidPlaced: bid })
    );
    deliver([log("BidPlaced", { id: 12n, round: 2, player: KOLA, quantity: 4, face: 5 }, 130n)]);
    expect(bid).toHaveBeenCalledWith({ round: 2, player: KOLA, quantity: 4, face: 5 });
    expect(shown).toEqual([]);
  });

  it("hands each round's result to the screen", () => {
    const settled = vi.fn();
    renderHook(() =>
      useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D", onRoundSettled: settled })
    );
    deliver([
      log(
        "RoundSettled",
        {
          id: 12n,
          round: 3,
          face: 5,
          quantity: 4,
          count: 3,
          loser: KOLA,
          revealedFaces: [1, 5, 5, 2, 6],
        },
        150n
      ),
    ]);
    expect(settled).toHaveBeenCalledWith({
      round: 3,
      face: 5,
      quantity: 4,
      count: 3,
      loser: KOLA,
      faces: [1, 5, 5, 2, 6],
    });
    expect(shown).toEqual([]);
  });

  it("ignores a round result it can't read", () => {
    const settled = vi.fn();
    renderHook(() =>
      useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D", onRoundSettled: settled })
    );
    deliver([log("RoundSettled", { id: 12n, round: 3, face: 5 }, 150n)]);
    expect(settled).not.toHaveBeenCalled();
  });
  it("hands the end of the game and its winners to the screen", () => {
    const ended = vi.fn();
    renderHook(() =>
      useTableEvents({ id: 12n, me: ME, nameOf: () => "Kola #3C4D", onGameEnded: ended })
    );
    deliver([log("GameEnded", { id: 12n, reason: 0, winners: [KOLA] }, 150n)]);
    expect(ended).toHaveBeenCalledWith({ reason: "last-standing", winners: [KOLA] });
  });
});
