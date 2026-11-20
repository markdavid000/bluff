import { bluffAbi } from "@bluff/contracts";
import {
  BaseError,
  CallExecutionError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  RawContractError,
  encodeErrorResult,
} from "viem";
import { describe, expect, it } from "vitest";
import { revertName } from "./revert";

function reverted(
  errorName: "TableFull" | "WrongStatus" | "TableNotFound",
  args: readonly unknown[]
) {
  const data = encodeErrorResult({ abi: bluffAbi, errorName, args } as Parameters<
    typeof encodeErrorResult
  >[0]);
  const cause = new ContractFunctionRevertedError({
    abi: bluffAbi,
    data,
    functionName: "joinFreeTable",
  });
  return new ContractFunctionExecutionError(cause, {
    abi: bluffAbi,
    functionName: "joinFreeTable",
    args: [12n],
  });
}

describe("revertName", () => {
  it("reads which rule the game used to refuse a move", () => {
    expect(revertName(reverted("TableFull", [12n]))).toBe("TableFull");
    expect(revertName(reverted("WrongStatus", [12n, 3]))).toBe("WrongStatus");
    expect(revertName(reverted("TableNotFound", [12n]))).toBe("TableNotFound");
  });

  it("reads the rule from a dry run's raw error too", () => {
    const data = encodeErrorResult({ abi: bluffAbi, errorName: "TableFull", args: [12n] });
    const error = new CallExecutionError(new RawContractError({ data }), {});
    expect(revertName(error)).toBe("TableFull");
  });

  it("finds nothing in an error that isn't the game refusing", () => {
    expect(revertName(new Error("network down"))).toBeNull();
    expect(revertName(new BaseError("timed out"))).toBeNull();
  });
});
