import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Notice, onNotice } from "@/lib/notify";
import { useWorkingNotice } from "./use-working-notice";

let shown: Notice[] = [];
let dismissed: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  dismissed = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice);
    else dismissed.push(event.id);
  });
});

afterEach(() => stop());

describe("useWorkingNotice", () => {
  it("keeps a working toast up for as long as the work goes on, then takes it down", () => {
    let working = true;
    const { rerender } = renderHook(() =>
      useWorkingNotice("reveal-12", "Revealing dice…", working)
    );
    expect(shown).toEqual([expect.objectContaining({ id: "reveal-12", kind: "loading" })]);
    rerender();
    expect(shown).toHaveLength(1);
    expect(dismissed).toEqual([]);
    working = false;
    rerender();
    expect(dismissed).toEqual(["reveal-12"]);
  });

  it("shows nothing when there's no work", () => {
    renderHook(() => useWorkingNotice("reveal-12", "Revealing dice…", false));
    expect(shown).toEqual([]);
  });

  it("takes the toast down when the screen goes away", () => {
    const { unmount } = renderHook(() => useWorkingNotice("reveal-12", "Revealing dice…", true));
    unmount();
    expect(dismissed).toEqual(["reveal-12"]);
  });
});
