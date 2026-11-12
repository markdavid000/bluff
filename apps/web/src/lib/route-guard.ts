import { safeNextPath } from "./safe-redirect";
import type { SessionCheck } from "./session-token";

const PROTECTED_PREFIXES = ["/play", "/welcome", "/profile", "/table"] as const;

const SIGN_IN_PAGES = ["/sign-in", "/refresh"] as const;

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
  const returningFromGoogle = PRIVY_OAUTH_PARAMS.some((param) => search.has(param));
  if ((SIGN_IN_PAGES as readonly string[]).includes(pathname)) {
    return session.status === "valid" && !returningFromGoogle
      ? { action: "redirect", to: safeNextPath(search.get("next")) }
      : { action: "allow" };
  }
  if (!isProtectedPath(pathname)) return { action: "allow" };
  if (returningFromGoogle) return { action: "allow" };
  if (session.status === "valid") return { action: "allow" };
  const query = search.toString();
  const next = encodeURIComponent(query ? `${pathname}?${query}` : pathname);
  const page = session.status === "expired" ? "/refresh" : "/sign-in";
  return { action: "redirect", to: `${page}?next=${next}` };
}
