"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { GameIcon } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { tableCopy } from "../../copy";
import { useGameHistoryList } from "../../hooks/use-game-history-list";
import { BackToLobby } from "../back-to-lobby";
import { PastGameCard } from "./past-game-card";
import { PastGameDialog } from "./past-game-dialog";

const PLACEHOLDERS = 4;

export function HistoryScreen() {
  const history = useGameHistoryList();
  const [openId, setOpenId] = useState<bigint | null>(null);
  const games = history.status === "ready" ? history.games : [];
  const open = games.find((game) => game.table.id === openId) ?? null;

  return (
    <div className="mb-24 flex max-h-full min-h-0 w-full max-w-4xl flex-col">
      <PatternFrame className="w-full">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-game text-3xl">{tableCopy.pastTitle}</h1>
            <BackToLobby />
          </div>
          <Appear show swapKey={history.status}>
            {history.status === "loading" ? (
              <div role="status" className="grid gap-5 sm:grid-cols-2">
                <span className="sr-only">{tableCopy.pastFinding}</span>
                {Array.from({ length: PLACEHOLDERS }, (_, index) => (
                  <span
                    key={index}
                    className="h-36 animate-pulse rounded-2xl bg-muted calm:animate-none"
                  />
                ))}
              </div>
            ) : history.status === "failed" ? (
              <p className="flex flex-wrap items-center justify-center gap-3 py-6 text-base">
                {tableCopy.pastProblem}
                <ActionButton tone="quiet" size="small" icon="target" onClick={history.retry}>
                  {tableCopy.tryAgain}
                </ActionButton>
              </p>
            ) : history.games.length === 0 && !history.more ? (
              <div className="flex flex-col items-center gap-5 py-6 text-center">
                <p className="font-game text-2xl">{tableCopy.pastNone}</p>
                <Link
                  href="/play"
                  className="inline-flex items-center gap-2 rounded-xl bg-seat-red px-5 py-3 font-game text-lg text-seat-foreground shadow-[0_5px_0_0_var(--color-seat-red-edge)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-seat-red-edge)]"
                >
                  <GameIcon name="play" size={24} />
                  {tableCopy.playNow}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <ul className="grid max-h-[60dvh] gap-5 overflow-y-auto p-1 pb-3 sm:grid-cols-2">
                  {history.games.map((game) => (
                    <PastGameCard
                      key={game.table.id.toString()}
                      game={game}
                      faceOf={history.faceOf}
                      onOpen={() => setOpenId(game.table.id)}
                    />
                  ))}
                </ul>
                {history.more ? (
                  <ActionButton
                    tone="quiet"
                    icon="plus"
                    working={history.loadingMore}
                    workingLabel={tableCopy.pastFindingMore}
                    onClick={history.loadMore}
                  >
                    {tableCopy.pastMore}
                  </ActionButton>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">{tableCopy.pastAll}</p>
                )}
              </div>
            )}
          </Appear>
        </div>
      </PatternFrame>
      <PastGameDialog
        game={open}
        nameOf={history.status === "ready" ? history.nameOf : () => ""}
        faceOf={history.status === "ready" ? history.faceOf : () => undefined}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
