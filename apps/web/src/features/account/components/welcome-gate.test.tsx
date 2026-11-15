import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountCopy } from "../copy";
import { WelcomeGate } from "./welcome-gate";

const replace = vi.fn();
let pathname = "/play";
let player: Record<string, unknown> = { status: "loading" };

const router = { replace };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
}));
vi.mock("../hooks/use-player", () => ({ usePlayer: () => ({ refresh: vi.fn(), ...player }) }));
const closeSession = vi.fn(async () => undefined);
vi.mock("../lib/session-client", () => ({ closeSession: () => closeSession() }));

const named = { status: "ready", address: "0x1", nickname: "Dave", name: "Dave #0001" };
const unnamed = { status: "ready", address: "0x1", nickname: null, name: "Player #0001" };

function show() {
  render(
    <WelcomeGate>
      <p>the page</p>
    </WelcomeGate>
  );
}

beforeEach(() => {
  pathname = "/play";
  player = { status: "loading" };
  vi.clearAllMocks();
});

describe("WelcomeGate", () => {
  it("draws nothing of the page until it knows who the player is", () => {
    show();
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(accountCopy.gettingReady);
  });

  it("never draws the lobby for a player who still has to pick a name", () => {
    player = unnamed;
    show();
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith(`/welcome?next=${encodeURIComponent("/play")}`);
  });

  it("never draws the welcome screen for a player who already has a name", () => {
    pathname = "/welcome";
    player = named;
    show();
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/play");
  });

  it("takes a player who just saved their name on to where they were going", () => {
    pathname = "/welcome";
    window.history.replaceState(null, "", `/welcome?next=${encodeURIComponent("/play?join=12")}`);
    player = named;
    show();
    expect(replace).toHaveBeenCalledWith("/play?join=12");
    window.history.replaceState(null, "", "/");
  });

  it("keeps a private table's invite when a nameless player is sent to pick a name", () => {
    pathname = "/table/5";
    window.history.replaceState(null, "", "/table/5#abc123");
    player = unnamed;
    show();
    expect(replace).toHaveBeenCalledWith(`/welcome?next=${encodeURIComponent("/table/5#abc123")}`);
    window.history.replaceState(null, "", "/");
  });

  it("takes the invite on to the table once the name is saved", () => {
    pathname = "/welcome";
    window.history.replaceState(null, "", `/welcome?next=${encodeURIComponent("/table/5#abc123")}`);
    player = named;
    show();
    expect(replace).toHaveBeenCalledWith("/table/5#abc123");
    window.history.replaceState(null, "", "/");
  });

  it("keeps a private table's invite when a signed-out player is sent to sign in", async () => {
    pathname = "/table/5";
    window.history.replaceState(null, "", "/table/5#abc123");
    player = { status: "signed-out" };
    show();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/sign-in?next=${encodeURIComponent("/table/5#abc123")}`)
    );
    window.history.replaceState(null, "", "/");
  });

  it("ignores a next address that leads off the site", () => {
    pathname = "/welcome";
    window.history.replaceState(
      null,
      "",
      `/welcome?next=${encodeURIComponent("https://evil.example")}`
    );
    player = named;
    show();
    expect(replace).toHaveBeenCalledWith("/play");
    window.history.replaceState(null, "", "/");
  });

  it("draws the welcome screen for a new player", () => {
    pathname = "/welcome";
    player = unnamed;
    show();
    expect(screen.getByText("the page")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("draws the lobby for a player with a name", () => {
    player = named;
    show();
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("offers to try again instead of the page when the player could not be loaded", () => {
    const refresh = vi.fn();
    player = { status: "failed", refresh };
    show();
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    screen.getByRole("button", { name: accountCopy.tryAgain }).click();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("closes a stale session and sends a signed-out player to sign in, without a loop", async () => {
    pathname = "/play";
    player = { status: "signed-out" };
    show();
    expect(screen.queryByText("the page")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?next=%2Fplay"));
    expect(closeSession.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("offers to try again, instead of bouncing, when the old session will not close", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    closeSession.mockRejectedValueOnce(new Error("offline"));
    player = { status: "signed-out" };
    show();
    const retry = await screen.findByRole("button", { name: accountCopy.tryAgain });
    expect(replace).not.toHaveBeenCalled();
    retry.click();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?next=%2Fplay"));
    expect(closeSession).toHaveBeenCalledTimes(2);
  });
});
