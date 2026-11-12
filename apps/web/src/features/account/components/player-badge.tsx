"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { accountCopy } from "../copy";
import { usePlayerBadge } from "../hooks/use-player-badge";

export function PlayerBadge() {
  const { player, signOut, signingOut } = usePlayerBadge();
  return (
    <div className="flex items-center gap-3">
      {player.status === "ready" ? (
        <span className="flex items-center gap-2">
          <Avatar src={player.avatarSrc} size={40} />
          <span className="font-game text-lg">{player.name}</span>
        </span>
      ) : (
        <span aria-hidden className="h-6 w-32 animate-pulse rounded-md bg-muted" />
      )}
      <ActionButton
        tone="quiet"
        size="small"
        icon="back"
        working={signingOut}
        workingLabel={accountCopy.signingOut}
        onClick={signOut}
      >
        {accountCopy.signOut}
      </ActionButton>
    </div>
  );
}
