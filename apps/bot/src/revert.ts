import { bluffAbi, chipFaucetAbi } from "@bluff/contracts";
import {
  BaseError,
  ContractFunctionRevertedError,
  RawContractError,
  decodeErrorResult,
  isHex,
} from "viem";

const GAME_ERRORS = [...bluffAbi, ...chipFaucetAbi].filter((item) => item.type === "error");
const SELECTOR_LENGTH = 10;

function rawErrorName(data: unknown): string | null {
  if (!isHex(data) || data.length < SELECTOR_LENGTH) return null;
  try {
    return decodeErrorResult({ abi: GAME_ERRORS, data }).errorName;
  } catch (error) {
    if (error instanceof BaseError) return null;
    throw error;
  }
}

export function revertName(error: unknown): string | null {
  if (!(error instanceof BaseError)) return null;
  const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
  if (reverted instanceof ContractFunctionRevertedError) return reverted.data?.errorName ?? null;
  const raw = error.walk((cause) => cause instanceof RawContractError);
  if (!(raw instanceof RawContractError)) return null;
  return rawErrorName(typeof raw.data === "object" ? raw.data.data : raw.data);
}
