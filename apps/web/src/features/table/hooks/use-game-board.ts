"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSound } from "@/hooks/use-sound";
import type { Face } from "@bluff/game";
import type { SeatPlacement } from "../lib/seat-layout";
import { useDiceThrow } from "./use-dice-throw";

export const SHAKE_MS = 650;
export const OTHERS_SHAKE_MS = 1_200;
export const DICE_WAIT_MS = 10_000;

export function useGameBoard({
  round,
  faces,
  placement,
  quiet = false,
}: {
  round: number;
  faces: readonly Face[] | null;
  placement: SeatPlacement | null;
  quiet?: boolean;
}) {
  const dice = useDiceThrow();
  const [roundSeen, setRoundSeen] = useState(0);
  const [shakingRound, setShakingRound] = useState<number | null>(null);
  const [thrownRound, setThrownRound] = useState(0);
  const [lateRound, setLateRound] = useState(0);
  if (round > 0 && round !== roundSeen) {
    setRoundSeen(round);
    setShakingRound(round);
  }
  const { play } = useSound();
  const shookFor = useRef<number | null>(null);
  const thrownFor = useRef<number | null>(null);
  const playing = placement !== null && round > 0;
  const ready = faces !== null && faces.length > 0;
  const facesKey = faces?.join(",") ?? "";

  const shake = useEffectEvent(() => {
    dice.shake();
    if (!quiet) play("shake");
  });

  const throwNow = useEffectEvent((forRound: number) => {
    if (!faces || !placement) return;
    thrownFor.current = forRound;
    setThrownRound(forRound);
    dice.throwDice(faces, placement.throwFrom);
    if (!quiet) play("roll");
  });

  useEffect(() => {
    if (!playing || shookFor.current === round) return;
    shookFor.current = round;
    shake();
  }, [playing, round]);

  const settle = useEffectEvent(() => {
    if (!quiet) play("settle");
  });

  useEffect(() => {
    if (dice.state.kind !== "rolling") return;
    const timer = window.setTimeout(settle, dice.state.result.settledAfterSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [dice.state]);

  useEffect(() => {
    if (shakingRound === null) return;
    const timer = window.setTimeout(() => setShakingRound(null), OTHERS_SHAKE_MS);
    return () => window.clearTimeout(timer);
  }, [shakingRound]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setLateRound(round), DICE_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [playing, round]);

  useEffect(() => {
    if (!playing || !ready || thrownFor.current === round) return;
    const timer = window.setTimeout(() => throwNow(round), SHAKE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, ready, facesKey, round]);

  return {
    throwState: dice.state,
    othersShaking: shakingRound === round,
    waitingForDice: playing && thrownRound !== round && lateRound !== round,
  };
}
