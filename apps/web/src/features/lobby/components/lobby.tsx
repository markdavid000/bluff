"use client";

import type { ReactNode } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { lobbyCopy } from "../copy";
import { useLobby } from "../hooks/use-lobby";
import { parseTableLink } from "../lib/tables";
import { BuyInPicker } from "./buy-in-picker";
import { CreateTableDialog } from "./create-table-dialog";
import { InviteCard } from "./invite-card";
import { JoinLinkForm } from "./join-link-form";
import { MyTableCard } from "./my-table-card";
import { OpenTablesButton } from "./open-tables-button";
import { OpenTablesDialog } from "./open-tables-dialog";

export function Lobby({ greeting, invite }: { greeting: ReactNode; invite: string | null }) {
  const lobby = useLobby({ invitedId: invite === null ? null : parseTableLink(invite) });
  const { sitDown, leaveTable } = lobby;
  const confirm = sitDown.confirmInWallet || leaveTable.confirmInWallet;
  const label = (working: string) => (confirm ? lobbyCopy.confirmInWallet : working);
  const seated = lobby.myTableId.status === "ready" && lobby.myTableId.id !== null;
  const busy = sitDown.working || leaveTable.leaving;
  const mine = lobby.myTable.status === "ready" ? lobby.myTable.seated : null;

  return (
    <div className="mb-24 flex max-h-full min-h-0 w-full max-w-4xl flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2">
        {mine ? (
          <MyTableCard
            table={mine.table}
            status={mine.status}
            leaving={leaveTable.leaving}
            leaveLabel={label(lobbyCopy.leaveWorking)}
            onLeave={() => leaveTable.leave(mine.table.id)}
            onCopyInvite={() => lobby.copyInvite(mine.table.id)}
          />
        ) : lobby.myTableId.status === "failed" ? (
          <p className="flex flex-wrap items-center justify-center gap-3 text-base">
            {lobbyCopy.yourTableProblem}
            <ActionButton tone="quiet" size="small" icon="target" onClick={lobby.myTableId.retry}>
              {lobbyCopy.tryAgain}
            </ActionButton>
          </p>
        ) : seated || lobby.myTableId.status === "loading" ? (
          <p role="status" className="h-40 w-full animate-pulse rounded-2xl bg-muted">
            <span className="sr-only">{lobbyCopy.findingYourTable}</span>
          </p>
        ) : (
          <PatternFrame className="w-full">
            <div className="flex flex-col divide-y-2 divide-dashed divide-tile-edge/30">
              <div className="flex flex-col gap-8 pb-7">
                {greeting}
                <div className="flex flex-col gap-3">
                  <ActionButton
                    tone="red"
                    size="large"
                    icon="play"
                    sound="drum"
                    disabled={
                      busy || lobby.buyInProblem !== null || lobby.openTables.status === "loading"
                    }
                    working={sitDown.findingSeat}
                    workingLabel={label(lobbyCopy.playNowWorking)}
                    onClick={lobby.playNow}
                  >
                    {lobbyCopy.playNow}
                  </ActionButton>
                  {lobby.buyInProblem ? (
                    <p className="text-sm text-muted-foreground">{lobby.buyInProblem}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-5 py-6">
                <BuyInPicker value={lobby.buyIn} onChange={lobby.chooseBuyIn} disabled={busy} />
                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    tone="blue"
                    icon="plus"
                    disabled={busy}
                    onClick={() => lobby.setCreateOpen(true)}
                  >
                    {lobbyCopy.createTable}
                  </ActionButton>
                  <OpenTablesButton
                    openTables={lobby.openTables}
                    disabled={busy}
                    onOpen={() => lobby.setTablesOpen(true)}
                  />
                </div>
              </div>
              <div className="pt-6">
                <JoinLinkForm
                  text={lobby.joinLink.text}
                  invalid={lobby.joinLink.invalid}
                  disabled={busy}
                  onChange={lobby.joinLink.change}
                  onSubmit={lobby.joinLink.submit}
                />
              </div>
            </div>
          </PatternFrame>
        )}
        {lobby.invited && lobby.myTableId.status === "ready" && !seated ? (
          <InviteCard
            id={lobby.invited.id}
            read={lobby.invited.read}
            problem={lobby.invitedProblem}
            joining={sitDown.joining}
            joiningLabel={label(lobbyCopy.joinWorking)}
            disabled={busy}
            onJoin={() => {
              const read = lobby.invited?.read;
              if (read?.status === "ready") {
                sitDown.join({
                  kind: "join",
                  tableId: read.seated.table.id,
                  buyIn: read.seated.table.buyIn,
                });
              }
            }}
            onDismiss={lobby.dismissInvite}
          />
        ) : null}
      </div>
      <OpenTablesDialog
        open={lobby.tablesOpen && !seated}
        onOpenChange={lobby.setTablesOpen}
        openTables={lobby.openTables}
        problemFor={lobby.problemFor}
        busy={busy}
        onJoin={(table) => sitDown.join({ kind: "join", tableId: table.id, buyIn: table.buyIn })}
        onPlayNow={lobby.playNow}
        onCreate={lobby.createFromTables}
      />
      <CreateTableDialog
        open={lobby.createOpen && !seated}
        onOpenChange={lobby.setCreateOpen}
        buyIn={lobby.buyIn}
        onBuyInChange={lobby.chooseBuyIn}
        problem={lobby.buyInProblem}
        working={sitDown.creating}
        workingLabel={label(
          lobby.buyIn === 0n ? lobbyCopy.createWorking : lobbyCopy.createPaidWorking
        )}
        onCreate={lobby.createTable}
      />
    </div>
  );
}
