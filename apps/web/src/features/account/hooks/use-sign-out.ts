"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { loadPage } from "@/lib/load-page";
import { notify } from "@/lib/notify";
import { accountCopy } from "../copy";
import { closeSession } from "../lib/session-client";
import { startSigningOut, stopSigningOut } from "./use-signing-out";

export function useSignOut() {
  const { logout } = usePrivy();
  const [working, setWorking] = useState(false);

  return {
    working,
    async signOut() {
      setWorking(true);
      startSigningOut();
      try {
        await closeSession();
        await logout();
        loadPage("/");
      } catch (error) {
        stopSigningOut();
        console.error("Sign out failed.", error);
        notify.error(accountCopy.signOutProblem, { id: "sign-out" });
        setWorking(false);
      }
    },
  };
}
