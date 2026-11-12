"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notify } from "@/components/shared/notify";
import { accountCopy } from "../copy";
import { closeSession } from "../lib/session-client";

export function useSignOut() {
  const router = useRouter();
  const { logout } = usePrivy();
  const [working, setWorking] = useState(false);

  return {
    working,
    async signOut() {
      setWorking(true);
      try {
        await closeSession();
        await logout();
        notify.info(accountCopy.signedOut, { id: "sign-out" });
        router.replace("/");
      } catch (error) {
        console.error("Sign out failed.", error);
        notify.error(accountCopy.signInProblem, { id: "sign-out" });
        setWorking(false);
      }
    },
  };
}
