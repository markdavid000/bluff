import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createLog } from "./log";
import { RATE_LIMIT, type SeatService, startServer } from "./server";

const SITE = "https://bluff.example";
const PLAYER = "0x00000000000000000000000000000000000b0b0b";
let close: () => Promise<void> = async () => undefined;
let base = "";
let clock = 1_800_000_000_000;
const logged: string[] = [];

function service(overrides: Partial<SeatService> = {}): SeatService {
  return {
    seat: async () => ({ kind: "seated", player: PLAYER }),
    health: async () => ({ bank: { address: "0xbank", balance: "1" }, players: [] }),
    ...overrides,
  };
}

async function start(seatService: SeatService) {
  const server = await startServer({
    port: 0,
    service: seatService,
    allowedOrigins: [SITE, "http://localhost:3000"],
    log: createLog((line) => logged.push(line)),
    now: () => clock,
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
}

function seat(body: unknown, origin = SITE, ip = "203.0.113.7") {
  return fetch(`${base}/seat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-forwarded-for": ip,
      connection: "close",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(async () => {
  await close();
  logged.length = 0;
  clock += 60 * 60_000;
});

describe("server", () => {
  it("seats a computer and says which, allowing the site to read the answer", async () => {
    const asked: bigint[] = [];
    await start(
      service({ seat: async (id) => (asked.push(id), { kind: "seated", player: PLAYER }) })
    );
    const response = await seat({ tableId: "251057203254149" });
    expect(response.status).toBe(202);
    expect(response.headers.get("access-control-allow-origin")).toBe(SITE);
    expect(await response.json()).toEqual({ seated: PLAYER });
    expect(asked).toEqual([251057203254149n]);
  });

  it("answers the browser's preflight for an allowed site", async () => {
    await start(service());
    const response = await fetch(`${base}/seat`, {
      method: "OPTIONS",
      headers: { origin: SITE, "access-control-request-method": "POST", connection: "close" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("refuses a site that isn't on the list", async () => {
    await start(service());
    expect((await seat({ tableId: "1" }, "https://evil.example")).status).toBe(403);
  });

  it.each([
    ["not json"],
    [{}],
    [{ tableId: 12 }],
    [{ tableId: "-1" }],
    [{ tableId: "0" }],
    [{ tableId: "1".repeat(80) }],
  ])("rejects a request that isn't a table number: %s", async (body) => {
    await start(service());
    const response = await seat(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: "bad-request" });
  });

  it("passes on each refusal with its reason", async () => {
    await start(service({ seat: async () => ({ kind: "refused", reason: "all-busy" }) }));
    const response = await seat({ tableId: "12" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ reason: "all-busy" });
  });

  it("limits each address to 5 requests in 10 minutes, then says when to come back", async () => {
    await start(service());
    for (let i = 0; i < RATE_LIMIT.requests; i++)
      expect((await seat({ tableId: "12" })).status).toBe(202);
    const limited = await seat({ tableId: "12" });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await seat({ tableId: "12" }, SITE, "198.51.100.9")).status).toBe(202);
    clock += RATE_LIMIT.windowMs;
    expect((await seat({ tableId: "12" })).status).toBe(202);
  });

  it("logs a failure and answers 503, without passing the error on", async () => {
    await start(service({ seat: async () => Promise.reject(new Error("rpc key-123 down")) }));
    const response = await seat({ tableId: "12" });
    expect(response.status).toBe(503);
    expect(response.headers.get("access-control-allow-origin")).toBe(SITE);
    expect(await response.text()).not.toMatch(/key-123/);
    expect(logged.some((line) => line.includes("seat failed"))).toBe(true);
  });

  it("reports health with the bank and players, and nothing else", async () => {
    await start(service());
    const response = await fetch(`${base}/health`, { headers: { connection: "close" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bank: { address: "0xbank", balance: "1" },
      players: [],
    });
  });

  it("knows no other paths", async () => {
    await start(service());
    expect((await fetch(`${base}/elsewhere`, { headers: { connection: "close" } })).status).toBe(
      404
    );
  });
});
