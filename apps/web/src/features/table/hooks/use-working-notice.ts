"use client";

import { useEffect } from "react";
import { notify } from "@/lib/notify";

export function useWorkingNotice(id: string, title: string, working: boolean) {
  useEffect(() => {
    if (!working) return;
    notify.loading(title, { id });
    return () => notify.dismiss(id);
  }, [id, title, working]);
}
