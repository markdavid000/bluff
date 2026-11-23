"use client";

import { bluffAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useEffect, useEffectEvent, useState } from "react";
import type { Address } from "viem";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useBlockClock, useFollowChain } from "@/hooks/use-block-clock";
import { useNow } from "@/hooks/use-now";
import { usePlayerProfiles } from "@/hooks/use-player-profiles";
import { useForgetMyTable } from "@/hooks/use-my-table-id";
import { useSendMove } from "@/hooks/use-send-move";
import { isComputerPlayer } from "@/lib/computer-players";
import { bidChance, bidRisk, type Bid, isValidFace, quickPicks } from "@bluff/game";
import { tableCopy } from "../copy";
import type { GameEnding } from "../lib/game-end";
import { gameLine } from "../lib/game-line";
import { potOf, shareOf } from "../lib/payout";
import { revealedBySeat } from "../lib/reveal";
import { useBidChoice } from "./use-bid-choice";
import { useCoachTips } from "./use-coach-tips";
import { useGameEnd } from "./use-game-end";
import { useOwnDice } from "./use-own-dice";
import { useRoundResultCatchUp } from "./use-round-result-catch-up";
import { type PlacedBid, type RoundResult, useTableEvents } from "./use-table-events";
import { useTable } from "./use-table";
import { useTableKeeper } from "./use-table-keeper";
import { useWorkingNotice } from "./use-working-notice";
import { revealNotice } from "../lib/reveal-notice";

const TICK_MS = 1_000;
const TURN_GRACE_MS = 15_000;
const TIME_LOW_MS = 10_000;
const GAME_CLOCK_MS = 15 * 60 * 1000;
const RESULT_SHOWN_MS = 6_000;
const TURN_SHOWN_MS = 60_000;
const WILD_FACE = 1;
const LAST_REVEAL_WAIT_MS = 3_000;
const RESULT_WAIT_MS = 6_000;

function same(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b) && a?.toLowerCase() === b?.toLowerCase();
}

export function useGame(id: bigint) {
  useFollowChain();
  const block = useBlockClock();
  const [liveEnd, setLiveEnd] = useState<GameEnding | null>(null);
  const forgetMyTable = useForgetMyTable();
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const me = user?.wallet?.address as Address | undefined;
  const read = useTable(id);
  const table = read.status === "ready" ? read.table : null;
  const tableOver = table?.status === "finished";
  const forgetSeat = useEffectEvent(() => forgetMyTable(id));
  useEffect(() => {
    if (tableOver) forgetSeat();
  }, [tableOver]);
  const profiles = usePlayerProfiles(
    table?.seats.map((seat) => seat.player) ?? [],
    tableCopy.unnamed
  );
  const nameOf = (address: string) => {
    if (profiles.status === "failed") return tableCopy.unnamed;
    if (profiles.status === "loading") return "";
    return profiles.profileOf(address)?.name ?? (profiles.pending ? "" : tableCopy.unnamed);
  };
  const noticeName = (address: string) => nameOf(address) || tableCopy.unnamed;
  const knownName = (address: string) =>
    profiles.status === "ready" ? (profiles.profileOf(address)?.name ?? null) : null;
  const [shownResult, setShownResult] = useState<{ result: RoundResult; until: number } | null>(
    null
  );
  const [roundBids, setRoundBids] = useState<{ round: number; bids: Record<string, Bid> }>({
    round: 0,
    bids: {},
  });
  useTableEvents({
    id,
    me,
    host: table?.host,
    nameOf: knownName,
    onBidPlaced: (placed: PlacedBid) => {
      const { face } = placed;
      if (!isValidFace(face)) return;
      setRoundBids((previous) => ({
        round: placed.round,
        bids: {
          ...(previous.round === placed.round ? previous.bids : {}),
          [placed.player.toLowerCase()]: { quantity: placed.quantity, face },
        },
      }));
    },
    onRoundSettled: (result) =>
      setShownResult((shown) =>
        shown?.result.round === result.round
          ? shown
          : { result, until: Date.now() + RESULT_SHOWN_MS }
      ),
    onGameEnded: (ending) => {
      setLiveEnd(ending);
      if (table !== null && table.buyIn > 0n)
        invalidateBalanceQueries(queryClient, contracts.chips);
    },
  });
  const now = useNow(TICK_MS, table !== null);
  const [endSeenAt, setEndSeenAt] = useState<number | null>(null);
  if (table?.status === "finished" && endSeenAt === null) setEndSeenAt(now);
  useTableKeeper({ table, me, now });
  const sendMove = useSendMove();
  const mySeat = table ? table.seats.findIndex((seat) => same(seat.player, me)) : -1;
  const mine = mySeat >= 0 && table ? table.seats[mySeat] : undefined;
  const inPlay = table !== null && (table.status === "playing" || table.status === "revealing");
  const dice = useOwnDice({
    id,
    me,
    round: table?.round ?? 0,
    inGame: inPlay && mine?.isActive === true,
  });

  const [finishedAt, setFinishedAt] = useState(0n);
  if (table?.status === "finished" && finishedAt === 0n && block > 0n) setFinishedAt(block);
  const end = useGameEnd({
    id,
    finished: table?.status === "finished",
    live: liveEnd,
    seenAt: finishedAt,
  });
  const [sawPlay, setSawPlay] = useState(false);
  if (inPlay && !sawPlay) setSawPlay(true);
  const [lastRevealSeen, setLastRevealSeen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [pendingBid, setPendingBid] = useState<{ bid: Bid; block: bigint | null } | null>(null);
  const [calledIn, setCalledIn] = useState<number | null>(null);
  const [revealCounts, setRevealCounts] = useState<{
    round: number;
    counts: number[];
    bidder: number | null;
    caller: number | null;
    bidderPlayer: string | null;
    callerPlayer: string | null;
    seenAt: bigint;
  } | null>(null);
  if (table?.status === "revealing" && revealCounts?.round !== table.round) {
    setRevealCounts({
      seenAt: block,
      round: table.round,
      counts: table.seats.map((seat) => (seat.isActive ? seat.dice : 0)),
      bidder: table.bid?.bidder ?? null,
      caller: table.caller,
      bidderPlayer: table.bid ? (table.seats[table.bid.bidder]?.player ?? null) : null,
      callerPlayer: table.caller === null ? null : (table.seats[table.caller]?.player ?? null),
    });
  }
  const [closedRound, setClosedRound] = useState(0);
  const [movedOn, setMovedOn] = useState<{ round: number; at: number } | null>(null);
  const calledRound = revealCounts?.round ?? 0;
  const pastCall =
    table !== null &&
    calledRound > 0 &&
    (table.status !== "revealing" || table.round !== calledRound);
  if (pastCall && movedOn?.round !== calledRound) setMovedOn({ round: calledRound, at: now });
  const resultRound = shownResult?.result.round ?? 0;
  const resultOpen = shownResult !== null && now < shownResult.until && closedRound < resultRound;
  const awaitingResult =
    pastCall &&
    closedRound < calledRound &&
    resultRound !== calledRound &&
    movedOn?.round === calledRound &&
    now < movedOn.at + RESULT_WAIT_MS;
  const caughtUp = useRoundResultCatchUp({
    id,
    round: calledRound,
    fromBlock: revealCounts?.seenAt ?? 0n,
    wanted:
      calledRound > 0 &&
      closedRound < calledRound &&
      resultRound !== calledRound &&
      (table?.status === "revealing" || awaitingResult),
  });
  if (caughtUp !== null && resultRound !== caughtUp.round && closedRound < caughtUp.round) {
    setShownResult({ result: caughtUp, until: now + RESULT_SHOWN_MS });
  }
  const holdReveal = resultOpen || awaitingResult;
  useWorkingNotice(
    `reveal-${id}`,
    revealNotice(
      revealCounts && { bidder: revealCounts.bidderPlayer, caller: revealCounts.callerPlayer },
      me,
      noticeName
    ),
    table?.status === "revealing" || awaitingResult
  );

  const confirmed =
    pendingBid !== null &&
    pendingBid.block !== null &&
    read.status === "ready" &&
    read.readAt !== null &&
    read.readAt >= pendingBid.block;
  if (confirmed) setPendingBid(null);
  const pendingShown = pendingBid !== null && !confirmed;
  const shownBid = pendingShown && pendingBid ? pendingBid.bid : (table?.bid ?? null);
  const choice = useBidChoice(
    shownBid,
    table?.diceInPlay ?? 0,
    dice.status === "ready" ? dice.faces : []
  );

  const placeBid = useAction({
    id: "bid",
    working: tableCopy.placingBid,
    run: async (report, bid: Bid) => {
      setPendingBid({ bid, block: null });
      try {
        const receipt = await sendMove(
          {
            address: contracts.bluff,
            abi: bluffAbi,
            functionName: "placeBid",
            args: [id, bid.quantity, bid.face],
          },
          report
        );
        setPendingBid({ bid, block: receipt.blockNumber });
        choice.clear();
        return receipt;
      } catch (error) {
        setPendingBid(null);
        throw error;
      }
    },
  });

  const callBluff = useAction({
    id: "call",
    working: tableCopy.callingBluff,
    run: async (report, round: number) => {
      const receipt = await sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: "callBluff", args: [id] },
        report
      );
      setCalledIn(round);
      return receipt;
    },
  });

  const coachFaces = dice.status === "ready" ? dice.faces : [];
  const coachHidden = Math.max((table?.diceInPlay ?? 0) - coachFaces.length, 0);
  const callLanding = table !== null && table.status === "playing" && calledIn === table.round;
  const coachTurn =
    table !== null &&
    table.status === "playing" &&
    mine?.isActive === true &&
    table.turn === mySeat &&
    !pendingShown &&
    !holdReveal &&
    !callLanding;
  const riskOf = (bid: Bid) => bidRisk(bidChance(bid, coachFaces, coachHidden));
  const coachChoice = coachTurn && dice.status === "ready" ? choice.choice : null;
  const safer = coachChoice
    ? (quickPicks(shownBid, table?.diceInPlay ?? 0, coachFaces).find(
        (pick) =>
          riskOf(pick) === "safe" &&
          (pick.quantity !== coachChoice.quantity || pick.face !== coachChoice.face)
      ) ?? null)
    : null;
  useCoachTips({
    myTurn: coachTurn,
    choice: coachChoice,
    risk: coachChoice ? riskOf(coachChoice) : null,
    safer,
    onPick: choice.pick,
  });

  const [left, setLeft] = useState(false);
  const leave = useAction({
    id: "leave",
    working: tableCopy.leaving,
    done: tableCopy.leftTable,
    run: (report) =>
      sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: "leaveTable", args: [id] },
        report
      ),
    onDone: () => {
      setLeft(true);
      forgetMyTable(id);
      invalidateBalanceQueries(queryClient, contracts.chips);
      void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
  });

  if (!table) return { read, view: null };

  const bid = shownBid;
  const stillIn = mine?.isActive === true;
  const myTurn =
    table.status === "playing" &&
    stillIn &&
    table.turn === mySeat &&
    !pendingShown &&
    !holdReveal &&
    !callLanding;
  const ownFaces = dice.status === "ready" ? dice.faces : [];
  const nameOfSeat = (seat: number) => {
    const player = table.seats[seat]?.player;
    return player ? noticeName(player) : tableCopy.unnamed;
  };
  const shownTurnEnds = table.deadline - TURN_GRACE_MS;
  const turnLeft = table.status === "playing" ? Math.max(shownTurnEnds - now, 0) : 0;
  const pot = potOf(table.buyIn, table.seats.length);
  const result =
    resultOpen && shownResult !== null
      ? { ...shownResult.result, loserName: noticeName(shownResult.result.loser) }
      : null;
  const snapshot = result !== null && revealCounts?.round === result.round ? revealCounts : null;
  const revealedDice =
    result !== null && snapshot !== null && isValidFace(result.face)
      ? revealedBySeat(result.faces, snapshot.counts, result.face)
      : null;
  const reveal =
    result === null
      ? null
      : {
          outcome: result.count >= result.quantity ? ("holds" as const) : ("caught" as const),
          quantity: result.quantity,
          face: result.face,
          count: result.count,
          loserName: result.loserName,
          loserIsMe: same(result.loser, me),
          rows: (revealedDice ?? []).flatMap((row, index) =>
            row
              ? [
                  {
                    seat: index,
                    name: nameOfSeat(index),
                    isMe: index === mySeat,
                    faces: row.faces,
                    counting: row.counting,
                    matches: row.counting.filter(Boolean).length,
                    role:
                      index === snapshot?.bidder
                        ? ("bidder" as const)
                        : index === snapshot?.caller
                          ? ("caller" as const)
                          : null,
                  },
                ]
              : []
          ),
        };
  const finished = table.status === "finished";
  if (finished && reveal !== null && !lastRevealSeen) setLastRevealSeen(true);
  const waitedForReveal =
    !sawPlay || lastRevealSeen || (endSeenAt !== null && now >= endSeenAt + LAST_REVEAL_WAIT_MS);
  const showResults =
    finished && end.status !== "loading" && (resultsOpen || (!holdReveal && waitedForReveal));
  if (showResults && !resultsOpen) setResultsOpen(true);
  const leaveSettled =
    left && (finished ? end.status !== "loading" : !(table.seats[mySeat]?.isActive ?? false));
  const iWon = end.status === "ready" && end.winners.some((winner) => same(winner, me));
  const chosen = myTurn ? choice.choice : null;
  const lastBidOf = (player: string, index: number): Bid | null =>
    (roundBids.round === table.round ? roundBids.bids[player.toLowerCase()] : undefined) ??
    (table.bid && table.bid.bidder === index ? table.bid : null);

  return {
    read,
    view: {
      table,
      seats: table.seats.map((seat, index) => ({
        ...seat,
        isMe: index === mySeat,
        isTurn:
          table.status === "playing" &&
          index === table.turn &&
          !holdReveal &&
          !(index === mySeat && callLanding) &&
          !(index === mySeat && pendingShown),
        lastBid:
          index === mySeat && pendingShown && pendingBid
            ? pendingBid.bid
            : lastBidOf(seat.player, index),
        isComputer: isComputerPlayer(seat.player),
        name: nameOf(seat.player),
        avatarSrc:
          profiles.status === "ready" ? profiles.profileOf(seat.player)?.avatarSrc : undefined,
      })),
      mySeat,
      watching: mySeat < 0,
      stillIn,
      myTurn,
      line: pendingShown
        ? placeBid.confirmInWallet
          ? tableCopy.confirmInWallet
          : tableCopy.placingBid
        : gameLine(table, mySeat, stillIn, nameOfSeat),
      bid,
      bidderName: pendingShown
        ? nameOfSeat(mySeat)
        : table.bid
          ? nameOfSeat(table.bid.bidder)
          : null,
      bidder: pendingShown
        ? (me ?? null)
        : table.bid
          ? (table.seats[table.bid.bidder]?.player ?? null)
          : null,
      choice,
      matching:
        chosen !== null ? ownFaces.map((face) => face === chosen.face || face === WILD_FACE) : null,
      dice,
      turnLeft,
      turnFraction: Math.min(turnLeft / TURN_SHOWN_MS, 1),
      turnLow: turnLeft > 0 && turnLeft <= TIME_LOW_MS,
      clockLeft: table.startedAt > 0 ? Math.max(table.startedAt + GAME_CLOCK_MS - now, 0) : 0,
      pot,
      reveal,
      revealedDice,
      dismissReveal: () => setClosedRound(resultRound),
      boardRevealed: table.status === "revealing" || holdReveal,
      boardRound: holdReveal ? (resultOpen ? resultRound : calledRound) : table.round,
      end,
      myShare: end.status === "ready" && me ? shareOf(pot, end.winners, me) : null,
      winnerNames:
        end.status === "ready"
          ? end.winners.map((winner) => (same(winner, me) ? tableCopy.you : noticeName(winner)))
          : [],
      iWon,
      showResults: left ? leaveSettled : showResults,
      left,
      placing: placeBid.working,
      calling: callBluff.working,
      leaving: leave.working,
      busy: placeBid.working || callBluff.working || leave.working,
      confirm: placeBid.confirmInWallet || callBluff.confirmInWallet || leave.confirmInWallet,
      placeBid: placeBid.start,
      callBluff: () => callBluff.start(table.round),
      leave: () => leave.start(),
    },
  };
}
