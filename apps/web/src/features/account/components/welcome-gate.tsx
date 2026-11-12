"use client";

import type { ReactNode } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { accountCopy } from "../copy";
import { useWelcomeGate } from "../hooks/use-welcome-gate";

export function WelcomeGate({ children }: { children: ReactNode }) {
  const { view, retry } = useWelcomeGate();
  if (view === "page") return children;
  if (view === "failed") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="font-game text-2xl">{accountCopy.profileProblem}</p>
        <ActionButton tone="quiet" icon="target" onClick={retry}>
          {accountCopy.tryAgain}
        </ActionButton>
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col items-center gap-6">
      <TumblingDie />
      <p className="font-game text-2xl">{accountCopy.gettingReady}</p>
    </div>
  );
}
