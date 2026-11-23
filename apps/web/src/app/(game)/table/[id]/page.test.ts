import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("@/features/table", () => ({ TableScreen: () => null }));

function titleFor(id: string) {
  return generateMetadata({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });
}

describe("the table page's title", () => {
  it("names the table, so tabs and history can tell games apart", async () => {
    expect(await titleFor("123456")).toMatchObject({
      title: "Table 123456",
      robots: { index: false },
    });
  });

  it("falls back to a plain title for an address that isn't a table", async () => {
    expect(await titleFor("not-a-table")).toMatchObject({ title: "Table" });
  });
});
