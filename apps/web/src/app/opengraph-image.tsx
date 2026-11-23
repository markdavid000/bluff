import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { landingCopy } from "@/features/landing";

export const alt = `${siteConfig.name}: ${landingCopy.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NIGHT = "#10132c";
const CREAM = "#f3ead9";
const OCHRE = "#dc932e";
const DICE: readonly { colour: string; pips: readonly (readonly [number, number])[] }[] = [
  { colour: "#db423c", pips: [[50, 50]] },
  {
    colour: "#348f4f",
    pips: [
      [28, 28],
      [72, 72],
    ],
  },
  {
    colour: "#f3c443",
    pips: [
      [26, 26],
      [50, 50],
      [74, 74],
    ],
  },
  {
    colour: "#3673cb",
    pips: [
      [26, 26],
      [74, 26],
      [50, 50],
      [26, 74],
      [74, 74],
    ],
  },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: NIGHT,
        color: CREAM,
      }}
    >
      <div style={{ height: 24, background: OCHRE, display: "flex" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          padding: "0 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 180, fontWeight: 800, lineHeight: 1 }}>{siteConfig.name}</div>
          <div style={{ fontSize: 44, maxWidth: 560, lineHeight: 1.25 }}>{landingCopy.tagline}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, width: 316 }}>
          {DICE.map(({ colour, pips }) => (
            <div
              key={colour}
              style={{
                width: 144,
                height: 144,
                borderRadius: 28,
                background: colour,
                position: "relative",
                display: "flex",
                boxShadow: "0 10px 0 rgba(0,0,0,0.35)",
              }}
            >
              {pips.map(([left, top]) => (
                <div
                  key={`${left}-${top}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: `${top}%`,
                    width: 24,
                    height: 24,
                    marginLeft: -12,
                    marginTop: -12,
                    borderRadius: 12,
                    background: CREAM,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 24, background: OCHRE, display: "flex" }} />
    </div>,
    size
  );
}
