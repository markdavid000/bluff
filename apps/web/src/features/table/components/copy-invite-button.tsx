"use client";

import { ActionButton } from "@/components/shared/action-button";
import { tableCopy } from "../copy";
import type { InviteCode } from "../hooks/use-invite-code";

export function CopyInviteButton({
  invite,
  unlocking,
  onPress,
}: {
  invite: InviteCode["status"];
  unlocking: boolean;
  onPress: () => void;
}) {
  if (invite === "locked") {
    return (
      <ActionButton
        tone="yellow"
        icon="lock"
        working={unlocking}
        workingLabel={tableCopy.unlockingInvite}
        onClick={onPress}
      >
        {tableCopy.unlockInvite}
      </ActionButton>
    );
  }
  if (invite === "failed") {
    return (
      <ActionButton tone="quiet" icon="target" title={tableCopy.inviteProblem} onClick={onPress}>
        {tableCopy.tryAgain}
      </ActionButton>
    );
  }
  return (
    <ActionButton
      tone="blue"
      icon="copy"
      disabled={invite === "loading"}
      working={invite === "loading"}
      workingLabel={tableCopy.gettingInvite}
      onClick={onPress}
    >
      {tableCopy.copyInvite}
    </ActionButton>
  );
}
