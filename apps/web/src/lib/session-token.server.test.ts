import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  SESSION_SECONDS,
  checkSessionToken,
  createSessionToken,
  sessionCookieOptions,
} from "./session-token";

const SECRET = randomBytes(32).toString("hex");

describe("session token", () => {
  it("accepts a token it signed and returns the player", async () => {
    const token = await createSessionToken("did:privy:abc", SECRET);
    expect(await checkSessionToken(token, SECRET)).toEqual({
      status: "valid",
      userId: "did:privy:abc",
    });
  });

  it("reports an hour-old token as expired", async () => {
    const issued = new Date("2026-11-12T10:00:00Z");
    const token = await createSessionToken("did:privy:abc", SECRET, issued);
    const later = new Date(issued.getTime() + (SESSION_SECONDS + 1) * 1000);
    expect(await checkSessionToken(token, SECRET, later)).toEqual({ status: "expired" });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("did:privy:abc", `${SECRET}-other`);
    expect(await checkSessionToken(token, SECRET)).toEqual({ status: "invalid" });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken("did:privy:abc", SECRET);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "did:privy:someone-else" })).toString(
      "base64url"
    );
    expect(await checkSessionToken(`${header}.${forged}.${signature}`, SECRET)).toEqual({
      status: "invalid",
    });
  });

  it("rejects a token from another issuer, and one with no player", async () => {
    const key = new TextEncoder().encode(SECRET);
    const otherIssuer = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("did:privy:abc")
      .setIssuer("someone-else")
      .setExpirationTime("1h")
      .sign(key);
    const noPlayer = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("bluff")
      .setExpirationTime("1h")
      .sign(key);
    expect(await checkSessionToken(otherIssuer, SECRET)).toEqual({ status: "invalid" });
    expect(await checkSessionToken(noPlayer, SECRET)).toEqual({ status: "invalid" });
  });

  it("treats a missing or garbled cookie as no session", async () => {
    expect(await checkSessionToken(undefined, SECRET)).toEqual({ status: "invalid" });
    expect(await checkSessionToken("not-a-token", SECRET)).toEqual({ status: "invalid" });
  });

  it("refuses to work with a short secret", async () => {
    await expect(createSessionToken("did:privy:abc", "short")).rejects.toThrow(/32 characters/);
  });

  it("sets a cookie the page cannot read, that lasts an hour", () => {
    expect(sessionCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
  });
});
