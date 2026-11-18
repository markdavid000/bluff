"use client";

import { useReducer } from "react";
import type { Face } from "@bluff/game";
import { type Throw, type Vector, throwDice } from "@/lib/dice-physics";
import { seededRandom } from "@/lib/random";

export type ThrowState =
  | { kind: "idle" }
  | { kind: "shaking"; startedAt: number }
  | { kind: "rolling"; result: Throw; startedAt: number };

type ThrowAction =
  { type: "shake"; at: number } | { type: "throw"; result: Throw; at: number } | { type: "reset" };

function reduce(state: ThrowState, action: ThrowAction): ThrowState {
  switch (action.type) {
    case "shake":
      return { kind: "shaking", startedAt: action.at };
    case "throw":
      return { kind: "rolling", result: action.result, startedAt: action.at };
    case "reset":
      return { kind: "idle" };
  }
}

export function useDiceThrow() {
  const [state, dispatch] = useReducer(reduce, { kind: "idle" });

  return {
    state,
    shake: () => dispatch({ type: "shake", at: performance.now() }),
    throwDice: (faces: readonly Face[], from: Vector) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const result = throwDice({ faces, from, random: seededRandom(seed) });
      dispatch({ type: "throw", result, at: performance.now() });
      return result;
    },
    reset: () => dispatch({ type: "reset" }),
  };
}
