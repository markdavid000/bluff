"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useEffectEvent } from "react";
import { loadPage } from "@/lib/load-page";
import { safeNextPath } from "@/lib/safe-redirect";
import { openSession } from "../lib/session-client";

export function useRefreshSession(next: string | undefined) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const destination = safeNextPath(next);

  const onward = () =>
    destination.includes("#") ? destination : `${destination}${window.location.hash}`;
  const signIn = () => `/sign-in?next=${encodeURIComponent(onward())}`;

  const refresh = useEffectEvent(async () => {
    if (!authenticated) {
      loadPage(signIn());
      return;
    }
    const token = await getAccessToken();
    const opened = token ? await openSession(token) : false;
    loadPage(opened ? onward() : signIn());
  });

  const giveUp = useEffectEvent((error: unknown) => {
    console.error("Bluff could not refresh the session.", error);
    loadPage(signIn());
  });

  useEffect(() => {
    if (!ready) return;
    refresh().catch(giveUp);
  }, [ready]);
}
