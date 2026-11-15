import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRefreshSession } from "./use-refresh-session";

const replace = vi.fn();
const loadPage = vi.fn();
const openSession = vi.fn();
let authenticated = true;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/load-page", () => ({ loadPage: (path: string) => loadPage(path) }));
vi.mock("../lib/session-client", () => ({ openSession: (token: string) => openSession(token) }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated, getAccessToken: async () => "privy-token" }),
}));

beforeEach(() => {
  authenticated = true;
  openSession.mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("useRefreshSession", () => {
  it("renews the session and goes back to the page the player was on", async () => {
    renderHook(() => useRefreshSession("/play"));
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith("/play"));
  });

  it("goes back with a full page load once the session is renewed", async () => {
    renderHook(() => useRefreshSession("/play"));
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith("/play"));
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps a private table's invite when going back", async () => {
    window.history.replaceState(null, "", "/refresh?next=%2Ftable%2F5#abc123");
    renderHook(() => useRefreshSession("/table/5"));
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith("/table/5#abc123"));
  });

  it("sends a signed-out player to sign in, still holding the invite", async () => {
    authenticated = false;
    window.history.replaceState(null, "", "/refresh?next=%2Ftable%2F5#abc123");
    renderHook(() => useRefreshSession("/table/5"));
    await waitFor(() =>
      expect(loadPage).toHaveBeenCalledWith(
        `/sign-in?next=${encodeURIComponent("/table/5#abc123")}`
      )
    );
  });
});
