import { ActionButton } from "@/components/shared/action-button";
import { tableCopy } from "../copy";

export function InviteSeat({ onInvite, waiting }: { onInvite: () => void; waiting: boolean }) {
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
