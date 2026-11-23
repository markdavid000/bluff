import { cn } from "cn";
import { sharedCopy } from "./copy";
import { TileLink } from "./tile-link";

export function LearnLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label={sharedCopy.learnMore}
      className={cn("flex flex-wrap items-center justify-center gap-3", className)}
    >
      <TileLink href="/how-to-play" tone="yellow" icon="chat-bubble">
        {sharedCopy.howToPlay}
      </TileLink>
      <TileLink href="/fairness" tone="blue" icon="lock">
        {sharedCopy.whyFair}
      </TileLink>
    </nav>
  );
}
