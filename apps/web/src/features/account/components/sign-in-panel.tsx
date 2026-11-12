"use client";

import { ActionButton } from "@/components/shared/action-button";
import type { GameIconName } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { accountCopy } from "../copy";
import { type SignInMethod, useSignIn } from "../hooks/use-sign-in";

const METHODS: {
  method: SignInMethod;
  label: string;
  tone: "red" | "blue";
  icon: GameIconName;
}[] = [
  { method: "google", label: accountCopy.google, tone: "red", icon: "lock" },
  { method: "email", label: accountCopy.email, tone: "blue", icon: "chat-bubble" },
];

export function SignInPanel({ next }: { next: string | undefined }) {
  const { ready, state, signIn } = useSignIn(next);
  const busy = !ready || state.kind === "working";

  return (
    <PatternFrame className="w-full max-w-md">
      <div className="flex flex-col gap-5 py-2">
        <h2 className="text-center text-4xl">{accountCopy.signInTitle}</h2>
        <p className="text-center text-base text-muted-foreground">{accountCopy.signInIntro}</p>
        <div className="flex flex-col gap-4" aria-busy={busy}>
          {METHODS.map(({ method, label, tone, icon }) => (
            <ActionButton
              key={method}
              tone={tone}
              icon={icon}
              size="large"
              disabled={busy}
              working={state.kind === "working" && state.method === method}
              workingLabel={accountCopy.signingIn}
              onClick={() => signIn(method)}
            >
              {label}
            </ActionButton>
          ))}
          <button
            type="button"
            data-variant="link"
            disabled={busy}
            onClick={() => signIn("wallet")}
            className="self-center rounded-md px-2 py-1 text-base font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-60"
          >
            {state.kind === "working" && state.method === "wallet"
              ? accountCopy.signingIn
              : accountCopy.ownWallet}
          </button>
        </div>
        {state.kind === "working" && state.method === "returning" && (
          <p role="status" className="text-center font-game text-lg">
            {accountCopy.signingIn}
          </p>
        )}
      </div>
    </PatternFrame>
  );
}
