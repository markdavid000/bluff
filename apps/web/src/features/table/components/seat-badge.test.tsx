import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { SeatBadge, type SeatBadgeProps } from "./seat-badge";

function show(props: Partial<SeatBadgeProps> = {}) {
  render(
    <SeatBadge
      name="Baba Dice"
      avatarSrc="/a.svg"
      ready
      isHost={false}
      isMe={false}
      isComputer={false}
      updating={false}
      {...props}
    />
  );
}

describe("SeatBadge", () => {
  it("marks a computer player in the waiting room, on screen and for screen readers", () => {
    show({ isComputer: true });
    expect(screen.getByText(tableCopy.computer)).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: `Baba Dice, ${tableCopy.computer}, ${tableCopy.ready}` })
    ).toBeInTheDocument();
  });

  it("shows no computer mark for a person", () => {
    show();
    expect(screen.queryByText(tableCopy.computer)).not.toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: `Baba Dice, ${tableCopy.ready}` })
    ).toBeInTheDocument();
  });
});
