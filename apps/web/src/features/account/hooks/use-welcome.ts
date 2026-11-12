"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useSendMove } from "@/hooks/use-send-move";
import { PRESET_AVATARS, type PresetAvatar, defaultAvatarFor, isPresetAvatar } from "@/lib/avatar";
import { isValidNickname, suggestNickname } from "@/lib/nickname";
import { safeNextPath } from "@/lib/safe-redirect";
import { accountCopy } from "../copy";
import { usePlayer } from "./use-player";

const SUGGEST_MS = 350;

export function useWelcome(next: string | undefined) {
  const router = useRouter();
  const player = usePlayer();
  const sendMove = useSendMove();
  const [nickname, setNickname] = useState(() => suggestNickname());
  const [touched, setTouched] = useState(false);
  const [chosen, setChosen] = useState<PresetAvatar | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const suggestTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (suggestTimer.current !== null) window.clearTimeout(suggestTimer.current);
    },
    []
  );

  const avatar: PresetAvatar =
    chosen ??
    (player.status === "ready"
      ? isPresetAvatar(player.avatar)
        ? player.avatar
        : defaultAvatarFor(player.address)
      : 1);

  const save = useAction({
    id: "welcome",
    working: accountCopy.welcomeWorking,
    done: accountCopy.welcomeDone,
    run: (report) =>
      sendMove(
        {
          address: contracts.faucet,
          abi: chipFaucetAbi,
          functionName: "claimWithAvatar",
          args: [nickname.trim(), avatar],
        },
        report
      ),
    onDone: () => {
      void player.refresh().then(() => router.replace(safeNextPath(next)));
    },
  });

  const valid = isValidNickname(nickname.trim());

  return {
    ready: player.status === "ready",
    nickname,
    nicknameError: touched && !valid ? accountCopy.nicknameInvalid : null,
    avatar,
    faces: PRESET_AVATARS,
    working: save.working,
    confirmInWallet: save.confirmInWallet,
    canSave: valid && player.status === "ready" && !save.working,
    changeNickname: (value: string) => {
      setTouched(true);
      setNickname(value);
    },
    suggesting,
    suggestion,
    suggestAnother: () => {
      if (suggestTimer.current !== null) window.clearTimeout(suggestTimer.current);
      setSuggesting(true);
      suggestTimer.current = window.setTimeout(() => {
        suggestTimer.current = null;
        setTouched(false);
        setNickname((current) => suggestNickname(Math.random, current));
        setSuggestion((count) => count + 1);
        setSuggesting(false);
      }, SUGGEST_MS);
    },
    chooseAvatar: setChosen,
    submit: () => {
      setTouched(true);
      if (valid) save.start();
    },
  };
}
