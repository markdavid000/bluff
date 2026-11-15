"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { safeNextPath } from "@/lib/safe-redirect";
import { closeSession } from "../lib/session-client";
import { usePlayer } from "./use-player";

const WELCOME = "/welcome";

type GateView = "waiting" | "failed" | "page";

export function useWelcomeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const player = usePlayer();
  const [closeAttempt, setCloseAttempt] = useState(0);
  const [closeFailed, setCloseFailed] = useState(false);
  const onWelcome = pathname === WELCOME;
  const signedOut = player.status === "signed-out";
  const goTo =
    player.status !== "ready"
      ? null
      : player.nickname === null
        ? onWelcome
          ? null
          : "welcome"
        : onWelcome
          ? "onward"
          : null;

  useEffect(() => {
    if (!signedOut) return;
    let current = true;
    closeSession().then(
      () => {
        if (current) {
          router.replace(
            `/sign-in?next=${encodeURIComponent(`${pathname}${window.location.hash}`)}`
          );
        }
      },
      (error: unknown) => {
        console.error("Bluff could not close the old session.", error);
        if (current) setCloseFailed(true);
      }
    );
    return () => {
      current = false;
    };
  }, [signedOut, pathname, router, closeAttempt]);

  useEffect(() => {
    if (goTo === "onward") {
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    } else if (goTo === "welcome") {
      router.replace(`${WELCOME}?next=${encodeURIComponent(`${pathname}${window.location.hash}`)}`);
    }
  }, [goTo, pathname, router]);

  const view: GateView =
    player.status === "failed" || (signedOut && closeFailed)
      ? "failed"
      : player.status === "ready" && goTo === null
        ? "page"
        : "waiting";

  return {
    view,
    retry: () => {
      if (signedOut) {
        setCloseFailed(false);
        setCloseAttempt((attempt) => attempt + 1);
      } else {
        void player.refresh();
      }
    },
  };
}
