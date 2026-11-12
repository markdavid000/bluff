"use client";

import { ActionButton } from "@/components/shared/action-button";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { CountingAmount } from "@/components/shared/counting-amount";
import { Cowrie } from "@/components/shared/cowrie";
import { PatternFrame } from "@/components/shared/pattern-band";
import { formatChips } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { useChipsPanel } from "../hooks/use-chips-panel";
import { CashOutDialog } from "./cash-out-dialog";

export function ChipsPanel() {
  const panel = useChipsPanel();
  const { balance, claim, cashOut } = panel;

  return (
    <PatternFrame className="w-full max-w-2xl">
      <section aria-labelledby="chips-title" className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Cowrie size={56} />
          <div className="flex flex-col">
            <h2 id="chips-title" className="font-game text-lg text-muted-foreground">
              {chipsCopy.balanceLabel}
            </h2>
            {balance.status === "ready" ? (
              <p aria-live="polite" className="font-heading text-5xl">
                <CountingAmount amount={balance.amount} />
              </p>
            ) : balance.status === "hidden" ? (
              <span className="flex flex-col items-start gap-2">
                <ActionButton
                  tone="yellow"
                  size="small"
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
                <ActionButton tone="quiet" size="small" onClick={balance.retry}>
                  {chipsCopy.tryAgain}
                </ActionButton>
              </p>
            ) : (
              <span role="status" className="h-12 w-32 animate-pulse rounded-md bg-muted">
                <span className="sr-only">{chipsCopy.balanceLoading}</span>
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {chipsCopy.hiddenNote} {chipsCopy.practiceNote}
        </p>
        {cashOut.dollars !== undefined && cashOut.dollars > 0n ? (
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-4 py-3">
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
        {panel.resume ? (
          <ActionButton
            tone="yellow"
            working={cashOut.working}
            workingLabel={chipsCopy.cashOutFinishing}
            onClick={panel.resume}
          >
            {chipsCopy.cashOutResume}
          </ActionButton>
        ) : null}
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
          ) : (
            <span aria-hidden className="h-12 w-48 animate-pulse rounded-xl bg-muted" />
          )}
          <ActionButton
            tone="quiet"
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
