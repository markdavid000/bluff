"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { type NoticeKind, onNotice } from "@/lib/notify";
import { ActionButton } from "./action-button";
import { ToastTile } from "./toast-tile";

const STAYS_MS: Record<NoticeKind, number> = {
  loading: Infinity,
  success: 3_000,
  info: 4_000,
  error: 6_000,
};

export function GameToaster() {
  useEffect(
    () =>
      onNotice((event) => {
        if (event.type === "dismiss") {
          toast.dismiss(event.id);
          return;
        }
        const { id, kind, title, icon, action } = event.notice;
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
          { id, duration: STAYS_MS[kind] }
        );
      }),
    []
  );
  return <Toaster position="top-center" visibleToasts={3} expand gap={10} />;
}
