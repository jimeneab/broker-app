import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Trend, changeTone } from "./Trend";

describe("Trend", () => {
  it("points up with an accessible label", () => {
    const { container } = render(<Trend up />);
    expect(container.querySelector("svg")?.getAttribute("class")).not.toContain("rotate-180");
    expect(screen.getByText("Sube").className).toContain("sr-only");
  });

  it("points down with an accessible label", () => {
    const { container } = render(<Trend up={false} />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("rotate-180");
    expect(screen.getByText("Baja").className).toContain("sr-only");
  });
});

describe("changeTone", () => {
  it("maps the sign of the change to a color token", () => {
    expect(changeTone(2.31)).toBe("text-up");
    expect(changeTone(-1.05)).toBe("text-down");
    expect(changeTone(0)).toBe("text-muted");
    expect(changeTone(null)).toBe("text-muted");
  });
});
