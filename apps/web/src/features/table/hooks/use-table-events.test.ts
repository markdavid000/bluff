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
});
