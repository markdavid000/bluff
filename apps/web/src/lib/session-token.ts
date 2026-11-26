import { SignJWT, errors, jwtVerify } from "jose";

export const SESSION_COOKIE = "bluff-session";
export const SESSION_SECONDS = 60 * 60;
const SESSION_COOKIE_SECONDS = 24 * 60 * 60;

const ISSUER = "bluff";

export type SessionCheck =
  { status: "valid"; userId: string } | { status: "expired" } | { status: "invalid" };

function key(secret: string): Uint8Array {
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  userId: string,
  secret: string,
  now: Date = new Date()
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_SECONDS)
    .sign(key(secret));
}

export async function checkSessionToken(
  token: string | undefined,
  secret: string,
  now: Date = new Date()
): Promise<SessionCheck> {
  if (!token) return { status: "invalid" };
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      algorithms: ["HS256"],
      currentDate: now,
    });
    return payload.sub ? { status: "valid", userId: payload.sub } : { status: "invalid" };
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { status: "expired" };
    if (error instanceof errors.JOSEError) return { status: "invalid" };
    throw error;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_SECONDS,
  };
}
