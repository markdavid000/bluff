import { afterEach, describe, expect, it, vi } from "vitest";
import { computerSatAt, rememberComputerAt } from "./remembered-computer";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("remembered computer", () => {
  it("remembers the computer sat at a table, for that table only", () => {
    expect(computerSatAt(12n)).toBe(false);
    rememberComputerAt(12n);
    expect(computerSatAt(12n)).toBe(true);
    expect(computerSatAt(13n)).toBe(false);
  });

  it("says the computer never sat, with a warning, when storage is closed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(computerSatAt(12n)).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
