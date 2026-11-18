import { describe, expect, it } from "vitest";
import { createLog } from "./log";

function capture() {
  const lines: string[] = [];
  return {
    log: createLog(
      (line) => lines.push(line),
      () => new Date("2026-11-18T12:00:00Z")
    ),
    lines,
  };
}

describe("createLog", () => {
  it("writes one JSON line per event, with the time and level", () => {
    const { log, lines } = capture();
    log.info("seated", { table: "12", player: "0xabc" });
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      {
        time: "2026-11-18T12:00:00.000Z",
        level: "info",
        event: "seated",
        table: "12",
        player: "0xabc",
      },
    ]);
  });

  it("keeps only the safe fields, so dice, phrases and keys can never be written", () => {
    const { log, lines } = capture();
    const unsafe = {
      table: "12",
      faces: [6, 6],
      mnemonic: "words",
      rpcUrl: "https://x/key",
    } as Record<string, unknown>;
    log.warn("turn", unsafe);
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      time: "2026-11-18T12:00:00.000Z",
      level: "warn",
      event: "turn",
      table: "12",
    });
  });

  it("writes errors with their message, not their stack", () => {
    const { log, lines } = capture();
    log.error("move failed", { table: "12", error: new Error("reverted") });
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ level: "error", error: "reverted" });
  });
});
