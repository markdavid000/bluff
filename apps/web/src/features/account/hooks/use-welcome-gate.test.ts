import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arriveAtTable, takeSeatWhileHere } from "@/hooks/use-go-to-table";
import { useWelcomeGate } from "./use-welcome-gate";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/play",
}));
vi.mock("./use-player", () => ({
  usePlayer: () => ({ status: "ready", nickname: "Mark", refresh: vi.fn() }),
}));
let seatId: bigint | null = null;
vi.mock("@/hooks/use-my-table-id", () => ({
  useMyTableId: () => ({ status: "ready", id: seatId }),
}));
vi.mock("@/hooks/use-left-tables", () => ({
  forgetGoneSeats: vi.fn(),
  useIsSeatGone: () => false,
}));
vi.mock("../lib/session-client", () => ({ closeSession: vi.fn() }));

afterEach(() => {
  seatId = null;
  arriveAtTable();
  vi.clearAllMocks();
});

describe("useWelcomeGate", () => {
  it("takes a seated player back to their table", () => {
    seatId = 40n;
    renderHook(() => useWelcomeGate());
    expect(replace).toHaveBeenCalledWith("/table/40");
  });

  it("leaves the player in the lobby while their own seat is still landing, even once the chain shows it", async () => {
    let land: (id: bigint) => void = () => undefined;
    let seated: Promise<bigint> = Promise.resolve(0n);
    act(() => {
      seated = takeSeatWhileHere(() => new Promise<bigint>((resolve) => (land = resolve)));
    });
    seatId = 41n;
    const gate = renderHook(() => useWelcomeGate());
    gate.rerender();
    expect(replace).not.toHaveBeenCalled();
    expect(gate.result.current.view).toBe("page");
    await act(async () => {
      land(41n);
      await seated;
    });
    gate.rerender();
    expect(replace).not.toHaveBeenCalled();
  });
});
