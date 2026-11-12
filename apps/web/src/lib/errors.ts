import { RelayerRequestFailedError, SigningRejectedError, isRetryable } from "@zama-fhe/sdk";
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";
import { errorCopy } from "./copy";

export class MoveNotReadyError extends Error {
  constructor() {
    super("The player's wallet is not ready to send a move yet.");
  }
}

export type ActionProblem =
  { kind: "cancelled"; reason: string } | { kind: "failed"; reason: string };

type KnownReason = keyof typeof errorCopy.reasons;

function isKnownReason(name: string): name is KnownReason {
  return name in errorCopy.reasons;
}

const USER_CANCELLED_CODES = new Set([4001, "ACTION_REJECTED"]);

export function explainProblem(error: unknown): ActionProblem {
  if (error instanceof MoveNotReadyError) return { kind: "failed", reason: errorCopy.noWallet };
  if (error instanceof SigningRejectedError)
    return { kind: "cancelled", reason: errorCopy.cancelled };
  if (error instanceof RelayerRequestFailedError || isRetryable(error)) {
    return { kind: "failed", reason: errorCopy.networkBusy };
  }
  if (error instanceof BaseError) {
    if (error.walk((cause) => cause instanceof UserRejectedRequestError)) {
      return { kind: "cancelled", reason: errorCopy.cancelled };
    }
    const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName ?? "";
      if (isKnownReason(name)) return { kind: "failed", reason: errorCopy.reasons[name] };
    }
    if (error.walk((cause) => cause instanceof HttpRequestError || cause instanceof TimeoutError)) {
      return { kind: "failed", reason: errorCopy.networkBusy };
    }
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (USER_CANCELLED_CODES.has(code as number | string)) {
      return { kind: "cancelled", reason: errorCopy.cancelled };
    }
  }
  if (typeof error === "string" && /exited|cancel|reject/i.test(error)) {
    return { kind: "cancelled", reason: errorCopy.cancelled };
  }
  return { kind: "failed", reason: errorCopy.generic };
}
