import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Physics from "@/lib/dice-physics";
import { seededRandom } from "@/lib/random";
import { loadDicePhysics, useDiceThrow } from "./use-dice-throw";

const physicsLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/lib/dice-physics", async (importOriginal) => {
  physicsLoads.count += 1;
  return importOriginal<typeof Physics>();
});

const FROM = [0, 1.2, 2.8] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDiceThrow", () => {
  it("leaves the dice physics unloaded until a cup starts to shake", async () => {
    const { result } = renderHook(() => useDiceThrow());
    expect(physicsLoads.count).toBe(0);
    act(() => result.current.shake());
    expect(result.current.state.kind).toBe("shaking");
    await waitFor(() => expect(physicsLoads.count).toBe(1));
  });

  it("throws as soon as the physics arrives when the dice are ready first", async () => {
    vi.resetModules();
    const fresh = await import("./use-dice-throw");
    const { result } = renderHook(() => fresh.useDiceThrow());
    act(() => {
      result.current.shake();
      result.current.throwDice([5, 1], FROM);
    });
    expect(result.current.state.kind).toBe("shaking");
    await waitFor(() => expect(result.current.state.kind).toBe("rolling"));
  });

  it("drops a throw that arrives after the cup was put down", async () => {
    vi.resetModules();
    const fresh = await import("./use-dice-throw");
    const { result } = renderHook(() => fresh.useDiceThrow());
    act(() => {
      result.current.throwDice([5, 1], FROM);
      result.current.reset();
    });
    await fresh.loadDicePhysics();
    await act(async () => undefined);
    expect(result.current.state.kind).toBe("idle");
  });

  it("throws straight away once the physics is ready", async () => {
    await loadDicePhysics();
    const { result } = renderHook(() => useDiceThrow());
    act(() => result.current.shake());
    act(() => result.current.throwDice([5, 1], FROM));
    expect(result.current.state.kind).toBe("rolling");
  });

  it("rolls exactly the dice the physics gives for the same seed", async () => {
    const physics = await loadDicePhysics();
    if (!physics) throw new Error("Expected the dice physics.");
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    const { result } = renderHook(() => useDiceThrow());
    act(() => result.current.throwDice([3, 6, 2], FROM));
    if (result.current.state.kind !== "rolling") throw new Error("Expected a throw.");
    const seed = Math.floor(0.25 * 2 ** 31);
    expect(result.current.state.result).toEqual(
      physics.throwDice({ faces: [3, 6, 2], from: FROM, random: seededRandom(seed) })
    );
  });
});
