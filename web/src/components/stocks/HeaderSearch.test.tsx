import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { HeaderSearch } from "./HeaderSearch";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/form", () => ({ default: (props: ComponentProps<"form">) => <form {...props} /> }));
vi.mock("@/lib/supabase/client", () => ({ getBrowserAccessToken: vi.fn(async () => "jwt") }));
const searchStocks = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, searchStocks } };
});

const RESULTS = [
  { symbol: "AAPL", name: "APPLE INC", type: "stock" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF TRUST", type: "etf" },
];

const input = () => screen.getByRole("combobox") as HTMLInputElement;

async function type(value: string) {
  fireEvent.change(input(), { target: { value } });
}

/** Lets the debounce fire and the mocked promises settle. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe("HeaderSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
    searchStocks.mockReset().mockResolvedValue({ query: "app", results: RESULTS });
  });
  afterEach(() => vi.useRealTimers());

  it("is a GET form to /search with an input named q", () => {
    const { container } = render(<HeaderSearch />);
    expect(container.querySelector("form")?.getAttribute("action")).toBe("/search");
    expect(input().name).toBe("q");
    expect(screen.getByLabelText("Buscar acciones o ETFs")).toBe(input());
  });

  it("debounces: one call 300 ms after the last key", async () => {
    render(<HeaderSearch />);
    await type("a");
    await type("ap");
    await type("app");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(searchStocks).not.toHaveBeenCalled();
    await flush();
    expect(searchStocks).toHaveBeenCalledOnce();
    expect(searchStocks).toHaveBeenCalledWith("app", { token: "jwt", signal: expect.any(AbortSignal) });
  });

  it("does not call the API for blank text", async () => {
    render(<HeaderSearch />);
    await type("   ");
    await flush();
    expect(searchStocks).not.toHaveBeenCalled();
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("shows options with their type and expands", async () => {
    render(<HeaderSearch />);
    await type("app");
    await flush();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toContain("Acción");
    expect(options[1]?.textContent).toContain("ETF");
    expect(input().getAttribute("aria-expanded")).toBe("true");
  });

  it("ArrowDown + Enter opens the stock and clears the input", async () => {
    render(<HeaderSearch />);
    await type("app");
    await flush();
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input().getAttribute("aria-activedescendant")).toBe("header-search-opt-0");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/stocks/AAPL");
    expect(input().value).toBe("");
  });

  it("ArrowUp wraps to the last option", async () => {
    render(<HeaderSearch />);
    await type("app");
    await flush();
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(input().getAttribute("aria-activedescendant")).toBe("header-search-opt-1");
  });

  it("clicking an option navigates", async () => {
    render(<HeaderSearch />);
    await type("app");
    await flush();
    fireEvent.click(screen.getByRole("option", { name: /SPY/ }));
    expect(push).toHaveBeenCalledWith("/stocks/SPY");
  });

  it("Escape collapses the list", async () => {
    render(<HeaderSearch />);
    await type("app");
    await flush();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("says when there are no results", async () => {
    searchStocks.mockResolvedValue({ query: "zzz", results: [] });
    render(<HeaderSearch />);
    await type("zzz");
    await flush();
    expect(screen.getAllByText("Sin resultados").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("shows the API error message", async () => {
    searchStocks.mockRejectedValue(new ApiError(503, "PROVIDER_RATE_LIMITED", "limited"));
    render(<HeaderSearch />);
    await type("app");
    await flush();
    expect(screen.getByText(/Demasiadas solicitudes al proveedor de datos/)).toBeDefined();
  });

  it("a new key aborts the request in flight", async () => {
    searchStocks.mockImplementation(() => new Promise(() => {}));
    render(<HeaderSearch />);
    await type("app");
    await flush();
    const { signal } = searchStocks.mock.calls[0]?.[1] as { signal: AbortSignal };
    expect(signal.aborted).toBe(false);
    await type("appl");
    expect(signal.aborted).toBe(true);
  });
});
