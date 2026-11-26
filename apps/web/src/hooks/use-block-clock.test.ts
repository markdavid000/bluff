import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFollowChain } from "./use-block-clock";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const watch = vi.fn();
vi.mock("wagmi", () => ({ useWatchBlockNumber: (options: unknown) => watch(options) }));

let state: DocumentVisibilityState = "visible";
vi.spyOn(document, "visibilityState", "get").mockImplementation(() => state);

afterEach(() => {
  state = "visible";
  vi.clearAllMocks();
});

describe("useFollowChain", () => {
  it("catches up with the chain as soon as a page starts following it", () => {
    renderHook(() => useFollowChain());
    expect(watch).toHaveBeenCalledWith(expect.objectContaining({ emitOnBegin: true }));
  });

  it("stops asking for new blocks while the tab is hidden, and catches up when it is shown", () => {
    renderHook(() => useFollowChain());
    expect(watch).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    act(() => {
      state = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(watch).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    act(() => {
      state = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(watch).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, emitOnBegin: true })
    );
  });
});
