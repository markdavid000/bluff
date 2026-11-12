import { cn } from "cn";
import type { Face } from "@/lib/dice-physics";
import { DieFace } from "./die";

const SIDES: { face: Face; placement: string }[] = [
  { face: 1, placement: "[transform:rotateY(0deg)_translateZ(3.44rem)]" },
  { face: 6, placement: "[transform:rotateY(180deg)_translateZ(3.44rem)]" },
  { face: 2, placement: "[transform:rotateY(90deg)_translateZ(3.44rem)]" },
  { face: 5, placement: "[transform:rotateY(-90deg)_translateZ(3.44rem)]" },
  { face: 3, placement: "[transform:rotateX(90deg)_translateZ(3.44rem)]" },
  { face: 4, placement: "[transform:rotateX(-90deg)_translateZ(3.44rem)]" },
];

export function TumblingDie({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("size-28 [perspective:600px]", className)}>
      <div className="relative size-full animate-tumble preserve-3d motion-reduce:[transform:rotateX(-20deg)_rotateY(30deg)] motion-reduce:animate-none">
        {SIDES.map(({ face, placement }) => (
          <div key={face} className={cn("absolute inset-0 backface-hidden", placement)}>
            <DieFace
              face={face}
              className="size-full rounded-[7%] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
