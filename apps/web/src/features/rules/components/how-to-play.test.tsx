import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { rulesCopy } from "../copy";
import { HowToPlay } from "./how-to-play";

describe("HowToPlay", () => {
  it("lays out every part of the rules, in order", () => {
    render(<HowToPlay />);
    expect(screen.getByRole("heading", { level: 1, name: rulesCopy.title })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
    ).toEqual([
      rulesCopy.ideaTitle,
      rulesCopy.startTitle,
      rulesCopy.diceTitle,
      rulesCopy.wildTitle,
      rulesCopy.turnTitle,
      rulesCopy.calledTitle,
      rulesCopy.winTitle,
      rulesCopy.leaveTitle,
      rulesCopy.fairTitle,
    ]);
  });

  it("shows how many dice each player gets, and names the dice for screen readers", () => {
    render(<HowToPlay />);
    expect(screen.getByText(rulesCopy.dicePerPlayer(2, 4))).toBeInTheDocument();
    expect(screen.getByText(rulesCopy.dicePerPlayer(3, 3))).toBeInTheDocument();
    expect(screen.getByText(rulesCopy.dicePerPlayer(4, 2))).toBeInTheDocument();
    expect(screen.getByRole("img", { name: rulesCopy.dice(4) })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: rulesCopy.wildExample })).toBeInTheDocument();
  });

  it("leads on to playing and to why the game is fair", () => {
    render(<HowToPlay />);
    expect(screen.getByRole("link", { name: rulesCopy.play })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: rulesCopy.whyFair })).toHaveAttribute(
      "href",
      "/fairness"
    );
  });
});
