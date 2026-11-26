"use client";

import { type RootState, useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";

export const LONGEST_FRAME_SECONDS = 1 / 30;

export function useFramesWhileMoving(
  step: (state: RootState, delta: number) => boolean,
  wake: string | number
) {
  const invalidate = useThree((state) => state.invalidate);
  useFrame((state, delta) => {
    if (step(state, Math.min(delta, LONGEST_FRAME_SECONDS))) state.invalidate();
  });
  useEffect(() => {
    invalidate();
  }, [invalidate, wake]);
}
