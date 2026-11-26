"use client";

import { useReducer, useRef } from "react";
import type { Face } from "@bluff/game";
import type { Throw, Vector } from "@/lib/dice-geometry";
import type * as DicePhysicsModule from "@/lib/dice-physics";
import { seededRandom } from "@/lib/random";

type DicePhysics = typeof DicePhysicsModule;

let loaded: DicePhysics | null = null;
let loading: Promise<DicePhysics | null> | null = null;

export function loadDicePhysics(): Promise<DicePhysics | null> {
  loading ??= import("@/lib/dice-physics").then(
    (physics) => {
      loaded = physics;
      return physics;
    },
    (error: unknown) => {
      loading = null;
      console.error("The dice roll could not be loaded, so the dice stay in the cup.", error);
      return null;
    }
  );
  return loading;
}

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
  const latest = useRef(0);

  function roll(physics: DicePhysics, faces: readonly Face[], from: Vector, seed: number) {
    const result = physics.throwDice({ faces, from, random: seededRandom(seed) });
    dispatch({ type: "throw", result, at: performance.now() });
  }

  return {
    state,
    shake: () => {
      latest.current += 1;
      void loadDicePhysics();
      dispatch({ type: "shake", at: performance.now() });
    },
    throwDice: (faces: readonly Face[], from: Vector) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      latest.current += 1;
      const asked = latest.current;
      if (loaded) {
        roll(loaded, faces, from, seed);
        return;
      }
      void loadDicePhysics().then((physics) => {
        if (latest.current !== asked) return;
        if (physics) roll(physics, faces, from, seed);
        else dispatch({ type: "reset" });
      });
    },
    reset: () => {
      latest.current += 1;
      dispatch({ type: "reset" });
    },
  };
}
