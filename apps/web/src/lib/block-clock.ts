let newest = 0n;
const listeners = new Set<() => void>();

export function seeBlock(block: bigint) {
  if (block <= newest) return;
  newest = block;
  listeners.forEach((listener) => listener());
}

export function newestBlock(): bigint {
  return newest;
}

export function onBlock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function forgetBlocks() {
  newest = 0n;
}
