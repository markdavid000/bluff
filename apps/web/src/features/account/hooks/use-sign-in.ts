"use client";

import { useLogin, useLoginWithOAuth, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { notify } from "@/lib/notify";
import { safeNextPath } from "@/lib/safe-redirect";
import { accountCopy } from "../copy";
import { openSession } from "../lib/session-client";

export type SignInMethod = "google" | "email" | "wallet";

type SignInState = { kind: "choosing" } | { kind: "working"; method: SignInMethod | "returning" };

const USER_CANCELLED = new Set(["exited_auth_flow", "user_exited_auth_flow"]);

export function useSignIn(next: string | undefined) {
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [chosen, setChosen] = useState<SignInState>({ kind: "choosing" });
  const [returnFailed, setReturnFailed] = useState(false);
  const destination = safeNextPath(next);

  const failed = (error: unknown) => {
    setChosen({ kind: "choosing" });
    if (typeof error === "string" && USER_CANCELLED.has(error)) {
      notify.info(accountCopy.cancelled, { id: "sign-in" });
      return;
    }
    console.error("Sign in failed.", error);
    notify.error(accountCopy.signInProblem, { id: "sign-in" });
  };

  const failFromEffect = useEffectEvent((error: unknown) => {
    setReturnFailed(true);
    failed(error);
  });
  const { login } = useLogin({ onError: failed });
  const { initOAuth } = useLoginWithOAuth({ onError: failed });

  const enter = useEffectEvent(async () => {
    const token = await getAccessToken();
    if (!token || !(await openSession(token))) throw new Error("Privy gave no usable session.");
    router.replace(destination);
  });

  useEffect(() => {
    if (!ready || !authenticated) return;
    enter().catch(failFromEffect);
  }, [ready, authenticated]);

  const state: SignInState =
    ready && authenticated && !returnFailed ? { kind: "working", method: "returning" } : chosen;

  return {
    ready,
    state,
    signIn(method: SignInMethod) {
      setReturnFailed(false);
      setChosen({ kind: "working", method });
      if (method === "google") {
        initOAuth({ provider: "google" }).catch(failed);
        return;
      }
      login({ loginMethods: [method] });
    },
  };
}
