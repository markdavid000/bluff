"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { SoundName } from "@/config/sounds";
import { useSound } from "./use-sound";

export function useSoundOn(name: SoundName, moment: number | null) {
  const { play } = useSound();
  const played = useRef<number | null>(null);
  const playNow = useEffectEvent(() => play(name));

  useEffect(() => {
    if (moment === null) {
      played.current = null;
      return;
    }
    if (played.current === moment) return;
    played.current = moment;
    playNow();
  }, [moment]);
}
