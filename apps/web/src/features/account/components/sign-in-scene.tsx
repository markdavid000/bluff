import { PatternBackdrop } from "@/components/shared/pattern-backdrop";
import { RaisedCard } from "@/components/shared/raised-card";
import { ScreenControls } from "@/components/shared/screen-controls";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { accountCopy } from "../copy";
import { SignInPanel } from "./sign-in-panel";

export function SignInScene({ next }: { next: string | undefined }) {
  return (
    <div className="relative isolate flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 py-6">
      <div aria-hidden className="absolute inset-0 -z-20 glow-backdrop" />
      <PatternBackdrop className="-z-10 text-pattern opacity-[0.07]" />
      <ScreenControls className="absolute top-4 right-4" />
      <div className="grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <section aria-labelledby="welcome-title" className="flex flex-col gap-8">
          <div className="flex items-center gap-6">
            <TumblingDie className="size-24 shrink-0 sm:size-28" />
            <div className="flex flex-col gap-2">
              <h1
                id="welcome-title"
                className="text-6xl drop-shadow-[0_4px_0_var(--color-tile-edge)] sm:text-7xl"
              >
                {accountCopy.welcomeTitle}
              </h1>
              <p className="font-game text-xl sm:text-2xl">{accountCopy.welcomeTagline}</p>
            </div>
          </div>
          <div className="hidden gap-5 sm:grid sm:grid-cols-3">
            {accountCopy.welcomeSteps.map((step) => (
              <RaisedCard key={step.title} className="p-5">
                <h3 className="text-xl">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </RaisedCard>
            ))}
          </div>
        </section>
        <div className="flex justify-center lg:justify-end">
          <SignInPanel next={next} />
        </div>
      </div>
    </div>
  );
}
