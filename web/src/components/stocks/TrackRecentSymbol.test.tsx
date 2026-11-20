import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECENT_KEY } from "@/lib/recent";
import { TrackRecentSymbol } from "./TrackRecentSymbol";

const blocked = () => {
  throw new Error("blocked");
};

describe("TrackRecentSymbol", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("puts the symbol first and renders nothing", () => {
    localStorage.setItem(RECENT_KEY, '["NVDA"]');
    const { container } = render(<TrackRecentSymbol symbol="AAPL" />);
    expect(localStorage.getItem(RECENT_KEY)).toBe('["AAPL","NVDA"]');
    expect(container.innerHTML).toBe("");
    render(<TrackRecentSymbol symbol="NVDA" />);
    expect(localStorage.getItem(RECENT_KEY)).toBe('["NVDA","AAPL"]');
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    expect(() => render(<TrackRecentSymbol symbol="AAPL" />)).not.toThrow();
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    expect(() => render(<TrackRecentSymbol symbol="AAPL" />)).not.toThrow();
  });
});
