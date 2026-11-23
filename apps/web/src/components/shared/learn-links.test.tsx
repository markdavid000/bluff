import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sharedCopy } from "./copy";
import { LearnLinks } from "./learn-links";

describe("LearnLinks", () => {
  it("offers the rules and why the game is fair as two raised tiles", () => {
    render(<LearnLinks />);
    const nav = screen.getByRole("navigation", { name: sharedCopy.learnMore });
    const rules = within(nav).getByRole("link", { name: sharedCopy.howToPlay });
    const fair = within(nav).getByRole("link", { name: sharedCopy.whyFair });
    expect(rules).toHaveAttribute("href", "/how-to-play");
    expect(fair).toHaveAttribute("href", "/fairness");
    expect(rules.className).toContain("bg-seat-yellow");
    expect(fair.className).toContain("bg-seat-blue");
  });
});
