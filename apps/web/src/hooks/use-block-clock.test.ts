import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFollowChain } from "./use-block-clock";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const watch = vi.fn();
vi.mock("wagmi", () => ({ useWatchBlockNumber: (options: unknown) => watch(options) }));

describe("useFollowChain", () => {
  it("catches up with the chain as soon as a page starts following it", () => {
    renderHook(() => useFollowChain());
    expect(watch).toHaveBeenCalledWith(expect.objectContaining({ emitOnBegin: true }));
  });
});
