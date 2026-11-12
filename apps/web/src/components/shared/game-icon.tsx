import { cn } from "cn";
import Image from "next/image";

export type { GameIconName } from "@/config/icons";
import type { GameIconName } from "@/config/icons";

export function GameIcon({
  name,
  size = 28,
  className,
}: {
  name: GameIconName;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/${name}.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn("shrink-0 drop-shadow-[0_2px_1px_rgb(0_0_0/0.3)]", className)}
    />
  );
}
