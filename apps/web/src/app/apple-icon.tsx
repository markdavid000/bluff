import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const PIPS: readonly (readonly [number, number])[] = [
  [26, 26],
  [74, 26],
  [50, 50],
  [26, 74],
  [74, 74],
];

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#db423c",
        borderRadius: 40,
      }}
    >
      {PIPS.map(([left, top]) => (
        <div
          key={`${left}-${top}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: 32,
            height: 32,
            marginLeft: -16,
            marginTop: -16,
            borderRadius: 16,
            background: "#f3ead9",
          }}
        />
      ))}
    </div>,
    size
  );
}
