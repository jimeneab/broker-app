import type { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";

const TIMEOUT_MS = 8000;

export function providerError(provider: string, url: string, cause: unknown): AppError {
  // API keys travel in headers, so the URL is safe to log.
  console.error(`[${provider}] ${url} failed:`, cause);
  return new AppError(502, "PROVIDER_ERROR", "Market data provider error");
}

export function rateLimited(): AppError {
  return new AppError(503, "PROVIDER_RATE_LIMITED", "Market data provider rate limit reached, try again in a minute");
}

export async function fetchJson<S extends z.ZodType>(
  provider: string,
  url: string,
  headers: Record<string, string>,
  schema: S,
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw providerError(provider, url, err);
  }
  if (res.status === 429) throw rateLimited();
  if (!res.ok) throw providerError(provider, url, `HTTP ${res.status}`);

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw providerError(provider, url, err);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw providerError(provider, url, parsed.error);
  return parsed.data;
}
