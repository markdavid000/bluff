export const WAKING_WAITS_MS = [4_000, 7_000, 9_000] as const;
const ANSWER_LIMIT_MS = 90_000;
const WAKING_STATUSES = new Set([502, 504]);

export type ComputerOutcome =
  | { kind: "seated" }
  | { kind: "taken" }
  | { kind: "busy" }
  | { kind: "too-many" }
  | { kind: "unavailable" }
  | { kind: "unreachable" };

function outcomeOf(status: number, reason: unknown): ComputerOutcome {
  if (status === 202) return { kind: "seated" };
  if (status === 429) return { kind: "too-many" };
  if (status === 409 && reason === "full") return { kind: "taken" };
  if (status === 409 && reason === "all-busy") return { kind: "busy" };
  return { kind: "unavailable" };
}

async function reasonIn(response: Response): Promise<unknown> {
  if (response.status !== 409) return null;
  const body: unknown = await response.json();
  return typeof body === "object" && body !== null && "reason" in body ? body.reason : null;
}

function tookTooLong(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

export async function requestComputer({
  botUrl,
  tableId,
  fetcher = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onWaking,
}: {
  botUrl: string;
  tableId: bigint;
  fetcher?: (url: string, init?: RequestInit) => Promise<Response>;
  sleep?: (ms: number) => Promise<void>;
  onWaking: () => void;
}): Promise<ComputerOutcome> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response | null = null;
    try {
      response = await fetcher(`${botUrl}/seat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tableId: tableId.toString() }),
        signal: AbortSignal.timeout(ANSWER_LIMIT_MS),
      });
    } catch (error) {
      if (tookTooLong(error)) return { kind: "unavailable" };
      if (!(error instanceof TypeError)) throw error;
    }
    if (response !== null && !WAKING_STATUSES.has(response.status)) {
      return outcomeOf(response.status, await reasonIn(response));
    }
    const wait = WAKING_WAITS_MS[attempt];
    if (wait === undefined) return { kind: "unreachable" };
    if (attempt === 0) onWaking();
    await sleep(wait);
  }
}
