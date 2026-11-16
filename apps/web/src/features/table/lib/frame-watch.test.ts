import { describe, expect, it } from "vitest";
import { createFrameWatch } from "./frame-watch";

function run(watch: ReturnType<typeof createFrameWatch>, fps: number, seconds: number) {
  let slow = false;
  for (let frame = 0; frame < fps * seconds; frame += 1) slow = watch.tick(1 / fps) || slow;
  return slow;
}

describe("createFrameWatch", () => {
  it("calls the board slow after 3 seconds in a row under 30 frames a second", () => {
    const watch = createFrameWatch();
    expect(run(watch, 20, 2)).toBe(false);
    expect(run(watch, 20, 1)).toBe(true);
  });

  it("starts counting again after a smooth second", () => {
    const watch = createFrameWatch();
    run(watch, 20, 2);
    run(watch, 60, 1);
    expect(run(watch, 20, 2)).toBe(false);
  });

  it("stays quiet on a smooth board", () => {
    expect(run(createFrameWatch(), 60, 10)).toBe(false);
  });

  it("reports slowness once", () => {
    const watch = createFrameWatch();
    expect(run(watch, 20, 3)).toBe(true);
    expect(run(watch, 20, 3)).toBe(false);
  });

  it("doesn't count a pause, like a hidden tab, as a slow board", () => {
    const watch = createFrameWatch();
    let slow = false;
    for (let pause = 0; pause < 6; pause += 1) slow = watch.tick(1.5) || slow;
    expect(slow).toBe(false);
  });

  it("starts counting again after a pause", () => {
    const watch = createFrameWatch();
    run(watch, 20, 2);
    watch.tick(2);
    expect(run(watch, 20, 2)).toBe(false);
  });
});
