import { tableCopy } from "../copy";

interface CalledBid {
  bidder: string | null;
  caller: string | null;
}

function same(a: string, b: string | undefined): boolean {
  return b !== undefined && a.toLowerCase() === b.toLowerCase();
}

export function revealNotice(
  call: CalledBid | null,
  me: string | undefined,
  nameOf: (player: string) => string
): string {
  if (!call?.bidder || !call.caller) return tableCopy.revealing;
  if (same(call.caller, me)) return tableCopy.youCalledBluff(nameOf(call.bidder));
  if (same(call.bidder, me)) return tableCopy.calledYourBluff(nameOf(call.caller));
  return tableCopy.calledBluff(nameOf(call.caller), nameOf(call.bidder));
}
