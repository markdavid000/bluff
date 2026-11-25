import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notify } from "@/lib/notify";
import { accountCopy } from "../copy";
import { useSessionKeeper } from "./use-session-keeper";
import { useSignOut } from "./use-sign-out";
import { stopSigningOut } from "./use-signing-out";
import { useWelcomeGate } from "./use-welcome-gate";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const replace = vi.fn();
const loadPage = vi.fn();
const closeSession = vi.fn();
const openSession = vi.fn();
const logout = vi.fn();
let authenticated = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/play",
}));
vi.mock("@/lib/load-page", () => ({ loadPage: (path: string) => loadPage(path) }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated,
    logout,
    getAccessToken: async () => "privy-token",
  }),
}));
vi.mock("./use-player", () => ({
  usePlayer: () =>
    authenticated
      ? { status: "ready", nickname: "Mark", refresh: vi.fn() }
      : { status: "signed-out", refresh: vi.fn() },
}));
vi.mock("@/hooks/use-my-table-id", () => ({
  useMyTableId: () => ({ status: "ready", id: null }),
}));
vi.mock("@/hooks/use-left-tables", () => ({
  forgetGoneSeats: vi.fn(),
  useIsSeatGone: () => false,
}));
vi.mock("../lib/session-client", () => ({
  SESSION_RENEW_MS: 45 * 60 * 1000,
  closeSession: () => closeSession(),
  openSession: (token: string) => openSession(token),
}));

function useSignedInPage() {
  useSessionKeeper();
  return { gate: useWelcomeGate(), leave: useSignOut() };
}

beforeEach(() => {
  authenticated = true;
  closeSession.mockResolvedValue(undefined);
  openSession.mockResolvedValue(true);
  logout.mockImplementation(async () => {
    authenticated = false;
  });
});

afterEach(() => {
  stopSigningOut();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useSignOut", () => {
  it("closes the session once and lands on the home page with a full page load", async () => {
    const page = renderHook(() => useSignedInPage());
    await act(async () => {
      await page.result.current.leave.signOut();
    });
    page.rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(closeSession).toHaveBeenCalledOnce();
    expect(loadPage).toHaveBeenCalledWith("/");
    expect(replace).not.toHaveBeenCalled();
  });

  it("says sign out failed, not sign in, and lets the player try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = vi.spyOn(notify, "error");
    closeSession.mockRejectedValueOnce(new Error("Closing the session failed with 500"));
    const page = renderHook(() => useSignedInPage());
    await act(async () => {
      await page.result.current.leave.signOut();
    });
    expect(error).toHaveBeenCalledWith(accountCopy.signOutProblem, { id: "sign-out" });
    expect(page.result.current.leave.working).toBe(false);
    expect(loadPage).not.toHaveBeenCalled();
  });

  it("still sends a player who was signed out unexpectedly back to sign in", async () => {
    const page = renderHook(() => useSignedInPage());
    authenticated = false;
    page.rerender();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/sign-in?next=${encodeURIComponent("/play")}`)
    );
    expect(loadPage).not.toHaveBeenCalled();
  });
});
