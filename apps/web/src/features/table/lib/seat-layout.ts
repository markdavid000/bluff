import type { TableSize } from "@bluff/game";
import type { Vector } from "@/lib/dice-physics";

export type SeatColor = "red" | "green" | "yellow" | "blue";

type Side = "bottom" | "left" | "top" | "right";

export interface SeatPlacement {
  side: Side;
  color: SeatColor;
  cup: Vector;
  throwFrom: Vector;
  facing: number;
}

const PLACEMENTS: Record<Side, Omit<SeatPlacement, "color">> = {
  bottom: { side: "bottom", cup: [0, 0, 2.55], throwFrom: [0, 1.1, 2.4], facing: 0 },
  left: { side: "left", cup: [-2.55, 0, 0], throwFrom: [-2.4, 1.1, 0], facing: Math.PI / 2 },
  top: { side: "top", cup: [0, 0, -2.55], throwFrom: [0, 1.1, -2.4], facing: Math.PI },
  right: { side: "right", cup: [2.55, 0, 0], throwFrom: [2.4, 1.1, 0], facing: -Math.PI / 2 },
};

const SIDES_BY_COUNT: Record<2 | 3 | 4, Side[]> = {
  2: ["bottom", "top"],
  3: ["bottom", "left", "right"],
  4: ["bottom", "left", "top", "right"],
};

const COLORS: SeatColor[] = ["red", "green", "yellow", "blue"];

export function seatLayout(players: TableSize, yourSeat: number): SeatPlacement[] {
  const sides = SIDES_BY_COUNT[players];
  return Array.from({ length: players }, (_, seat) => {
    const offset = (seat - yourSeat + players) % players;
    return { ...PLACEMENTS[sides[offset]], color: COLORS[seat] };
  });
}
