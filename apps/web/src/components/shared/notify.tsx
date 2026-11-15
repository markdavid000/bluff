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

function showOneAtATime() {
  let current: string | null = null;
  const working = new Map<string, Notice>();

  function left(id: string) {
    if (current !== id) return;
    current = null;
    const next = [...working.values()].at(-1);
    if (next) present(next);
  }

  function present(notice: Notice) {
    const { id, kind, title, icon, action, staysMs } = notice;
    const before = current;
    current = id;
    if (before !== null && before !== id) toast.dismiss(before);
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
        id,
        duration: staysMs ?? STAYS_MS[kind],
        dismissible: kind !== "loading",
        onAutoClose: () => left(id),
        onDismiss: () => left(id),
      }
    );
  }

  return onNotice((event) => {
    if (event.type === "dismiss") {
      working.delete(event.id);
      toast.dismiss(event.id);
      return;
    }
    const { notice } = event;
    working.delete(notice.id);
    if (notice.kind === "loading") working.set(notice.id, notice);
    present(notice);
  });
}

export function GameToaster() {
  useEffect(showOneAtATime, []);
  return <Toaster position="top-center" visibleToasts={1} gap={10} />;
}
