"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useEffect, useState } from "react";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useSendMove } from "@/hooks/use-send-move";
import { PRESET_AVATARS, type PresetAvatar } from "@/lib/avatar";
import { isValidNickname } from "@/lib/nickname";
import { notify } from "@/lib/notify";
import { accountCopy } from "../copy";
import { useNicknameTaken } from "./use-nickname-taken";
import { usePlayer } from "./use-player";

type Panel = "main" | "name" | "face";

export function useProfileEdit() {
  const player = usePlayer();
  const sendMove = useSendMove();
  const [panel, setPanel] = useState<Panel>("main");
  const [nickname, setNickname] = useState("");
  const [nicknameInvalid, setNicknameInvalid] = useState(false);
  const ready = player.status === "ready";
  const current = ready ? (player.nickname ?? "") : "";
  const trimmed = nickname.trim();
  const taken = useNicknameTaken(trimmed, ready ? player.address : undefined);
  const takenName = panel === "name" && taken ? trimmed.toLowerCase() : null;
  useEffect(() => {
    if (takenName !== null) notify.error(accountCopy.nicknameTaken, { id: "nickname" });
  }, [takenName]);

  const finish = () => {
    void player.refresh();
    setPanel("main");
  };

  const saveNickname = useAction({
    id: "profile-name",
    working: accountCopy.savingName,
    done: accountCopy.nameSaved,
    run: (report, name: string) =>
      sendMove(
        {
          address: contracts.faucet,
          abi: chipFaucetAbi,
          functionName: "setNickname",
          args: [name],
        },
        report
      ),
    onDone: finish,
  });

  const saveFace = useAction({
    id: "profile-face",
    working: accountCopy.savingFace,
    done: accountCopy.faceSaved,
    run: (report, face: PresetAvatar) =>
      sendMove(
        { address: contracts.faucet, abi: chipFaucetAbi, functionName: "setAvatar", args: [face] },
        report
      ),
    onDone: finish,
  });

  const saving = saveNickname.working || saveFace.working;

  return {
    panel,
    nickname,
    nicknameInvalid,
    face: ready ? player.avatar : 0,
    faces: PRESET_AVATARS,
    saving,
    savingName: saveNickname.working,
    savingFace: saveFace.working,
    confirmInWallet: saveNickname.confirmInWallet || saveFace.confirmInWallet,
    canSaveName: ready && !saving && !taken,
    editName: () => {
      setNickname(current);
      setNicknameInvalid(false);
      setPanel("name");
    },
    editFace: () => setPanel("face"),
    back: () => {
      if (!saving) setPanel("main");
    },
    changeNickname: (value: string) => {
      setNicknameInvalid(false);
      setNickname(value);
    },
    saveName: () => {
      if (trimmed === current) {
        setPanel("main");
        return;
      }
      if (!isValidNickname(trimmed)) {
        setNicknameInvalid(true);
        notify.error(accountCopy.nicknameInvalid, { id: "nickname" });
        return;
      }
      if (taken) {
        notify.error(accountCopy.nicknameTaken, { id: "nickname" });
        return;
      }
      saveNickname.start(trimmed);
    },
    chooseFace: (face: PresetAvatar) => {
      if (ready && face === player.avatar) {
        setPanel("main");
        return;
      }
      saveFace.start(face);
    },
  };
}
