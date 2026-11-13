"use client";

import { ActionButton } from "@/components/shared/action-button";
import { DieFace } from "@/components/shared/die";
import { tableCopy } from "../../copy";
import { BoardPlaceholder, LazyBoardScene } from "./lazy-board";
import { PREVIEW_CHIPS_EACH, PREVIEW_SEATS, usePreviewBoard } from "../../hooks/use-preview-board";

export function BoardPreview() {
  const board = usePreviewBoard();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="mx-auto w-full max-w-[760px]">
        {board.colors ? (
          <LazyBoardScene
            colors={board.colors}
            seats={PREVIEW_SEATS}
            throwState={board.throwState}
            chipsEach={PREVIEW_CHIPS_EACH}
            revealed={board.revealed}
            label={tableCopy.boardLabel}
          />
        ) : (
          <BoardPlaceholder />
        )}
      </div>
      <div
        aria-live="polite"
        className="mx-auto flex min-h-14 w-full max-w-[720px] items-center gap-3"
      >
        {board.landed && (
          <>
            <span className="font-game text-lg">{tableCopy.yourDice}</span>
            {board.landed.map((face, index) => (
              <span key={index} role="img" aria-label={tableCopy.faceWords[face - 1]}>
                <DieFace face={face} className="size-11" />
              </span>
            ))}
          </>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-[720px] flex-wrap gap-4">
        <ActionButton
          tone="red"
          size="large"
          icon="play"
          working={board.throwState.kind === "shaking"}
          workingLabel={tableCopy.shaking}
          onClick={board.shakeAndThrow}
        >
          {tableCopy.shakeAndThrow}
        </ActionButton>
        <ActionButton
          tone="quiet"
          size="large"
          icon="megaphone"
          sound="drum"
          onClick={board.toggleCups}
        >
          {board.revealed ? tableCopy.coverCups : tableCopy.liftCups}
        </ActionButton>
      </div>
    </div>
  );
}
