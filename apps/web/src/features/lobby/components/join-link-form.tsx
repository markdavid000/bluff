"use client";

import { useId } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { lobbyCopy } from "../copy";

export function JoinLinkForm({
  text,
  invalid,
  disabled,
  onChange,
  onSubmit,
}: {
  text: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const inputId = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={inputId} className="font-game text-lg">
        {lobbyCopy.joinWithLink}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          value={text}
          disabled={disabled}
          autoComplete="off"
          placeholder={lobbyCopy.joinWithLinkLabel}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-tile-edge/50 bg-background px-4 py-3 text-lg focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
        />
        <ActionButton type="submit" tone="quiet" icon="zoom" disabled={disabled}>
          {lobbyCopy.findTable}
        </ActionButton>
      </div>
    </form>
  );
}
