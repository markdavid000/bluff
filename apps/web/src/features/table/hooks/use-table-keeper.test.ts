import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNotice } from "@/lib/notify";
import { tableCopy } from "../copy";
import { KEEPER_STAGGER_MS, type Table, type TableStatus } from "@bluff/game";
import { useTableKeeper } from "./use-table-keeper";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const OUTSIDER = "0x0000000000000000000000000000000000009f9f";
const START = 1_700_000_000_000;
const DEADLINE = START + 10 * 60 * 1000;

let chainStatus = 2;
const sendMove = vi.fn();
const decryptPublic = vi.fn();
const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
  if (functionName === "revealHandles") return ["0xaa", "0xbb"];
  return [
    {
      id: 12n,
      host: HOST,
      status: chainStatus,
      isPrivate: false,
      seatCount: 2,
      playerCount: 2,
      dicePerPlayer: 4,
      diceInPlay: 0,
      buyIn: 10n,
      createdAt: 0n,
      startedAt: 0n,
      deadline: BigInt(DEADLINE / 1000),
      round: 0,
      turn: 0,
      roundStarter: 0,
      bidQuantity: 0,
      bidFace: 0,
      bidder: 0,
      caller: 0,
    },
    [
      { player: HOST, dice: 0, missedTurns: 0, isActive: true, ready: false },
      { player: KOLA, dice: 0, missedTurns: 0, isActive: true, ready: true },
    ],
  ];
});

vi.mock("wagmi", () => ({ usePublicClient: () => ({ readContract }) }));
vi.mock("@zama-fhe/react-sdk", () => ({
  useDecryptPublicValues: () => ({ mutateAsync: decryptPublic }),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));

function table(status: TableStatus): Table {
  return {
    id: 12n,
    host: HOST,
    status,
    isPrivate: false,
    seatCount: 2,
    buyIn: 10n,
    deadline: DEADLINE,
    ...NO_GAME,
    seats: [
      { player: HOST, ready: false, isHost: true, isActive: true, ...NO_DICE },
      { player: KOLA, ready: true, isHost: false, isActive: true, ...NO_DICE },
    ],
  };
}

async function wait(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

let shown: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START + 1_000);
  chainStatus = 2;
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
  decryptPublic.mockResolvedValue({ abiEncodedClearValues: "0x01", decryptionProof: "0x02" });
  sendMove.mockResolvedValue({ status: "success" });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useTableKeeper", () => {
  it("has the host run the payment check with the public reveal", async () => {
    renderHook(() => useTableKeeper({ table: table("verifying"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(decryptPublic).toHaveBeenCalledWith(["0xaa", "0xbb"]);
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "confirmSeats", args: [12n, "0x01", "0x02"] }),
      expect.any(Function)
    );
  });

  it("has another player wait their turn before stepping in", async () => {
    renderHook(() => useTableKeeper({ table: table("verifying"), me: KOLA, now: Date.now() }));
    await wait(KEEPER_STAGGER_MS - 2_000);
    expect(sendMove).not.toHaveBeenCalled();
    await wait(2_500);
    expect(sendMove).toHaveBeenCalledOnce();
  });

  it("checks the table again just before sending, and stays quiet if someone else already did it", async () => {
    chainStatus = 3;
    renderHook(() => useTableKeeper({ table: table("verifying"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(readContract).toHaveBeenCalled();
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("never sends anything for a watcher", async () => {
    renderHook(() => useTableKeeper({ table: table("verifying"), me: OUTSIDER, now: Date.now() }));
    await wait(30_000);
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("drops a scheduled move when the player leaves the page", async () => {
    const { unmount } = renderHook(() =>
      useTableKeeper({ table: table("verifying"), me: KOLA, now: Date.now() })
    );
    unmount();
    await wait(KEEPER_STAGGER_MS * 2);
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("tries again after a failure, and only mentions it after the second", async () => {
    sendMove.mockRejectedValue(new Error("network"));
    renderHook(() => useTableKeeper({ table: table("verifying"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(sendMove).toHaveBeenCalledTimes(1);
    expect(shown).toEqual([]);
    await wait(16_000);
    expect(sendMove).toHaveBeenCalledTimes(2);
    expect(shown).toEqual([tableCopy.keeperProblem]);
  });

  it("checks again after the slow reveal, and stays quiet if someone else confirmed meanwhile", async () => {
    decryptPublic.mockImplementation(async () => {
      chainStatus = 3;
      return { abiEncodedClearValues: "0x01", decryptionProof: "0x02" };
    });
    renderHook(() => useTableKeeper({ table: table("verifying"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(decryptPublic).toHaveBeenCalled();
    expect(sendMove).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("treats a refusal as done, not as a failure, when someone else got there first", async () => {
    sendMove.mockImplementation(async () => {
      chainStatus = 3;
      throw new Error("WrongStatus(12, 3)");
    });
    renderHook(() => useTableKeeper({ table: table("verifying"), me: HOST, now: Date.now() }));
    await wait(100);
    await wait(16_000);
    expect(sendMove).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
    expect(shown).toEqual([]);
  });

  it("settles a called round with the public reveal", async () => {
    chainStatus = 4;
    renderHook(() => useTableKeeper({ table: table("revealing"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(decryptPublic).toHaveBeenCalledWith(["0xaa", "0xbb"]);
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "settleReveal", args: [12n, "0x01", "0x02"] }),
      expect.any(Function)
    );
  });

  it("claims a turn that ran out of time", async () => {
    chainStatus = 3;
    vi.setSystemTime(DEADLINE + 16_000);
    renderHook(() => useTableKeeper({ table: table("playing"), me: HOST, now: Date.now() }));
    await wait(100);
    expect(decryptPublic).not.toHaveBeenCalled();
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "claimTimeout", args: [12n] }),
      expect.any(Function)
    );
  });
});
