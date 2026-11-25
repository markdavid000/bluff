"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useCreateWallet, useLogin, useLoginWithOAuth, usePrivy } from "@privy-io/react-auth";
import { useEffect, useEffectEvent, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { keepFragmentFor, withKeptFragment } from "@/lib/carried-fragment";
import { loadPage } from "@/lib/load-page";
import { notify } from "@/lib/notify";
import { safeNextPath } from "@/lib/safe-redirect";
import { accountCopy } from "../copy";
import { makeWalletOnce } from "../lib/player-wallet";
import { openSession } from "../lib/session-client";

export type SignInMethod = "google" | "email" | "wallet";

type SignInState = { kind: "choosing" } | { kind: "working"; method: SignInMethod | "returning" };

const USER_CANCELLED = new Set(["exited_auth_flow", "user_exited_auth_flow"]);

export function useSignIn(next: string | undefined) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { createWallet } = useCreateWallet();
  const publicClient = usePublicClient({ chainId: gameChain.id });
  const [chosen, setChosen] = useState<SignInState>({ kind: "choosing" });
  const [returnFailed, setReturnFailed] = useState(false);
  const [returnAttempt, setReturnAttempt] = useState(0);
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
    if (!publicClient) throw new Error("The game network is not ready yet.");
    if (!user) throw new Error("Privy has not shared the player yet.");
    const address = (user.wallet?.address ??
      (await makeWalletOnce(user.id, () => createWallet()))) as Address;
    const token = await getAccessToken();
    if (!token || !(await openSession(token))) throw new Error("Privy gave no usable session.");
    const nickname = await publicClient.readContract({
      address: contracts.faucet,
      abi: chipFaucetAbi,
      functionName: "nicknameOf",
      args: [address],
    });
    const onward = withKeptFragment(destination);
    loadPage(nickname === "" ? `/welcome?next=${encodeURIComponent(onward)}` : onward);
  });

  useEffect(() => {
    keepFragmentFor(destination, window.location.hash);
  }, [destination]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    enter().catch(failFromEffect);
  }, [ready, authenticated, returnAttempt]);

  const state: SignInState =
    ready && authenticated && !returnFailed ? { kind: "working", method: "returning" } : chosen;

  return {
    ready,
    state,
    signIn(method: SignInMethod) {
      setReturnFailed(false);
      if (authenticated) {
        setReturnAttempt((attempt) => attempt + 1);
        return;
      }
      setChosen({ kind: "working", method });
      if (method === "google") {
        initOAuth({ provider: "google" }).catch(failed);
        return;
      }
      login({ loginMethods: [method] });
    },
  };
}
