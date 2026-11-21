import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import type { Log } from "./log";
import type { SeatRefusal } from "./seat-policy";

export const RATE_LIMIT = { requests: 5, windowMs: 10 * 60_000 } as const;
const MOST_BODY_BYTES = 1024;
const TABLE_ID = /^[1-9]\d{0,77}$/;

export type SeatReason = SeatRefusal | "all-busy" | "resting" | "not-found";

export type SeatResult =
  { kind: "seated"; player: string } | { kind: "refused"; reason: SeatReason };

export interface Health {
  bank: { address: string; balance: string };
  players: { address: string; name: string; busy: boolean; balance: string }[];
}

export interface SeatService {
  seat(tableId: bigint): Promise<SeatResult>;
  health(): Promise<Health>;
}

class BadRequest extends Error {}

function send(
  response: ServerResponse,
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  response.writeHead(
    status,
    body === undefined ? headers : { ...headers, "content-type": "application/json" }
  );
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MOST_BODY_BYTES) {
        reject(new BadRequest("The request is too big"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function tableIdFrom(text: string): bigint {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new BadRequest(`The request isn't JSON: ${String(error)}`);
  }
  const tableId =
    typeof parsed === "object" && parsed !== null && "tableId" in parsed
      ? parsed.tableId
      : undefined;
  if (typeof tableId !== "string" || !TABLE_ID.test(tableId))
    throw new BadRequest("No table number");
  return BigInt(tableId);
}

function clientAddress(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || request.socket.remoteAddress || "unknown";
}

function createRateLimit(now: () => number) {
  const seen = new Map<string, number[]>();
  return (address: string): number => {
    const time = now();
    const recent = (seen.get(address) ?? []).filter((at) => time - at < RATE_LIMIT.windowMs);
    if (recent.length >= RATE_LIMIT.requests) {
      seen.set(address, recent);
      const oldest = recent[0] ?? time;
      return Math.max(1, Math.ceil((oldest + RATE_LIMIT.windowMs - time) / 1000));
    }
    recent.push(time);
    seen.set(address, recent);
    return 0;
  };
}

export function startServer({
  port,
  service,
  allowedOrigins,
  log,
  now = Date.now,
}: {
  port: number;
  service: SeatService;
  allowedOrigins: readonly string[];
  log: Log;
  now?: () => number;
}): Promise<Server> {
  const limited = createRateLimit(now);

  function corsFor(request: IncomingMessage): Record<string, string> {
    const origin = request.headers.origin;
    return typeof origin === "string" && allowedOrigins.includes(origin)
      ? { "access-control-allow-origin": origin, vary: "origin" }
      : {};
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const path = new URL(request.url ?? "/", "http://bot").pathname;
    const cors = corsFor(request);
    const allowed = "access-control-allow-origin" in cors;

    if (path === "/health" && request.method === "GET") {
      send(response, 200, await service.health(), cors);
      return;
    }
    if (path !== "/seat") {
      send(response, 404, { reason: "not-found" });
      return;
    }
    if (!allowed) {
      send(response, 403, { reason: "site-not-allowed" });
      return;
    }
    if (request.method === "OPTIONS") {
      send(response, 204, undefined, {
        ...cors,
        "access-control-allow-methods": "POST",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      });
      return;
    }
    if (request.method !== "POST") {
      send(response, 405, { reason: "method-not-allowed" }, cors);
      return;
    }
    let tableId: bigint;
    try {
      tableId = tableIdFrom(await readBody(request));
    } catch (error) {
      if (!(error instanceof BadRequest)) throw error;
      send(response, 400, { reason: "bad-request" }, cors);
      return;
    }
    const retryAfter = limited(clientAddress(request));
    if (retryAfter > 0) {
      send(
        response,
        429,
        { reason: "too-many-requests" },
        { ...cors, "retry-after": String(retryAfter) }
      );
      return;
    }
    const result = await service.seat(tableId);
    if (result.kind === "seated") {
      log.info("seat granted", { table: tableId.toString(), player: result.player });
      send(response, 202, { seated: result.player }, cors);
    } else {
      log.info("seat refused", { table: tableId.toString(), reason: result.reason });
      send(response, 409, { reason: result.reason }, cors);
    }
  }

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      log.error("seat failed", { action: request.url ?? "", error });
      if (!response.headersSent) send(response, 503, { reason: "unavailable" }, corsFor(request));
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
