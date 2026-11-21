"use client";

import { bluffAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import type { Address } from "viem";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useFollowChain } from "@/hooks/use-block-clock";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { markLeftTable } from "@/hooks/use-left-tables";
import { useForgetMyTable, useMyTableId } from "@/hooks/use-my-table-id";
import { useNow } from "@/hooks/use-now";
import { usePlayerProfiles } from "@/hooks/use-player-profiles";
import { useProveInvite } from "@/hooks/use-prove-invite";
import { useSendMove } from "@/hooks/use-send-move";
import { useTakeSeat } from "@/hooks/use-take-seat";
import { type KnownBalance, formatChips, whyUnaffordable } from "@/lib/chips";
import { isComputerPlayer } from "@/lib/computer-players";
import { notify } from "@/lib/notify";
import { tableLink } from "@/lib/table-links";
import { tableCopy } from "../copy";
import { useComputerArrival } from "./use-computer-arrival";
import { type Role, nextStep } from "../lib/next-step";
import { type Table, freeSeats, notReady } from "@bluff/game";
import { useInviteCode } from "./use-invite-code";
import { useLinkInvite } from "./use-link-invite";
import { isNotTableRead, useTable } from "./use-table";
import { useTableEvents } from "./use-table-events";
import { useWorkingNotice } from "./use-working-notice";
import { useTableKeeper } from "./use-table-keeper";

const TICK_MS = 1_000;
const MIN_PLAYERS = 2;

function same(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b) && a?.toLowerCase() === b?.toLowerCase();
}

function roleOf(table: Table, me: string | undefined): Role {
  const seat = table.seats.find((entry) => same(entry.player, me));
  if (!seat) return "visitor";
  return seat.isHost ? "host" : "guest";
}

export function useWaitingRoom(id: bigint) {
  useFollowChain();
  const router = useRouter();
  const forgetMyTable = useForgetMyTable();
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const me = user?.wallet?.address as Address | undefined;
  const read = useTable(id);
  const table = read.status === "ready" ? read.table : null;
  const { computerComing } = useComputerArrival(table);
  const tableOver = table?.status === "cancelled" || table?.status === "finished";
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
  const knownName = (address: string) =>
    profiles.status === "ready" ? (profiles.profileOf(address)?.name ?? null) : null;
  useTableEvents({ id, me, host: table?.host, nameOf: knownName });
  useWorkingNotice(`checking-${id}`, tableCopy.checkingPaid, table?.status === "verifying");
  const sendMove = useSendMove();
  const takeSeat = useTakeSeat();
  const proveInvite = useProveInvite();
  const seated = table !== null && roleOf(table, me) !== "visitor";
  const invite = useInviteCode({ id, isPrivate: table?.isPrivate ?? false, canRead: seated });
  const linkCode = useLinkInvite();
  const [joinStep, setJoinStep] = useState<"invite" | "seat">("seat");
  const myTable = useMyTableId();
  const balance = useChipBalance({ working: tableCopy.gettingReady });
  const now = useNow(TICK_MS, table !== null && table.deadline > 0);
  useTableKeeper({ table, me, now });
  const [pendingReady, setPendingReady] = useState<{ value: boolean; block: bigint | null } | null>(
    null
  );

  const ready = useAction({
    id: "ready",
    working: tableCopy.gettingReady,
    quiet: true,
    run: async (report, next: boolean) => {
      setPendingReady({ value: next, block: null });
      try {
        const receipt = await sendMove(
          { address: contracts.bluff, abi: bluffAbi, functionName: "setReady", args: [id, next] },
          report
        );
        setPendingReady({ value: next, block: receipt.blockNumber });
        return receipt;
      } catch (error) {
        setPendingReady(null);
        throw error;
      }
    },
  });

  const [startSent, setStartSent] = useState(false);
  const start = useAction({
    id: "start",
    working: tableCopy.starting,
    run: (report) =>
      sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: "startTable", args: [id] },
        report
      ),
    onDone: () => setStartSent(true),
  });

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
      markLeftTable(id);
      forgetMyTable(id);
      invalidateBalanceQueries(queryClient, contracts.chips);
      void queryClient.invalidateQueries({ queryKey: ["readContract"], predicate: isNotTableRead });
      router.replace("/play");
    },
  });

  const close = useAction({
    id: "close",
    working: tableCopy.closing,
    run: (report) =>
      sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: "cancelTable", args: [id] },
        report
      ),
    onDone: () => {
      markLeftTable(id);
      forgetMyTable(id);
      invalidateBalanceQueries(queryClient, contracts.chips);
      router.replace("/play");
    },
  });

  const [seatTaken, setSeatTaken] = useState(false);
  const join = useAction({
    id: "join",
    working: tableCopy.joining,
    run: async (report, buyIn: bigint, code: bigint | null) => {
      if (code !== null) {
        setJoinStep("invite");
        await proveInvite(id, code, report);
      }
      setJoinStep("seat");
      return takeSeat({ kind: "join", tableId: id, buyIn }, report);
    },
    onDone: () => {
      setSeatTaken(true);
      invalidateBalanceQueries(queryClient, contracts.chips);
      void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
  });

  if (!table) return { read, view: null };

  const role = roleOf(table, me);
  const readAt = read.status === "ready" ? read.readAt : null;
  const showPending =
    pendingReady !== null &&
    (pendingReady.block === null || readAt === null || readAt < pendingReady.block);
  const seats = table.seats.map((seat) => ({
    ...seat,
    ready: same(seat.player, me) && showPending && pendingReady ? pendingReady.value : seat.ready,
    isMe: same(seat.player, me),
    isComputer: isComputerPlayer(seat.player),
    name: nameOf(seat.player),
    avatarSrc: profiles.status === "ready" ? profiles.profileOf(seat.player)?.avatarSrc : undefined,
  }));
  const shown: Table = { ...table, seats };
  const known: KnownBalance =
    balance.status === "ready"
      ? { status: "ready", amount: balance.amount }
      : { status: "unknown" };
  const unaffordable = whyUnaffordable(table.buyIn, known);
  const mine = seats.find((seat) => seat.isMe);
  const timeLeft = Math.max(table.deadline - now, 0);
  const starting = start.working || (startSent && table.status === "waiting");
  const busy = ready.working || starting || leave.working || close.working || join.working;
  const confirm =
    ready.confirmInWallet ||
    start.confirmInWallet ||
    leave.confirmInWallet ||
    close.confirmInWallet ||
    join.confirmInWallet;

  return {
    read,
    view: {
      table: shown,
      role,
      line: nextStep(shown, role, me, nameOf),
      seats,
      freeSeats: freeSeats(table),
      timeLeft,
      timeUp: table.status === "waiting" && timeLeft === 0,
      myReady: mine?.ready ?? false,
      canStart:
        role === "host" &&
        table.status === "waiting" &&
        table.seats.length >= MIN_PLAYERS &&
        notReady(shown).length === 0,
      joinProblem: seatTaken
        ? null
        : table.status !== "waiting"
          ? tableCopy.started
          : freeSeats(table) === 0
            ? tableCopy.full
            : myTable.status === "ready" && myTable.id !== null && myTable.id !== table.id
              ? tableCopy.seatedElsewhere
              : table.isPrivate && linkCode === null
                ? tableCopy.privateTable
                : unaffordable === "show-chips"
                  ? tableCopy.showChipsFirst
                  : unaffordable === "too-few"
                    ? tableCopy.notEnough(formatChips(table.buyIn))
                    : null,
      busy,
      confirm,
      toggling: ready.working,
      starting,
      leaving: leave.working,
      closing: close.working,
      joining: join.working || (seatTaken && role === "visitor"),
      joinStep,
      invite: invite.status,
      unlockingInvite: invite.status === "locked" && invite.unlocking,
      computerComing,
      toggleReady: () => ready.start(!(mine?.ready ?? false)),
      start: start.start,
      leave: leave.start,
      close: close.start,
      join: () => join.start(table.buyIn, table.isPrivate ? linkCode : null),
      copyInvite: () => {
        if (invite.status === "locked") return invite.unlock();
        if (invite.status === "failed") return invite.retry();
        if (invite.status !== "ready") return;
        navigator.clipboard.writeText(tableLink(window.location.origin, id, invite.code)).then(
          () => notify.success(tableCopy.inviteCopied, { id: "invite" }),
          (error: unknown) => {
            console.error("The invite link could not be copied.", error);
            notify.error(tableCopy.inviteCopyProblem, { id: "invite" });
          }
        );
      },
    },
  };
}
