"use client";

import { useSyncExternalStore } from "react";
import { type GraphicsSupport, boardToShow, graphicsSupport } from "@/lib/graphics";
import type { BoardSetting } from "@/lib/settings-store";
import { useSettings } from "./use-settings";

let checked: GraphicsSupport | null = null;

function subscribe() {
  return () => undefined;
}

function deviceSupport(): GraphicsSupport {
  checked ??= graphicsSupport();
  return checked;
}

const FULL_ON_SERVER = (): GraphicsSupport => "full";

export function forgetGraphicsCheck() {
  checked = null;
}

export function useBoardSetting(): { board: BoardSetting; choose: (board: BoardSetting) => void } {
  const { settings, update } = useSettings();
  const support = useSyncExternalStore(subscribe, deviceSupport, FULL_ON_SERVER);
  return {
    board: boardToShow(settings, support),
    choose: (board) => update({ board, boardPicked: true }),
  };
}
