import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNotice } from "@/lib/notify";
import { accountCopy } from "../copy";
import { useProfileEdit } from "./use-profile-edit";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x00000000000000000000000000000000000a11ce";
const sendMove = vi.fn();
const refresh = vi.fn(async () => undefined);
let taken = false;
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
vi.mock("./use-nickname-taken", () => ({ useNicknameTaken: () => taken }));
vi.mock("./use-player", () => ({
  usePlayer: () => ({
    status: "ready",
    address: ME,
    name: "Favour #1CE0",
    nickname: "Favour",
    avatar: 3,
    avatarSrc: "/avatars/3.svg",
    refresh,
  }),
}));

let shown: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  taken = false;
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
  sendMove.mockResolvedValue({ status: "success" });
});

afterEach(() => {
  stop();
  vi.clearAllMocks();
});

function sent() {
  return sendMove.mock.calls.map(([call]) => call as { functionName: string; args: unknown[] });
}

describe("useProfileEdit", () => {
  it("starts on the profile, and opens the name panel with the current name", () => {
    const { result } = renderHook(() => useProfileEdit());
    expect(result.current.panel).toBe("main");
    act(() => result.current.editName());
    expect(result.current).toMatchObject({ panel: "name", nickname: "Favour" });
  });

  it("saves a new name, refreshes the player, and goes back to the profile", async () => {
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editName());
    act(() => result.current.changeNickname("Brave Otter"));
    act(() => result.current.saveName());
    await waitFor(() => expect(result.current.panel).toBe("main"));
    expect(sent()).toEqual([
      {
        address: expect.any(String),
        abi: expect.any(Array),
        functionName: "setNickname",
        args: ["Brave Otter"],
      },
    ]);
    expect(refresh).toHaveBeenCalled();
    expect(shown).toContain(accountCopy.nameSaved);
  });

  it("says what kind of name to pick, and sends nothing, for a name the game won't take", () => {
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editName());
    act(() => result.current.changeNickname("no"));
    act(() => result.current.saveName());
    expect(shown).toEqual([accountCopy.nicknameInvalid]);
    expect(result.current.nicknameInvalid).toBe(true);
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("won't save a name someone else has, and says so", () => {
    taken = true;
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editName());
    act(() => result.current.changeNickname("Maki"));
    expect(result.current.canSaveName).toBe(false);
    act(() => result.current.saveName());
    expect(sendMove).not.toHaveBeenCalled();
    expect(shown).toContain(accountCopy.nicknameTaken);
  });

  it("says straight away when the name being typed is taken", () => {
    const { result, rerender } = renderHook(() => useProfileEdit());
    act(() => result.current.editName());
    act(() => result.current.changeNickname("Maki"));
    taken = true;
    rerender();
    expect(shown).toEqual([accountCopy.nicknameTaken]);
  });

  it("goes straight back when the name hasn't changed", () => {
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editName());
    act(() => result.current.saveName());
    expect(result.current.panel).toBe("main");
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("saves a new face and goes back to the profile", async () => {
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editFace());
    expect(result.current).toMatchObject({ panel: "face", face: 3 });
    act(() => result.current.chooseFace(7));
    await waitFor(() => expect(result.current.panel).toBe("main"));
    expect(sent()[0]).toMatchObject({ functionName: "setAvatar", args: [7] });
    expect(shown).toContain(accountCopy.faceSaved);
  });

  it("stays on the panel, and says it's still saving, while a save is on its way", async () => {
    let land: (value: unknown) => void = () => undefined;
    sendMove.mockImplementation(() => new Promise((resolve) => (land = resolve)));
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editFace());
    act(() => result.current.chooseFace(7));
    await waitFor(() => expect(result.current.saving).toBe(true));
    act(() => result.current.back());
    expect(result.current.panel).toBe("face");
    await act(async () => land({ status: "success" }));
    await waitFor(() => expect(result.current.panel).toBe("main"));
  });

  it("stays on the panel when a save fails, so the player can try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMove.mockRejectedValue(new Error("busy"));
    const { result } = renderHook(() => useProfileEdit());
    act(() => result.current.editFace());
    act(() => result.current.chooseFace(7));
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.panel).toBe("face");
  });
});
