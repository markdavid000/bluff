"use client";

import { useCreateWallet, usePrivy } from "@privy-io/react-auth";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { errorCopy } from "@/lib/copy";
import { notify } from "@/lib/notify";
import { accountCopy } from "../copy";
import { makeWalletOnce } from "../lib/player-wallet";

export function useWalletKeeper() {
  const { ready, authenticated, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const missing = ready && authenticated && user !== null && !user.wallet;

  function makeWallet() {
    setFailed(false);
    if (!user) return;
    makeWalletOnce(user.id, () => createWallet()).catch((error: unknown) => {
      console.error("Bluff could not make the player's wallet.", error);
      setFailed(true);
      notify.error(accountCopy.walletProblem, {
        id: "wallet",
        action: { label: errorCopy.tryAgain, onPress: makeWallet },
      });
    });
  }

  const makeWalletOnMount = useEffectEvent(makeWallet);

  useEffect(() => {
    if (!missing || started.current) return;
    started.current = true;
    makeWalletOnMount();
  }, [missing]);

  return { failed };
}
