import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNotice } from "@/lib/notify";
import { accountCopy } from "../copy";
import { useWelcome } from "./use-welcome";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const sendMove = vi.fn();
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
let nextClaimAt: bigint | undefined = 0n;
vi.mock("wagmi", () => ({ useReadContract: () => ({ data: nextClaimAt }) }));
vi.mock("./use-player", () => ({
  usePlayer: () => ({
    status: "ready",
    address: "0x00000000000000000000000000000000000a11ce",
    name: "Player #A11C",
    nickname: null,
    avatar: 0,
    avatarSrc: "/avatars/1.svg",
    refresh: vi.fn(async () => undefined),
  }),
}));

let shown: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
  sendMove.mockResolvedValue({ status: "success" });
  nextClaimAt = 0n;
});

function sent() {
  return sendMove.mock.calls.map(([call]) => call as { functionName: string; args: unknown[] });
}

afterEach(() => {
  stop();
  vi.clearAllMocks();
});

describe("useWelcome", () => {
  it("says what kind of name to pick in a short toast, and sends nothing", () => {
    const { result } = renderHook(() => useWelcome());
    act(() => result.current.changeNickname("no"));
    expect(result.current.canSave).toBe(true);
    act(() => result.current.submit());
    expect(shown).toEqual([accountCopy.nicknameInvalid]);
    expect(result.current.nicknameInvalid).toBe(true);
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("does not warn while the player is still typing", () => {
    const { result } = renderHook(() => useWelcome());
    act(() => result.current.changeNickname("no"));
    expect(result.current.nicknameInvalid).toBe(false);
    expect(shown).toEqual([]);
  });

  it("clears the warning as soon as the player types again", () => {
    const { result } = renderHook(() => useWelcome());
    act(() => result.current.changeNickname("no"));
    act(() => result.current.submit());
    act(() => result.current.changeNickname("now"));
    expect(result.current.nicknameInvalid).toBe(false);
  });

  it("saves the name and face and claims the day's chips in one move when they are still there", async () => {
    const { result } = renderHook(() => useWelcome());
    expect(result.current.submitLabel).toBe(accountCopy.welcomeSubmit);
    act(() => result.current.changeNickname("Brave Otter"));
    act(() => result.current.submit());
    await waitFor(() => expect(sendMove).toHaveBeenCalledOnce());
    expect(sent()[0]).toMatchObject({
      functionName: "claimWithAvatar",
      args: ["Brave Otter", expect.any(Number)],
    });
  });

  it("only saves the name and face when today's chips were already claimed", async () => {
    nextClaimAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const { result } = renderHook(() => useWelcome());
    expect(result.current.submitLabel).toBe(accountCopy.welcomeSave);
    act(() => result.current.changeNickname("Brave Otter"));
    act(() => result.current.submit());
    await waitFor(() => expect(sendMove).toHaveBeenCalledTimes(2));
    expect(sent().map((call) => call.functionName)).toEqual(["setNickname", "setAvatar"]);
    expect(sent()[0]?.args).toEqual(["Brave Otter"]);
  });

  it("holds the button until it knows whether today's chips are still there", () => {
    nextClaimAt = undefined;
    const { result } = renderHook(() => useWelcome());
    expect(result.current.canSave).toBe(false);
  });
});
