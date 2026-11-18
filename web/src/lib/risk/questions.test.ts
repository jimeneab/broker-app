import { describe, expect, it } from "vitest";
import { RISK_DISCLAIMER, RISK_PROFILES, RISK_QUESTIONS } from "./questions";

describe("risk questionnaire copy", () => {
  it("has 6 questions, each with a title and 4 non-empty options", () => {
    expect(RISK_QUESTIONS).toHaveLength(6);
    for (const q of RISK_QUESTIONS) {
      expect(q.title).not.toBe("");
      expect(q.options).toHaveLength(4);
      q.options.forEach((o) => expect(o).not.toBe(""));
    }
  });

  it("has the 3 profiles with label and description, and the disclaimer", () => {
    expect(Object.keys(RISK_PROFILES)).toEqual(["conservador", "moderado", "agresivo"]);
    expect(RISK_PROFILES.moderado.label).toBe("Moderado");
    Object.values(RISK_PROFILES).forEach((p) => expect(p.description).not.toBe(""));
    expect(RISK_DISCLAIMER).toBe("Este perfil es orientativo y no es una recomendación de inversión.");
  });
});
