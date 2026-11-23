import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import Link from "next/link";
import type { ReactNode } from "react";
import { GameIcon, type GameIconName } from "./game-icon";
import { tileVariants } from "./tile-variants";

const ICON_SIZE = { large: 34, medium: 28, small: 22 } as const;

export function TileLink({
  href,
  tone,
  size,
  icon,
  className,
  children,
}: VariantProps<typeof tileVariants> & {
  href: string;
  icon?: GameIconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        tileVariants({ tone, size }),
        "inline-flex items-center justify-center gap-2 outline-none",
        className
      )}
    >
      {icon ? <GameIcon name={icon} size={ICON_SIZE[size ?? "medium"]} /> : null}
      {children}
    </Link>
  );
}
