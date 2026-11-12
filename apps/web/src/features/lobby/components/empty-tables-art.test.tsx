import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tokensUsedIn, undefinedTokensIn } from "@/lib/page-tokens.testing";
import { EmptyTablesArt } from "./empty-tables-art";

describe("EmptyTablesArt", () => {
  it("paints only with colour tokens the page actually defines, in day and night", () => {
    const { container } = render(<EmptyTablesArt />);
    expect(tokensUsedIn(container.innerHTML).length).toBeGreaterThan(0);
    expect(undefinedTokensIn(container.innerHTML)).toEqual([]);
  });

  it("is decoration only, hidden from screen readers", () => {
    const { container } = render(<EmptyTablesArt />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });
});
