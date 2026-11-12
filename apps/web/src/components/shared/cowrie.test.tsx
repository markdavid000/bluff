import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tokensUsedIn, undefinedTokensIn } from "@/lib/page-tokens.testing";
import { Cowrie } from "./cowrie";

describe("Cowrie", () => {
  it("paints only with colour tokens the page actually defines, in day and night", () => {
    const { container } = render(<Cowrie />);
    expect(tokensUsedIn(container.innerHTML)).toEqual(
      expect.arrayContaining(["--cowrie", "--cowrie-shade", "--cowrie-slit"])
    );
    expect(undefinedTokensIn(container.innerHTML)).toEqual([]);
  });
});
