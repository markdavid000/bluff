"use client";

import { useSyncExternalStore } from "react";
import { readInviteCode } from "@/lib/table-links";

function onHashChange(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

const codeInLink = () => readInviteCode(window.location.hash);
const NO_CODE_ON_SERVER = () => null;

export function useLinkInvite(): bigint | null {
  return useSyncExternalStore(onHashChange, codeInLink, NO_CODE_ON_SERVER);
}
