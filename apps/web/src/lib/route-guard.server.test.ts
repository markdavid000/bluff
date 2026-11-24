import { describe, expect, it } from "vitest";
import { decideRoute } from "./route-guard";

const valid = { status: "valid", userId: "did:privy:abc" } as const;
const expired = { status: "expired" } as const;
const invalid = { status: "invalid" } as const;
const none = new URLSearchParams();

describe("decideRoute", () => {
  it.each(["/play", "/welcome", "/profile", "/table/12"])(
    "lets a signed-in player open %s",
    (page) => {
      expect(decideRoute(page, none, valid)).toEqual({ action: "allow" });
    }
  );

  it("sends a visitor with no session to sign in, remembering the page", () => {
    expect(decideRoute("/table/12", new URLSearchParams("seat=2"), invalid)).toEqual({
      action: "redirect",
      to: `/sign-in?next=${encodeURIComponent("/table/12?seat=2")}`,
    });
  });

  it("sends a player whose session ran out to be refreshed", () => {
    expect(decideRoute("/play", none, expired)).toEqual({
      action: "redirect",
      to: "/refresh?next=%2Fplay",
    });
  });

  it.each(["/", "/how-to-play", "/fairness", "/sign-in", "/refresh", "/players"])(
    "leaves the public page %s open",
    (page) => {
      expect(decideRoute(page, none, invalid)).toEqual({ action: "allow" });
    }
  );

  it.each(["privy_oauth_code", "privy_oauth_state", "privy_oauth_provider"])(
    "never interrupts Google sign-in coming back with %s",
    (param) => {
      expect(decideRoute("/play", new URLSearchParams(`${param}=x`), invalid)).toEqual({
        action: "allow",
      });
    }
  );

  it.each(["/sign-in", "/refresh"])(
    "sends a signed-in player away from %s before anything is drawn",
    (page) => {
      expect(decideRoute(page, none, valid)).toEqual({ action: "redirect", to: "/play" });
    }
  );

  it("sends a signed-in player on to the page they asked for", () => {
    const next = new URLSearchParams(`next=${encodeURIComponent("/play?join=12")}`);
    expect(decideRoute("/sign-in", next, valid)).toEqual({
      action: "redirect",
      to: "/play?join=12",
    });
  });

  it("never follows a next address that leads off the site", () => {
    const next = new URLSearchParams(`next=${encodeURIComponent("https://evil.example")}`);
    expect(decideRoute("/sign-in", next, valid)).toEqual({ action: "redirect", to: "/play" });
  });

  it("lets Google sign-in finish on the sign-in page even with an old session", () => {
    expect(decideRoute("/sign-in", new URLSearchParams("privy_oauth_code=x"), valid)).toEqual({
      action: "allow",
    });
  });

  it.each([expired, invalid])(
    "shows the sign-in page to a visitor without a valid session",
    (session) => {
      expect(decideRoute("/sign-in", none, session)).toEqual({ action: "allow" });
    }
  );
});
