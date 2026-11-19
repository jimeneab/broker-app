"use client";

import type { CandlestickData, HistogramData, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { api, errorMessage, type Candle } from "@/lib/api";
import { DEFAULT_RANGE, STOCK_RANGES, type StockRange } from "@/lib/stocks";
import { getBrowserAccessToken } from "@/lib/supabase/client";

type Status = "loading" | "ready" | "empty" | "error";
type Rgb = [number, number, number];
type ChartTheme = { surface: Rgb | string; muted: Rgb | string; border: Rgb | string; up: Rgb | string; down: Rgb | string };

/** Tokens are oklch; painting them on a 1x1 canvas yields rgb without relying on the library's color parser. */
function toRgb(color: string): Rgb | string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

const css = (c: Rgb | string, alpha = 1) => (typeof c === "string" ? c : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`);

function readChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => toRgb(style.getPropertyValue(`--${name}`).trim());
  return { surface: token("surface"), muted: token("muted"), border: token("border"), up: token("up"), down: token("down") };
}

function volumeData(candles: Candle[], theme: ChartTheme): HistogramData<Time>[] {
  return candles.flatMap((c) =>
    c.volume === null ? [] : [{ time: c.date, value: c.volume, color: css(c.close >= c.open ? theme.up : theme.down, 0.4) }],
  );
}

type Chart = {
  chart: IChartApi;
  candles: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram">;
};

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const themeRef = useRef<ChartTheme | null>(null);
  const shownRef = useRef<Candle[]>([]);
  const cacheRef = useRef(new Map<StockRange, Candle[]>());
  const controllerRef = useRef<AbortController | null>(null);
  const rangeRef = useRef<StockRange>(DEFAULT_RANGE);
  const [range, setRange] = useState<StockRange>(DEFAULT_RANGE);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const show = useCallback((candles: Candle[]) => {
    shownRef.current = candles;
    const c = chartRef.current;
    const theme = themeRef.current;
    if (c && theme) {
      c.candles.setData(candles.map((k): CandlestickData<Time> => ({ time: k.date, open: k.open, high: k.high, low: k.low, close: k.close })));
      c.volume.setData(volumeData(candles, theme));
      c.chart.timeScale().fitContent();
    }
    setStatus(candles.length ? "ready" : "empty");
  }, []);

  const load = useCallback(
    async (next: StockRange) => {
      controllerRef.current?.abort();
      rangeRef.current = next;
      setRange(next);
      const cached = cacheRef.current.get(next);
      if (cached) return show(cached);

      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus("loading");
      try {
        const token = await getBrowserAccessToken();
        const { candles } = await api.stockHistory(symbol, next, { token, signal: controller.signal });
        if (controller.signal.aborted) return;
        cacheRef.current.set(next, candles);
        show(candles);
      } catch (err) {
        if (controller.signal.aborted) return; // an AbortError is not a failure
        setError(errorMessage(err));
        setStatus("error");
      }
    },
    [symbol, show],
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      // Imported here so the library never runs on the server and lands in its own chunk after hydration.
      const { createChart, CandlestickSeries, HistogramSeries, ColorType } = await import("lightweight-charts");
      const el = containerRef.current;
      if (cancelled || !el) return;

      const optionsFor = (t: ChartTheme) => ({
        layout: { background: { type: ColorType.Solid, color: css(t.surface) } as const, textColor: css(t.muted) },
        grid: { vertLines: { color: css(t.border) }, horzLines: { color: css(t.border) } },
        rightPriceScale: { borderColor: css(t.border) },
        timeScale: { borderColor: css(t.border) },
      });
      const seriesColorsFor = (t: ChartTheme) => ({
        upColor: css(t.up),
        downColor: css(t.down),
        wickUpColor: css(t.up),
        wickDownColor: css(t.down),
      });

      const theme = readChartTheme();
      themeRef.current = theme;
      // attributionLogo keeps its default (true): the library's license asks to credit TradingView.
      const chart = createChart(el, { autoSize: true, localization: { locale: "es-MX" }, ...optionsFor(theme) });
      const candles = chart.addSeries(CandlestickSeries, { ...seriesColorsFor(theme), borderVisible: false });
      const volume = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" } });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      chartRef.current = { chart, candles, volume };

      const media = window.matchMedia?.("(prefers-color-scheme: dark)");
      const onSchemeChange = () => {
        const next = readChartTheme();
        themeRef.current = next;
        chart.applyOptions(optionsFor(next));
        candles.applyOptions(seriesColorsFor(next));
        volume.setData(volumeData(shownRef.current, next));
      };
      media?.addEventListener("change", onSchemeChange);
      cleanup = () => {
        media?.removeEventListener("change", onSchemeChange);
        chart.remove();
        chartRef.current = null;
      };

      void load(rangeRef.current);
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
      cleanup();
    };
  }, [load]);

  const long = STOCK_RANGES.find((r) => r.value === range)?.long ?? range;

  return (
    <section aria-labelledby="chart-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-heading" className="text-base font-semibold tracking-tight">
          Precio
        </h2>
        <div role="group" aria-label="Rango de la gráfica" className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {STOCK_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={r.value === range}
              onClick={() => r.value !== range && void load(r.value)}
              className="h-8 min-w-11 rounded px-2.5 text-sm text-muted transition-colors hover:text-foreground aria-pressed:bg-accent-soft aria-pressed:font-medium aria-pressed:text-accent"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-72 overflow-hidden rounded-lg border border-border bg-surface md:h-96">
        <div
          ref={containerRef}
          role="img"
          aria-label={`Gráfica de velas de ${symbol}, ${long}`}
          className={`absolute inset-0 ${status === "ready" ? "" : "invisible"}`}
        />
        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col justify-center p-5">
            {status === "loading" && <LoadingState label="Cargando gráfica…" rows={4} />}
            {status === "empty" && <EmptyState title="No hay histórico para este rango." />}
            {status === "error" && (
              <ErrorState
                message={error}
                action={
                  <button
                    type="button"
                    onClick={() => void load(range)}
                    className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-border/60"
                  >
                    Reintentar
                  </button>
                }
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
