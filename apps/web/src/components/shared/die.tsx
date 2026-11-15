import { cn } from "cn";
import type { Face } from "@/lib/dice-physics";

const PIPS: Record<Face, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DieFace({ face, className }: { face: Face; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block aspect-square shrink-0 rounded-[22%] bg-cowrie",
        "shadow-[inset_0_-3px_0_0_rgb(0_0_0/0.15),0_3px_0_0_var(--color-tile-edge)]",
        className
      )}
    >
      <span className="absolute inset-0 grid grid-cols-3 grid-rows-[repeat(3,minmax(0,1fr))] place-items-center p-[14%]">
        {Array.from({ length: 9 }, (_, cell) => (
          <span
            key={cell}
            className={cn(
              "aspect-square w-[70%] rounded-full",
              PIPS[face].includes(cell) ? "bg-board shadow-[inset_0_1px_1px_rgb(0_0_0/0.5)]" : ""
            )}
          />
        ))}
      </span>
    </span>
  );
}
