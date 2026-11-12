"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { accountCopy } from "../copy";
import { usePlayerBadge } from "../hooks/use-player-badge";

export function PlayerBadge() {
  const { player, signOut, signingOut, open, setOpen } = usePlayerBadge();

  if (player.status === "failed") {
    return (
      <ActionButton
        tone="quiet"
        size="small"
        icon="target"
        title={accountCopy.profileProblem}
        onClick={() => void player.refresh()}
      >
        {accountCopy.tryAgain}
      </ActionButton>
    );
  }

  if (player.status !== "ready") {
    return <span aria-hidden className="h-10 w-40 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!signingOut) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <ActionButton tone="quiet" size="small" aria-label={accountCopy.openPlayer(player.name)}>
          <Avatar src={player.avatarSrc} size={30} />
          <span className="font-game text-lg">{player.name}</span>
        </ActionButton>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <PatternFrame>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <Avatar src={player.avatarSrc} size={112} />
            <DialogTitle>{player.name}</DialogTitle>
            <ActionButton
              tone="quiet"
              icon="back"
              working={signingOut}
              workingLabel={accountCopy.signingOut}
              onClick={signOut}
            >
              {accountCopy.signOut}
            </ActionButton>
          </div>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
