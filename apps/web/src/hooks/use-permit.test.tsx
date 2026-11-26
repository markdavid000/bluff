import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePermit } from "./use-permit";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const { HAS_PERMIT } = vi.hoisted(() => ({ HAS_PERMIT: ["zama.hasPermit"] as const }));
const sign = vi.fn();
const switchChain = vi.fn();
let stored = false;
let checkFails = false;
let walletClientType = "privy";
let walletChainId: number | undefined = 11155111;
let connectedAddress: string | undefined = "0x1";
let connectionStatus = "connected";

const sdk = {};

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: "0x1", walletClientType } } }),
}));
vi.mock("wagmi", () => ({
  useConnection: () => ({
    chainId: walletChainId,
    address: connectedAddress,
    status: connectionStatus,
  }),
  useSwitchChain: () => ({ mutateAsync: switchChain }),
}));
vi.mock("@zama-fhe/sdk/query", () => ({
  zamaQueryKeys: { hasPermit: { all: HAS_PERMIT } },
  hasPermitQueryOptions: () => ({
    queryKey: [...HAS_PERMIT, "0x1"],
    queryFn: async () => stored,
  }),
  grantPermitMutationOptions: () => ({
    mutationFn: async (contracts: string[]) => {
      await sign(contracts);
      stored = true;
    },
  }),
}));
vi.mock("@zama-fhe/react-sdk", () => ({
  useZamaSDK: () => sdk,
  useHasPermit: () =>
    useQuery({
      queryKey: [...HAS_PERMIT, "0x1"],
      queryFn: async () => {
        if (checkFails) throw new Error("check failed");
        return stored;
      },
      retry: false,
    }),
  useGrantPermit: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (contracts: string[]) => {
        await sign(contracts);
        stored = true;
      },
      onSuccess: () => queryClient.removeQueries({ queryKey: HAS_PERMIT }),
    });
  },
}));

function render(automatic: boolean, queryClient = new QueryClient()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => usePermit({ working: "Opening", automatic }), { wrapper: Wrapper });
}

beforeEach(() => {
  stored = false;
  checkFails = false;
  walletClientType = "privy";
  walletChainId = 11155111;
  connectedAddress = "0x1";
  connectionStatus = "connected";
  sign.mockResolvedValue(undefined);
  switchChain.mockImplementation(async ({ chainId }: { chainId: number }) => {
    walletChainId = chainId;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePermit", () => {
  it("offers to try again when it can't check, instead of loading forever", async () => {
    checkFails = true;
    const { result } = render(false);
    await waitFor(() => expect(result.current.status).toBe("failed"));
    checkFails = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("needed"));
  });

  it("signs once, without asking, for a wallet Bluff made", async () => {
    const { result, rerender } = render(true);
    rerender();
    rerender();
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(sign).toHaveBeenCalledOnce();
    expect(sign.mock.calls[0]?.[0]).toHaveLength(3);
  });

  it("waits for a tap before asking a player's own wallet", async () => {
    walletClientType = "metamask";
    const { result } = render(true);
    await waitFor(() => expect(result.current.status).toBe("needed"));
    expect(sign).not.toHaveBeenCalled();
    act(() => result.current.grant());
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(sign).toHaveBeenCalledOnce();
  });

  it("leaves signing to the one place that asks for it", async () => {
    const { result } = render(false);
    await waitFor(() => expect(result.current.status).toBe("needed"));
    expect(sign).not.toHaveBeenCalled();
  });

  it("tells every part of the screen once the chips are opened, not just the one tapped", async () => {
    walletClientType = "metamask";
    const queryClient = new QueryClient();
    const header = render(false, queryClient);
    const card = render(false, queryClient);
    await waitFor(() => expect(header.result.current.status).toBe("needed"));
    await waitFor(() => expect(card.result.current.status).toBe("needed"));

    act(() => card.result.current.grant());

    await waitFor(() => expect(card.result.current.status).toBe("granted"));
    await waitFor(() => expect(header.result.current.status).toBe("granted"));
  });

  it("moves a player's own wallet to the game's network before asking it to sign", async () => {
    walletClientType = "metamask";
    walletChainId = 1;
    sign.mockImplementation(async () => {
      if (walletChainId !== 11155111)
        throw new Error("Provided chainId must match the active chainId");
    });
    const { result } = render(false);
    await waitFor(() => expect(result.current.status).toBe("needed"));
    act(() => result.current.grant());
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(switchChain).toHaveBeenCalledWith({ chainId: 11155111 });
  });

  it("never asks a different wallet to sign for the player's chips", async () => {
    connectedAddress = "0x000000000000000000000000000000000000cafe";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = render(true);
    act(() => result.current.grant());
    await waitFor(() => expect(result.current.granting).toBe(false));
    expect(sign).not.toHaveBeenCalled();
    expect(result.current.status).toBe("checking");
  });

  it("waits for the wallet to finish reconnecting before signing", async () => {
    connectionStatus = "reconnecting";
    const queryClient = new QueryClient();
    const { result, rerender } = render(true, queryClient);
    await waitFor(() =>
      expect(queryClient.getQueryState([...HAS_PERMIT, "0x1"])?.status).toBe("success")
    );
    await act(() => new Promise((settle) => setTimeout(settle, 20)));
    expect(sign).not.toHaveBeenCalled();
    expect(result.current.status).toBe("checking");
    connectionStatus = "connected";
    rerender();
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(sign).toHaveBeenCalledOnce();
  });
});
