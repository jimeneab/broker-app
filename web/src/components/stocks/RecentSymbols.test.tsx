import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECENT_KEY } from "@/lib/recent";
import { RecentSymbols } from "./RecentSymbols";

const blocked = () => {
  throw new Error("blocked");
};

function renderWithSearchBox() {
  return render(
    <>
      <input id="search-page-q" />
      <RecentSymbols />
    </>,
  );
}

describe("RecentSymbols", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("lists stored symbols as links in order", async () => {
    localStorage.setItem(RECENT_KEY, '["AAPL","NVDA"]');
    render(<RecentSymbols />);
    const nav = await screen.findByRole("navigation", { name: "Vistos recientemente" });
    const links = nav.querySelectorAll("a");
    expect([...links].map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["AAPL", "/stocks/AAPL"],
      ["NVDA", "/stocks/NVDA"],
    ]);
  });

  it.each([
    ["empty storage", null],
    ["corrupted data", "{oops"],
  ])("renders nothing with %s", (_, raw) => {
    if (raw !== null) localStorage.setItem(RECENT_KEY, raw);
    const { container } = render(<RecentSymbols />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    const { container } = render(<RecentSymbols />);
    expect(container.innerHTML).toBe("");
  });

  it("Borrar clears storage, hides the block and focuses the search box", async () => {
    localStorage.setItem(RECENT_KEY, '["AAPL"]');
    renderWithSearchBox();
    fireEvent.click(await screen.findByRole("button", { name: "Borrar vistos recientemente" }));
    expect(localStorage.getItem(RECENT_KEY)).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.activeElement?.id).toBe("search-page-q");
  });

  it("Borrar still hides the block when removeItem fails", async () => {
    localStorage.setItem(RECENT_KEY, '["AAPL"]');
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked);
    renderWithSearchBox();
    fireEvent.click(await screen.findByRole("button", { name: /Borrar/ }));
    await waitFor(() => expect(screen.queryByRole("navigation")).toBeNull());
  });
});
