import { COMPUTER_PLAYERS } from "@/config/computer-players";

const COMPUTERS = new Set(COMPUTER_PLAYERS.map((address) => address.toLowerCase()));

export function isComputerPlayer(address: string): boolean {
  return COMPUTERS.has(address.toLowerCase());
}
