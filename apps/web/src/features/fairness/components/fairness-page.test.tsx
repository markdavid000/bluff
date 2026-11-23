import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fairnessCopy } from "../copy";
import { FairnessPage } from "./fairness-page";

describe("FairnessPage", () => {
  it("makes each promise in plain words, with the technical detail one tap away", () => {
    render(<FairnessPage />);
    expect(screen.getByRole("heading", { level: 1, name: fairnessCopy.title })).toBeInTheDocument();
    for (const point of fairnessCopy.points) {
      expect(screen.getByRole("heading", { level: 2, name: point.title })).toBeInTheDocument();
    }
    const [first] = fairnessCopy.points;
    const how = screen.getAllByText(fairnessCopy.how)[0];
    if (!first || !how) throw new Error("Expected a point with its detail.");
    const detail = screen.getByText(first.detail);
    expect(detail).not.toBeVisible();
    fireEvent.click(how);
    expect(detail).toBeVisible();
  });

  it("lets anyone check every contract and the tests, opening outside pages in a new tab", () => {
    render(<FairnessPage />);
    const bluff = screen.getByRole("link", { name: new RegExp(fairnessCopy.contracts.bluff) });
    expect(bluff).toHaveAttribute("target", "_blank");
    expect(bluff).toHaveAttribute("rel", "noreferrer");
    expect(
      screen.getByRole("link", { name: new RegExp(fairnessCopy.confidentialityTests) })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /opens in a new tab/ })).toHaveLength(6);
  });

  it("leads on to playing and to the rules", () => {
    render(<FairnessPage />);
    expect(screen.getByRole("link", { name: fairnessCopy.play })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: fairnessCopy.howToPlay })).toHaveAttribute(
      "href",
      "/how-to-play"
    );
  });
});
