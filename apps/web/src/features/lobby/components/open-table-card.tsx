"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { Cowrie } from "@/components/shared/cowrie";
import { lobbyCopy } from "../copy";
import type { LobbyTable } from "../lib/tables";
import { buyInLabel } from "./buy-in-picker";
import { SeatDots } from "./seat-dots";

export function OpenTableCard({
  table,
  problem,
  disabled,
  onJoin,
}: {
  table: LobbyTable;
  problem: string | null;
  disabled: boolean;
  onJoin: () => void;
}) {
  const name = lobbyCopy.tableName(table.id.toString());
  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-tile-edge/40 bg-card p-4 shadow-[0_5px_0_0_var(--color-tile-edge)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-game text-lg">{name}</span>
        <span className="flex items-center gap-1 font-game text-base">
          {table.buyIn === 0n ? null : <Cowrie size={20} />}
          {buyInLabel(table.buyIn)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <SeatDots players={table.playerCount} seats={table.seatCount} />
          {lobbyCopy.playersAtTable(table.playerCount, table.seatCount)}
        </span>
        <ActionButton
          tone="green"
          size="small"
          icon="rocket"
          disabled={disabled || problem !== null}
          aria-label={`${lobbyCopy.join} ${name}`}
          onClick={onJoin}
        >
          {lobbyCopy.join}
        </ActionButton>
      </div>
      <Appear show={Boolean(problem)} swapKey={problem ?? ""}>
        <p className="text-sm text-muted-foreground">{problem}</p>
      </Appear>
    </li>
  );
}
