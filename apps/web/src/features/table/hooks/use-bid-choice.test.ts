import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Bid } from "@bluff/game";
import { useBidChoice } from "./use-bid-choice";

const bid = (quantity: number, face: Bid["face"]): Bid => ({ quantity, face });

describe("useBidChoice", () => {
  it("starts on the lowest bid the player is allowed to make", () => {
    const { result } = renderHook(() => useBidChoice(bid(4, 5), 8, []));
    expect(result.current.choice).toEqual(bid(4, 6));
    expect(result.current.canFewer).toBe(false);
    expect(result.current.canMore).toBe(true);
  });

  it("changes the face, keeping the quantity where it can", () => {
    const { result } = renderHook(() => useBidChoice(bid(4, 5), 8, []));
    act(() => result.current.more());
    act(() => result.current.more());
    act(() => result.current.setFace(3));
    expect(result.current.choice).toEqual(bid(6, 3));
  });

  it("raises the quantity when a lower face needs it", () => {
    const { result } = renderHook(() => useBidChoice(bid(4, 5), 8, []));
    act(() => result.current.setFace(2));
    expect(result.current.choice).toEqual(bid(5, 2));
  });

  it("takes a quick pick as it is", () => {
    const { result } = renderHook(() => useBidChoice(bid(4, 5), 8, []));
    act(() => result.current.pick(bid(5, 5)));
    expect(result.current.choice).toEqual(bid(5, 5));
  });

  it("moves back to a legal bid when another player's bid overtakes the choice", () => {
    let current = bid(4, 5);
    const { result, rerender } = renderHook(() => useBidChoice(current, 8, []));
    act(() => result.current.pick(bid(5, 2)));
    current = bid(5, 3);
    rerender();
    expect(result.current.choice).toEqual(bid(5, 4));
  });

  it("disables faces that can't be bid any more, and offers nothing at the top bid", () => {
    const { result } = renderHook(() => useBidChoice(bid(8, 5), 8, []));
    expect(result.current.faceAvailable(5)).toBe(false);
    expect(result.current.faceAvailable(6)).toBe(true);
    const top = renderHook(() => useBidChoice(bid(8, 6), 8, []));
    expect(top.result.current.choice).toBeNull();
  });
});
