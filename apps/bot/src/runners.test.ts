import { describe, expect, it } from "vitest";
import { createLog } from "./log";
import { createRunners } from "./runners";

function fakeRunner() {
  const heads: (bigint | undefined)[] = [];
  return { heads, update: async (head?: bigint) => void heads.push(head) };
}

describe("createRunners", () => {
  it("plays each table with one runner, even when asked to start it twice", () => {
    const lines: string[] = [];
    const runners = createRunners<ReturnType<typeof fakeRunner>>(
      createLog((line) => void lines.push(line))
    );
    const first = fakeRunner();
    const second = fakeRunner();
    runners.start(12n, () => first);
    runners.start(12n, () => second);
    expect(runners.tables()).toEqual([12n]);
    expect(runners.get(12n)).toBe(first);
    expect(first.heads).toEqual([undefined]);
    expect(second.heads).toEqual([]);
    expect(lines.some((line) => line.includes("already playing"))).toBe(true);
  });

  it("lets a table be played again once its runner has finished", () => {
    const runners = createRunners<ReturnType<typeof fakeRunner>>(createLog(() => undefined));
    let finish: () => void = () => undefined;
    const first = fakeRunner();
    runners.start(12n, (finished) => {
      finish = finished;
      return first;
    });
    finish();
    expect(runners.tables()).toEqual([]);
    const next = fakeRunner();
    runners.start(12n, () => next);
    expect(runners.get(12n)).toBe(next);
    expect(runners.count()).toBe(1);
  });
});
