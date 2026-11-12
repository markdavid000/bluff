import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

const WIDTH = 512;
const HEIGHT = 256;

export function calabashTexture(colors: { gourd: string; burnt: string }) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the calabash.");

  context.fillStyle = colors.gourd;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  for (let streak = 0; streak < 140; streak++) {
    context.globalAlpha = 0.05 + (streak % 5) * 0.015;
    context.fillStyle = colors.burnt;
    const x = (streak * 37) % WIDTH;
    context.fillRect(x, 0, 2 + (streak % 3), HEIGHT);
  }
  context.globalAlpha = 1;

  context.strokeStyle = colors.burnt;
  context.fillStyle = colors.burnt;
  for (const y of [70, 118, 166]) {
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
  context.lineWidth = 4;
  context.beginPath();
  for (let x = 0; x <= WIDTH; x += 32) {
    context.lineTo(x, 80);
    context.lineTo(x + 16, 108);
  }
  context.stroke();
  for (let x = 16; x < WIDTH; x += 32) {
    context.beginPath();
    context.moveTo(x, 128);
    context.lineTo(x + 12, 156);
    context.lineTo(x - 12, 156);
    context.closePath();
    context.fill();
  }
  for (let x = 8; x < WIDTH; x += 16) {
    context.beginPath();
    context.arc(x, 186, 3, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
