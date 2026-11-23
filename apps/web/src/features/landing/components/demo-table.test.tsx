import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { landingCopy } from "../copy";
import { DemoTable } from "./demo-table";

vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => false }));

describe("DemoTable", () => {
  it("describes the whole round in words for screen readers", () => {
    render(<DemoTable step="deal" />);
    expect(screen.getByRole("img", { name: landingCopy.demoLabel })).toBeInTheDocument();
  });

  it("seats four players around the table", () => {
    render(<DemoTable step="deal" />);
    for (const name of Object.values(landingCopy.demoNames)) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("raises the bid each turn, then calls the bluff", () => {
    const { rerender } = render(<DemoTable step="bid1" />);
    expect(screen.getAllByText(landingCopy.demoBid(2)).length).toBeGreaterThan(0);
    rerender(<DemoTable step="bid3" />);
    expect(screen.getAllByText(landingCopy.demoBid(4)).length).toBeGreaterThan(0);
    rerender(<DemoTable step="call" />);
    expect(screen.getByText(landingCopy.demoCall)).toBeInTheDocument();
  });

  it("keeps the dice hidden until the cups lift, then shows who lost", () => {
    const { container, rerender } = render(<DemoTable step="bid2" />);
    expect(container.querySelectorAll("[data-demo-die][data-shown='true']")).toHaveLength(0);
    rerender(<DemoTable step="reveal" />);
    expect(container.querySelectorAll("[data-demo-die][data-shown='true']")).toHaveLength(8);
    expect(container.querySelectorAll("[data-demo-die][data-counts='true']")).toHaveLength(3);
    rerender(<DemoTable step="result" />);
    expect(screen.getByText(landingCopy.demoResult)).toBeInTheDocument();
  });
});
