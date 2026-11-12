"use client";

import { useEffect, useRef, useState } from "react";
import { useSound } from "@/hooks/use-sound";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { Face } from "@/lib/dice-physics";
import { seatLayout } from "../lib/seat-layout";
import { useDiceThrow } from "./use-dice-throw";

const SHAKE_MS = 650;
const DICE_IN_HAND = 4;

export const PREVIEW_SEATS = seatLayout(4, 0);

export const PREVIEW_CHIPS_EACH = 8;

function rollFaces(): Face[] {
  return Array.from({ length: DICE_IN_HAND }, () => (Math.floor(Math.random() * 6) + 1) as Face);
}

export function usePreviewBoard() {
  const colors = useThemeColors();
  const dice = useDiceThrow();
  const { play } = useSound();
  const [landed, setLanded] = useState<Face[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function later(action: () => void, ms: number) {
    timers.current.push(window.setTimeout(action, ms));
  }

  return {
    colors,
    throwState: dice.state,
    landed,
    revealed,
    toggleCups: () => setRevealed((value) => !value),
    shakeAndThrow: () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
      setRevealed(false);
      setLanded(null);
      dice.shake();
      play("shake");
      later(() => {
        const faces = rollFaces();
        const result = dice.throwDice(faces, PREVIEW_SEATS[0].throwFrom);
        play("roll");
        later(() => setLanded(faces), result.settledAfterSeconds * 1000);
      }, SHAKE_MS);
    },
  };
}
