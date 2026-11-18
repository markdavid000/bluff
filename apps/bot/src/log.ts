interface LogFields {
  table?: string;
  player?: string;
  action?: string;
  tx?: string;
  block?: string;
  reason?: string;
  status?: number;
  ms?: number;
  balance?: string;
  count?: number;
  error?: unknown;
}

const SAFE_FIELDS = [
  "table",
  "player",
  "action",
  "tx",
  "block",
  "reason",
  "status",
  "ms",
  "balance",
  "count",
] as const;

type Level = "info" | "warn" | "error";

export type Log = Record<Level, (event: string, fields?: LogFields) => void>;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const short = (error as Error & { shortMessage?: unknown }).shortMessage;
    return typeof short === "string" ? short : error.message;
  }
  return String(error);
}

export function createLog(
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  now: () => Date = () => new Date()
): Log {
  function entry(level: Level, event: string, fields: LogFields = {}) {
    const safe: Record<string, unknown> = { time: now().toISOString(), level, event };
    for (const key of SAFE_FIELDS) {
      if (fields[key] !== undefined) safe[key] = fields[key];
    }
    if (fields.error !== undefined) safe.error = errorMessage(fields.error);
    write(JSON.stringify(safe));
  }
  return {
    info: (event, fields) => entry("info", event, fields),
    warn: (event, fields) => entry("warn", event, fields),
    error: (event, fields) => entry("error", event, fields),
  };
}
