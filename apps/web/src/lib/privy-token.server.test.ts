import { type JWTVerifyGetKey, SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { bearerToken, checkPrivyAccessToken } from "./privy-token";

const APP_ID = "test-app-id";

let privateKey: CryptoKey;
let keys: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  keys = createLocalJWKSet({ keys: [{ ...jwk, alg: "ES256", use: "sig", kid: "test" }] });
});

function privyToken(overrides: { issuer?: string; audience?: string; expires?: string } = {}) {
  return new SignJWT({ sid: "session-1" })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setSubject("did:privy:abc")
    .setIssuer(overrides.issuer ?? "privy.io")
    .setAudience(overrides.audience ?? APP_ID)
    .setIssuedAt()
    .setExpirationTime(overrides.expires ?? "1h")
    .sign(privateKey);
}

describe("checkPrivyAccessToken", () => {
  it("accepts a token Privy signed for this app", async () => {
    expect(await checkPrivyAccessToken(await privyToken(), { appId: APP_ID, keys })).toEqual({
      status: "valid",
      userId: "did:privy:abc",
    });
  });

  it.each([
    ["another issuer", { issuer: "evil.example" }],
    ["another app", { audience: "other-app" }],
    ["an expired token", { expires: "-1m" }],
  ])("rejects %s", async (_case, overrides) => {
    const token = await privyToken(overrides);
    expect(await checkPrivyAccessToken(token, { appId: APP_ID, keys })).toEqual({
      status: "invalid",
    });
  });

  it("rejects a token signed by a different key", async () => {
    const stranger = await generateKeyPair("ES256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setSubject("did:privy:abc")
      .setIssuer("privy.io")
      .setAudience(APP_ID)
      .setExpirationTime("1h")
      .sign(stranger.privateKey);
    expect(await checkPrivyAccessToken(token, { appId: APP_ID, keys })).toEqual({
      status: "invalid",
    });
  });

  it("rejects a token signed with a shared secret instead of Privy's key", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("did:privy:abc")
      .setIssuer("privy.io")
      .setAudience(APP_ID)
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("a-shared-secret-someone-guessed-123456"));
    expect(await checkPrivyAccessToken(token, { appId: APP_ID, keys })).toEqual({
      status: "invalid",
    });
  });

  it("rejects a missing token", async () => {
    expect(await checkPrivyAccessToken(null, { appId: APP_ID, keys })).toEqual({
      status: "invalid",
    });
  });
});

describe("bearerToken", () => {
  it("reads a bearer token", () => {
    expect(bearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it.each([null, "", "Basic abc", "Bearer", "Bearer a b"])("ignores %s", (header) => {
    expect(bearerToken(header)).toBeNull();
  });
});
