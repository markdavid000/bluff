import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TileLink } from "./tile-link";

describe("TileLink", () => {
  it("is a real link that looks like a raised tile", () => {
    render(
      <TileLink href="/play" tone="red" icon="play">
        Sit down and play
      </TileLink>
    );
    const link = screen.getByRole("link", { name: "Sit down and play" });
    expect(link).toHaveAttribute("href", "/play");
    expect(link.className).toContain("bg-seat-red");
  });
});
