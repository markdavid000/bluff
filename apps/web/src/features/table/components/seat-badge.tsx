import { cn } from "cn";
import { Avatar } from "@/components/shared/avatar";
import { GameIcon } from "@/components/shared/game-icon";
import { tableCopy } from "../copy";
import { ComputerTag } from "./computer-tag";

export interface SeatBadgeProps {
  name: string;
  avatarSrc: string | undefined;
  ready: boolean;
  isHost: boolean;
  isMe: boolean;
  isComputer: boolean;
  updating: boolean;
  compact?: boolean;
}

export function SeatBadge({
  name,
  avatarSrc,
  ready,
  isHost,
  isMe,
  isComputer,
  updating,
  compact = false,
}: SeatBadgeProps) {
  const state = isHost ? tableCopy.host : ready ? tableCopy.ready : tableCopy.notReady;
  return (
    <figure
      aria-label={[isMe ? tableCopy.you : name, isComputer ? tableCopy.computer : null, state]
        .filter(Boolean)
        .join(", ")}
      className="flex flex-col items-center gap-1.5"
    >
      <span className="relative">
        {avatarSrc ? (
          <Avatar
            src={avatarSrc}
            size={compact ? 44 : 64}
            className={cn(isMe && "ring-4 ring-seat-yellow")}
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              "block animate-pulse rounded-full bg-muted calm:animate-none",
              compact ? "size-11" : "size-16"
            )}
          />
        )}
        {isHost ? (
          <span aria-hidden className="absolute -top-3 left-1/2 -translate-x-1/2">
            <GameIcon name="trophy" size={compact ? 20 : 26} />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -bottom-1 flex items-center justify-center rounded-full border-2 border-background",
              compact ? "size-5" : "size-7",
              ready ? "bg-seat-green" : "bg-muted",
              updating && "animate-pulse calm:animate-none"
            )}
          >
            {ready ? (
              <GameIcon name="tick" size={compact ? 13 : 18} />
            ) : (
              <span
                className={cn(
                  "rounded-full bg-muted-foreground/60",
                  compact ? "size-1.5" : "size-2.5"
                )}
              />
            )}
          </span>
        )}
      </span>
      <figcaption aria-hidden className="flex flex-col items-center leading-tight">
        <span className={cn("font-game", compact ? "max-w-24 truncate text-xs" : "text-base")}>
          {isMe
            ? tableCopy.you
            : name || (
                <span
                  data-name-loading
                  className="inline-block h-[1em] w-16 animate-pulse rounded bg-muted align-middle calm:animate-none"
                />
              )}
        </span>
        {isComputer ? <ComputerTag small={compact} /> : null}
        <span className={cn("text-muted-foreground", compact ? "text-[0.65rem]" : "text-xs")}>
          {updating ? tableCopy.gettingReady : state}
        </span>
      </figcaption>
    </figure>
  );
}
