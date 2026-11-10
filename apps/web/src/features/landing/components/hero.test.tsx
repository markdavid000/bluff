import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { landingCopy } from "../copy";
import { Hero } from "./hero";

describe("Hero", () => {
  it("names the game as the page heading", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.name })).toBeInTheDocument();
  });

  it("explains the game in plain words", () => {
    render(<Hero />);
    expect(screen.getByText(landingCopy.tagline)).toBeInTheDocument();
    expect(screen.getByText(landingCopy.explainer)).toBeInTheDocument();
  });
});
