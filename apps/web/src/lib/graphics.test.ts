import { afterEach, describe, expect, it, vi } from "vitest";
import { boardToShow, graphicsSupport } from "./graphics";

type Probe = (kind: string, attributes?: WebGLContextAttributes) => boolean;

const loseContext = vi.fn();

function devices(answer: Probe) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((
    kind: string,
    attributes?: WebGLContextAttributes
  ) =>
    answer(kind, attributes)
      ? { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null) }
      : null) as HTMLCanvasElement["getContext"]);
}

afterEach(() => {
  vi.restoreAllMocks();
  loseContext.mockClear();
});

describe("graphicsSupport", () => {
  it("calls a device with a proper graphics chip fully able", () => {
    devices(() => true);
    expect(graphicsSupport()).toBe("full");
  });

  it("calls a device weak when it can only draw 3D slowly", () => {
    devices((_, attributes) => attributes?.failIfMajorPerformanceCaveat !== true);
    expect(graphicsSupport()).toBe("weak");
  });

  it("calls a device unable when it can't draw 3D at all", () => {
    devices(() => false);
    expect(graphicsSupport()).toBe("none");
  });

  it("falls back to the older 3D drawing when the newer one is missing", () => {
    devices((kind) => kind === "webgl");
    expect(graphicsSupport()).toBe("full");
  });

  it("lets go of every test drawing surface it opened", () => {
    devices((_, attributes) => attributes?.failIfMajorPerformanceCaveat !== true);
    graphicsSupport();
    expect(loseContext).toHaveBeenCalledOnce();
  });
});

describe("boardToShow", () => {
  it("shows the 3D board on a device that draws it well", () => {
    expect(boardToShow({ board: "3d", boardPicked: false }, "full")).toBe("3d");
  });

  it("shows the flat board on a weak device, unless the player picked 3D", () => {
    expect(boardToShow({ board: "3d", boardPicked: false }, "weak")).toBe("flat");
    expect(boardToShow({ board: "3d", boardPicked: true }, "weak")).toBe("3d");
  });

  it("always shows the flat board when the player picked it", () => {
    expect(boardToShow({ board: "flat", boardPicked: true }, "full")).toBe("flat");
    expect(boardToShow({ board: "flat", boardPicked: false }, "full")).toBe("flat");
  });

  it("shows the flat board when the device can't draw 3D at all", () => {
    expect(boardToShow({ board: "3d", boardPicked: true }, "none")).toBe("flat");
  });
});
