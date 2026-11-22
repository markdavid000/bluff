import { describe, expect, it } from "vitest";
import { COMPUTER_PLAYERS } from "@/config/computer-players";
import { isComputerPlayer } from "./computer-players";

describe("isComputerPlayer", () => {
  it("knows all twenty computer players, whatever the letter case", () => {
    expect(new Set(COMPUTER_PLAYERS.map((address) => address.toLowerCase())).size).toBe(20);
    for (const address of COMPUTER_PLAYERS) {
      expect(isComputerPlayer(address)).toBe(true);
      expect(isComputerPlayer(address.toLowerCase())).toBe(true);
    }
  });

  it("treats everyone else as a person", () => {
    expect(isComputerPlayer("0xa65e5ca50ece62d908dfabca6db2466de5167bac")).toBe(false);
    expect(isComputerPlayer("0x0000000000000000000000000000000000000000")).toBe(false);
  });
});
