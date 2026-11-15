import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorCopy } from "./copy";
import { holdOpenWhile } from "./hold-open";
import { type Notice, onNotice } from "./notify";

let shown: Notice[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice);
  });
});

afterEach(() => stop());

describe("holdOpenWhile", () => {
  it("keeps a modal open while its action runs, and says what's still going on", () => {
    const onOpenChange = vi.fn();
    holdOpenWhile(true, "Cashing out your chips…", onOpenChange)(false);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([
      errorCopy.stillGoing("Cashing out your chips…"),
    ]);
  });

  it("lets the modal close once nothing is running", () => {
    const onOpenChange = vi.fn();
    holdOpenWhile(false, "Cashing out your chips…", onOpenChange)(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(shown).toEqual([]);
  });

  it("always lets a modal open", () => {
    const onOpenChange = vi.fn();
    holdOpenWhile(true, "Cashing out your chips…", onOpenChange)(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
