"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { CountingAmount } from "@/components/shared/counting-amount";
import { Cowrie } from "@/components/shared/cowrie";
import { PatternFrame } from "@/components/shared/pattern-band";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatChips } from "@/lib/chips";
import { chipsCopy } from "../copy";
import type { useChipsPanel } from "../hooks/use-chips-panel";
import { CashOutDialog } from "./cash-out-dialog";

export function ChipsPanel({ panel }: { panel: ReturnType<typeof useChipsPanel> }) {
  const { balance, claim, cashOut } = panel;

  return (
    <PatternFrame roomy className="w-full">
      <section className="flex flex-col gap-8">
        <div className="flex items-center gap-5">
          <Cowrie size={56} />
          <div className="flex flex-col">
            <DialogTitle className="font-game text-lg text-muted-foreground">
              {chipsCopy.balanceLabel}
            </DialogTitle>
            {balance.status === "ready" ? (
              <p aria-live="polite" className="font-heading text-5xl">
                <CountingAmount amount={balance.amount} />
              </p>
            ) : balance.status === "hidden" ? (
              <span className="flex flex-col items-start gap-2">
                <ActionButton
                  tone="yellow"
                  size="small"
                  icon="lock"
                  working={balance.revealing}
                  workingLabel={chipsCopy.showingChips}
                  onClick={balance.reveal}
                >
                  {chipsCopy.showChips}
                </ActionButton>
                {balance.asksWallet ? (
                  <span className="text-sm text-muted-foreground">{chipsCopy.showChipsHelp}</span>
                ) : null}
              </span>
            ) : balance.status === "failed" ? (
              <p className="flex items-center gap-3 text-base">
                {chipsCopy.balanceProblem}
                <ActionButton tone="quiet" size="small" icon="target" onClick={balance.retry}>
                  {chipsCopy.tryAgain}
                </ActionButton>
              </p>
            ) : (
              <span
                role="status"
                className="h-12 w-32 animate-pulse rounded-md bg-muted calm:animate-none"
              >
                <span className="sr-only">{chipsCopy.balanceLoading}</span>
              </span>
            )}
          </div>
        </div>
        <DialogDescription className="text-sm">
          {chipsCopy.hiddenNote} {chipsCopy.practiceNote}
        </DialogDescription>
        {cashOut.dollars !== undefined && cashOut.dollars > 0n ? (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/60 px-5 py-4">
            <p aria-live="polite" className="font-game text-lg">
              <CountingAmount
                amount={cashOut.dollars}
                format={(amount) => chipsCopy.dollars(formatChips(amount))}
              />
            </p>
            <p className="text-sm text-muted-foreground">{chipsCopy.dollarsHelp}</p>
            {cashOut.publicRecord ? (
              <a
                href={cashOut.publicRecord}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold underline underline-offset-4 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                {chipsCopy.seeCashOuts}
              </a>
            ) : null}
          </div>
        ) : null}
        <Appear show={panel.pendingRetry !== null}>
          {panel.pendingRetry ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{chipsCopy.pendingProblem}</p>
              <ActionButton tone="quiet" size="small" icon="target" onClick={panel.pendingRetry}>
                {chipsCopy.tryAgain}
              </ActionButton>
            </div>
          ) : null}
        </Appear>
        <Appear show={panel.resume !== null}>
          {panel.resume ? (
            <ActionButton
              tone="yellow"
              icon="wallet"
              working={cashOut.working}
              workingLabel={chipsCopy.cashOutFinishing}
              onClick={panel.resume}
            >
              {chipsCopy.cashOutResume}
            </ActionButton>
          ) : null}
        </Appear>
        <div className="flex flex-wrap items-center gap-3">
          {claim.status === "ready" ? (
            <ActionButton
              tone="green"
              icon="cowrie"
              sound="cowries"
              working={claim.working}
              workingLabel={
                claim.confirmInWallet ? chipsCopy.confirmInWallet : chipsCopy.claimWorking
              }
              onClick={claim.claim}
            >
              {chipsCopy.claim}
            </ActionButton>
          ) : claim.status === "waiting" ? (
            <CountdownBadge
              label={chipsCopy.claimNext}
              remainingMs={claim.remainingMs}
              icon={<Cowrie size={30} />}
            />
          ) : claim.status === "failed" ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">{chipsCopy.claimProblem}</span>
              <ActionButton tone="quiet" size="small" icon="target" onClick={claim.retry}>
                {chipsCopy.tryAgain}
              </ActionButton>
            </span>
          ) : (
            <span
              aria-hidden
              className="h-12 w-48 animate-pulse rounded-xl bg-muted calm:animate-none"
            />
          )}
          <ActionButton
            tone="quiet"
            icon="wallet"
            disabled={!panel.canCashOut || cashOut.working}
            onClick={() => panel.setCashOutOpen(true)}
          >
            {chipsCopy.cashOut}
          </ActionButton>
        </div>
      </section>
      {balance.status === "ready" ? (
        <CashOutDialog
          open={panel.cashOutOpen}
          onOpenChange={panel.setCashOutOpen}
          balance={balance.amount}
          working={cashOut.working}
          confirmInWallet={cashOut.confirmInWallet}
          cashOut={cashOut.cashOut}
        />
      ) : null}
    </PatternFrame>
  );
}
