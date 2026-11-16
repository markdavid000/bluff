import { cn } from "cn";
import { DieFace } from "./die";

export function SpinningDie({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-block size-5 shrink-0", className)}>
      <DieFace
        face={5}
        className="size-full animate-spin [animation-duration:900ms] calm:animate-none"
      />
    </span>
  );
}
