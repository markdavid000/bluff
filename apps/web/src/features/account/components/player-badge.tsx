"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { PatternFrame } from "@/components/shared/pattern-band";
import { ScreenControls } from "@/components/shared/screen-controls";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { accountCopy } from "../copy";
import { usePlayerBadge } from "../hooks/use-player-badge";
import { holdOpenWhile } from "@/lib/hold-open";
import Link from "next/link";
import { useId } from "react";
import { GameIcon } from "@/components/shared/game-icon";
import { FacePicker } from "./face-picker";
import { NicknameInput } from "./nickname-input";

export function PlayerBadge() {
  const { player, signOut, signingOut, open, setOpen, profile } = usePlayerBadge();
  const nameId = useId();
  const helpId = useId();
  const busy = signingOut || profile.saving;
  const busyLabel = signingOut
    ? accountCopy.signingOut
    : profile.savingName
      ? accountCopy.savingName
      : accountCopy.savingFace;
  const label = (working: string) =>
    profile.confirmInWallet ? accountCopy.confirmInWallet : working;

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
    return (
      <span aria-hidden className="h-10 w-40 animate-pulse rounded-xl bg-muted calm:animate-none" />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={holdOpenWhile(busy, busyLabel, (next) => {
        if (!next) profile.back();
        setOpen(next);
      })}
    >
      <DialogTrigger asChild>
        <ActionButton tone="quiet" size="small" aria-label={accountCopy.openPlayer(player.name)}>
          <Avatar src={player.avatarSrc} size={30} />
          <span className="hidden font-game text-lg sm:inline">{player.name}</span>
        </ActionButton>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <PatternFrame roomy>
          {profile.panel === "name" ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                profile.saveName();
              }}
            >
              <DialogTitle>{accountCopy.changeName}</DialogTitle>
              <div className="flex flex-col gap-2">
                <label htmlFor={nameId} className="font-game text-lg">
                  {accountCopy.nicknameLabel}
                </label>
                <NicknameInput
                  id={nameId}
                  value={profile.nickname}
                  onChange={profile.changeNickname}
                  invalid={profile.nicknameInvalid}
                  describedBy={helpId}
                />
                <p id={helpId} className="text-sm text-muted-foreground">
                  {accountCopy.nicknameHelp}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  type="submit"
                  tone="green"
                  icon="tick"
                  disabled={!profile.canSaveName}
                  working={profile.savingName}
                  workingLabel={label(accountCopy.savingName)}
                >
                  {accountCopy.saveName}
                </ActionButton>
                <ActionButton
                  type="button"
                  tone="quiet"
                  icon="back"
                  disabled={profile.saving}
                  onClick={profile.back}
                >
                  {accountCopy.backToProfile}
                </ActionButton>
              </div>
            </form>
          ) : profile.panel === "face" ? (
            <div className="flex flex-col gap-4">
              <DialogTitle>{accountCopy.changeFace}</DialogTitle>
              <FacePicker
                faces={profile.faces}
                chosen={profile.face}
                onChoose={profile.chooseFace}
                disabled={profile.saving}
              />
              <p aria-live="polite" className="min-h-6 text-center font-game text-base">
                {profile.savingFace ? label(accountCopy.savingFace) : ""}
              </p>
              <ActionButton
                type="button"
                tone="quiet"
                icon="back"
                disabled={profile.saving}
                onClick={profile.back}
              >
                {accountCopy.backToProfile}
              </ActionButton>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <Avatar src={player.avatarSrc} size={112} />
              <DialogTitle>{player.name}</DialogTitle>
              <div className="flex flex-wrap justify-center gap-3">
                <ActionButton tone="green" icon="chat-bubble" onClick={profile.editName}>
                  {accountCopy.changeName}
                </ActionButton>
                <ActionButton tone="yellow" icon="setting" onClick={profile.editFace}>
                  {accountCopy.changeFace}
                </ActionButton>
                <Link
                  href="/history"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-seat-blue px-4 py-2.5 font-game text-base text-seat-foreground shadow-[0_5px_0_0_var(--color-seat-blue-edge)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-seat-blue-edge)] calm:transition-none"
                >
                  <GameIcon name="trophy" size={22} />
                  {accountCopy.yourGames}
                </Link>
              </div>
              <ScreenControls />
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
          )}
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
