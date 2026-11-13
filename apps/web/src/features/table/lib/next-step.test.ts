import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { nextStep } from "./next-step";
import type { Table, TableStatus } from "./table-view";

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const ADA = "0x0000000000000000000000000000000000005e6f";
const BOLA = "0x0000000000000000000000000000000000007a8b";
const NAMES: Record<string, string> = {
  [KOLA]: "Kola",
  [ADA]: "Ada",
  [BOLA]: "Bola",
  [HOST]: "Dave",
};
const nameOf = (address: string) => NAMES[address] ?? "?";

function table(status: TableStatus, seats: [string, boolean][], seatCount = 4): Table {
  return {
    id: 12n,
    host: HOST,
    status,
    isPrivate: false,
    seatCount,
    buyIn: 0n,
    deadline: 0,
    seats: seats.map(([player, ready]) => ({
      player: player as `0x${string}`,
      ready,
      isHost: player === HOST,
      isActive: true,
    })),
  };
}

describe("nextStep", () => {
  it("waits for a second player first", () => {
    expect(nextStep(table("waiting", [[HOST, false]]), "host", HOST, nameOf)).toBe(
      tableCopy.waitingForPlayers(1)
    );
  });

  it("names who still has to get ready", () => {
    const seats: [string, boolean][] = [
      [HOST, false],
      [KOLA, true],
      [ADA, false],
    ];
    expect(nextStep(table("waiting", seats), "host", HOST, nameOf)).toBe(
      tableCopy.waitingOn("Ada")
    );
  });

  it("names several players naturally", () => {
    const seats: [string, boolean][] = [
      [HOST, false],
      [KOLA, false],
      [ADA, false],
    ];
    expect(nextStep(table("waiting", seats), "host", HOST, nameOf)).toBe(
      tableCopy.waitingOn("Kola and Ada")
    );
  });

  it("speaks to the player who is not ready yet", () => {
    const seats: [string, boolean][] = [
      [HOST, false],
      [KOLA, false],
      [ADA, true],
    ];
    expect(nextStep(table("waiting", seats), "guest", KOLA, nameOf)).toBe(
      tableCopy.waitingOn("you")
    );
  });

  it("names all three guests at a full table of four", () => {
    const seats: [string, boolean][] = [
      [HOST, false],
      [KOLA, false],
      [ADA, false],
      [BOLA, false],
    ];
    expect(nextStep(table("waiting", seats, 4), "host", HOST, nameOf)).toBe(
      tableCopy.waitingOn("Kola, Ada and Bola")
    );
  });

  it("tells the host to start once everyone else is ready", () => {
    const seats: [string, boolean][] = [
      [HOST, false],
      [KOLA, true],
    ];
    expect(nextStep(table("waiting", seats), "host", HOST, nameOf)).toBe(tableCopy.startWhenReady);
    expect(nextStep(table("waiting", seats), "guest", KOLA, nameOf)).toBe(tableCopy.hostWillStart);
  });

  it.each<[TableStatus, string]>([
    ["verifying", tableCopy.checkingPaid],
    ["playing", tableCopy.gameOn],
    ["revealing", tableCopy.gameOn],
    ["finished", tableCopy.closed],
    ["cancelled", tableCopy.closed],
  ])("describes a %s table", (status, words) => {
    expect(
      nextStep(
        table(status, [
          [HOST, false],
          [KOLA, true],
        ]),
        "host",
        HOST,
        nameOf
      )
    ).toBe(words);
  });
});
