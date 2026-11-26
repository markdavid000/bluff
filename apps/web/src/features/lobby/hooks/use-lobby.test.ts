import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLobby } from "./use-lobby";

const quickPlay = vi.fn();
const latest = vi.fn();

vi.mock("@/hooks/use-chip-balance", () => ({
  useChipBalance: () => ({ status: "ready", amount: 0n }),
}));
vi.mock("./use-join-link", () => ({ useJoinLink: () => null }));
vi.mock("@/hooks/use-my-table-id", () => ({ useMyTableId: () => ({ status: "ready", id: null }) }));
vi.mock("./use-open-tables", () => ({
  useOpenTables: () => ({ status: "failed", retry: vi.fn() }),
  useLatestOpenTables: () => latest,
}));
vi.mock("./use-sit-down", () => ({ useSitDown: () => ({ quickPlay }) }));
const refreshGames = vi.fn();
const watchedWith: boolean[] = [];
vi.mock("./use-games-in-play", () => ({
  useGamesInPlay: (watching: boolean) => {
    watchedWith.push(watching);
    return { games: { status: "loading" }, refresh: refreshGames };
  },
}));

afterEach(() => {
  watchedWith.length = 0;
  vi.clearAllMocks();
});

describe("useLobby", () => {
  it("plays now from the open tables as they are at the moment of the press", () => {
    const { result } = renderHook(() => useLobby());
    act(() => result.current.quickPlay());
    expect(quickPlay).toHaveBeenCalledWith(latest, 0n);
  });

  it("watches the games in play closely only while their list is open, and looks again as it opens", () => {
    const { result } = renderHook(() => useLobby());
    expect(result.current.gamesInPlay).toEqual({ status: "loading" });
    expect(watchedWith.at(-1)).toBe(false);
    act(() => result.current.setWatchOpen(true));
    expect(watchedWith.at(-1)).toBe(true);
    expect(refreshGames).toHaveBeenCalledOnce();
    act(() => result.current.setWatchOpen(false));
    expect(watchedWith.at(-1)).toBe(false);
    expect(refreshGames).toHaveBeenCalledOnce();
  });
});
