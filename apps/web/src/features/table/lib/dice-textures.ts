import { CanvasTexture, SRGBColorSpace } from "three";
import type { Face } from "@bluff/game";

const SIZE = 256;

const PIP_SPOTS: Record<Face, readonly [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.27, 0.22],
    [0.73, 0.22],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.78],
    [0.73, 0.78],
  ],
};

export function dieFaceTexture(face: Face, colors: { body: string; pip: string; edge: string }) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the dice.");
  context.fillStyle = colors.edge;
  context.fillRect(0, 0, SIZE, SIZE);
  context.fillStyle = colors.body;
  context.beginPath();
  context.roundRect(8, 8, SIZE - 16, SIZE - 16, 44);
  context.fill();
  for (const [x, y] of PIP_SPOTS[face]) {
    const gradient = context.createRadialGradient(
      x * SIZE - 4,
      y * SIZE - 4,
      2,
      x * SIZE,
      y * SIZE,
      face === 1 ? 34 : 24
    );
    gradient.addColorStop(0, colors.pip);
    gradient.addColorStop(1, colors.edge);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x * SIZE, y * SIZE, face === 1 ? 30 : 21, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
