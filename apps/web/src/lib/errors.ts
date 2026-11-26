import { bluffAbi, bluffCashierAbi, bluffInvitesAbi, chipFaucetAbi } from "@bluff/contracts";
import { RelayerRequestFailedError, SigningRejectedError, isRetryable } from "@zama-fhe/sdk";
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  ProviderDisconnectedError,
  TimeoutError,
  UnauthorizedProviderError,
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

export class CashOutWaitingError extends Error {
  constructor() {
    super("An earlier cash out is still open, so a new one was not started.");
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

const WALLET_NOT_CONNECTED = new Set([
  "ConnectorNotConnectedError",
  "ConnectorNotFoundError",
  "ConnectorAccountNotFoundError",
  "ConnectorUnavailableReconnectingError",
]);

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

const UNCLEAR_REFUSAL = "Execution reverted for an unknown reason";

export function refusedWithoutReason(error: unknown): boolean {
  return error instanceof Error && error.message.includes(UNCLEAR_REFUSAL);
}

export function mayStillLand(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

function walletNotConnected(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    WALLET_NOT_CONNECTED.has(error.name)
  );
}

export function explainProblem(error: unknown): ActionProblem {
  if (mayStillLand(error)) return { kind: "unsure", reason: errorCopy.mayStillLand };
  if (refusedWithoutReason(error)) return { kind: "failed", reason: errorCopy.networkBusy };
  if (walletNotConnected(error)) return { kind: "failed", reason: errorCopy.walletNotConnected };
  if (error instanceof MoveNotReadyError) return { kind: "failed", reason: errorCopy.noWallet };
  if (error instanceof CashOutWaitingError) {
    return { kind: "failed", reason: errorCopy.finishCashOutFirst };
  }
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
    if (error.walk((cause) => cause instanceof InsufficientFundsError)) {
      return { kind: "failed", reason: errorCopy.walletNeedsCoins };
    }
    if (
      error.walk(
        (cause) =>
          cause instanceof UnauthorizedProviderError || cause instanceof ProviderDisconnectedError
      )
    ) {
      return { kind: "failed", reason: errorCopy.walletNotConnected };
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
