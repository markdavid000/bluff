import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Appear } from "./appear";

describe("Appear", () => {
  it("shows its content while the condition holds", () => {
    render(
      <Appear show>
        <button type="button">Raise</button>
      </Appear>
    );
    expect(screen.getByRole("button", { name: "Raise" })).toBeInTheDocument();
  });

  it("shows nothing while the condition doesn't hold", () => {
    render(
      <Appear show={false}>
        <button type="button">Raise</button>
      </Appear>
    );
    expect(screen.queryByRole("button", { name: "Raise" })).toBeNull();
  });

  it("eases in when the condition starts to hold", () => {
    const { rerender } = render(
      <Appear show={false}>
        <button type="button">Raise</button>
      </Appear>
    );
    rerender(
      <Appear show>
        <button type="button">Raise</button>
      </Appear>
    );
    const wrapper = screen.getByRole("button", { name: "Raise" }).parentElement;
    expect(Number(wrapper?.style.opacity)).toBeLessThan(1);
  });

  it("eases out, then leaves, when the condition stops holding", async () => {
    const { rerender } = render(
      <Appear show>
        <button type="button">Raise</button>
      </Appear>
    );
    rerender(
      <Appear show={false}>
        <button type="button">Raise</button>
      </Appear>
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Raise" })).toBeNull());
  });

  it("stops taking presses while it eases out", () => {
    const { rerender } = render(
      <Appear show>
        <button type="button">Raise</button>
      </Appear>
    );
    rerender(
      <Appear show={false}>
        <button type="button">Raise</button>
      </Appear>
    );
    const button = screen.getByText("Raise");
    expect(button.parentElement).toHaveAttribute("inert");
  });

  it("can sit inside a line of text", () => {
    render(
      <p>
        <Appear show inline>
          <span>Your turn!</span>
        </Appear>
      </p>
    );
    expect(screen.getByText("Your turn!").parentElement?.tagName).toBe("SPAN");
  });

  it("cross-fades when what it shows changes", async () => {
    const { rerender } = render(
      <Appear show swapKey="ada">
        <span>Ada is thinking</span>
      </Appear>
    );
    rerender(
      <Appear show swapKey="kola">
        <span>Kola is thinking</span>
      </Appear>
    );
    await waitFor(() => expect(screen.getByText("Kola is thinking")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Ada is thinking")).toBeNull());
  });

  it("can pop in for things that should grab attention", () => {
    const { rerender } = render(
      <Appear show={false} pop>
        <span>Your turn!</span>
      </Appear>
    );
    rerender(
      <Appear show pop>
        <span>Your turn!</span>
      </Appear>
    );
    expect(screen.getByText("Your turn!")).toBeInTheDocument();
  });
});
