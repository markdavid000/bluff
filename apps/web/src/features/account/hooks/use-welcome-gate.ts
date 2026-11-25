"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { arriveAtTable, useHeadingTo, useTakingSeat } from "@/hooks/use-go-to-table";
import { forgetGoneSeats, useIsSeatGone } from "@/hooks/use-left-tables";
import { useMyTableId } from "@/hooks/use-my-table-id";
import { safeNextPath } from "@/lib/safe-redirect";
import { tablePath } from "@/lib/table-links";
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
  const seat = useMyTableId();
  const seatId = seat.status === "ready" ? seat.id : null;
  const seatGone = useIsSeatGone(seatId);
  const headingTo = useHeadingTo();
  const takingSeat = useTakingSeat();
  const myTable =
    seatId !== null && !seatGone && !takingSeat && seatId !== headingTo ? tablePath(seatId) : null;
  const named = player.status === "ready" && player.nickname !== null;
  const goTo =
    player.status !== "ready"
      ? null
      : player.nickname === null
        ? onWelcome
          ? null
          : "welcome"
        : myTable !== null
          ? pathname === myTable
            ? null
            : "table"
          : onWelcome
            ? "onward"
            : null;
  const findingSeat = named && seat.status === "loading";

  useEffect(() => {
    if (seat.status === "ready") forgetGoneSeats(seat.id);
  }, [seat]);

  useEffect(() => {
    if (headingTo !== null && pathname === tablePath(headingTo)) arriveAtTable();
  }, [headingTo, pathname]);

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
    if (goTo === "table" && myTable !== null) {
      router.replace(myTable);
    } else if (goTo === "onward") {
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    } else if (goTo === "welcome") {
      router.replace(`${WELCOME}?next=${encodeURIComponent(`${pathname}${window.location.hash}`)}`);
    }
  }, [goTo, myTable, pathname, router]);

  const view: GateView =
    player.status === "failed" || (signedOut && closeFailed)
      ? "failed"
      : player.status === "ready" && goTo === null && !findingSeat
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
