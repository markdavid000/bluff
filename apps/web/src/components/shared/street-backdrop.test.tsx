import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tokensUsedIn, undefinedTokensIn } from "@/lib/page-tokens.testing";
import { PatternBand } from "./pattern-band";
import { StreetBackdrop } from "./street-backdrop";

describe("StreetBackdrop", () => {
  it("paints only with colour tokens the page actually defines, in day and night", () => {
    const { container } = render(<StreetBackdrop />);
    expect(tokensUsedIn(container.innerHTML)).toEqual(
      expect.arrayContaining(["--street-shadow", "--glass"])
    );
    expect(undefinedTokensIn(container.innerHTML)).toEqual([]);
  });

  it("draws the street as one soft shadow, with lit windows only at night", () => {
    const { container } = render(<StreetBackdrop />);
    const filter = container.querySelector("filter");
    expect(filter?.querySelector("feFlood")?.getAttribute("style")).toContain("--street-shadow");
    expect(container.querySelector(`g[filter="url(#${filter?.id ?? ""})"]`)).not.toBeNull();
    const windows = container.querySelector("g.dark\\:inline");
    expect(windows?.getAttribute("class")).toBe("hidden dark:inline");
    expect(windows?.querySelectorAll("rect")).toHaveLength(8);
  });

  it("keeps its shadow when the page is drawn after moving between pages without a reload", () => {
    document.body.innerHTML =
      renderToStaticMarkup(<PatternBand />) + renderToStaticMarkup(<StreetBackdrop />);
    const shaded = document.querySelector("g[filter]");
    const target = /url\(#(.+)\)/.exec(shaded?.getAttribute("filter") ?? "")?.[1] ?? "";
    expect(document.getElementById(target)?.tagName.toLowerCase()).toBe("filter");
    document.body.innerHTML = "";
  });

  it("sinks past the bottom edge, with the overflow hidden", () => {
    const { container } = render(<StreetBackdrop />);
    const scene = container.querySelectorAll("svg");
    expect(scene).toHaveLength(1);
    expect(scene[0]?.getAttribute("class")).toContain("bottom-0");
    expect(scene[0]?.getAttribute("class")).toContain("translate-y-[20%]");
    expect(container.firstElementChild?.className).toContain("overflow-hidden");
  });

  it("is scenery only, and holds still for reduced motion", () => {
    const { container } = render(<StreetBackdrop />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root?.className).toContain("pointer-events-none");
    const moving = container.querySelectorAll("[class*='animate-street']");
    expect(moving.length).toBeGreaterThan(0);
    moving.forEach((element) => {
      expect(element.getAttribute("class")).toContain("motion-reduce:animate-none");
    });
  });
});
