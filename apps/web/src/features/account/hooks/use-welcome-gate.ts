"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePlayer } from "./use-player";

export function useWelcomeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const player = usePlayer();
  const needsWelcome = player.status === "ready" && player.nickname === null;
  const onWelcome = pathname === "/welcome";

  useEffect(() => {
    if (needsWelcome && !onWelcome) {
      router.replace(`/welcome?next=${encodeURIComponent(pathname)}`);
    }
    if (player.status === "ready" && !needsWelcome && onWelcome) router.replace("/play");
  }, [needsWelcome, onWelcome, pathname, player.status, router]);
}
