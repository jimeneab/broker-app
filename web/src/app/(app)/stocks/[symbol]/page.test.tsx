import { describe, expect, it, vi } from "vitest";

const stock = vi.hoisted(() => vi.fn());
vi.mock("@/components/stocks/StockOverview", () => ({ StockOverview: () => null }));
vi.mock("@/lib/api", () => ({ api: { stock } }));

const { generateMetadata } = await import("./page");

const params = (symbol: string) => ({ params: Promise.resolve({ symbol }) }) as Parameters<typeof generateMetadata>[0];

describe("stock page metadata", () => {
  it("uses the normalized symbol without calling the API", async () => {
    await expect(generateMetadata(params("nvda"))).resolves.toEqual({ title: "NVDA · Stock Insights" });
    expect(stock).not.toHaveBeenCalled();
  });

  it("falls back to Stock for invalid symbols", async () => {
    await expect(generateMetadata(params("AAPL1"))).resolves.toEqual({ title: "Stock · Stock Insights" });
  });
});
