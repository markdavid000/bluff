import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletKeeper } from "./use-wallet-keeper";

const createWallet = vi.fn();
let privy: {
  ready: boolean;
  authenticated: boolean;
  user: { id: string; wallet?: { address: string } } | null;
};

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => privy,
  useCreateWallet: () => ({ createWallet }),
}));

beforeEach(() => {
  createWallet.mockResolvedValue({ address: "0x00000000000000000000000000000000000b1ff0" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useWalletKeeper", () => {
  it("makes the missing wallet of a signed-in player, once", async () => {
    privy = { ready: true, authenticated: true, user: { id: "did:privy:case-1" } };
    const { rerender } = renderHook(() => useWalletKeeper());
    rerender();
    rerender();
    await waitFor(() => expect(createWallet).toHaveBeenCalledOnce());
  });

  it("leaves a player who already has a wallet alone", () => {
    privy = {
      ready: true,
      authenticated: true,
      user: { id: "did:privy:has", wallet: { address: "0x1" } },
    };
    renderHook(() => useWalletKeeper());
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("waits until sign in has settled", () => {
    privy = { ready: false, authenticated: false, user: null };
    renderHook(() => useWalletKeeper());
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("reports a wallet that cannot be made instead of waiting forever", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    createWallet.mockRejectedValue(new Error("The wallet frame was blocked."));
    privy = { ready: true, authenticated: true, user: { id: "did:privy:case-2" } };
    const { result } = renderHook(() => useWalletKeeper());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(console.error).toHaveBeenCalled();
  });
});
