import { renderHook } from "@testing-library/react";
import { zeroHash } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { useInviteCode } from "./use-invite-code";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const HANDLE = `0x${"cd".repeat(32)}`;
const CODE = 98765n;
const TABLE = 182915736201844n;

let codeRead: Record<string, unknown> = {};
let decrypted: Record<string, unknown> = {};
let permit: Record<string, unknown> = {};
const readAsked: Record<string, unknown>[] = [];
const decryptAsked: { inputs: unknown[]; options: Record<string, unknown> }[] = [];
const refetchCode = vi.fn();
const refetchDecrypt = vi.fn();
const grant = vi.fn();

vi.mock("wagmi", () => ({
  useReadContract: (request: Record<string, unknown>) => {
    readAsked.push(request);
    return { refetch: refetchCode, ...codeRead };
  },
}));
vi.mock("@zama-fhe/react-sdk", () => ({
  useDecryptValues: (inputs: unknown[], options: Record<string, unknown>) => {
    decryptAsked.push({ inputs, options });
    return { refetch: refetchDecrypt, ...decrypted };
  },
}));
vi.mock("@/hooks/use-permit", () => ({ usePermit: () => ({ grant, ...permit }) }));

function render(isPrivate = true, canRead = true) {
  return renderHook(() => useInviteCode({ id: TABLE, isPrivate, canRead })).result.current;
}

beforeEach(() => {
  codeRead = { isPending: false, isError: false, isPlaceholderData: false, data: HANDLE };
  decrypted = { isPending: false, isError: false, data: { [HANDLE]: CODE } };
  permit = { status: "granted", granting: false };
});

afterEach(() => {
  readAsked.length = 0;
  decryptAsked.length = 0;
  vi.clearAllMocks();
});

describe("useInviteCode", () => {
  it("needs no code for a public table, and reads nothing", () => {
    expect(render(false)).toEqual({ status: "ready", code: null });
    expect(readAsked.at(-1)?.query).toMatchObject({ enabled: false });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
  });

  it("reads nothing for someone who isn't at the table", () => {
    render(true, false);
    expect(readAsked.at(-1)?.query).toMatchObject({ enabled: false });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
  });

  it("gives the host the table's code from the invites contract", () => {
    expect(render()).toEqual({ status: "ready", code: CODE });
    expect(readAsked.at(-1)).toMatchObject({
      address: contracts.invites,
      functionName: "codeOf",
      args: [TABLE],
    });
    expect(decryptAsked.at(-1)?.inputs).toEqual([
      { encryptedValue: HANDLE, contractAddress: contracts.invites },
    ]);
  });

  it("shares a plain link for a private table made before codes existed", () => {
    codeRead = { ...codeRead, data: zeroHash };
    expect(render()).toEqual({ status: "ready", code: null });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
  });

  it("is loading while the code is read or opened", () => {
    codeRead = { isPending: true, isError: false, data: undefined };
    expect(render().status).toBe("loading");
    codeRead = { isPending: false, isError: false, data: HANDLE };
    decrypted = { isPending: true, isError: false, data: undefined };
    expect(render().status).toBe("loading");
  });

  it("never opens the code before the player has unlocked hidden values, and lets them unlock", () => {
    permit = { status: "needed", granting: false };
    const result = render();
    expect(result).toMatchObject({ status: "locked", unlocking: false });
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
    if (result.status !== "locked") throw new Error("Expected a locked invite.");
    result.unlock();
    expect(grant).toHaveBeenCalledOnce();
  });

  it("waits while the permit is being checked", () => {
    permit = { status: "checking", granting: false };
    expect(render().status).toBe("loading");
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
  });

  it("never shows another table's leftover code while this one loads", () => {
    codeRead = { ...codeRead, isPlaceholderData: true };
    expect(render().status).toBe("loading");
    expect(decryptAsked.at(-1)?.options).toMatchObject({ enabled: false });
    codeRead = { isPending: false, isError: false, isPlaceholderData: false, data: HANDLE };
    decrypted = { isPending: false, isError: false, data: { [`0x${"ee".repeat(32)}`]: 1n } };
    expect(render().status).toBe("loading");
  });

  it("offers to try again when the code can't be read or opened", () => {
    codeRead = { isPending: false, isError: true, data: undefined };
    const unread = render();
    expect(unread.status).toBe("failed");
    if (unread.status !== "failed") throw new Error("Expected a failure.");
    unread.retry();
    expect(refetchCode).toHaveBeenCalledOnce();

    codeRead = { isPending: false, isError: false, data: HANDLE };
    decrypted = { isPending: false, isError: true, data: undefined };
    const unopened = render();
    if (unopened.status !== "failed") throw new Error("Expected a failure.");
    unopened.retry();
    expect(refetchDecrypt).toHaveBeenCalledOnce();
  });
});
