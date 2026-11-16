"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { DieFace } from "@/components/shared/die";
import { GameIcon } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { tableCopy } from "../copy";
import { type Tip, useTipSteps, useTipsDialog } from "../hooks/use-tips-dialog";

function TipPicture({ tip }: { tip: Tip }) {
  if (tip === "call-bluff") return <GameIcon name="megaphone" size={56} />;
  const face = tip === "wild-ones" ? 1 : tip === "at-least" ? 4 : 5;
  return <DieFace face={face} className="size-14" />;
}

function TipCards({ onDone }: { onDone: () => void }) {
  const tips = useTipSteps();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <DialogTitle className="font-heading text-3xl">{tableCopy.tipsTitle}</DialogTitle>
      <Appear show swapKey={tips.tip} className="flex flex-col items-center gap-4">
        <TipPicture tip={tips.tip} />
        <DialogDescription className="text-lg leading-snug text-foreground">
          {tableCopy.firstTips[tips.tip]}
        </DialogDescription>
      </Appear>
      <p className="font-game text-sm text-muted-foreground">
        {tableCopy.tipCount(tips.step + 1, tips.total)}
      </p>
      {tips.last ? (
        <ActionButton tone="green" icon="tick" onClick={onDone}>
          {tableCopy.gotIt}
        </ActionButton>
      ) : (
        <ActionButton tone="green" icon="play" onClick={tips.next}>
          {tableCopy.nextTip}
        </ActionButton>
      )}
    </div>
  );
}

export function FirstGameTips() {
  const dialog = useTipsDialog();
  return (
    <Dialog open={dialog.open} onOpenChange={(open) => (open ? undefined : dialog.done())}>
      <DialogContent className="sm:max-w-md">
        <PatternFrame roomy>
          <TipCards onDone={dialog.done} />
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
