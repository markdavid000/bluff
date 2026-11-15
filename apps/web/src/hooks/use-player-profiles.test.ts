import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarSource } from "@/lib/avatar";
import { usePlayerProfiles } from "./use-player-profiles";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const KOLA = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const refetch = vi.fn();
let read: Record<string, unknown> = {};
const asked: unknown[] = [];

vi.mock("wagmi", () => ({
  useReadContracts: (request: { contracts: unknown[] }) => {
    asked.push(request.contracts);
    return { refetch, ...read };
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  asked.length = 0;
});

describe("usePlayerProfiles", () => {
  it("is loading while the names are read", () => {
    read = { isPending: true, isError: false, data: undefined };
    expect(renderHook(() => usePlayerProfiles([KOLA], "Player")).result.current.status).toBe(
      "loading"
    );
  });

  it("keeps the names and faces when a later refresh fails", () => {
    read = { isPending: false, isError: true, data: ["Kola", [4, ""]] };
    expect(renderHook(() => usePlayerProfiles([KOLA], "Player")).result.current.status).toBe(
      "ready"
    );
  });

  it("names every player and gives each a face, with a tag to tell them apart", () => {
    read = { isPending: false, isError: false, data: ["Kola", [4, ""], "", [0, ""]] };
    const { result } = renderHook(() => usePlayerProfiles([KOLA, ADA], "Player"));
    expect(result.current).toMatchObject({ status: "ready" });
    if (result.current.status !== "ready") throw new Error("Expected names.");
    expect(result.current.profileOf(KOLA)).toEqual({
      address: KOLA,
      nickname: "Kola",
      name: "Kola #1A2B",
      avatarSrc: avatarSource(4, KOLA),
    });
    expect(result.current.profileOf(ADA.toUpperCase().replace("0X", "0x"))?.name).toBe(
      "Player #3C4D"
    );
    expect(asked[0]).toHaveLength(4);
  });

  it("reports a failed read with a way to try again, instead of making names up", () => {
    read = { isPending: false, isError: true, data: undefined };
    const { result } = renderHook(() => usePlayerProfiles([KOLA], "Player"));
    expect(result.current.status).toBe("failed");
    if (result.current.status !== "failed") throw new Error("Expected a failure.");
    result.current.retry();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("is ready at once with nobody to name", () => {
    read = { isPending: true, isError: false, data: undefined };
    expect(renderHook(() => usePlayerProfiles([], "Player")).result.current.status).toBe("ready");
  });

  it("never puts the last answer's names on a changed table while the new one loads", () => {
    read = { isPending: false, isError: false, isPlaceholderData: true, data: ["Kola", [4, ""]] };
    const { result } = renderHook(() => usePlayerProfiles([KOLA, ADA], "Player"));
    expect(result.current.status).toBe("loading");
  });

  it("reports an answer in the wrong shape as a failure instead of guessing", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    read = { isPending: false, isError: false, data: ["Kola"] };
    const { result } = renderHook(() => usePlayerProfiles([KOLA], "Player"));
    expect(result.current.status).toBe("failed");
  });
});
