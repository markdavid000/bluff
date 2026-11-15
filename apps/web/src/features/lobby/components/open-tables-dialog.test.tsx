import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { errorCopy } from "@/lib/copy";
import { type Notice, onNotice } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import type { OpenTables } from "../hooks/use-open-tables";
import type { LobbyTable } from "../lib/tables";
import { OpenTablesDialog } from "./open-tables-dialog";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const onJoin = vi.fn();
const onPlayNow = vi.fn();
const onCreate = vi.fn();

function table(id: bigint, players: number, seats: number, buyIn = 0n): LobbyTable {
  return {
    id,
    host: "0x00000000000000000000000000000000000a11ce",
    waiting: true,
    isPrivate: false,
    seatCount: seats,
    playerCount: players,
    buyIn,
    createdAt: Number(id) * 1000,
    closesAt: 0,
  };
}

const onOpenChange = vi.fn();

function show(
  openTables: OpenTables,
  problemFor: (buyIn: bigint) => string | null = () => null,
  busy = false
) {
  render(
    <OpenTablesDialog
      open
      onOpenChange={onOpenChange}
      openTables={openTables}
      problemFor={problemFor}
      busy={busy}
      busyLabel={lobbyCopy.joinWorking}
      onJoin={onJoin}
      onPlayNow={onPlayNow}
      onCreate={onCreate}
    />
  );
  return screen.getByRole("dialog", { name: lobbyCopy.openTables });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OpenTablesDialog", () => {
  it("shows a placeholder while the open tables load", () => {
    const dialog = show({ status: "loading" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(lobbyCopy.openTablesLoading);
  });

  it("shows an empty table and ways to start one when nothing is open", () => {
    const dialog = show({ status: "ready", tables: [] });
    expect(dialog.querySelector("svg[aria-hidden]")).not.toBeNull();
    expect(within(dialog).getByText(lobbyCopy.noOpenTables)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: lobbyCopy.playNow }));
    expect(onPlayNow).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole("button", { name: lobbyCopy.createTable }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("explains a failed load and offers to try again", () => {
    const retry = vi.fn();
    const dialog = show({ status: "failed", retry });
    expect(within(dialog).getByText(lobbyCopy.openTablesProblem)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: lobbyCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("lists open tables and joins one in a tap", () => {
    const dialog = show({ status: "ready", tables: [table(12n, 1, 3, 10n * ONE_CHIP)] });
    expect(within(dialog).getByText(lobbyCopy.playersAtTable(1, 3))).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: `${lobbyCopy.join} ${lobbyCopy.tableName("12")}` })
    );
    expect(onJoin).toHaveBeenCalledWith(table(12n, 1, 3, 10n * ONE_CHIP));
  });

  it("holds a table the player cannot afford, and says why", () => {
    const dialog = show({ status: "ready", tables: [table(12n, 1, 2, 50n * ONE_CHIP)] }, () =>
      lobbyCopy.notEnough("50")
    );
    expect(
      within(dialog).getByRole("button", { name: `${lobbyCopy.join} ${lobbyCopy.tableName("12")}` })
    ).toBeDisabled();
    expect(within(dialog).getByText(lobbyCopy.notEnough("50"))).toBeInTheDocument();
  });
  it("stays open while the player is being seated, and says so when they try to close it", () => {
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    show({ status: "ready", tables: [] }, () => null, true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([
      errorCopy.stillGoing(lobbyCopy.joinWorking),
    ]);
    stop();
  });
});
