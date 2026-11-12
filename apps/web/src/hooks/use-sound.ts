"use client";

import { useEffect } from "react";
import { SOUNDS, type SoundName } from "@/config/sounds";
import type { MusicTrack } from "@/lib/settings-store";
import { createSoundBoard, type SoundBoard } from "@/lib/sound";
import { useSettings } from "./use-settings";

const MUSIC_FOR_TRACK: Record<MusicTrack, SoundName> = {
  drum: "drumLoop",
  bell: "bellLoop",
  both: "bothLoop",
};

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

export function useBackgroundMusic() {
  const { settings } = useSettings();
  const track = MUSIC_FOR_TRACK[settings.musicTrack];

  useEffect(() => {
    const sounds = soundBoard();
    if (!settings.music) return;
    const start = () => {
      sounds.unlock();
      sounds.setMuted("music", false);
      void sounds.play(track);
    };
    if (sounds.unlocked) {
      start();
      return () => sounds.stop(track);
    }
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      sounds.stop(track);
    };
  }, [settings.music, track]);
}
