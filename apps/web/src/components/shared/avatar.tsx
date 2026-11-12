import { cn } from "cn";
import Image from "next/image";

export function Avatar({
  src,
  size = 40,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-full border-2 border-tile-edge bg-cowrie shadow-[0_3px_0_0_var(--color-tile-edge)]",
        className
      )}
    />
  );
}
