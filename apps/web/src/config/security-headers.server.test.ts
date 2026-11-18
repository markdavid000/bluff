import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("are sent on every path: no framing, HTTPS only, no sniffing, short referrers, no unused devices", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules.map((rule) => rule.source)).toEqual(["/(.*)"]);
    expect(
      Object.fromEntries((rules[0]?.headers ?? []).map(({ key, value }) => [key, value]))
    ).toEqual({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
    });
  });
});
