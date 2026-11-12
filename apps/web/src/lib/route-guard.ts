import type { SessionCheck } from "./session-token";

const PROTECTED_PREFIXES = ["/play", "/welcome", "/profile", "/table"] as const;

const PRIVY_OAUTH_PARAMS = ["privy_oauth_code", "privy_oauth_state", "privy_oauth_provider"];

export type GuardDecision = { action: "allow" } | { action: "redirect"; to: string };

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function decideRoute(
  pathname: string,
  search: URLSearchParams,
  session: SessionCheck
): GuardDecision {
  if (!isProtectedPath(pathname)) return { action: "allow" };
  if (PRIVY_OAUTH_PARAMS.some((param) => search.has(param))) return { action: "allow" };
  if (session.status === "valid") return { action: "allow" };
  const query = search.toString();
  const next = encodeURIComponent(query ? `${pathname}?${query}` : pathname);
  const page = session.status === "expired" ? "/refresh" : "/sign-in";
  return { action: "redirect", to: `${page}?next=${next}` };
}
