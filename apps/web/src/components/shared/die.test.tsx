import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DieFace } from "./die";

describe("DieFace", () => {
  it("measures its pip padding against the die itself, never against a wide row around it", () => {
    const { container } = render(
      <p>
        <DieFace face={5} className="size-7" />
      </p>
    );
    const die = container.querySelector("p > span");
    expect(die?.className).toContain("size-7");
    expect(die?.className).toContain("relative");
    expect(die?.className).not.toMatch(/\bp-\[/);
    const face = die?.firstElementChild;
    expect(face?.className).toContain("absolute");
    expect(face?.className).toContain("inset-0");
    expect(face?.className).toContain("p-[14%]");
  });

  it("shows the right number of pips for every face", () => {
    for (const face of [1, 2, 3, 4, 5, 6] as const) {
      const { container, unmount } = render(<DieFace face={face} className="size-10" />);
      expect(container.querySelectorAll(".bg-board")).toHaveLength(face);
      unmount();
    }
  });
});
