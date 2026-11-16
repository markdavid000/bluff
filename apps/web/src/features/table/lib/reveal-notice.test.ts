import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { revealNotice } from "./reveal-notice";

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";
const names: Record<string, string> = { [ADA]: "Ada", [KOLA]: "Kola" };
const nameOf = (player: string) => names[player] ?? "Player";

describe("revealNotice", () => {
  it("tells the bidder who called their bluff", () => {
    expect(revealNotice({ bidder: ME, caller: ADA }, ME, nameOf)).toBe(
      tableCopy.calledYourBluff("Ada")
    );
  });

  it("tells everyone else who called whose bluff", () => {
    expect(revealNotice({ bidder: KOLA, caller: ADA }, ME, nameOf)).toBe(
      tableCopy.calledBluff("Ada", "Kola")
    );
  });

  it("reminds the caller whose bluff they called", () => {
    expect(revealNotice({ bidder: ADA, caller: ME }, ME, nameOf)).toBe(
      tableCopy.youCalledBluff("Ada")
    );
  });

  it("matches the player whatever the letter case", () => {
    expect(revealNotice({ bidder: ME.toUpperCase(), caller: ADA }, ME, nameOf)).toBe(
      tableCopy.calledYourBluff("Ada")
    );
  });

  it("just says the dice are being revealed when it can't tell who called", () => {
    expect(revealNotice({ bidder: KOLA, caller: null }, ME, nameOf)).toBe(tableCopy.revealing);
    expect(revealNotice(null, ME, nameOf)).toBe(tableCopy.revealing);
  });
});
