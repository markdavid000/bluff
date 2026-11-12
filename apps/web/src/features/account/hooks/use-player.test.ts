import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlayer } from "./use-player";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const refetch = vi.fn();
let profile: Record<string, unknown> = {};

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: true, user: { wallet: { address: ACCOUNT } } }),
}));
vi.mock("wagmi", () => ({ useReadContracts: () => ({ refetch, ...profile }) }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePlayer", () => {
  it("is loading while the profile is read", () => {
    profile = { isPending: true, isError: false, data: undefined };
    expect(renderHook(() => usePlayer()).result.current.status).toBe("loading");
  });

  it("reports a failed profile read instead of loading forever", () => {
    profile = { isPending: false, isError: true, data: undefined };
    const { result } = renderHook(() => usePlayer());
    expect(result.current.status).toBe("failed");
    result.current.refresh();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("is ready with the saved name and face", () => {
    profile = { isPending: false, isError: false, data: ["Dave", [3, ""]] };
    const { result } = renderHook(() => usePlayer());
    expect(result.current).toMatchObject({ status: "ready", nickname: "Dave", avatar: 3 });
  });
});
