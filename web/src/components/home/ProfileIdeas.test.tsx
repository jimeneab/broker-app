import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileIdeas } from "./ProfileIdeas";

vi.mock("@/components/home/QuoteCard", () => ({
  QuoteCard: ({ symbol, showCompany }: { symbol: string; showCompany?: boolean }) => (
    <div data-testid="quote-card" data-symbol={symbol} data-show-company={String(Boolean(showCompany))} />
  ),
  QuoteCardSkeleton: () => <div />,
}));
const getMe = vi.hoisted(() => vi.fn());
vi.mock("@/lib/me", () => ({ getMe }));

const NO_PROFILE = "Selección de ejemplo. No es recomendación de inversión.";

async function renderIdeas() {
  render(await ProfileIdeas());
  const cards = screen.getAllByTestId("quote-card");
  expect(cards.every((c) => c.dataset.showCompany === "true")).toBe(true);
  return cards.map((c) => c.dataset.symbol);
}

describe("ProfileIdeas", () => {
  beforeEach(() => getMe.mockReset());

  it("shows the aggressive list with its subtitle", async () => {
    getMe.mockResolvedValue({ riskProfile: "agresivo" });
    expect(await renderIdeas()).toEqual(["NVDA", "TSLA", "AMD", "META"]);
    expect(screen.getByRole("heading", { level: 2, name: "Ideas para tu perfil" })).toBeDefined();
    expect(
      screen.getByText("Selección de ejemplo según tu perfil Agresivo. No es recomendación de inversión."),
    ).toBeDefined();
  });

  it("shows the conservative list", async () => {
    getMe.mockResolvedValue({ riskProfile: "conservador" });
    expect(await renderIdeas()).toEqual(["KO", "JNJ", "PG", "VTI"]);
  });

  it("uses the moderate list without a profile", async () => {
    getMe.mockResolvedValue({ riskProfile: null });
    expect(await renderIdeas()).toEqual(["AAPL", "MSFT", "V", "QQQ"]);
    expect(screen.getByText(NO_PROFILE)).toBeDefined();
  });

  it("uses the moderate list when /me fails, without an error", async () => {
    getMe.mockResolvedValue(null);
    expect(await renderIdeas()).toEqual(["AAPL", "MSFT", "V", "QQQ"]);
    expect(screen.getByText(NO_PROFILE)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
