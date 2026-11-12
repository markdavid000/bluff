"use client";

import { useEffect } from "react";
import { SOUNDS, type SoundName } from "@/config/sounds";
import { createSoundBoard, type SoundBoard } from "@/lib/sound";
import { useSettings } from "./use-settings";

let board: SoundBoard<SoundName> | null = null;

function soundBoard(): SoundBoard<SoundName> {
  board ??= createSoundBoard(SOUNDS, {
    createContext: () => new AudioContext(),
    fetchAudio: (url) => fetch(url).then((response) => response.arrayBuffer()),
  });
  return board;
}

export function useSound(): { play: (name: SoundName) => void; stop: (name: SoundName) => void } {
  const { settings } = useSettings();

  useEffect(() => {
    const sounds = soundBoard();
    sounds.setMuted("effects", !settings.sounds);
    sounds.setMuted("music", !settings.music);
  }, [settings.sounds, settings.music]);

  useEffect(() => {
    const sounds = soundBoard();
    if (sounds.unlocked) return;
    const unlock = () => sounds.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return {
    play: (name) => void soundBoard().play(name),
    stop: (name) => soundBoard().stop(name),
  };
}

export function useBackgroundMusic(track: SoundName) {
  const { settings } = useSettings();

  useEffect(() => {
    const sounds = soundBoard();
    if (!settings.music) {
      sounds.stop(track);
      return;
    }
    if (sounds.unlocked) {
      void sounds.play(track);
      return;
    }
    const start = () => {
      sounds.unlock();
      sounds.setMuted("music", false);
      void sounds.play(track);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [settings.music, track]);
}
