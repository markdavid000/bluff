"use client";

import { TumblingDie } from "@/components/shared/tumbling-die";
import { accountCopy } from "../copy";
import { useRefreshSession } from "../hooks/use-refresh-session";

export function RefreshScreen({ next }: { next: string | undefined }) {
  useRefreshSession(next);
  return (
    <div role="status" className="flex flex-col items-center gap-6">
      <TumblingDie />
      <p className="font-game text-2xl">{accountCopy.refreshing}</p>
    </div>
  );
}
