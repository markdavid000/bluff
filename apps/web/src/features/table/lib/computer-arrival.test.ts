import { describe, expect, it } from "vitest";
import { COMPUTER_PLAYERS } from "@/config/computer-players";
import type { ComputerCall } from "@/hooks/use-computer-call";
import { tableCopy } from "../copy";
import { type ArrivalTable, computerArrival } from "./computer-arrival";

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const BABA = COMPUTER_PLAYERS[0] ?? ADA;

function call(change: Partial<ComputerCall> = {}): ComputerCall {
  return { tableId: 12n, phase: "asking", outcome: null, ...change };
}

function table(
  seats: { player: string; ready: boolean }[] = [{ player: ME, ready: false }],
  status: ArrivalTable["status"] = "waiting"
): ArrivalTable {
  return { id: 12n, status, seats };
}

describe("computerArrival", () => {
  it("says nothing when no computer was called to this table", () => {
    expect(computerArrival(null, table())).toEqual({ kind: "none" });
    expect(computerArrival(call({ tableId: 7n }), table())).toEqual({ kind: "none" });
    expect(computerArrival(call(), null)).toEqual({ kind: "none" });
  });

  it("says the computer is joining until it sits down", () => {
    expect(computerArrival(call(), table())).toEqual({
      kind: "working",
      message: tableCopy.computerJoining,
    });
    expect(
      computerArrival(call({ phase: "answered", outcome: { kind: "seated" } }), table())
    ).toEqual({ kind: "working", message: tableCopy.computerJoining });
  });

  it("says the computer is waking while a sleeping service starts", () => {
    expect(computerArrival(call({ phase: "waking" }), table())).toEqual({
      kind: "working",
      message: tableCopy.computerWaking,
    });
  });

  it("says the computer is getting ready once it has sat down", () => {
    expect(
      computerArrival(
        call(),
        table([
          { player: ME, ready: false },
          { player: BABA, ready: false },
        ])
      )
    ).toEqual({ kind: "working", message: tableCopy.computerGettingReady });
  });

  it("is done once the computer is ready", () => {
    expect(
      computerArrival(
        call(),
        table([
          { player: ME, ready: false },
          { player: BABA, ready: true },
        ])
      )
    ).toEqual({ kind: "arrived" });
  });

  it("is done if the table stops waiting", () => {
    expect(computerArrival(call(), table(undefined, "cancelled"))).toEqual({ kind: "arrived" });
  });

  it("passes on why the computer isn't coming", () => {
    expect(
      computerArrival(call({ phase: "answered", outcome: { kind: "busy" } }), table())
    ).toEqual({ kind: "refused", message: tableCopy.computerOutcome.busy });
    expect(
      computerArrival(
        call({ phase: "answered", outcome: { kind: "taken" } }),
        table([
          { player: ME, ready: false },
          { player: ADA, ready: false },
        ])
      )
    ).toEqual({ kind: "refused", message: tableCopy.computerOutcome.taken });
  });
});
