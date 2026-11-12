import { describe, expect, it, vi } from "vitest";
import { makeWalletOnce } from "./player-wallet";

describe("makeWalletOnce", () => {
  it("shares one wallet between requests made at the same time", async () => {
    const create = vi.fn(async () => ({ address: "0xa" }));
    const [first, second] = await Promise.all([
      makeWalletOnce("did:privy:same", create),
      makeWalletOnce("did:privy:same", create),
    ]);
    expect([first, second]).toEqual(["0xa", "0xa"]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("keeps each player's wallet separate", async () => {
    const create = vi.fn(async () => ({ address: "0xb" }));
    await makeWalletOnce("did:privy:one", create);
    await makeWalletOnce("did:privy:two", create);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("lets a failed attempt be tried again", async () => {
    const create = vi
      .fn<() => Promise<{ address: string }>>()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce({ address: "0xc" });
    await expect(makeWalletOnce("did:privy:retry", create)).rejects.toThrow("blocked");
    await expect(makeWalletOnce("did:privy:retry", create)).resolves.toBe("0xc");
    expect(create).toHaveBeenCalledTimes(2);
  });
});
