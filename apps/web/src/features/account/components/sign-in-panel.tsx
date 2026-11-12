"use client";

import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { accountCopy } from "../copy";
import { type SignInMethod, useSignIn } from "../hooks/use-sign-in";

const METHODS: { method: SignInMethod; label: string; tone: "red" | "blue" | "quiet" }[] = [
  { method: "google", label: accountCopy.google, tone: "red" },
  { method: "email", label: accountCopy.email, tone: "blue" },
  { method: "wallet", label: accountCopy.ownWallet, tone: "quiet" },
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
          {METHODS.map(({ method, label, tone }) => (
            <ActionButton
              key={method}
              tone={tone}
              size="large"
              disabled={busy}
              working={state.kind === "working" && state.method === method}
              workingLabel={accountCopy.signingIn}
              onClick={() => signIn(method)}
            >
              {label}
            </ActionButton>
          ))}
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
