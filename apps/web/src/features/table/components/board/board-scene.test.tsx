import { render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { Texture } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Fiber from "@react-three/fiber";
import { tableCopy } from "../../copy";
import { seatLayout } from "../../lib/seat-layout";
import { BoardScene } from "./board-scene";

let canvas: Partial<ComponentProps<typeof Fiber.Canvas>> = {};
vi.mock("@react-three/fiber", async (importOriginal) => ({
  ...(await importOriginal<typeof Fiber>()),
  Canvas: (props: ComponentProps<typeof Fiber.Canvas>) => {
    canvas = props;
    return null;
  },
}));
vi.mock("../../lib/dice-textures", () => ({ dieFaceTexture: () => new Texture() }));

const COLORS = new Proxy({}, { get: () => "#808080" }) as ComponentProps<
  typeof BoardScene
>["colors"];

const props = {
  colors: COLORS,
  seats: seatLayout(2, 0),
  throwState: { kind: "idle" } as const,
  chipsEach: 0,
  revealed: false,
  label: tableCopy.boardLabel,
};

afterEach(() => {
  canvas = {};
});

describe("BoardScene", () => {
  it("draws a frame only when something on the board moves", () => {
    render(<BoardScene {...props} />);
    expect(canvas.frameloop).toBe("demand");
  });

  it("keeps the drawing sharp without drawing more pixels than a phone needs", () => {
    render(<BoardScene {...props} />);
    expect(canvas.dpr).toEqual([1, 1.5]);
  });

  it("draws nothing at all while paused", () => {
    render(<BoardScene {...props} paused />);
    expect(canvas.frameloop).toBe("never");
  });
});
