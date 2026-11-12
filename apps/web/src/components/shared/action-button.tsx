"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SoundName } from "@/config/sounds";
import { useSound } from "@/hooks/use-sound";
import { GameIcon, type GameIconName } from "./game-icon";

const tileVariants = cva(
  [
    "relative h-auto rounded-xl font-game tracking-wide select-none",
    "transition-[translate,box-shadow,filter] duration-75 ease-out",
    "shadow-[0_var(--depth)_0_0_var(--edge),0_calc(var(--depth)+6px)_14px_-4px_rgb(0_0_0/0.35)]",
    "hover:brightness-105 active:translate-y-[calc(var(--depth)-2px)]",
    "active:shadow-[0_2px_0_0_var(--edge),0_4px_8px_-4px_rgb(0_0_0/0.35)]",
    "aria-busy:translate-y-[calc(var(--depth)-2px)] aria-busy:shadow-[0_2px_0_0_var(--edge)]",
    "focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-60",
  ],
  {
    variants: {
      tone: {
        red: "bg-seat-red text-seat-foreground [--edge:var(--color-seat-red-edge)]",
        green: "bg-seat-green text-seat-foreground [--edge:var(--color-seat-green-edge)]",
        yellow: "bg-seat-yellow text-seat-yellow-foreground [--edge:var(--color-seat-yellow-edge)]",
        blue: "bg-seat-blue text-seat-foreground [--edge:var(--color-seat-blue-edge)]",
        danger: "bg-destructive text-seat-foreground [--edge:var(--color-seat-red-edge)]",
        quiet: "bg-tile text-tile-foreground [--edge:var(--color-tile-edge)]",
      },
      size: {
        large: "min-h-16 px-8 py-4 text-2xl [--depth:7px]",
        medium: "min-h-12 px-6 py-3 text-lg [--depth:6px]",
        small: "min-h-10 px-4 py-2 text-base [--depth:4px]",
      },
    },
    defaultVariants: { tone: "red", size: "medium" },
  }
);

type ActionButtonProps = Omit<ComponentProps<"button">, "children"> &
  VariantProps<typeof tileVariants> & {
    children: ReactNode;
    working?: boolean;
    workingLabel?: ReactNode;
    icon?: GameIconName;
    sound?: SoundName;
  };

export function ActionButton({
  tone,
  size,
  className,
  children,
  working = false,
  workingLabel,
  icon,
  sound = "tap",
  onPointerDown,
  ...props
}: ActionButtonProps) {
  const { play } = useSound();
  return (
    <Button
      {...props}
      aria-busy={working || undefined}
      className={cn(tileVariants({ tone, size }), className)}
      onPointerDown={(event) => {
        play(sound);
        onPointerDown?.(event);
      }}
    >
      {icon && <GameIcon name={icon} size={size === "large" ? 34 : size === "small" ? 22 : 28} />}
      {working && workingLabel ? workingLabel : children}
    </Button>
  );
}
