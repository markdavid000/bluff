function pause(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function keepTrying<T>(
  attempt: () => Promise<T>,
  { forMs, everyMs }: { forMs: number; everyMs: number }
): Promise<T> {
  const deadline = Date.now() + forMs;
  for (;;) {
    try {
      return await attempt();
    } catch (error) {
      if (Date.now() + everyMs > deadline) throw error;
      await pause(everyMs);
    }
  }
}
