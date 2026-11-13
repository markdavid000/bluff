import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onNotice } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import { useJoinLink } from "./use-join-link";

const push = vi.fn();
const router = { push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

let shown: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
});

afterEach(() => {
  stop();
  vi.clearAllMocks();
});

describe("useJoinLink", () => {
  it("asks for a link in a short toast when the box is empty", () => {
    const { result } = renderHook(() => useJoinLink());
    act(() => result.current.submit());
    expect(shown).toEqual([lobbyCopy.linkEmpty]);
    expect(result.current.invalid).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("says what to paste when the text is not a link", () => {
    const { result } = renderHook(() => useJoinLink());
    act(() => result.current.change("hello"));
    act(() => result.current.submit());
    expect(shown).toEqual([lobbyCopy.linkInvalid]);
    expect(push).not.toHaveBeenCalled();
  });

  it("goes to the table from a link, then clears the box", () => {
    const { result } = renderHook(() => useJoinLink());
    act(() => result.current.change("http://localhost:3002/table/12"));
    act(() => result.current.submit());
    expect(push).toHaveBeenCalledWith("/table/12");
    expect(result.current.text).toBe("");
    expect(shown).toEqual([]);
  });

  it("clears the warning as soon as the player types again", () => {
    const { result } = renderHook(() => useJoinLink());
    act(() => result.current.submit());
    act(() => result.current.change("1"));
    expect(result.current.invalid).toBe(false);
  });
});
