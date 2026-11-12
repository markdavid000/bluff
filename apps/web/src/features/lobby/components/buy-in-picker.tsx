"use client";

import { cn } from "cn";
import { useId } from "react";
import { Cowrie } from "@/components/shared/cowrie";
import { formatChips } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import { BUY_INS } from "../lib/tables";

export function buyInLabel(buyIn: bigint): string {
  return buyIn === 0n ? lobbyCopy.free : lobbyCopy.chips(formatChips(buyIn));
}

export function BuyInPicker({
  value,
  onChange,
  disabled,
}: {
  value: bigint;
  onChange: (buyIn: bigint) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset role="radiogroup" className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 font-game text-lg">{lobbyCopy.buyIn}</legend>
      <div className="flex flex-wrap gap-2">
        {BUY_INS.map((buyIn) => {
          const checked = buyIn === value;
          return (
            <label
              key={buyIn.toString()}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-xl border-2 px-3 py-2 font-game text-base transition-[translate,box-shadow] select-none",
                "has-focus-visible:ring-4 has-focus-visible:ring-ring/60",
                checked
                  ? "translate-y-0.5 border-seat-yellow-edge bg-seat-yellow text-seat-yellow-foreground shadow-[0_2px_0_0_var(--color-seat-yellow-edge)]"
                  : "border-tile-edge/50 bg-tile text-tile-foreground shadow-[0_4px_0_0_var(--color-tile-edge)]"
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(buyIn)}
              />
              {buyIn === 0n ? null : <Cowrie size={20} />}
              {buyInLabel(buyIn)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
