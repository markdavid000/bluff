import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNotice } from "@/lib/notify";
import { accountCopy } from "../copy";
import { NICKNAME_CHECK_MS } from "./use-nickname-taken";
import { useWelcome } from "./use-welcome";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const sendMove = vi.fn();
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
let nextClaimAt: bigint | undefined = 0n;
let claimCheckFails = false;
const refetchClaim = vi.fn();
let takenNames: string[] = [];
const askedTaken: string[] = [];
vi.mock("wagmi", () => ({
  useReadContract: ({
    functionName,
    args,
    query,
  }: {
    functionName: string;
    args?: [string, string];
    query?: { enabled?: boolean };
  }) => {
    if (functionName !== "isNicknameTaken") {
      return claimCheckFails
        ? { data: undefined, isError: true, refetch: refetchClaim }
        : { data: nextClaimAt, isError: false, refetch: refetchClaim };
    }
    if (!query?.enabled || !args) return { data: undefined, isPlaceholderData: false };
    askedTaken.push(args[0]);
    return {
      data: takenNames.some((name) => name.toLowerCase() === args[0].toLowerCase()),
      isPlaceholderData: false,
    };
  },
}));
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
let actions: { label: string; onPress: () => void }[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  stop = onNotice((event) => {
    if (event.type !== "show") return;
    shown.push(event.notice.title);
    if (event.notice.action) actions.push(event.notice.action);
  });
  actions = [];
  claimCheckFails = false;
  sendMove.mockResolvedValue({ status: "success" });
  nextClaimAt = 0n;
  takenNames = [];
  askedTaken.length = 0;
});

function sent() {
  return sendMove.mock.calls.map(([call]) => call as { functionName: string; args: unknown[] });
}

afterEach(() => {
  stop();
  vi.clearAllMocks();
});

describe("useWelcome", () => {
  describe("a nickname someone else has", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      takenNames = ["Brave Otter"];
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("checks the name once the player stops typing, then says it's taken", () => {
      const { result, rerender } = renderHook(() => useWelcome());
      act(() => result.current.changeNickname("brave otter"));
      expect(askedTaken).not.toContain("brave otter");
      act(() => {
        vi.advanceTimersByTime(NICKNAME_CHECK_MS);
      });
      rerender();
      expect(askedTaken).toContain("brave otter");
      expect(shown).toEqual([accountCopy.nicknameTaken]);
      expect(result.current.canSave).toBe(false);
    });

    it("won't send a taken name, and says why again", () => {
      const { result, rerender } = renderHook(() => useWelcome());
      act(() => result.current.changeNickname("Brave Otter"));
      act(() => {
        vi.advanceTimersByTime(NICKNAME_CHECK_MS);
      });
      rerender();
      act(() => result.current.submit());
      expect(sendMove).not.toHaveBeenCalled();
      expect(shown).toEqual([accountCopy.nicknameTaken, accountCopy.nicknameTaken]);
    });

    it("lets the player save again once they pick a free name", () => {
      const { result, rerender } = renderHook(() => useWelcome());
      act(() => result.current.changeNickname("Brave Otter"));
      act(() => {
        vi.advanceTimersByTime(NICKNAME_CHECK_MS);
      });
      rerender();
      act(() => result.current.changeNickname("Calm Otter"));
      expect(result.current.canSave).toBe(true);
      act(() => {
        vi.advanceTimersByTime(NICKNAME_CHECK_MS);
      });
      rerender();
      expect(result.current.canSave).toBe(true);
      expect(shown).toEqual([accountCopy.nicknameTaken]);
    });

    it("doesn't ask about a name that breaks the nickname rules", () => {
      const { result, rerender } = renderHook(() => useWelcome());
      act(() => result.current.changeNickname("no"));
      act(() => {
        vi.advanceTimersByTime(NICKNAME_CHECK_MS);
      });
      rerender();
      expect(askedTaken).not.toContain("no");
    });
  });

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

  it("says when it can't check today's chips, with a way to try again", () => {
    claimCheckFails = true;
    renderHook(() => useWelcome());
    expect(shown).toContain(accountCopy.claimCheckProblem);
    const retry = actions.find((action) => action.label === accountCopy.tryAgain);
    retry?.onPress();
    expect(refetchClaim).toHaveBeenCalledOnce();
  });

  it("holds the button until it knows whether today's chips are still there", () => {
    nextClaimAt = undefined;
    const { result } = renderHook(() => useWelcome());
    expect(result.current.canSave).toBe(false);
  });
});
