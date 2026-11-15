import { afterEach, describe, expect, it } from "vitest";
import { keepFragmentFor, withKeptFragment } from "./carried-fragment";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("carried fragments", () => {
  it("brings an invite back to the page it belongs to after a trip away", () => {
    keepFragmentFor("/table/5", "#abc123");
    expect(withKeptFragment("/table/5")).toBe("/table/5#abc123");
  });

  it("uses a kept fragment only once", () => {
    keepFragmentFor("/table/5", "#abc123");
    withKeptFragment("/table/5");
    expect(withKeptFragment("/table/5")).toBe("/table/5");
  });

  it("never hands one table's invite to a different page", () => {
    keepFragmentFor("/table/5", "#abc123");
    expect(withKeptFragment("/table/9")).toBe("/table/9");
  });

  it("leaves a path that already carries its own fragment alone", () => {
    keepFragmentFor("/table/5", "#abc123");
    expect(withKeptFragment("/table/5#zzz")).toBe("/table/5#zzz");
  });

  it("keeps nothing for a link without a fragment", () => {
    keepFragmentFor("/table/5", "");
    expect(withKeptFragment("/table/5")).toBe("/table/5");
  });
});
