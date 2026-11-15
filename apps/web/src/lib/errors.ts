import { bluffAbi, bluffCashierAbi, bluffInvitesAbi, chipFaucetAbi } from "@bluff/contracts";
import { RelayerRequestFailedError, SigningRejectedError, isRetryable } from "@zama-fhe/sdk";
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  TimeoutError,
  UserRejectedRequestError,
  toFunctionSelector,
} from "viem";
import { formatAbiItem } from "viem/utils";
import { errorCopy } from "./copy";

export class MoveNotReadyError extends Error {
  constructor() {
    super("The player's wallet is not ready to send a move yet.");
  }
}

export class InviteNotWorkingError extends Error {
  constructor() {
    super("The invite code did not match the table's code.");
  }
}

export type ActionProblem =
  | { kind: "cancelled"; reason: string }
  | { kind: "unsure"; reason: string }
  | { kind: "refused"; reason: string }
  | { kind: "failed"; reason: string };

type KnownReason = keyof typeof errorCopy.reasons;

function isKnownReason(name: string): name is KnownReason {
  return name in errorCopy.reasons;
}

const USER_CANCELLED_CODES = new Set([4001, "ACTION_REJECTED"]);

const RULE_BY_SELECTOR = new Map<string, string>(
  [...bluffAbi, ...bluffInvitesAbi, ...chipFaucetAbi, ...bluffCashierAbi].flatMap((item) =>
    item.type === "error" ? [[toFunctionSelector(formatAbiItem(item)), item.name] as const] : []
  )
);

function ruleInMessage(message: string): KnownReason | null {
  for (const [data] of message.matchAll(/0x[0-9a-fA-F]{8,}/g)) {
    const name = RULE_BY_SELECTOR.get(data.slice(0, 10).toLowerCase());
    if (name && isKnownReason(name)) return name;
  }
  return null;
}

export function explainProblem(error: unknown): ActionProblem {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  ) {
    return { kind: "unsure", reason: errorCopy.mayStillLand };
  }
  if (error instanceof MoveNotReadyError) return { kind: "failed", reason: errorCopy.noWallet };
  if (error instanceof InviteNotWorkingError) {
    return { kind: "failed", reason: errorCopy.inviteNotWorking };
  }
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
      if (isKnownReason(name)) return { kind: "refused", reason: errorCopy.reasons[name] };
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
  if (error instanceof Error) {
    const rule = ruleInMessage(error.message);
    if (rule) return { kind: "refused", reason: errorCopy.reasons[rule] };
  }
  if (typeof error === "string" && /exited|cancel|reject/i.test(error)) {
    return { kind: "cancelled", reason: errorCopy.cancelled };
  }
  return { kind: "failed", reason: errorCopy.generic };
}
