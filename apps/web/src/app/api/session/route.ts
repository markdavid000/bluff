import { type NextRequest, NextResponse } from "next/server";
import { isLocalRequest, privyAppId, sessionSecret } from "@/config/server-env";
import { bearerToken, checkPrivyAccessToken, privyKeySet } from "@/lib/privy-token";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session-token";

let keys: ReturnType<typeof privyKeySet> | null = null;

export async function POST(request: NextRequest) {
  keys ??= privyKeySet(privyAppId());
  const check = await checkPrivyAccessToken(bearerToken(request.headers.get("authorization")), {
    appId: privyAppId(),
    keys,
  });
  if (check.status !== "valid") {
    return NextResponse.json({ signedIn: false }, { status: 401 });
  }
  const response = NextResponse.json({ signedIn: true });
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(check.userId, sessionSecret()),
    sessionCookieOptions(!isLocalRequest(request.nextUrl))
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ signedIn: false });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
