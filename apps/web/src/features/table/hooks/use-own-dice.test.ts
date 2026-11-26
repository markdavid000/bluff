import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { forgetBlocks, seeBlock } from "@/lib/block-clock";
import { useOwnDice } from "./use-own-dice";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const TABLE = 12n;
const FIRST = `0x${"a1".repeat(32)}`;
const SECOND = `0x${"b2".repeat(32)}`;

let diceRead: Record<string, unknown> = {};
let decrypted: Record<string, unknown> = {};
let permit: Record<string, unknown> = {};
const readAsked: Record<string, unknown>[] = [];
const decryptAsked: { inputs: unknown[]; options: Record<string, unknown> }[] = [];
const refetchDice = vi.fn();
const refetchDecrypt = vi.fn();
const grant = vi.fn();

vi.mock("wagmi", () => ({
  useReadContract: (request: Record<string, unknown>) => {
    readAsked.push(request);
    return { refetch: refetchDice, ...diceRead };
  },
}));
vi.mock("@zama-fhe/react-sdk", () => ({
  useDecryptValues: (inputs: unknown[], options: Record<string, unknown>) => {
    decryptAsked.push({ inputs, options });
    return { refetch: refetchDecrypt, ...decrypted };
  },
}));
vi.mock("@/hooks/use-permit", () => ({ usePermit: () => ({ grant, ...permit }) }));

function render(inGame = true, round = 3) {
  return renderHook(() => useOwnDice({ id: TABLE, me: ME, round, inGame })).result.current;
}

beforeEach(() => {
  diceRead = { isPending: false, isError: false, isPlaceholderData: false, data: [FIRST, SECOND] };
  decrypted = { isPending: false, isError: false, data: { [FIRST]: 4n, [SECOND]: 0n } };
  permit = { status: "granted", granting: false };
});

afterEach(() => {
  readAsked.length = 0;
  decryptAsked.length = 0;
  forgetBlocks();
  vi.clearAllMocks();
});

describe("useOwnDice", () => {
  it("shows the player their own dice as faces, in order", () => {
    expect(render()).toEqual({ status: "ready", faces: [5, 1] });
    expect(readAsked.at(-1)).toMatchObject({
      address: contracts.bluff,
      functionName: "diceOf",
      args: [TABLE, ME],
    });
    expect(decryptAsked.at(-1)?.inputs).toEqual([
      { encryptedValue: FIRST, contractAddress: contracts.bluff },
      { encryptedValue: SECOND, contractAddress: contracts.bluff },
    ]);
  });

  it("reads each round on its own, at the newest block the app has seen", () => {
    seeBlock(900n);
    render(true, 3);
    const third = readAsked.at(-1);
    render(true, 4);
    const fourth = readAsked.at(-1);
    expect(third?.scopeKey).not.toEqual(fourth?.scopeKey);
    expect(fourth?.blockNumber).toBe(900n);
  });

  it("reads a round's dice once, not again at every new block", () => {
    seeBlock(900n);
    let round = 3;
    const hook = renderHook(() => useOwnDice({ id: TABLE, me: ME, round, inGame: true }));
    const first = readAsked.at(-1);
    act(() => seeBlock(901n));
    act(() => seeBlock(902n));
    hook.rerender();
    expect(readAsked.at(-1)?.blockNumber).toBe(first?.blockNumber);
    expect(readAsked.at(-1)?.scopeKey).toBe(first?.scopeKey);
    round = 4;
    hook.rerender();
    expect(readAsked.at(-1)?.blockNumber).toBe(902n);
    expect(readAsked.at(-1)?.scopeKey).not.toBe(first?.scopeKey);
  });

  it("never shows the last round's dice while this round's are read", () => {
    diceRead = { ...diceRead, isPlaceholderData: true };
    expect(render().status).toBe("loading");
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
    diceRead = { ...diceRead, isPlaceholderData: false };
    decrypted = { isPending: false, isError: false, data: { [FIRST]: 4n } };
    expect(render().status).toBe("loading");
  });

  it("keeps this round's dice steady while a newer block is read", () => {
    let round = 3;
    const hook = renderHook(() => useOwnDice({ id: TABLE, me: ME, round, inGame: true }));
    expect(hook.result.current).toEqual({ status: "ready", faces: [5, 1] });
    diceRead = { ...diceRead, isPlaceholderData: true };
    hook.rerender();
    expect(hook.result.current).toEqual({ status: "ready", faces: [5, 1] });
    round = 4;
    hook.rerender();
    expect(hook.result.current.status).toBe("loading");
  });

  it("keeps the dice on screen when a later refresh fails", () => {
    diceRead = { ...diceRead, isError: true };
    decrypted = { ...decrypted, isError: true };
    expect(render()).toEqual({ status: "ready", faces: [5, 1] });
  });

  it("reads nothing for someone who isn't playing", () => {
    expect(render(false)).toEqual({ status: "none" });
    expect(readAsked.at(-1)?.query).toMatchObject({ enabled: false });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
  });

  it("is loading while the dice are read or opened", () => {
    diceRead = { isPending: true, isError: false, data: undefined };
    expect(render().status).toBe("loading");
    diceRead = { isPending: false, isError: false, data: [FIRST] };
    decrypted = { isPending: true, isError: false, data: undefined };
    expect(render().status).toBe("loading");
  });

  it("never opens the dice before the player has unlocked hidden values, and lets them unlock", () => {
    permit = { status: "needed", granting: false };
    const result = render();
    expect(result).toMatchObject({ status: "locked", unlocking: false });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
    if (result.status !== "locked") throw new Error("Expected locked dice.");
    result.unlock();
    expect(grant).toHaveBeenCalledOnce();
  });

  it("offers to try again when the dice can't be read or opened", () => {
    diceRead = { isPending: false, isError: true, data: undefined };
    const unread = render();
    if (unread.status !== "failed") throw new Error("Expected a failure.");
    unread.retry();
    expect(refetchDice).toHaveBeenCalledOnce();

    diceRead = { isPending: false, isError: false, data: [FIRST] };
    decrypted = { isPending: false, isError: true, data: undefined };
    const unopened = render();
    if (unopened.status !== "failed") throw new Error("Expected a failure.");
    unopened.retry();
    expect(refetchDecrypt).toHaveBeenCalledOnce();
  });

  it("reads dice the decryption service returns as plain numbers", () => {
    decrypted = { isPending: false, isError: false, data: { [FIRST]: 4, [SECOND]: 0 } };
    expect(render()).toEqual({ status: "ready", faces: [5, 1] });
  });

  it("reports a die that isn't a real die as a failure, never a guess", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    decrypted = { isPending: false, isError: false, data: { [FIRST]: 9n, [SECOND]: 0n } };
    expect(render().status).toBe("failed");
  });
});
