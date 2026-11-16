import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as TipsDialog from "../hooks/use-tips-dialog";
import { tableCopy } from "../copy";
import { FirstGameTips } from "./first-game-tips";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const done = vi.fn();
let open = true;
vi.mock("../hooks/use-tips-dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof TipsDialog>()),
  useTipsDialog: () => ({ open, done }),
}));

describe("FirstGameTips", () => {
  it("shows one tip at a time, then ends on Got it", () => {
    open = true;
    render(<FirstGameTips />);
    expect(screen.getByRole("dialog", { name: tableCopy.tipsTitle })).toBeInTheDocument();
    expect(screen.getByText(tableCopy.firstTips["wild-ones"])).toBeInTheDocument();
    expect(screen.getByText(tableCopy.tipCount(1, 4))).toBeInTheDocument();
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: tableCopy.nextTip }));
    }
    expect(screen.getByText(tableCopy.tipCount(4, 4))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.gotIt }));
    expect(done).toHaveBeenCalled();
  });

  it("shows nothing until the tips are asked for", () => {
    open = false;
    render(<FirstGameTips />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
