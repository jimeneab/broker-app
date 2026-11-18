import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchJson } from "./http.js";

const schema = z.object({ value: z.number() });
const fetchMock = vi.fn();

const call = () => fetchJson("test", "https://example.com/x", { "X-Token": "secret" }, schema);

describe("fetchJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("returns the parsed body and sends the headers", async () => {
    fetchMock.mockResolvedValue(Response.json({ value: 1, extra: true }));
    await expect(call()).resolves.toEqual({ value: 1 });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ "X-Token": "secret" });
  });

  it("maps 429 to 503 PROVIDER_RATE_LIMITED", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    await expect(call()).rejects.toMatchObject({ status: 503, code: "PROVIDER_RATE_LIMITED" });
  });

  it.each([
    ["HTTP 500", () => new Response("boom", { status: 500 })],
    ["invalid JSON", () => new Response("<html>", { status: 200 })],
    ["schema mismatch", () => Response.json({ value: "nope" })],
  ])("maps %s to 502 PROVIDER_ERROR", async (_label, response) => {
    fetchMock.mockResolvedValue(response());
    await expect(call()).rejects.toMatchObject({ status: 502, code: "PROVIDER_ERROR" });
  });

  it("maps a rejected fetch (network/timeout) to 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(call()).rejects.toMatchObject({ status: 502, code: "PROVIDER_ERROR" });
  });

  it("does not log the API key", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await call().catch(() => {});
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret");
  });
});
