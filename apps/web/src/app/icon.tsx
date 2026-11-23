import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const PIPS: readonly (readonly [number, number])[] = [
  [26, 26],
  [74, 26],
  [50, 50],
  [26, 74],
  [74, 74],
];

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#db423c",
        borderRadius: 14,
      }}
    >
      {PIPS.map(([left, top]) => (
        <div
          key={`${left}-${top}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: 6,
            background: "#f3ead9",
          }}
        />
      ))}
    </div>,
    size
  );
}
