"use client";

import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { ActionButton } from "./action-button";
import type { GameIconName } from "./game-icon";
import { ToastTile, type ToastKind } from "./toast-tile";

const STAYS_MS: Record<ToastKind, number> = {
  loading: Infinity,
  success: 3_000,
  info: 4_000,
  error: Infinity,
};

interface NotifyOptions {
  id?: string;
  icon?: GameIconName;
  action?: { label: ReactNode; onPress: () => void };
}

function show(kind: ToastKind, title: ReactNode, { id, icon, action }: NotifyOptions = {}) {
  return toast.custom(
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
}

export const notify = {
  loading: (title: ReactNode, options?: NotifyOptions) => show("loading", title, options),
  success: (title: ReactNode, options?: NotifyOptions) => show("success", title, options),
  info: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
  error: (title: ReactNode, options?: NotifyOptions) => show("error", title, options),
  dismiss: (id: string) => toast.dismiss(id),
};

export function GameToaster() {
  return <Toaster position="top-center" visibleToasts={3} expand gap={10} />;
}
