import { cn } from "cn";
import { Avatar } from "@/components/shared/avatar";
import { GameIcon } from "@/components/shared/game-icon";
import { tableCopy } from "../copy";

export interface SeatBadgeProps {
  name: string;
  avatarSrc: string | undefined;
  ready: boolean;
  isHost: boolean;
  isMe: boolean;
  updating: boolean;
}

export function SeatBadge({ name, avatarSrc, ready, isHost, isMe, updating }: SeatBadgeProps) {
  const state = isHost ? tableCopy.host : ready ? tableCopy.ready : tableCopy.notReady;
  return (
    <figure
      aria-label={`${isMe ? tableCopy.you : name}, ${state}`}
      className="flex flex-col items-center gap-1.5"
    >
      <span className="relative">
        {avatarSrc ? (
          <Avatar src={avatarSrc} size={64} className={cn(isMe && "ring-4 ring-seat-yellow")} />
        ) : (
          <span
            aria-hidden
            className="block size-16 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
          />
        )}
        {isHost ? (
          <span aria-hidden className="absolute -top-3 left-1/2 -translate-x-1/2">
            <GameIcon name="trophy" size={26} />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-background",
              ready ? "bg-seat-green" : "bg-muted",
              updating && "animate-pulse motion-reduce:animate-none"
            )}
          >
            {ready ? (
              <GameIcon name="tick" size={18} />
            ) : (
              <span className="size-2.5 rounded-full bg-muted-foreground/60" />
            )}
          </span>
        )}
      </span>
      <figcaption aria-hidden className="flex flex-col items-center leading-tight">
        <span className="font-game text-base">{isMe ? tableCopy.you : name}</span>
        <span className="text-xs text-muted-foreground">
          {updating ? tableCopy.gettingReady : state}
        </span>
      </figcaption>
    </figure>
  );
}
