"use client";

import { useDesignSettings } from "./use-design-settings";
import { useToastDemo } from "./use-toast-demo";

export function useDesignShowcase() {
  const settings = useDesignSettings();
  const toasts = useToastDemo();
  return {
    ...settings,
    toasts: toasts.toasts,
    showToast: toasts.show,
    dismiss: toasts.dismiss,
  };
}
