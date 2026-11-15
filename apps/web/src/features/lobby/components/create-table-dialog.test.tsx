import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorCopy } from "@/lib/copy";
import { type Notice, onNotice } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import { CreateTableDialog } from "./create-table-dialog";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const onCreate = vi.fn();
const onOpenChange = vi.fn();

function open(problem: string | null = null, working = false) {
  render(
    <CreateTableDialog
      open
      onOpenChange={onOpenChange}
      buyIn={0n}
      onBuyInChange={vi.fn()}
      problem={problem}
      working={working}
      workingLabel={lobbyCopy.createWorking}
      onCreate={onCreate}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateTableDialog", () => {
  it("creates a public table for two by default", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: lobbyCopy.create }));
    expect(onCreate).toHaveBeenCalledWith(2, false);
  });

  it("creates the size of table chosen, kept off the open list", () => {
    open();
    fireEvent.click(screen.getByLabelText(new RegExp(lobbyCopy.seatCount(4))));
    fireEvent.click(screen.getByLabelText(lobbyCopy.private));
    fireEvent.click(screen.getByRole("button", { name: lobbyCopy.create }));
    expect(onCreate).toHaveBeenCalledWith(4, true);
  });

  it("says how many dice each player gets", () => {
    open();
    expect(screen.getByText(lobbyCopy.dicePerPlayer(4))).toBeInTheDocument();
    expect(screen.getByText(lobbyCopy.dicePerPlayer(2))).toBeInTheDocument();
  });

  it("holds Create and says why when the chips to play are out of reach", () => {
    open(lobbyCopy.notEnough("50"));
    expect(screen.getByRole("button", { name: lobbyCopy.create })).toBeDisabled();
    expect(screen.getByText(lobbyCopy.notEnough("50"))).toBeInTheDocument();
  });

  it("stays open while the table is being set up, and says so when the player tries to close it", () => {
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    open(null, true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([
      errorCopy.stillGoing(lobbyCopy.createWorking),
    ]);
    stop();
  });
});
