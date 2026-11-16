"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { useId } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { PatternFrame } from "@/components/shared/pattern-band";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { accountCopy } from "../copy";
import { useWelcome } from "../hooks/use-welcome";
import { FacePicker } from "./face-picker";
import { NicknameInput } from "./nickname-input";

const OPPONENT_FACE = 11;

export function WelcomeForm() {
  const welcome = useWelcome();
  const calm = useCalmMotion();
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
                    <NicknameInput
                      id={nameId}
                      value={welcome.nickname}
                      onChange={welcome.changeNickname}
                      invalid={welcome.nicknameInvalid}
                      describedBy={helpId}
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
            <p id={helpId} className="text-sm text-muted-foreground">
              {accountCopy.nicknameHelp}
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-game text-lg">{accountCopy.faceLabel}</legend>
            <FacePicker
              faces={welcome.faces}
              chosen={welcome.avatar}
              onChoose={welcome.chooseAvatar}
            />
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
              welcome.confirmInWallet ? accountCopy.confirmInWallet : welcome.workingLabel
            }
          >
            {welcome.submitLabel}
          </ActionButton>
        </form>
      </PatternFrame>
    </div>
  );
}
