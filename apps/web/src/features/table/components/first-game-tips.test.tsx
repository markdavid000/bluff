import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { FirstGameTips } from "./first-game-tips";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const next = vi.fn();
const done = vi.fn();
let dialog: Record<string, unknown> = {};
vi.mock("../hooks/use-tips-dialog", () => ({ useTipsDialog: () => dialog }));

describe("FirstGameTips", () => {
  it("shows one tip at a time with how far along the player is", () => {
    dialog = { open: true, step: 0, last: false, tip: "wild-ones", total: 4, next, done };
    render(<FirstGameTips />);
    expect(screen.getByRole("dialog", { name: tableCopy.tipsTitle })).toBeInTheDocument();
    expect(screen.getByText(tableCopy.firstTips["wild-ones"])).toBeInTheDocument();
    expect(screen.getByText(tableCopy.tipCount(1, 4))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.nextTip }));
    expect(next).toHaveBeenCalledOnce();
  });

  it("ends on Got it", () => {
    dialog = { open: true, step: 3, last: true, tip: "call-bluff", total: 4, next, done };
    render(<FirstGameTips />);
    expect(screen.queryByRole("button", { name: tableCopy.nextTip })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.gotIt }));
    expect(done).toHaveBeenCalled();
  });

  it("shows nothing once the tips were seen", () => {
    dialog = { open: false, step: 0, last: false, tip: "wild-ones", total: 4, next, done };
    render(<FirstGameTips />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
