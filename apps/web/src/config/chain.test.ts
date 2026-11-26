import { afterEach, describe, expect, it, vi } from "vitest";
import { gameClient } from "./chain";

vi.mock("./env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameClient", () => {
  it("tries each node at most twice when a read keeps failing, rather than fanning out", async () => {
    const fetch = vi.fn(
      async (_input: string | URL | Request) => new Response("busy", { status: 503 })
    );
    vi.stubGlobal("fetch", fetch);
    await expect(gameClient.getBlockNumber({ cacheTime: 0 })).rejects.toThrow();
    const hosts = fetch.mock.calls.map(([url]) => new URL(String(url)).host);
    expect(hosts.filter((host) => host === "127.0.0.1:8545")).toHaveLength(2);
    expect(hosts.filter((host) => host === "ethereum-sepolia-rpc.publicnode.com")).toHaveLength(2);
  }, 15_000);
});
