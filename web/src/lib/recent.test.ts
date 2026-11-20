import { describe, expect, it } from "vitest";
import { addRecent, parseRecent, RECENT_KEY } from "./recent";

describe("addRecent", () => {
  it("normalizes and adds to an empty list", () => {
    expect(addRecent([], "aapl")).toEqual(["AAPL"]);
  });

  it("moves an existing symbol to the front without duplicating it", () => {
    expect(addRecent(["NVDA", "AAPL"], "AAPL")).toEqual(["AAPL", "NVDA"]);
  });

  it("keeps at most 8, dropping the oldest", () => {
    const list = ["A", "B", "C", "D", "E", "F", "G", "H"];
    expect(addRecent(list, "Z")).toEqual(["Z", "A", "B", "C", "D", "E", "F", "G"]);
  });

  it("respects a custom max", () => {
    expect(addRecent(["A", "B", "C"], "D", 3)).toEqual(["D", "A", "B"]);
  });

  it("returns a copy of the list for invalid symbols", () => {
    const list = ["AAPL"];
    for (const bad of ["AAPL1", ""]) {
      const out = addRecent(list, bad);
      expect(out).toEqual(["AAPL"]);
      expect(out).not.toBe(list);
    }
  });
});

describe("parseRecent", () => {
  it("returns [] for null, invalid JSON and non-arrays", () => {
    for (const raw of [null, "no-json", "{}", "42", '"AAPL"', "null"]) expect(parseRecent(raw)).toEqual([]);
  });

  it("keeps only valid, normalized, unique symbols", () => {
    expect(parseRecent('["aapl", 3, null, "BAD!", "NVDA", "AAPL"]')).toEqual(["AAPL", "NVDA"]);
  });

  it("caps at 8", () => {
    const twelve = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    expect(parseRecent(JSON.stringify(twelve))).toEqual(twelve.slice(0, 8));
  });

  it("uses the agreed storage key", () => {
    expect(RECENT_KEY).toBe("si:recent-symbols");
  });
});
