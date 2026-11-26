import { describe, expect, it } from "vitest";
import { STEP_SECONDS } from "@/lib/dice-geometry";
import { rollFrame } from "./roll-frame";

const STEP_MS = STEP_SECONDS * 1000;

describe("rollFrame", () => {
  it("plays the recorded throw one physics step at a time", () => {
    expect(rollFrame(0, 30)).toEqual({ index: 0, done: false });
    expect(rollFrame(STEP_MS * 10.5, 30)).toEqual({ index: 10, done: false });
  });

  it("holds the last frame and says the throw is over once it has played", () => {
    expect(rollFrame(STEP_MS * 29, 30)).toEqual({ index: 29, done: true });
    expect(rollFrame(STEP_MS * 500, 30)).toEqual({ index: 29, done: true });
  });
});
