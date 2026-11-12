"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useEffectEvent, useRef } from "react";
import { SESSION_RENEW_MS, closeSession, openSession } from "../lib/session-client";

export function useSessionKeeper() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const wasSignedIn = useRef(false);

  const renew = useEffectEvent(async () => {
    const token = await getAccessToken();
    if (token) await openSession(token);
  });

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      if (wasSignedIn.current) {
        wasSignedIn.current = false;
        closeSession().catch((error: unknown) =>
          console.error("Bluff could not close the session after sign-out.", error)
        );
      }
      return;
    }
    wasSignedIn.current = true;
    const keepAlive = () =>
      renew().catch((error: unknown) => console.error("Bluff could not renew the session.", error));
    void keepAlive();
    const timer = window.setInterval(keepAlive, SESSION_RENEW_MS);
    return () => window.clearInterval(timer);
  }, [ready, authenticated]);
}
