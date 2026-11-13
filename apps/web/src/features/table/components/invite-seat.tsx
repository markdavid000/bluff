import { ActionButton } from "@/components/shared/action-button";
import { tableCopy } from "../copy";

export function InviteSeat({ onInvite }: { onInvite: () => void }) {
  return (
    <ActionButton
      tone="quiet"
      size="small"
      icon="copy"
      aria-label={tableCopy.copyInvite}
      onClick={onInvite}
    >
      {tableCopy.invite}
    </ActionButton>
  );
}
