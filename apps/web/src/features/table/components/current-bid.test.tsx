import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { CurrentBid } from "./current-bid";

function liveRegions(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[aria-live]"));
}

describe("CurrentBid", () => {
  it("announces the first bid of a round through a live region that was already listening", async () => {
    const { container, rerender } = render(<CurrentBid bid={null} bidderName={null} />);
    const [live] = liveRegions(container);
    expect(live).toBeDefined();
    rerender(<CurrentBid bid={{ quantity: 3, face: 4 }} bidderName="Ada" />);
    expect(live).toBeInTheDocument();
    expect(live).toHaveTextContent(tableCopy.bid(3, tableCopy.faceWords[3] ?? ""));
    expect(liveRegions(container)).toEqual([live]);
  });

  it("keeps the same live region as bids are raised", () => {
    const { container, rerender } = render(
      <CurrentBid bid={{ quantity: 3, face: 4 }} bidderName="Ada" />
    );
    const [live] = liveRegions(container);
    rerender(<CurrentBid bid={{ quantity: 4, face: 2 }} bidderName="Kola" />);
    expect(liveRegions(container)).toEqual([live]);
    expect(live).toHaveTextContent(tableCopy.bid(4, tableCopy.faceWords[1] ?? ""));
  });
});
