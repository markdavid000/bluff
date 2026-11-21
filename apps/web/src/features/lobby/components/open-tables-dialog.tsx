"use client";

import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { lobbyCopy } from "../copy";
import type { OpenTables } from "../hooks/use-open-tables";
import type { LobbyTable } from "../lib/tables";
import { EmptyTablesArt } from "./empty-tables-art";
import { OpenTableCard } from "./open-table-card";
import { holdOpenWhile } from "@/lib/hold-open";

export function OpenTablesDialog({
  open,
  onOpenChange,
  openTables,
  problemFor,
  busy,
  busyLabel,
  onJoin,
  onQuickPlay,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openTables: OpenTables;
  problemFor: (buyIn: bigint) => string | null;
  busy: boolean;
  busyLabel: string;
  onJoin: (table: LobbyTable) => void;
  onQuickPlay: () => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={holdOpenWhile(busy, busyLabel, onOpenChange)}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-6xl">
        <PatternFrame roomy>
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{lobbyCopy.openTables}</DialogTitle>
              <DialogClose asChild>
                <ActionButton tone="quiet" size="small" icon="back" disabled={busy}>
                  {lobbyCopy.close}
                </ActionButton>
              </DialogClose>
            </div>
            {openTables.status === "ready" ? (
              openTables.tables.length === 0 ? (
                <div className="flex flex-col items-center gap-6 py-4 text-center">
                  <EmptyTablesArt className="w-full max-w-sm" />
                  <p className="font-game text-2xl">{lobbyCopy.noOpenTables}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <ActionButton
                      tone="red"
                      icon="play"
                      sound="drum"
                      disabled={busy}
                      onClick={onQuickPlay}
                    >
                      {lobbyCopy.quickPlay}
                    </ActionButton>
                    <ActionButton tone="blue" icon="plus" disabled={busy} onClick={onCreate}>
                      {lobbyCopy.createTable}
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <ul className="grid max-h-[60dvh] gap-5 overflow-y-auto p-1 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                  {openTables.tables.map((table) => (
                    <OpenTableCard
                      key={table.id.toString()}
                      table={table}
                      problem={problemFor(table.buyIn)}
                      disabled={busy}
                      onJoin={() => onJoin(table)}
                    />
                  ))}
                </ul>
              )
            ) : openTables.status === "failed" ? (
              <p className="flex items-center gap-3 text-base">
                {lobbyCopy.openTablesProblem}
                <ActionButton tone="quiet" size="small" icon="target" onClick={openTables.retry}>
                  {lobbyCopy.tryAgain}
                </ActionButton>
              </p>
            ) : (
              <p
                role="status"
                className="h-40 animate-pulse rounded-2xl bg-muted calm:animate-none"
              >
                <span className="sr-only">{lobbyCopy.openTablesLoading}</span>
              </p>
            )}
          </div>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
