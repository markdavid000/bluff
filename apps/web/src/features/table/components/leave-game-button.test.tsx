import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { LeaveGameButton } from "./leave-game-button";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const onLeave = vi.fn();

function show(paid = true) {
  render(
    <LeaveGameButton
      paid={paid}
      leaving={false}
      leavingLabel={tableCopy.leaving}
      disabled={false}
      onLeave={onLeave}
    />
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("LeaveGameButton", () => {
  it("asks before leaving, warning about the chips", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.getByText(tableCopy.leaveWarning)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leaveConfirm }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("never mentions chips when leaving a free game", () => {
    show(false);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
    expect(screen.getByText(tableCopy.leaveWarningFree)).toBeInTheDocument();
    expect(screen.queryByText(tableCopy.leaveWarning)).toBeNull();
  });

  it("stays when the player changes their mind", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
    fireEvent.click(screen.getByRole("button", { name: tableCopy.stay }));
    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
