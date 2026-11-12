"use client";

import { useToastDemo } from "./use-toast-demo";

export function useDesignShowcase() {
  const toasts = useToastDemo();
  return {
    toasts: toasts.toasts,
    showToast: toasts.show,
    dismiss: toasts.dismiss,
  };
}
