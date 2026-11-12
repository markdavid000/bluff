"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { safeNextPath } from "@/lib/safe-redirect";
import { openSession } from "../lib/session-client";

export function useRefreshSession(next: string | undefined) {
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const destination = safeNextPath(next);
  const signIn = `/sign-in?next=${encodeURIComponent(destination)}`;

  const refresh = useEffectEvent(async () => {
    if (!authenticated) {
      router.replace(signIn);
      return;
    }
    const token = await getAccessToken();
    const opened = token ? await openSession(token) : false;
    router.replace(opened ? destination : signIn);
  });

  useEffect(() => {
    if (!ready) return;
    refresh().catch((error: unknown) => {
      console.error("Bluff could not refresh the session.", error);
      router.replace(signIn);
    });
  }, [ready, router, signIn]);
}
