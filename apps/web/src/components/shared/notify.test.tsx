import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notify } from "@/lib/notify";
import { GameToaster } from "./notify";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const EXIT_MS = 500;

async function wait(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  toast.dismiss();
  await wait(EXIT_MS);
  vi.useRealTimers();
});

describe("GameToaster", () => {
  it.each(["error", "info", "success"] as const)(
    "lets a %s toast leave by itself",
    async (kind) => {
      render(<GameToaster />);
      act(() => {
        notify[kind](`Leaves by itself: ${kind}`, { id: `leaves-${kind}` });
      });
      await wait(50);
      expect(screen.getByText(`Leaves by itself: ${kind}`)).toBeInTheDocument();
      await wait(10_000 + EXIT_MS);
      expect(screen.queryByText(`Leaves by itself: ${kind}`)).not.toBeInTheDocument();
    }
  );

  it("pauses while the pointer rests on a toast, and carries on once it leaves", async () => {
    render(<GameToaster />);
    act(() => {
      notify.error("Type a number of chips, like 25.", { id: "paused" });
    });
    await wait(50);
    const list = screen.getByText("Type a number of chips, like 25.").closest("ol");
    if (!list) throw new Error("The toast list is missing.");
    fireEvent.mouseEnter(list);
    await wait(30_000);
    expect(screen.getByText("Type a number of chips, like 25.")).toBeInTheDocument();
    fireEvent.mouseLeave(list);
    await wait(10_000 + EXIT_MS);
    expect(screen.queryByText("Type a number of chips, like 25.")).not.toBeInTheDocument();
  });

  it("keeps a working message until the action finishes", async () => {
    render(<GameToaster />);
    act(() => {
      notify.loading("Joining the table…", { id: "working" });
    });
    await wait(30_000);
    expect(screen.getByText("Joining the table…")).toBeInTheDocument();
  });
});
