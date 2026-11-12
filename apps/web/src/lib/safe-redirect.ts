export const DEFAULT_AFTER_SIGN_IN = "/play";

export function safeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (/[\u0000-\u001f]/.test(value)) return DEFAULT_AFTER_SIGN_IN;
  const parsed = new URL(value, "https://bluff.invalid");
  if (parsed.origin !== "https://bluff.invalid") return DEFAULT_AFTER_SIGN_IN;
  return `${parsed.pathname}${parsed.search}`;
}
