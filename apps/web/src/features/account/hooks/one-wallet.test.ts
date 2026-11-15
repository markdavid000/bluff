import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSignIn } from "./use-sign-in";
import { useWalletKeeper } from "./use-wallet-keeper";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const replace = vi.fn();
const loadPage = vi.fn();
const createWallet = vi.fn(
  () =>
    new Promise<{ address: string }>((resolve) =>
      setTimeout(() => resolve({ address: "0x00000000000000000000000000000000000b1ff0" }), 30)
    )
);

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/load-page", () => ({ loadPage: (path: string) => loadPage(path) }));
vi.mock("wagmi", () => ({ usePublicClient: () => ({ readContract: async () => "" }) }));
vi.mock("../lib/session-client", () => ({ openSession: async () => true }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    user: { id: "did:privy:new" },
    getAccessToken: async () => "privy-token",
  }),
  useLogin: () => ({ login: vi.fn() }),
  useLoginWithOAuth: () => ({ initOAuth: vi.fn() }),
  useCreateWallet: () => ({ createWallet }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("making a player's wallet", () => {
  it("makes exactly one wallet when sign in and the page keeper both see it missing", async () => {
    renderHook(() => {
      useSignIn(undefined);
      useWalletKeeper();
    });
    await waitFor(() => expect(loadPage).toHaveBeenCalledOnce());
    expect(createWallet).toHaveBeenCalledOnce();
  });
});
