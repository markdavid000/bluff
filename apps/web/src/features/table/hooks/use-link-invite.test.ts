import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { tableLink } from "@/lib/table-links";
import { useLinkInvite } from "./use-link-invite";

function hashFor(code: bigint) {
  const link = tableLink("", 1n, code);
  return link.slice(link.indexOf("#"));
}

afterEach(() => {
  window.history.replaceState(null, "", window.location.pathname);
});

describe("useLinkInvite", () => {
  it("finds no code when the link has none", () => {
    expect(renderHook(() => useLinkInvite()).result.current).toBeNull();
  });

  it("reads the code from the link, and follows it if the link changes", () => {
    window.history.replaceState(null, "", hashFor(98765n));
    const { result } = renderHook(() => useLinkInvite());
    expect(result.current).toBe(98765n);
    act(() => {
      window.location.hash = hashFor(1295n);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toBe(1295n);
  });

  it("ignores a damaged code", () => {
    window.history.replaceState(null, "", "#not-a-code!");
    expect(renderHook(() => useLinkInvite()).result.current).toBeNull();
  });
});
