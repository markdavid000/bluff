import { describe, expect, it } from "vitest";
import { parseTableLink, tableLink, tablePath } from "./table-links";

describe("table links", () => {
  it("puts every table on its own page", () => {
    expect(tablePath(12n)).toBe("/table/12");
    expect(tableLink("https://bluff.example", 12n)).toBe("https://bluff.example/table/12");
  });

  it.each([
    ["https://bluff.example/table/12", 12n],
    ["http://localhost:3002/table/7?from=invite", 7n],
    ["/table/42", 42n],
    ["https://bluff.example/table/9/", 9n],
    ["  42 ", 42n],
    ["#9", 9n],
  ])("reads %s", (input, id) => {
    expect(parseTableLink(input)).toBe(id);
  });

  it.each([
    "",
    "0",
    "/table/0",
    "-3",
    "abc",
    "https://bluff.example/play",
    "https://bluff.example/table/x",
    "https://bluff.example/tables/12",
    "1e3",
  ])("rejects %s", (input) => {
    expect(parseTableLink(input)).toBeNull();
  });
});
