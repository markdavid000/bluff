"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { lobbyCopy } from "../copy";
import type { OpenTables } from "../hooks/use-open-tables";

export function OpenTablesButton({
  openTables,
  disabled,
  onOpen,
}: {
  openTables: OpenTables;
  disabled: boolean;
  onOpen: () => void;
}) {
  const count = openTables.status === "ready" ? openTables.tables.length : null;
  return (
    <span className="relative inline-flex">
      <ActionButton
        tone="yellow"
        icon="megaphone"
        disabled={disabled}
        aria-label={
          count === null
            ? lobbyCopy.openTables
            : `${lobbyCopy.openTables}, ${lobbyCopy.openTablesCount(count)}`
        }
        onClick={onOpen}
      >
        {lobbyCopy.openTables}
      </ActionButton>
      <Appear
        show={count !== null && count > 0}
        inline
        pop
        className="pointer-events-none absolute -top-2 -right-2 flex size-7"
      >
        <span aria-hidden className="relative flex size-7">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-seat-green opacity-60 calm:animate-none" />
          <span className="relative inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-seat-green font-game text-sm text-seat-foreground tabular-nums">
            {count}
          </span>
        </span>
      </Appear>
    </span>
  );
}
