import { chipTokenAbi } from "@bluff/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { type Hex, encodeAbiParameters, encodeEventTopics } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import type { ContractCall } from "@/hooks/use-send-move";
import { ONE_CHIP } from "@/lib/chips";
import { rememberedCashOuts } from "../lib/pending-cash-outs";
import { useCashOut } from "./use-cash-out";

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const REQUEST: Hex = `0x${"ab".repeat(32)}`;
const SEALED: Hex = `0x${"cd".repeat(32)}`;
const BURNT: Hex = `0x${"ef".repeat(32)}`;
const BALANCE: Hex = `0x${"12".repeat(32)}`;
const PROOF: Hex = "0x1234";
const DECRYPTION_PROOF: Hex = "0x5678";

const sendMove = vi.fn();
const encrypt = vi.fn();
const decryptPublic = vi.fn();
const readContract = vi.fn();
const invalidateBalanceQueries = vi.fn();

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ACCOUNT } } }),
}));
vi.mock("wagmi", () => ({
  usePublicClient: () => ({ readContract }),
  useReadContract: () => ({ data: 0n, refetch: vi.fn() }),
}));
vi.mock("@zama-fhe/react-sdk", () => ({
  useEncrypt: () => ({ mutateAsync: encrypt }),
  useDecryptPublicValues: () => ({ mutateAsync: decryptPublic }),
}));
vi.mock("@zama-fhe/sdk/query", () => ({
  invalidateBalanceQueries: (...args: unknown[]) => invalidateBalanceQueries(...args),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
vi.mock("./use-pending-cash-out", () => ({
  pendingCashOutKey: (account: string) => ["pending-cash-out", account],
  firstOpenCashOut: async (_client: unknown, account: string, ids: Hex[]) => {
    for (const id of ids) {
      const requester = await readContract({ functionName: "unwrapRequester", args: [id] });
      if (requester === account) return id;
    }
    return null;
  },
}));

function unwrapReceipt() {
  return {
    status: "success",
    transactionHash: "0x99",
    logs: [
      {
        address: contracts.chips,
        topics: encodeEventTopics({
          abi: chipTokenAbi,
          eventName: "UnwrapRequested",
          args: { receiver: ACCOUNT, unwrapRequestId: REQUEST },
        }),
        data: encodeAbiParameters([{ type: "bytes32" }], [BURNT]),
        blockNumber: 1n,
        logIndex: 0,
        transactionHash: "0x99",
        transactionIndex: 0,
        blockHash: "0x01",
        removed: false,
      },
    ],
  };
}

const finalized = { status: "success", transactionHash: "0x98", logs: [] };

function calls(name: string) {
  return sendMove.mock.calls
    .map(([call]) => call as ContractCall)
    .filter((call) => call.functionName === name);
}

function render(onFinished = vi.fn()) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { onFinished, ...renderHook(() => useCashOut({ onFinished }), { wrapper }) };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName === "unwrapAmount") return BURNT;
    if (functionName === "confidentialBalanceOf") return BALANCE;
    if (functionName === "unwrapRequester") return "0x0000000000000000000000000000000000000000";
    throw new Error(`Unexpected read ${functionName}`);
  });
  encrypt.mockResolvedValue({ encryptedValues: [SEALED], inputProof: PROOF });
  decryptPublic.mockResolvedValue({
    clearValues: { [BURNT]: 25n * ONE_CHIP },
    decryptionProof: DECRYPTION_PROOF,
  });
  sendMove.mockImplementation(async (call: ContractCall) =>
    call.functionName === "unwrap" ? unwrapReceipt() : finalized
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("useCashOut", () => {
  it("seals the exact amount, burns it and finishes with the public reveal in one action", async () => {
    const { result, onFinished } = render();
    act(() => result.current.cashOut(25n * ONE_CHIP));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(encrypt).toHaveBeenCalledWith({
      values: [{ type: "euint64", value: 25n * ONE_CHIP }],
      contractAddress: contracts.chips,
      userAddress: ACCOUNT,
    });
    expect(calls("unwrap")).toEqual([
      expect.objectContaining({ args: [ACCOUNT, ACCOUNT, SEALED, PROOF] }),
    ]);
    expect(decryptPublic).toHaveBeenCalledWith([BURNT]);
    expect(calls("finalizeUnwrap")).toEqual([
      expect.objectContaining({ args: [REQUEST, 25n * ONE_CHIP, DECRYPTION_PROOF] }),
    ]);
    expect(invalidateBalanceQueries).toHaveBeenCalledWith(expect.anything(), contracts.chips);
    expect(rememberedCashOuts(ACCOUNT)).toEqual([]);
  });

  it("cashes out everything from the balance itself, without sealing a number", async () => {
    const { result, onFinished } = render();
    act(() => result.current.cashOut("everything"));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(encrypt).not.toHaveBeenCalled();
    expect(calls("unwrap")).toEqual([
      expect.objectContaining({ args: [ACCOUNT, ACCOUNT, BALANCE] }),
    ]);
  });

  it("keeps an interrupted cash out, and finishes it instead of burning again on retry", async () => {
    sendMove.mockImplementation(async (call: ContractCall) => {
      if (call.functionName === "unwrap") return unwrapReceipt();
      throw new Error("The connection dropped.");
    });
    const { result, onFinished } = render();
    act(() => result.current.cashOut(25n * ONE_CHIP));
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(onFinished).not.toHaveBeenCalled();
    expect(rememberedCashOuts(ACCOUNT)).toEqual([REQUEST]);

    readContract.mockImplementation(async ({ functionName }: { functionName: string }) =>
      functionName === "unwrapRequester" ? ACCOUNT : BURNT
    );
    sendMove.mockResolvedValue(finalized);
    act(() => result.current.cashOut(25n * ONE_CHIP));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(calls("unwrap")).toHaveLength(1);
    expect(calls("finalizeUnwrap").at(-1)).toEqual(
      expect.objectContaining({ args: [REQUEST, 25n * ONE_CHIP, DECRYPTION_PROOF] })
    );
    expect(rememberedCashOuts(ACCOUNT)).toEqual([]);
  });

  it("resumes a cash out found on the chain", async () => {
    const { result, onFinished } = render();
    act(() => result.current.resume(REQUEST));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(calls("unwrap")).toHaveLength(0);
    expect(calls("finalizeUnwrap")).toEqual([
      expect.objectContaining({ args: [REQUEST, 25n * ONE_CHIP, DECRYPTION_PROOF] }),
    ]);
  });

  it("waits for the burnt amount to become public before finishing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    decryptPublic
      .mockRejectedValueOnce(new Error("not ready"))
      .mockRejectedValueOnce(new Error("not ready"));
    const { result, onFinished } = render();
    act(() => result.current.resume(REQUEST));

    await vi.advanceTimersByTimeAsync(7_000);
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(decryptPublic).toHaveBeenCalledTimes(3);
  });

  it("gives up after thirty seconds and leaves the cash out to resume", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    decryptPublic.mockRejectedValue(new Error("not ready"));
    const { result, onFinished } = render();
    act(() => result.current.resume(REQUEST));

    await vi.advanceTimersByTimeAsync(31_000);
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(onFinished).not.toHaveBeenCalled();
    expect(calls("finalizeUnwrap")).toHaveLength(0);
  });
});
