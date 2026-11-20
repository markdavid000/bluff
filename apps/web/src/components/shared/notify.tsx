"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { type Notice, type NoticeKind, onNotice } from "@/lib/notify";
import { ActionButton } from "./action-button";
import { ToastTile } from "./toast-tile";

const STAYS_MS: Record<NoticeKind, number> = {
  loading: Infinity,
  success: 3_000,
  info: 4_000,
  error: 6_000,
};

let shownCount = 0;

function showOneAtATime() {
  let stopped = false;
  let current: string | null = null;
  const working = new Map<string, Notice>();
  const onScreen = new Map<string, string>();
  const lingering = new Map<string, Set<string>>();

  function sweep(id: string, keep?: string) {
    lingering.get(id)?.forEach((shownAs) => {
      if (shownAs !== keep) toast.dismiss(shownAs);
    });
  }

  function hide(id: string) {
    onScreen.delete(id);
    sweep(id);
  }

  function showNext() {
    current = null;
    const next = [...working.values()].at(-1);
    if (next) present(next);
  }

  function left(id: string, shownAs: string) {
    if (stopped) return;
    lingering.get(id)?.delete(shownAs);
    if (onScreen.get(id) !== shownAs) return;
    onScreen.delete(id);
    if (current === id) showNext();
  }

  function present(notice: Notice) {
    const { id, kind, title, icon, action, staysMs } = notice;
    const before = current;
    current = id;
    if (before !== null && before !== id) hide(before);
    const shownAs = onScreen.get(id) ?? `${id}-${(shownCount += 1)}`;
    onScreen.set(id, shownAs);
    sweep(id, shownAs);
    lingering.set(id, (lingering.get(id) ?? new Set()).add(shownAs));
    toast.custom(
      (toastId) => (
        <ToastTile
          kind={kind}
          title={title}
          icon={icon}
          action={
            action ? (
              <ActionButton
                tone="quiet"
                size="small"
                icon="target"
                onClick={() => {
                  toast.dismiss(toastId);
                  action.onPress();
                }}
              >
                {action.label}
              </ActionButton>
            ) : undefined
          }
        />
      ),
      {
        id: shownAs,
        duration: staysMs ?? STAYS_MS[kind],
        dismissible: kind !== "loading",
        onAutoClose: () => left(id, shownAs),
        onDismiss: () => left(id, shownAs),
      }
    );
  }

  const stopListening = onNotice((event) => {
    if (event.type === "dismiss") {
      working.delete(event.id);
      hide(event.id);
      if (current === event.id) showNext();
      return;
    }
    const { notice } = event;
    working.delete(notice.id);
    if (notice.kind === "loading") working.set(notice.id, notice);
    present(notice);
  });

  return () => {
    stopped = true;
    stopListening();
  };
}

export function GameToaster() {
  useEffect(showOneAtATime, []);
  return <Toaster position="top-center" visibleToasts={1} gap={10} />;
}
