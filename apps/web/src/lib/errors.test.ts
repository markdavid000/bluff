import { chipFaucetAbi, bluffAbi } from "@bluff/contracts";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  UserRejectedRequestError,
  encodeErrorResult,
} from "viem";
import { describe, expect, it } from "vitest";
import { errorCopy } from "./copy";
import { MoveNotReadyError, explainProblem } from "./errors";

function reverted(
  abi: typeof bluffAbi | typeof chipFaucetAbi,
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
  it("names the rule a move broke, in plain words", () => {
    expect(explainProblem(reverted(bluffAbi, "NotYourTurn", [1n, 0]))).toEqual({
      kind: "failed",
      reason: errorCopy.reasons.NotYourTurn,
    });
    expect(explainProblem(reverted(chipFaucetAbi, "ClaimTooSoon", [123n]))).toEqual({
      kind: "failed",
      reason: errorCopy.reasons.ClaimTooSoon,
    });
  });

  it("has a sentence for every game rule a player can break", () => {
    const players = [
      "NotYourTurn",
      "BidNotHigher",
      "AlreadyAtTable",
      "ClaimTooSoon",
      "InvalidAvatar",
    ];
    for (const name of players) expect(errorCopy.reasons).toHaveProperty(name);
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
