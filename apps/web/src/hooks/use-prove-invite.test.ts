import { bluffInvitesAbi } from "@bluff/contracts";
import { renderHook } from "@testing-library/react";
import { encodeEventTopics, zeroHash } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { InviteNotWorkingError, MoveNotReadyError } from "@/lib/errors";
import { useProveInvite } from "./use-prove-invite";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000003c4d" as const;
const TABLE = 182915736201844n;
const CODE = 98765n;
const ATTEMPT = `0x${"ab".repeat(32)}`;
const TRY_BLOCK = 700n;
const CONFIRM_BLOCK = 701n;

let me: `0x${string}` | undefined = ME;
let invited = false;
let waiting: string = zeroHash;
const readContract = vi.fn();
const encrypt = vi.fn();
const decryptPublic = vi.fn();
const sendMove = vi.fn();
const report = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: me ? { wallet: { address: me } } : null }),
}));
vi.mock("wagmi", () => ({ usePublicClient: () => ({ readContract }) }));
vi.mock("@zama-fhe/react-sdk", () => ({
  useEncrypt: () => ({ mutateAsync: encrypt }),
  useDecryptPublicValues: () => ({ mutateAsync: decryptPublic }),
}));
vi.mock("./use-send-move", () => ({ useSendMove: () => sendMove }));

function answerLog(eventName: "Invited" | "CodeRejected", player: `0x${string}` = ME) {
  return {
    address: contracts.invites,
    topics: encodeEventTopics({ abi: bluffInvitesAbi, eventName, args: { id: TABLE, player } }),
    data: "0x",
    blockNumber: CONFIRM_BLOCK,
    logIndex: 0,
    transactionHash: zeroHash,
    transactionIndex: 0,
    blockHash: zeroHash,
    removed: false,
  };
}

function prove() {
  const { result } = renderHook(() => useProveInvite());
  return result.current(TABLE, CODE, report);
}

beforeEach(() => {
  me = ME;
  invited = false;
  waiting = zeroHash;
  readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName === "isInvited") return invited;
    if (functionName === "attemptOf") return waiting;
    throw new Error(`Unexpected read ${functionName}`);
  });
  encrypt.mockResolvedValue({ encryptedValues: ["0xhandle"], inputProof: "0xproof" });
  decryptPublic.mockResolvedValue({ abiEncodedClearValues: "0x01", decryptionProof: "0x02" });
  sendMove.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName === "tryCode") {
      waiting = ATTEMPT;
      return { blockNumber: TRY_BLOCK, logs: [] };
    }
    return { blockNumber: CONFIRM_BLOCK, logs: [answerLog("Invited")] };
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useProveInvite", () => {
  it("sends the code sealed, reveals only the answer, and confirms it", async () => {
    await expect(prove()).resolves.toBeUndefined();
    expect(encrypt).toHaveBeenCalledWith({
      values: [{ type: "euint64", value: CODE }],
      contractAddress: contracts.invites,
      userAddress: ME,
    });
    expect(sendMove).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        address: contracts.invites,
        functionName: "tryCode",
        args: [TABLE, "0xhandle", "0xproof"],
      }),
      report
    );
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "attemptOf", blockNumber: TRY_BLOCK })
    );
    expect(decryptPublic).toHaveBeenCalledWith([ATTEMPT]);
    expect(sendMove).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        address: contracts.invites,
        functionName: "confirmCode",
        args: [TABLE, ME, "0x01", "0x02"],
      }),
      report
    );
  });

  it("does nothing for a player who is already invited", async () => {
    invited = true;
    await prove();
    expect(encrypt).not.toHaveBeenCalled();
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("picks up a try already on its way after a reload, instead of using another", async () => {
    waiting = ATTEMPT;
    await prove();
    expect(encrypt).not.toHaveBeenCalled();
    expect(sendMove).toHaveBeenCalledOnce();
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "confirmCode" }),
      report
    );
  });

  it("says the link doesn't work when the code was wrong", async () => {
    sendMove.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "tryCode") {
        waiting = ATTEMPT;
        return { blockNumber: TRY_BLOCK, logs: [] };
      }
      return { blockNumber: CONFIRM_BLOCK, logs: [answerLog("CodeRejected")] };
    });
    await expect(prove()).rejects.toBeInstanceOf(InviteNotWorkingError);
  });

  it("only believes an answer about this player", async () => {
    sendMove.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "tryCode") {
        waiting = ATTEMPT;
        return { blockNumber: TRY_BLOCK, logs: [] };
      }
      return {
        blockNumber: CONFIRM_BLOCK,
        logs: [answerLog("Invited", "0x0000000000000000000000000000000000009f9f")],
      };
    });
    await expect(prove()).rejects.toBeInstanceOf(InviteNotWorkingError);
  });

  it("waits for the answer to be ready before confirming", async () => {
    vi.useFakeTimers();
    decryptPublic
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValue({ abiEncodedClearValues: "0x01", decryptionProof: "0x02" });
    const proving = prove();
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(proving).resolves.toBeUndefined();
    expect(decryptPublic).toHaveBeenCalledTimes(2);
  });

  it("asks the player to wait when their wallet isn't ready", async () => {
    me = undefined;
    await expect(prove()).rejects.toBeInstanceOf(MoveNotReadyError);
    expect(sendMove).not.toHaveBeenCalled();
  });
});
