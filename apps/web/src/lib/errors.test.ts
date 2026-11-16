import { bluffAbi, bluffInvitesAbi, chipFaucetAbi } from "@bluff/contracts";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  UserRejectedRequestError,
  encodeErrorResult,
} from "viem";
import { RelayerRequestFailedError, SigningRejectedError } from "@zama-fhe/sdk";
import { describe, expect, it } from "vitest";
import { errorCopy } from "./copy";
import { InviteNotWorkingError, MoveNotReadyError, explainProblem } from "./errors";

function reverted(
  abi: typeof bluffAbi | typeof chipFaucetAbi | typeof bluffInvitesAbi,
  errorName: string,
  args: unknown[] = []
) {
  const data = encodeErrorResult({ abi, errorName, args } as Parameters<
    typeof encodeErrorResult
  >[0]);
  const cause = new ContractFunctionRevertedError({ abi, data, functionName: "move" });
  return new ContractFunctionExecutionError(cause, { abi, functionName: "move", args: [] });
}

describe("explainProblem", () => {
  it("treats a declined signature for hidden values as cancelled", () => {
    expect(explainProblem(new SigningRejectedError("declined"))).toEqual({
      kind: "cancelled",
      reason: errorCopy.cancelled,
    });
  });

  it("asks for patience when the decryption service is busy", () => {
    expect(explainProblem(new RelayerRequestFailedError("busy", 503))).toEqual({
      kind: "failed",
      reason: errorCopy.networkBusy,
    });
  });

  it("names the rule a move broke, in plain words", () => {
    expect(explainProblem(reverted(bluffAbi, "NotYourTurn", [1n, 0]))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.NotYourTurn,
    });
    expect(explainProblem(reverted(chipFaucetAbi, "ClaimTooSoon", [123n]))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.ClaimTooSoon,
    });
  });

  it("says a nickname is taken when someone else already has it", () => {
    expect(explainProblem(reverted(chipFaucetAbi, "NicknameTaken"))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.NicknameTaken,
    });
  });

  it("names the rule a sponsored move broke, when the wallet service only gives the raw data", () => {
    const data = encodeErrorResult({ abi: bluffAbi, errorName: "WrongStatus", args: [12n, 5] });
    const fromPrivy = new Error(`${data} (User operation hash: 0x${"b2".repeat(32)})`);
    expect(explainProblem(fromPrivy)).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.WrongStatus,
    });
  });

  it("never calls a move failed when the wallet service only gave up waiting for it", () => {
    const timedOut = new DOMException("signal is aborted without reason", "AbortError");
    expect(explainProblem(timedOut)).toEqual({ kind: "unsure", reason: errorCopy.mayStillLand });
  });

  it("ignores raw data that isn't one of the game's rules", () => {
    expect(explainProblem(new Error("0xdeadbeef00 went wrong"))).toEqual({
      kind: "failed",
      reason: errorCopy.generic,
    });
  });

  it("has a sentence for every game rule a player can break", () => {
    const players = [
      "NotYourTurn",
      "BidNotHigher",
      "AlreadyAtTable",
      "ClaimTooSoon",
      "InvalidAvatar",
      "TableFull",
      "NotEveryoneReady",
      "NotInvited",
      "TooManyTries",
      "NoCode",
    ];
    for (const name of players) expect(errorCopy.reasons).toHaveProperty(name);
  });

  it("tells a player without the invite to ask the host", () => {
    expect(explainProblem(reverted(bluffAbi, "NotInvited", [4n]))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.NotInvited,
    });
    expect(explainProblem(reverted(bluffInvitesAbi, "TooManyTries", [4n]))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.TooManyTries,
    });
  });

  it("says an invite link that doesn't work, in plain words", () => {
    expect(explainProblem(new InviteNotWorkingError())).toEqual({
      kind: "failed",
      reason: errorCopy.inviteNotWorking,
    });
  });

  it("says a table filled up in plain words", () => {
    expect(explainProblem(reverted(bluffAbi, "TableFull", [4n]))).toEqual({
      kind: "refused",
      reason: errorCopy.reasons.TableFull,
    });
  });

  it("treats a player cancelling in their wallet as cancelled, not an error", () => {
    const rejection = new ContractFunctionExecutionError(
      new UserRejectedRequestError(new Error("User rejected")),
      { abi: bluffAbi, functionName: "placeBid", args: [] }
    );
    expect(explainProblem(rejection)).toEqual({ kind: "cancelled", reason: errorCopy.cancelled });
    expect(explainProblem({ code: 4001 })).toEqual({
      kind: "cancelled",
      reason: errorCopy.cancelled,
    });
    expect(explainProblem("exited_auth_flow")).toEqual({
      kind: "cancelled",
      reason: errorCopy.cancelled,
    });
  });

  it("calls a network failure busy", () => {
    const failure = new ContractFunctionExecutionError(
      new HttpRequestError({ url: "https://rpc.example" }),
      { abi: bluffAbi, functionName: "placeBid", args: [] }
    );
    expect(explainProblem(failure)).toEqual({ kind: "failed", reason: errorCopy.networkBusy });
  });

  it("asks the player to wait a moment when their wallet is not ready yet", () => {
    expect(explainProblem(new MoveNotReadyError())).toEqual({
      kind: "failed",
      reason: errorCopy.noWallet,
    });
  });

  it("falls back to a general sentence for anything it does not recognise", () => {
    expect(explainProblem(new Error("boom"))).toEqual({
      kind: "failed",
      reason: errorCopy.generic,
    });
  });
});
