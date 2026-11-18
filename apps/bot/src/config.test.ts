import { describe, expect, it } from "vitest";
import { readConfig } from "./config";

const PHRASE = "test test test test test test test test test test test junk";
const VALID = {
  BOT_MNEMONIC: PHRASE,
  SEPOLIA_RPC_URL: "https://sepolia.example/v2/key",
  ALLOWED_ORIGINS: "http://localhost:3000, https://bluff.example",
};

describe("readConfig", () => {
  it("reads a complete environment, with the defaults filled in", () => {
    expect(readConfig(VALID)).toEqual({
      mnemonic: PHRASE,
      rpcUrl: "https://sepolia.example/v2/key",
      allowedOrigins: ["http://localhost:3000", "https://bluff.example"],
      maxPlayers: 20,
      port: 8080,
    });
  });

  it("takes the player cap and port when they're given", () => {
    expect(readConfig({ ...VALID, BOT_MAX_PLAYERS: "5", PORT: "3100" })).toMatchObject({
      maxPlayers: 5,
      port: 3100,
    });
  });

  it("refuses to start without what it needs, naming every problem", () => {
    expect(() => readConfig({})).toThrow(/BOT_MNEMONIC.*SEPOLIA_RPC_URL.*ALLOWED_ORIGINS/s);
  });

  it.each([
    ["a phrase that isn't a real secret phrase", { BOT_MNEMONIC: "not a phrase" }, /BOT_MNEMONIC/],
    [
      "an RPC address that isn't https",
      { SEPOLIA_RPC_URL: "http://sepolia.example" },
      /SEPOLIA_RPC_URL/,
    ],
    ["an allowed site that isn't a site", { ALLOWED_ORIGINS: "localhost" }, /ALLOWED_ORIGINS/],
    ["a player cap of 0", { BOT_MAX_PLAYERS: "0" }, /BOT_MAX_PLAYERS/],
    ["a player cap over the 24 names", { BOT_MAX_PLAYERS: "25" }, /BOT_MAX_PLAYERS/],
    ["a port that isn't a number", { PORT: "web" }, /PORT/],
  ])("refuses %s", (_name, change, problem) => {
    expect(() => readConfig({ ...VALID, ...change })).toThrow(problem);
  });

  it("never repeats the secret phrase or the RPC key in its errors", () => {
    const broken = {
      ...VALID,
      BOT_MNEMONIC: "secret words that are wrong",
      SEPOLIA_RPC_URL: "ftp://x/key-123",
    };
    let message = "";
    try {
      readConfig(broken);
    } catch (error) {
      message = String(error);
    }
    expect(message).toMatch(/BOT_MNEMONIC/);
    expect(message).not.toMatch(/secret words/);
    expect(message).not.toMatch(/key-123/);
  });
});
