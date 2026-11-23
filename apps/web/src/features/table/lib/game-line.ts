import { isMaximal, type Table } from "@bluff/game";
import { tableCopy } from "../copy";

export function gameLine(
  table: Pick<Table, "status" | "turn" | "bid" | "diceInPlay">,
  mySeat: number | null,
  stillIn: boolean,
  nameOfSeat: (seat: number) => string
): string {
  if (table.status === "finished") return tableCopy.gameOver;
  if (table.status === "revealing") return tableCopy.revealing;
  if (mySeat === null || mySeat < 0) return tableCopy.theirTurn(nameOfSeat(table.turn));
  if (!stillIn) return tableCopy.outWatching;
  if (table.turn !== mySeat) return tableCopy.theirTurn(nameOfSeat(table.turn));
  if (table.bid === null) return tableCopy.youStart;
  return isMaximal(table.bid, table.diceInPlay) ? tableCopy.topBid : tableCopy.yourTurn;
}
