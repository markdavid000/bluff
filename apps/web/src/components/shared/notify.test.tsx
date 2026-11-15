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

async function settle() {
  await wait(100);
  await wait(EXIT_MS);
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

  it("shows one toast at a time, the newest pushing out the one before", async () => {
    render(<GameToaster />);
    act(() => {
      notify.info("First news", { id: "first" });
    });
    await wait(50);
    act(() => {
      notify.info("Second news", { id: "second" });
    });
    await settle();
    expect(screen.queryByText("First news")).not.toBeInTheDocument();
    expect(screen.getByText("Second news")).toBeInTheDocument();
  });

  it("brings a working toast back once the toast that pushed it out has gone", async () => {
    render(<GameToaster />);
    act(() => {
      notify.loading("Revealing dice…", { id: "reveal" });
    });
    await wait(50);
    act(() => {
      notify.info("Ada ran out of time", { id: "news" });
    });
    await settle();
    expect(screen.queryByText("Revealing dice…")).not.toBeInTheDocument();
    await wait(4_000);
    await settle();
    expect(screen.queryByText("Ada ran out of time")).not.toBeInTheDocument();
    expect(screen.getByText("Revealing dice…")).toBeInTheDocument();
  });

  it("never brings back a working toast that has finished", async () => {
    render(<GameToaster />);
    act(() => {
      notify.loading("Revealing dice…", { id: "reveal" });
    });
    await wait(50);
    act(() => {
      notify.info("Ada ran out of time", { id: "news" });
    });
    act(() => {
      notify.dismiss("reveal");
    });
    await wait(4_000);
    await settle();
    expect(screen.queryByText("Revealing dice…")).not.toBeInTheDocument();
  });

  it("never lets a working toast be swiped away", async () => {
    render(<GameToaster />);
    act(() => {
      notify.loading("Cashing out your chips…", { id: "working" });
    });
    await wait(50);
    const tile = screen.getByText("Cashing out your chips…").closest("[data-sonner-toast]");
    expect(tile?.getAttribute("data-dismissible")).toBe("false");
  });

  it("keeps a toast as long as it asks for", async () => {
    render(<GameToaster />);
    act(() => {
      notify.info("Stays a while", { id: "stays", staysMs: 12_000 });
    });
    await wait(9_000);
    expect(screen.getByText("Stays a while")).toBeInTheDocument();
    await wait(3_000 + EXIT_MS);
    expect(screen.queryByText("Stays a while")).not.toBeInTheDocument();
  });
});
