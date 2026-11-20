import { describe, expect, it, vi } from "vitest";
import { WAKING_WAITS_MS, requestComputer } from "./computer-seat";

const BOT = "https://bot.example";

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function harness(answers: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const waits: number[] = [];
  const onWaking = vi.fn();
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = answers.shift();
    if (next === undefined) throw new Error("no more answers");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = async (ms: number) => {
    waits.push(ms);
  };
  return {
    calls,
    waits,
    onWaking,
    ask: (tableId = 12n) => requestComputer({ botUrl: BOT, tableId, fetcher, sleep, onWaking }),
  };
}

describe("requestComputer", () => {
  it("asks the computer to sit at the table and reports it seated", async () => {
    const h = harness([reply(202, { seated: "0xabc" })]);
    expect(await h.ask(12n)).toEqual({ kind: "seated" });
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.url).toBe(`${BOT}/seat`);
    expect(h.calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(h.calls[0]?.init?.body))).toEqual({ tableId: "12" });
    expect(h.onWaking).not.toHaveBeenCalled();
  });

  it("says a person took the seat first", async () => {
    const h = harness([reply(409, { reason: "full" })]);
    expect(await h.ask()).toEqual({ kind: "taken" });
  });

  it("says the computer is busy when every computer is playing", async () => {
    const h = harness([reply(409, { reason: "all-busy" })]);
    expect(await h.ask()).toEqual({ kind: "busy" });
  });

  it("says the computer can't play for any other refusal, without retrying", async () => {
    for (const reason of ["resting", "not-found", "too-old", "private", "not-waiting"]) {
      const h = harness([reply(409, { reason })]);
      expect(await h.ask()).toEqual({ kind: "unavailable" });
      expect(h.calls).toHaveLength(1);
    }
  });

  it("says to wait a while after too many requests", async () => {
    const h = harness([reply(429, { reason: "too-many-requests" })]);
    expect(await h.ask()).toEqual({ kind: "too-many" });
  });

  it("wakes a sleeping service by trying again, and says it's waking", async () => {
    const h = harness([
      new TypeError("Failed to fetch"),
      reply(502, {}),
      reply(202, { seated: "0xabc" }),
    ]);
    expect(await h.ask()).toEqual({ kind: "seated" });
    expect(h.onWaking).toHaveBeenCalledOnce();
    expect(h.waits).toEqual(WAKING_WAITS_MS.slice(0, 2));
  });

  it("gives up after three more tries over about twenty seconds", async () => {
    const h = harness([reply(502, {}), reply(504, {}), reply(502, {}), reply(502, {})]);
    expect(await h.ask()).toEqual({ kind: "unreachable" });
    expect(h.calls).toHaveLength(4);
    const waited = h.waits.reduce((sum, ms) => sum + ms, 0);
    expect(waited).toBeGreaterThanOrEqual(15_000);
    expect(waited).toBeLessThanOrEqual(25_000);
  });

  it("stops waiting when the computer takes too long to answer", async () => {
    const h = harness([new DOMException("The operation timed out.", "TimeoutError")]);
    expect(await h.ask()).toEqual({ kind: "unavailable" });
    expect(h.calls).toHaveLength(1);
  });

  it("does not try again when the service failed while seating, since a retry could misread its own seat", async () => {
    const h = harness([reply(503, { reason: "unavailable" })]);
    expect(await h.ask()).toEqual({ kind: "unavailable" });
    expect(h.calls).toHaveLength(1);
  });
});
