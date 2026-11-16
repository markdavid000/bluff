import { describe, expect, it } from "vitest";
import { type NewTable, newTableOffer } from "./play-again";

const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";
const STRANGER = "0x0000000000000000000000000000000000007a8b";

const LAST = {
  id: 12n,
  seatCount: 2,
  buyIn: 0n,
  startedAt: 1_000_000,
  players: [ADA, KOLA],
};

function table(overrides: Partial<NewTable> = {}): NewTable {
  return {
    id: 20n,
    host: ADA,
    status: "waiting",
    seatCount: 2,
    seatsTaken: 1,
    buyIn: 0n,
    isPrivate: false,
    createdAt: 1_200_000,
    ...overrides,
  };
}

describe("newTableOffer", () => {
  it("offers the new table a player from the last game set up with the same settings", () => {
    expect(newTableOffer([table()], LAST)).toEqual({
      id: 20n,
      host: ADA,
      buyIn: 0n,
      isPrivate: false,
    });
  });

  it("offers it even when the player found sits at someone else's new table", () => {
    expect(newTableOffer([table({ host: KOLA })], LAST)?.host).toBe(KOLA);
  });

  it.each([
    ["the old table", { id: 12n }],
    ["different seats", { seatCount: 3 as const }],
    ["a different buy-in", { buyIn: 10n }],
    ["a table that already started", { status: "playing" as const }],
    ["a cancelled table", { status: "cancelled" as const }],
    ["a full table", { seatsTaken: 2 }],
    ["a table made before this game began", { createdAt: 900_000 }],
    ["a table hosted by someone who wasn't in the game", { host: STRANGER }],
  ])("ignores %s", (_case, overrides) => {
    expect(newTableOffer([table(overrides)], LAST)).toBeNull();
  });

  it("keeps a private table private in the offer", () => {
    expect(newTableOffer([table({ isPrivate: true })], LAST)?.isPrivate).toBe(true);
  });

  it("offers nothing when nobody has moved on yet", () => {
    expect(newTableOffer([], LAST)).toBeNull();
  });
});
