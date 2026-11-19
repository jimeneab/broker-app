import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { PriceChart } from "./PriceChart";

const chart = vi.hoisted(() => {
  const series = () => ({ setData: vi.fn(), applyOptions: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) });
  const candles = series();
  const volume = series();
  const fitContent = vi.fn();
  const api = {
    addSeries: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent })),
    remove: vi.fn(),
  };
  return { api, candles, volume, fitContent, createChart: vi.fn(() => api) };
});
vi.mock("lightweight-charts", () => ({
  createChart: chart.createChart,
  CandlestickSeries: "Candlestick",
  HistogramSeries: "Histogram",
  ColorType: { Solid: "solid" },
}));
vi.mock("@/lib/supabase/client", () => ({ getBrowserAccessToken: vi.fn(async () => "jwt") }));
const stockHistory = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, stockHistory } };
});

const CANDLES = [
  { date: "2026-05-19", open: 187.2, high: 190.1, low: 186.9, close: 189.84, volume: 51234000 },
  { date: "2026-05-20", open: 190, high: 191, low: 185, close: 186, volume: null },
];
const history = (range: string, candles = CANDLES) => ({ symbol: "AAPL", range, interval: "1day", candles });

let schemeListener: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  chart.api.addSeries.mockImplementation((type: string) => (type === "Candlestick" ? chart.candles : chart.volume));
  stockHistory.mockImplementation(async (_s: string, range: string) => history(range));
  // jsdom has no canvas: the theme falls back to the raw token values.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  schemeListener = undefined;
  window.matchMedia = vi.fn(() => ({
    addEventListener: (_: string, fn: () => void) => (schemeListener = fn),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => vi.restoreAllMocks());

const button = (label: string) => screen.getByRole("button", { name: label });

describe("PriceChart", () => {
  it("loads the default range once and paints candles and volume", async () => {
    render(<PriceChart symbol="AAPL" />);
    await waitFor(() => expect(chart.fitContent).toHaveBeenCalled());
    expect(stockHistory).toHaveBeenCalledOnce();
    expect(stockHistory).toHaveBeenCalledWith("AAPL", "6M", { token: "jwt", signal: expect.any(AbortSignal) });
    expect(chart.candles.setData).toHaveBeenCalledWith([
      { time: "2026-05-19", open: 187.2, high: 190.1, low: 186.9, close: 189.84 },
      { time: "2026-05-20", open: 190, high: 191, low: 185, close: 186 },
    ]);
    const volume = chart.volume.setData.mock.calls[0]?.[0] as { time: string }[];
    expect(volume.map((v) => v.time)).toEqual(["2026-05-19"]);
    expect(button("6M").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Gráfica de velas de AAPL, 6 meses");
  });

  it("fetches a new range once and reuses ranges already loaded", async () => {
    render(<PriceChart symbol="AAPL" />);
    await waitFor(() => expect(stockHistory).toHaveBeenCalledOnce());
    fireEvent.click(button("1A"));
    await waitFor(() => expect(stockHistory).toHaveBeenLastCalledWith("AAPL", "1Y", expect.anything()));
    expect(button("1A").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("6M"));
    await waitFor(() => expect(button("6M").getAttribute("aria-pressed")).toBe("true"));
    expect(stockHistory).toHaveBeenCalledTimes(2);
  });

  it("aborts the pending request when the range changes, and its answer does not paint", async () => {
    let resolveSlow: (v: unknown) => void = () => {};
    stockHistory.mockImplementation(async (_s: string, range: string) =>
      range === "1M" ? new Promise((r) => (resolveSlow = r)) : history(range),
    );
    render(<PriceChart symbol="AAPL" />);
    await waitFor(() => expect(chart.fitContent).toHaveBeenCalledOnce());
    fireEvent.click(button("1M"));
    await waitFor(() => expect(stockHistory).toHaveBeenCalledTimes(2));
    const { signal } = stockHistory.mock.calls[1]?.[2] as { signal: AbortSignal };
    fireEvent.click(button("5A"));
    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(chart.fitContent).toHaveBeenCalledTimes(2));
    await act(async () => resolveSlow(history("1M", [CANDLES[0]!])));
    expect(chart.fitContent).toHaveBeenCalledTimes(2);
    expect(button("5A").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the empty state", async () => {
    stockHistory.mockResolvedValue(history("6M", []));
    render(<PriceChart symbol="AAPL" />);
    expect(await screen.findByText("No hay histórico para este rango.")).toBeDefined();
  });

  it("shows the error and retries the current range", async () => {
    stockHistory.mockRejectedValueOnce(new ApiError(502, "PROVIDER_ERROR", "bad"));
    render(<PriceChart symbol="AAPL" />);
    expect((await screen.findByRole("alert")).textContent).toContain("El proveedor de datos no respondió correctamente.");
    fireEvent.click(button("Reintentar"));
    await waitFor(() => expect(stockHistory).toHaveBeenCalledTimes(2));
    expect(stockHistory).toHaveBeenLastCalledWith("AAPL", "6M", expect.anything());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("re-applies the theme when the color scheme changes", async () => {
    render(<PriceChart symbol="AAPL" />);
    await waitFor(() => expect(schemeListener).toBeDefined());
    const before = chart.api.applyOptions.mock.calls.length;
    act(() => schemeListener?.());
    expect(chart.api.applyOptions.mock.calls.length).toBe(before + 1);
    expect(chart.candles.applyOptions).toHaveBeenCalled();
  });

  it("removes the chart on unmount", async () => {
    const { unmount } = render(<PriceChart symbol="AAPL" />);
    await waitFor(() => expect(chart.createChart).toHaveBeenCalled());
    unmount();
    expect(chart.api.remove).toHaveBeenCalledOnce();
  });
});
