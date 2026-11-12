import { chipFaucetAbi, chipTokenAbi } from "@bluff/contracts";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSendMove } from "./use-send-move";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const SEPOLIA = 11155111;
const order: string[] = [];
let walletChainId: number | undefined = SEPOLIA;
let embedded = false;

const sendSponsored = vi.fn(async () => {
  order.push("sponsored");
  return { hash: "0xaa" };
});
const sendTransactionAsync = vi.fn(async (_request: { account?: string }) => {
  order.push("send");
  if (walletChainId !== SEPOLIA) throw new Error("The wallet is on another network.");
  return "0xbb";
});
const switchChain = vi.fn(async ({ chainId }: { chainId: number }) => {
  order.push("switch");
  walletChainId = chainId;
});

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ACCOUNT } } }),
  useWallets: () => ({
    wallets: embedded ? [{ walletClientType: "privy", address: ACCOUNT }] : [],
  }),
  useSendTransaction: () => ({ sendTransaction: sendSponsored }),
}));
const simulateContract = vi.fn(
  async (_request: { abi: readonly { type: string; name?: string }[] }) => order.push("simulate")
);

vi.mock("wagmi", () => ({
  usePublicClient: () => ({
    simulateContract: (request: { abi: readonly { type: string; name?: string }[] }) =>
      simulateContract(request),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  }),
  useSendTransaction: () => ({ sendTransactionAsync }),
  useConnection: () => ({ chainId: walletChainId }),
  useSwitchChain: () => ({ mutateAsync: switchChain }),
}));

const CLAIM = {
  address: "0x0000000000000000000000000000000000000fa5",
  abi: chipFaucetAbi,
  functionName: "claim",
  args: [""],
} as const;

beforeEach(() => {
  order.length = 0;
  walletChainId = SEPOLIA;
  embedded = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSendMove", () => {
  it("moves a player's own wallet to the game's network before sending", async () => {
    walletChainId = 1;
    const { result } = renderHook(() => useSendMove());
    await result.current(CLAIM, vi.fn());
    expect(order).toEqual(["simulate", "switch", "send"]);
    expect(switchChain).toHaveBeenCalledWith({ chainId: SEPOLIA });
  });

  it("does not ask to switch when the wallet is already on the game's network", async () => {
    const { result } = renderHook(() => useSendMove());
    await result.current(CLAIM, vi.fn());
    expect(switchChain).not.toHaveBeenCalled();
    expect(order).toEqual(["simulate", "send"]);
  });

  it("sends only from the wallet the player signed in with", async () => {
    const { result } = renderHook(() => useSendMove());
    await result.current(CLAIM, vi.fn());
    expect(sendTransactionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ account: ACCOUNT })
    );
  });

  it("pays for moves from a wallet Bluff made, without switching anything", async () => {
    embedded = true;
    walletChainId = undefined;
    const { result } = renderHook(() => useSendMove());
    await result.current(CLAIM, vi.fn());
    expect(switchChain).not.toHaveBeenCalled();
    expect(order).toEqual(["simulate", "sponsored"]);
  });

  it("can name a table's refusal even when the move goes through the chip token", async () => {
    const { result } = renderHook(() => useSendMove());
    await result.current(
      {
        address: "0x0000000000000000000000000000000000000c41",
        abi: chipTokenAbi,
        functionName: "confidentialTransferAndCall",
        args: [
          "0x0000000000000000000000000000000000000ca5",
          `0x${"ab".repeat(32)}`,
          "0x1234",
          "0x",
        ],
      },
      vi.fn()
    );
    const known = (simulateContract.mock.calls[0]?.[0].abi ?? [])
      .filter((item) => item.type === "error")
      .map((item) => item.name);
    expect(known).toEqual(
      expect.arrayContaining(["AlreadyAtTable", "WrongStatus", "InvalidBuyIn", "ClaimTooSoon"])
    );
  });
});
