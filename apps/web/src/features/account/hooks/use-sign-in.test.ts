import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSignIn } from "./use-sign-in";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const NEW_WALLET = "0x00000000000000000000000000000000000b1ff0";
const OWN_WALLET = "0x000000000000000000000000000000000000cafe";

const replace = vi.fn();
const createWallet = vi.fn();
const readContract = vi.fn();
const openSession = vi.fn();
let privy: {
  ready: boolean;
  authenticated: boolean;
  user: { id: string; wallet?: { address: string } } | null;
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("wagmi", () => ({ usePublicClient: () => ({ readContract }) }));
vi.mock("../lib/session-client", () => ({ openSession: (token: string) => openSession(token) }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ...privy, getAccessToken: async () => "privy-token" }),
  useLogin: () => ({ login: vi.fn() }),
  useLoginWithOAuth: () => ({ initOAuth: vi.fn() }),
  useCreateWallet: () => ({ createWallet }),
}));

let caseNumber = 0;

beforeEach(() => {
  caseNumber += 1;
  privy = {
    ready: true,
    authenticated: true,
    user: { id: `did:privy:sign-in-${caseNumber}`, wallet: undefined },
  };
  createWallet.mockResolvedValue({ address: NEW_WALLET });
  openSession.mockResolvedValue(true);
  readContract.mockResolvedValue("");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSignIn", () => {
  it("makes the wallet of a new email or Google player before leaving sign in", async () => {
    renderHook(() => useSignIn(undefined));
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(createWallet).toHaveBeenCalledOnce();
    expect(createWallet.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0] ?? 0
    );
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "nicknameOf", args: [NEW_WALLET] })
    );
  });

  it("sends a player with no name yet to the welcome screen, and on to where they were going", async () => {
    renderHook(() => useSignIn("/play?join=12"));
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith(`/welcome?next=${encodeURIComponent("/play?join=12")}`);
  });

  it("sends a returning player straight to where they were going", async () => {
    privy = {
      ready: true,
      authenticated: true,
      user: { id: "did:privy:own", wallet: { address: OWN_WALLET } },
    };
    readContract.mockResolvedValue("Brave Otter");
    renderHook(() => useSignIn(undefined));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/play"));
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("stays on sign in and says so when the wallet cannot be made", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    createWallet.mockRejectedValue(new Error("The wallet frame was blocked."));
    const { result } = renderHook(() => useSignIn(undefined));
    await waitFor(() => expect(result.current.state).toEqual({ kind: "choosing" }));
    expect(replace).not.toHaveBeenCalled();
  });
});
