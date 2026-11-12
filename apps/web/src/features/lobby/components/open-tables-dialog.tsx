"use client";

import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { lobbyCopy } from "../copy";
import type { OpenTables } from "../hooks/use-open-tables";
import type { LobbyTable } from "../lib/tables";
import { EmptyTablesArt } from "./empty-tables-art";
import { OpenTableCard } from "./open-table-card";

export function OpenTablesDialog({
  open,
  onOpenChange,
  openTables,
  problemFor,
  busy,
  onJoin,
  onPlayNow,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openTables: OpenTables;
  problemFor: (buyIn: bigint) => string | null;
  busy: boolean;
  onJoin: (table: LobbyTable) => void;
  onPlayNow: () => void;
  onCreate: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent aria-describedby={undefined} className="max-w-5xl">
        <PatternFrame>
          <div className="flex flex-col gap-5">
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
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <EmptyTablesArt className="w-full max-w-sm" />
                  <p className="font-game text-2xl">{lobbyCopy.noOpenTables}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <ActionButton
                      tone="red"
                      icon="play"
                      sound="drum"
                      disabled={busy}
                      onClick={onPlayNow}
                    >
                      {lobbyCopy.playNow}
                    </ActionButton>
                    <ActionButton tone="blue" icon="plus" disabled={busy} onClick={onCreate}>
                      {lobbyCopy.createTable}
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <ul className="grid max-h-[60dvh] gap-4 overflow-y-auto p-1 pb-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <p role="status" className="h-40 animate-pulse rounded-2xl bg-muted">
                <span className="sr-only">{lobbyCopy.openTablesLoading}</span>
              </p>
            )}
          </div>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
