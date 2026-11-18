"use client";

import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { DieFace } from "@/components/shared/die";
import type { GameIconName } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { RaisedCard } from "@/components/shared/raised-card";
import { ToastTile } from "@/components/shared/toast-tile";
import { ScreenControls } from "@/components/shared/screen-controls";
import { TumblingDie } from "@/components/shared/tumbling-die";
import type { Face } from "@bluff/game";
import { designCopy } from "../copy";
import { useDesignShowcase } from "../hooks/use-design-showcase";
import { DEMO_KIND, type DemoMessage } from "../hooks/use-toast-demo";

const FACES: Face[] = [1, 2, 3, 4, 5, 6];

const MESSAGES: Record<DemoMessage, { text: string; icon: GameIconName }> = {
  success: { text: designCopy.successMessage, icon: "chat-bubble" },
  bid: { text: designCopy.bidMessage, icon: "chat-bubble" },
  calledYou: { text: designCopy.calledYouMessage, icon: "megaphone" },
  youCalled: { text: designCopy.youCalledMessage, icon: "megaphone" },
  problem: { text: designCopy.errorMessage, icon: "back" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="font-heading text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export function DesignShowcase({ board }: { board: ReactNode }) {
  const page = useDesignShowcase();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl sm:text-5xl">{designCopy.pageTitle}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{designCopy.intro}</p>
      </header>

      <Section title={designCopy.settings}>
        <div className="flex flex-wrap gap-3">
          <ScreenControls />
        </div>
      </Section>

      <Section title={designCopy.heroTitle}>
        <PatternFrame>
          <div className="flex flex-col items-center gap-6 py-6 text-center sm:flex-row sm:text-left">
            <TumblingDie />
            <div className="flex flex-1 flex-col gap-4">
              <p className="font-heading text-5xl">{designCopy.typeHeading}</p>
              <p className="font-game text-xl">{designCopy.heroTagline}</p>
              <ActionButton
                tone="red"
                size="large"
                icon="play"
                className="self-center sm:self-start"
              >
                {designCopy.play}
              </ActionButton>
            </div>
          </div>
        </PatternFrame>
      </Section>

      <Section title={designCopy.typeTitle}>
        <p className="font-heading text-4xl">{designCopy.typeHeading}</p>
        <p className="font-game text-2xl">{designCopy.typeGame}</p>
        <p className="max-w-2xl text-base">{designCopy.typeBody}</p>
      </Section>

      <Section title={designCopy.buttonsTitle}>
        <div className="flex flex-wrap gap-4">
          <ActionButton tone="red" icon="play">
            {designCopy.play}
          </ActionButton>
          <ActionButton tone="green" icon="chat-bubble" sound="knock">
            {designCopy.bid}
          </ActionButton>
          <ActionButton tone="yellow" icon="link">
            {designCopy.invite}
          </ActionButton>
          <ActionButton tone="blue" icon="3d-coin" sound="shekere">
            {designCopy.chips}
          </ActionButton>
          <ActionButton tone="danger" icon="megaphone" sound="drum">
            {designCopy.callBluff}
          </ActionButton>
          <ActionButton tone="quiet" icon="back">
            {designCopy.quiet}
          </ActionButton>
          <ActionButton tone="green" icon="chat-bubble" working workingLabel={designCopy.working}>
            {designCopy.bid}
          </ActionButton>
        </div>
      </Section>

      <Section title={designCopy.cardsTitle}>
        <div className="grid gap-6 sm:grid-cols-3">
          {designCopy.cards.map((card) => (
            <RaisedCard key={card.title}>
              <h3 className="font-heading text-2xl">{card.title}</h3>
              <p className="mt-2 text-base text-muted-foreground">{card.body}</p>
            </RaisedCard>
          ))}
        </div>
      </Section>

      <Section title={designCopy.toastsTitle}>
        <div className="flex flex-wrap gap-3">
          <ActionButton tone="green" size="small" onClick={() => page.showToast("success")}>
            {designCopy.showSuccess}
          </ActionButton>
          <ActionButton
            tone="blue"
            size="small"
            icon="chat-bubble"
            sound="knock"
            onClick={() => page.showToast("bid")}
          >
            {designCopy.showBid}
          </ActionButton>
          <ActionButton
            tone="yellow"
            size="small"
            icon="megaphone"
            sound="drum"
            onClick={() => page.showToast("calledYou")}
          >
            {designCopy.showCalledYou}
          </ActionButton>
          <ActionButton
            tone="quiet"
            size="small"
            icon="megaphone"
            onClick={() => page.showToast("youCalled")}
          >
            {designCopy.showYouCalled}
          </ActionButton>
          <ActionButton tone="danger" size="small" onClick={() => page.showToast("problem")}>
            {designCopy.showError}
          </ActionButton>
        </div>
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4 [perspective:800px]"
        >
          <AnimatePresence initial={false}>
            {page.toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
                <ToastTile
                  kind={DEMO_KIND[toast.message]}
                  title={MESSAGES[toast.message].text}
                  icon={MESSAGES[toast.message].icon}
                  action={
                    toast.message === "problem" ? (
                      <ActionButton
                        tone="quiet"
                        size="small"
                        onClick={() => page.dismiss(toast.id)}
                      >
                        {designCopy.tryAgain}
                      </ActionButton>
                    ) : undefined
                  }
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </Section>

      <Section title={designCopy.patternTitle}>
        <PatternFrame>
          <p className="font-game text-lg">{designCopy.patternBody}</p>
        </PatternFrame>
      </Section>

      <Section title={designCopy.diceTitle}>
        <div className="flex flex-wrap gap-4">
          {FACES.map((face) => (
            <DieFace key={face} face={face} className="size-14" />
          ))}
        </div>
      </Section>

      <Section title={designCopy.boardTitle}>
        <p className="max-w-2xl text-base text-muted-foreground">{designCopy.boardBody}</p>
        {board}
      </Section>
    </div>
  );
}
