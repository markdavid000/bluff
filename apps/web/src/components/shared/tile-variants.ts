import { cva } from "class-variance-authority";

export const tileVariants = cva(
  [
    "relative h-auto rounded-xl font-game tracking-wide select-none",
    "transition-[translate,box-shadow,filter] duration-75 ease-out",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_var(--depth)_0_0_var(--edge),0_calc(var(--depth)+6px)_14px_-4px_rgb(0_0_0/0.35)]",
    "hover:brightness-105 active:translate-y-[calc(var(--depth)-2px)]",
    "active:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_2px_0_0_var(--edge),0_4px_8px_-4px_rgb(0_0_0/0.35)]",
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
        large:
          "min-h-16 px-8 py-4 text-2xl [--depth:7px] max-[40rem]:min-h-12 max-[40rem]:px-5 max-[40rem]:py-2.5 max-[40rem]:text-xl max-[40rem]:[--depth:5px]",
        medium:
          "min-h-12 px-6 py-3 text-lg [--depth:6px] max-[40rem]:min-h-10 max-[40rem]:px-4 max-[40rem]:py-2 max-[40rem]:text-base max-[40rem]:[--depth:4px]",
        small:
          "min-h-10 px-4 py-2 text-base [--depth:4px] max-[40rem]:min-h-9 max-[40rem]:px-3 max-[40rem]:py-1.5 max-[40rem]:text-sm max-[40rem]:[--depth:3px]",
      },
    },
    defaultVariants: { tone: "red", size: "medium" },
  }
);
