"use client";

import { cn } from "cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { PatternFrame } from "@/components/shared/pattern-band";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { accountCopy } from "../copy";
import { useWelcome } from "../hooks/use-welcome";

const OPPONENT_FACE = 11;

export function WelcomeForm({ next }: { next: string | undefined }) {
  const welcome = useWelcome(next);
  const calm = useReducedMotion();
  const nameId = useId();
  const helpId = useId();

  return (
    <div className="flex max-h-full w-full max-w-2xl flex-col items-center gap-4">
      <div aria-hidden className="flex items-center justify-center gap-4 sm:gap-8">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={welcome.avatar}
            initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 12 }}
            transition={calm ? { duration: 0.12 } : { type: "spring", stiffness: 380, damping: 22 }}
          >
            <Avatar
              src={`/avatars/${welcome.avatar}.svg`}
              size={88}
              className="ring-4 ring-seat-red"
            />
          </motion.div>
        </AnimatePresence>
        <div className="flex size-20 items-center justify-center">
          <TumblingDie className="scale-[0.62]" />
        </div>
        <Avatar src={`/avatars/${OPPONENT_FACE}.svg`} size={88} className="ring-4 ring-seat-blue" />
      </div>
      <PatternFrame className="min-h-0 w-full overflow-y-auto">
        <form
          className="flex flex-col gap-5 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            welcome.submit();
          }}
        >
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-3xl sm:text-4xl">{accountCopy.welcomeHeading}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">{accountCopy.welcomeIntro}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={nameId} className="font-game text-lg">
              {accountCopy.nicknameLabel}
            </label>
            <div className="flex flex-wrap gap-3">
              <div className="relative min-h-12 flex-1 overflow-hidden rounded-xl">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={welcome.suggestion}
                    initial={calm ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={calm ? { opacity: 0 } : { opacity: 0, y: -18, filter: "blur(3px)" }}
                    transition={
                      calm ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 32 }
                    }
                  >
                    <input
                      id={nameId}
                      value={welcome.nickname}
                      onChange={(event) => welcome.changeNickname(event.target.value)}
                      maxLength={20}
                      autoComplete="nickname"
                      aria-describedby={helpId}
                      aria-invalid={welcome.nicknameError ? true : undefined}
                      className="min-h-12 w-full rounded-xl border-2 border-tile-edge bg-card px-4 font-game text-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/60 aria-invalid:border-destructive"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              <ActionButton
                tone="quiet"
                size="medium"
                icon="chat-bubble"
                type="button"
                working={welcome.suggesting}
                workingLabel={accountCopy.suggesting}
                onClick={welcome.suggestAnother}
              >
                {accountCopy.suggestAnother}
              </ActionButton>
            </div>
            <p
              id={helpId}
              className={cn(
                "text-sm",
                welcome.nicknameError ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {welcome.nicknameError ?? accountCopy.nicknameHelp}
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-game text-lg">{accountCopy.faceLabel}</legend>
            <div
              role="radiogroup"
              aria-label={accountCopy.faceLabel}
              className="grid grid-cols-6 gap-2"
            >
              {welcome.faces.map((face) => {
                const selected = welcome.avatar === face;
                return (
                  <button
                    key={face}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={accountCopy.faceNumber(face)}
                    onClick={() => welcome.chooseAvatar(face)}
                    className={cn(
                      "rounded-full p-1 transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/60",
                      selected
                        ? "-translate-y-1 bg-accent shadow-[0_5px_0_0_var(--color-tile-edge)]"
                        : "hover:-translate-y-0.5"
                    )}
                  >
                    <Avatar src={`/avatars/${face}.svg`} size={52} className="size-full" />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <ActionButton
            type="submit"
            tone="red"
            size="large"
            icon="cowrie"
            sound="shekere"
            disabled={!welcome.canSave}
            working={welcome.working}
            workingLabel={
              welcome.confirmInWallet ? accountCopy.confirmInWallet : accountCopy.welcomeWorking
            }
          >
            {accountCopy.welcomeSubmit}
          </ActionButton>
        </form>
      </PatternFrame>
    </div>
  );
}
