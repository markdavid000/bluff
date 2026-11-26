import { ActionButton } from "@/components/shared/action-button";
import { tableCopy } from "../copy";

export function InviteSeat({
  onInvite,
  waiting,
  compact = false,
}: {
  onInvite: () => void;
  waiting: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <ActionButton
          tone="quiet"
          size="small"
          icon="copy"
          aria-label={tableCopy.copyInvite}
          disabled={waiting}
          onClick={onInvite}
          className="size-11 min-h-0 rounded-full p-0"
        >
          {null}
        </ActionButton>
        <span aria-hidden className="font-game text-xs">
          {tableCopy.invite}
        </span>
      </span>
    );
  }
  return (
    <ActionButton
      tone="quiet"
      size="small"
      icon="copy"
      aria-label={tableCopy.copyInvite}
      disabled={waiting}
      onClick={onInvite}
    >
      {tableCopy.invite}
    </ActionButton>
  );
}
