import { type NextRequest, NextResponse } from "next/server";
import { sessionSecret } from "@/config/server-env";
import { decideRoute } from "@/lib/route-guard";
import { SESSION_COOKIE, checkSessionToken } from "@/lib/session-token";

export async function proxy(request: NextRequest) {
  const session = await checkSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    sessionSecret()
  );
  const decision = decideRoute(request.nextUrl.pathname, request.nextUrl.searchParams, session);
  if (decision.action === "allow") return NextResponse.next();
  return NextResponse.redirect(new URL(decision.to, request.url));
}

export const config = {
  matcher: [
    "/play/:path*",
    "/welcome/:path*",
    "/table/:path*",
    "/history/:path*",
    "/sign-in",
    "/refresh",
  ],
};
