function keyFor(id: bigint): string {
  return `bluff:computer-sat:${id.toString()}`;
}

export function computerSatAt(id: bigint): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(keyFor(id)) === "yes";
  } catch (error) {
    console.warn("Bluff could not check whether the computer sat at this table.", error);
    return false;
  }
}

export function rememberComputerAt(id: bigint) {
  try {
    window.sessionStorage.setItem(keyFor(id), "yes");
  } catch (error) {
    console.warn("Bluff could not remember that the computer sat at this table.", error);
  }
}
