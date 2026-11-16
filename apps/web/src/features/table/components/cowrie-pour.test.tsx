import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CowriePour } from "./cowrie-pour";

let calm = false;
vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => calm }));

describe("CowriePour", () => {
  it("pours a handful of cowries over what it wraps", () => {
    calm = false;
    const { container, getByText } = render(
      <CowriePour>
        <p>You won 20 chips</p>
      </CowriePour>
    );
    expect(getByText("You won 20 chips")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pouring-cowrie]").length).toBeGreaterThan(4);
  });

  it("pours nothing when motion should be calm", () => {
    calm = true;
    const { container, getByText } = render(
      <CowriePour>
        <p>You won 20 chips</p>
      </CowriePour>
    );
    expect(getByText("You won 20 chips")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pouring-cowrie]")).toHaveLength(0);
  });
});
