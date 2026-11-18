import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmitRiskProfileResult } from "@/lib/risk/actions";
import { RISK_PROFILES, RISK_QUESTIONS } from "@/lib/risk/questions";

const submitRiskProfile = vi.fn<(answers: number[]) => Promise<SubmitRiskProfileResult>>();
vi.mock("@/lib/risk/actions", () => ({ submitRiskProfile }));

const { RiskQuestionnaire } = await import("./RiskQuestionnaire");

const next = () => screen.getByRole<HTMLButtonElement>("button", { name: /Siguiente|Ver mi perfil|Calculando/ });
const back = () => screen.getByRole<HTMLButtonElement>("button", { name: "Atrás" });
const option = (q: number, k: number) => screen.getByLabelText<HTMLInputElement>(RISK_QUESTIONS[q].options[k]);

/** Answers every question with option 1 (sums to 6) and stays on question 6. */
function answerAll() {
  for (let i = 0; i < 6; i++) {
    fireEvent.click(option(i, 0));
    if (i < 5) fireEvent.click(next());
  }
}

describe("RiskQuestionnaire", () => {
  beforeEach(() => submitRiskProfile.mockReset());

  it("starts on question 1 with progress, 4 radios and both buttons disabled, without stealing focus", () => {
    render(<RiskQuestionnaire />);
    expect(screen.getByText("Pregunta 1 de 6")).toBeDefined();
    const progress = screen.getByRole("progressbar", { name: "Progreso del cuestionario" });
    expect(progress.getAttribute("value")).toBe("1");
    expect(progress.getAttribute("max")).toBe("6");
    expect(screen.getByRole("heading", { level: 2, name: RISK_QUESTIONS[0].title })).toBeDefined();
    const radios = screen.getAllByRole<HTMLInputElement>("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual([...RISK_QUESTIONS[0].options]);
    expect(radios.map((r) => r.value)).toEqual(["1", "2", "3", "4"]);
    expect(back().disabled).toBe(true);
    expect(next().disabled).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it("enables Siguiente after choosing, moves focus to the new heading and keeps answers when going back", () => {
    render(<RiskQuestionnaire />);
    fireEvent.click(option(0, 2));
    expect(next().disabled).toBe(false);
    fireEvent.click(next());
    expect(screen.getByText("Pregunta 2 de 6")).toBeDefined();
    expect(next().disabled).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: RISK_QUESTIONS[1].title }));
    fireEvent.click(back());
    expect(option(0, 2).checked).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: RISK_QUESTIONS[0].title }));
  });

  it("submits the 6 answers in order and shows what the server returned", async () => {
    let resolve!: (r: SubmitRiskProfileResult) => void;
    submitRiskProfile.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<RiskQuestionnaire />);
    answerAll();
    expect(next().textContent).toBe("Ver mi perfil");
    await act(async () => fireEvent.click(next()));
    expect(submitRiskProfile).toHaveBeenCalledWith([1, 1, 1, 1, 1, 1]);
    expect(next().textContent).toBe("Calculando…");
    expect(next().disabled).toBe(true);

    // The answers sum to 6: the screen must still show the server result, not a local calculation.
    await act(async () => resolve({ ok: true, riskScore: 21, riskProfile: "agresivo" }));
    const heading = screen.getByRole("heading", { level: 2, name: "Tu perfil es Agresivo" });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText("Puntaje: 21 de 24")).toBeDefined();
    expect(screen.getByText(RISK_PROFILES.agresivo.description)).toBeDefined();
    expect(screen.getByText("Este perfil es orientativo y no es una recomendación de inversión.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a la app" }).getAttribute("href")).toBe("/");
  });

  it("shows the error, stays on question 6 with the answer and lets the user retry", async () => {
    submitRiskProfile.mockResolvedValueOnce({ ok: false, error: "No se pudo conectar con el servidor." });
    render(<RiskQuestionnaire />);
    answerAll();
    await act(async () => fireEvent.click(next()));
    expect(screen.getByRole("alert").textContent).toBe("No se pudo conectar con el servidor.");
    expect(screen.getByText("Pregunta 6 de 6")).toBeDefined();
    expect(option(5, 0).checked).toBe(true);

    submitRiskProfile.mockResolvedValueOnce({ ok: true, riskScore: 6, riskProfile: "conservador" });
    await act(async () => fireEvent.click(next()));
    expect(submitRiskProfile).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Tu perfil es Conservador" })).toBeDefined();
  });
});
