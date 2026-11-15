"use client";

import { bluffAbi } from "@bluff/contracts";
import { useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Hex } from "viem";
import { usePublicClient } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { useSendMove } from "@/hooks/use-send-move";
import { MoveNotReadyError } from "@/lib/errors";
import { keepTrying } from "@/lib/keep-trying";
import { notify } from "@/lib/notify";
import { tableCopy } from "../copy";
import { type KeeperAction, keeperDuty } from "../lib/keeper-duty";
import { type Table, toTable } from "../lib/table-view";

const RETRY_MS = 15_000;
const REVEAL_DEADLINE_MS = 30_000;
const REVEAL_RETRY_MS = 3_000;
const FAILURES_BEFORE_NOTICE = 2;

export function useTableKeeper({
  table,
  me,
  now,
}: {
  table: Table | null;
  me: string | undefined;
  now: number;
}) {
  const publicClient = usePublicClient({ chainId: gameChain.id });
  const sendMove = useSendMove();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();
  const failures = useRef(0);
  const [retryAt, setRetryAt] = useState(0);
  const duty = table ? keeperDuty(table, now, me) : null;
  const action = duty?.action ?? null;
  const dueAt = duty ? Math.max(duty.dueAt, retryAt) : 0;
  const id = table?.id ?? null;

  function reveal(handles: readonly Hex[]) {
    return keepTrying(() => decryptPublic([...handles]), {
      forMs: REVEAL_DEADLINE_MS,
      everyMs: REVEAL_RETRY_MS,
    });
  }

  async function stillDue(tableId: bigint, expected: KeeperAction) {
    if (!publicClient) throw new MoveNotReadyError();
    const [view, seats] = await publicClient.readContract({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "getTable",
      args: [tableId],
    });
    return keeperDuty(toTable(view, seats), Date.now(), me)?.action === expected;
  }

  async function sendIfStillDue(tableId: bigint, chosen: KeeperAction, args: readonly unknown[]) {
    if (!(await stillDue(tableId, chosen))) return;
    try {
      await sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: chosen, args },
        () => undefined
      );
    } catch (error) {
      if (await stillDue(tableId, chosen)) throw error;
    }
  }

  async function send(tableId: bigint, chosen: KeeperAction) {
    if (!publicClient) throw new MoveNotReadyError();
    if (!(await stillDue(tableId, chosen))) return;
    if (chosen !== "confirmSeats" && chosen !== "settleReveal") {
      return sendIfStillDue(tableId, chosen, [tableId]);
    }
    const handles = await publicClient.readContract({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "revealHandles",
      args: [tableId],
    });
    const result = await reveal(handles);
    return sendIfStillDue(tableId, chosen, [
      tableId,
      result.abiEncodedClearValues,
      result.decryptionProof,
    ]);
  }

  const perform = useEffectEvent((tableId: bigint, chosen: KeeperAction) => {
    send(tableId, chosen).then(
      () => {
        failures.current = 0;
      },
      (error: unknown) => {
        failures.current += 1;
        console.error(`The table keeper could not ${chosen}.`, error);
        if (failures.current >= FAILURES_BEFORE_NOTICE) {
          notify.error(tableCopy.keeperProblem, { id: "keeper" });
        }
        setRetryAt(Date.now() + RETRY_MS);
      }
    );
  });

  useEffect(() => {
    if (action === null || id === null) return;
    const timer = window.setTimeout(() => perform(id, action), Math.max(dueAt - Date.now(), 0));
    return () => window.clearTimeout(timer);
  }, [action, dueAt, id]);
}
