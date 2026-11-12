import { describe, expect, it } from "vitest";
import { activeWalletFor } from "./active-wallet";

const BLUFF_WALLET = {
  address: "0x00000000000000000000000000000000000B1FF0",
  walletClientType: "privy",
};
const METAMASK = {
  address: "0x000000000000000000000000000000000000CAFE",
  walletClientType: "metamask",
};

describe("activeWalletFor", () => {
  it("uses the wallet Bluff made for a Google or email player, even with MetaMask installed", () => {
    const user = { wallet: { address: BLUFF_WALLET.address.toLowerCase() } };
    expect(activeWalletFor({ wallets: [METAMASK, BLUFF_WALLET], user })).toBe(BLUFF_WALLET);
  });

  it("uses the player's own wallet when they signed in with it", () => {
    const user = { wallet: { address: METAMASK.address } };
    expect(activeWalletFor({ wallets: [BLUFF_WALLET, METAMASK], user })).toBe(METAMASK);
  });

  it("uses no wallet when the signed-in one is not ready yet", () => {
    const user = { wallet: { address: BLUFF_WALLET.address } };
    expect(activeWalletFor({ wallets: [METAMASK], user })).toBeUndefined();
  });

  it("uses no wallet when nobody is signed in", () => {
    expect(activeWalletFor({ wallets: [METAMASK], user: null })).toBeUndefined();
  });
});
