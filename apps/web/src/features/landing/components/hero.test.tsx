import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { landingCopy } from "../copy";
import { Hero } from "./hero";

describe("Hero", () => {
  it("names the game and explains it in plain words", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.name })).toBeInTheDocument();
    expect(screen.getByText(landingCopy.tagline)).toBeInTheDocument();
    expect(screen.getByText(landingCopy.explainer)).toBeInTheDocument();
  });

  it("has one clear way into the game", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: landingCopy.play })).toHaveAttribute("href", "/play");
  });

  it("shows the three moves of the game as cards", () => {
    render(<Hero />);
    const moves = screen.getByRole("list", { name: landingCopy.movesLabel });
    expect(
      within(moves)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent)
    ).toEqual(landingCopy.moves.map((move) => move.title));
  });

  it("points to the rules and to why the game is fair", () => {
    render(<Hero />);
    expect(screen.getByText(landingCopy.fair)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: landingCopy.howToPlay })).toHaveAttribute(
      "href",
      "/how-to-play"
    );
    expect(screen.getByRole("link", { name: landingCopy.whyFair })).toHaveAttribute(
      "href",
      "/fairness"
    );
  });
});
