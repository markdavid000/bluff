import { type JWTVerifyGetKey, createRemoteJWKSet, errors, jwtVerify } from "jose";

const PRIVY_ISSUER = "privy.io";

export type PrivyTokenCheck = { status: "valid"; userId: string } | { status: "invalid" };

export function privyKeySet(appId: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`));
}

export async function checkPrivyAccessToken(
  token: string | null | undefined,
  { appId, keys }: { appId: string; keys: JWTVerifyGetKey },
  now: Date = new Date()
): Promise<PrivyTokenCheck> {
  if (!token) return { status: "invalid" };
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: PRIVY_ISSUER,
      audience: appId,
      algorithms: ["ES256"],
      currentDate: now,
    });
    return payload.sub ? { status: "valid", userId: payload.sub } : { status: "invalid" };
  } catch (error) {
    if (error instanceof errors.JWSSignatureVerificationFailed) return { status: "invalid" };
    if (error instanceof errors.JWTClaimValidationFailed) return { status: "invalid" };
    if (error instanceof errors.JWTExpired) return { status: "invalid" };
    if (error instanceof errors.JWSInvalid || error instanceof errors.JWTInvalid) {
      return { status: "invalid" };
    }
    if (error instanceof errors.JOSEAlgNotAllowed || error instanceof errors.JWKSNoMatchingKey) {
      return { status: "invalid" };
    }
    throw error;
  }
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
