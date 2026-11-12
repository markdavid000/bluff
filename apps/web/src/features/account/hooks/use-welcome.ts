"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useEffect, useRef, useState } from "react";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useSendMove } from "@/hooks/use-send-move";
import { PRESET_AVATARS, type PresetAvatar, defaultAvatarFor, isPresetAvatar } from "@/lib/avatar";
import { isValidNickname, suggestNickname } from "@/lib/nickname";
import { notify } from "@/lib/notify";
import { accountCopy } from "../copy";
import { usePlayer } from "./use-player";

const SUGGEST_MS = 350;
const CLAIM_CHECK_MS = 5_000;

export function useWelcome() {
  const player = usePlayer();
  const sendMove = useSendMove();
  const [nickname, setNickname] = useState(() => suggestNickname());
  const [nicknameInvalid, setNicknameInvalid] = useState(false);
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

  const nextClaim = useReadContract({
    address: contracts.faucet,
    abi: chipFaucetAbi,
    functionName: "nextClaimAt",
    args: player.status === "ready" ? [player.address] : undefined,
    query: { enabled: player.status === "ready" },
  });
  const now = useNow(CLAIM_CHECK_MS, nextClaim.data !== undefined);
  const claimKnown = nextClaim.data !== undefined;
  const canClaim = claimKnown && Number(nextClaim.data) * 1000 <= now;

  const finish = () => {
    void player.refresh();
  };

  const saveAndClaim = useAction({
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
    onDone: finish,
  });

  const saveOnly = useAction({
    id: "welcome",
    working: accountCopy.welcomeSaveWorking,
    done: accountCopy.welcomeSaveDone,
    run: async (report) => {
      await sendMove(
        {
          address: contracts.faucet,
          abi: chipFaucetAbi,
          functionName: "setNickname",
          args: [nickname.trim()],
        },
        report
      );
      return sendMove(
        {
          address: contracts.faucet,
          abi: chipFaucetAbi,
          functionName: "setAvatar",
          args: [avatar],
        },
        report
      );
    },
    onDone: finish,
  });

  const valid = isValidNickname(nickname.trim());
  const working = saveAndClaim.working || saveOnly.working;

  return {
    ready: player.status === "ready",
    nickname,
    nicknameInvalid,
    avatar,
    faces: PRESET_AVATARS,
    working,
    confirmInWallet: saveAndClaim.confirmInWallet || saveOnly.confirmInWallet,
    canSave: player.status === "ready" && claimKnown && !working,
    submitLabel: canClaim ? accountCopy.welcomeSubmit : accountCopy.welcomeSave,
    workingLabel: canClaim ? accountCopy.welcomeWorking : accountCopy.welcomeSaveWorking,
    changeNickname: (value: string) => {
      setNicknameInvalid(false);
      setNickname(value);
    },
    suggesting,
    suggestion,
    suggestAnother: () => {
      if (suggestTimer.current !== null) window.clearTimeout(suggestTimer.current);
      setSuggesting(true);
      suggestTimer.current = window.setTimeout(() => {
        suggestTimer.current = null;
        setNicknameInvalid(false);
        setNickname((current) => suggestNickname(Math.random, current));
        setSuggestion((count) => count + 1);
        setSuggesting(false);
      }, SUGGEST_MS);
    },
    chooseAvatar: setChosen,
    submit: () => {
      if (valid) {
        if (canClaim) saveAndClaim.start();
        else saveOnly.start();
        return;
      }
      setNicknameInvalid(true);
      notify.error(accountCopy.nicknameInvalid, { id: "nickname" });
    },
  };
}
