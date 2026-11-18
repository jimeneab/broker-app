import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileNavToggle } from "./MobileNavToggle";

function setup() {
  render(
    <>
      <MobileNavToggle controls="nav" />
      <aside id="nav">
        <a href="#home">Home</a>
      </aside>
    </>,
  );
  return { button: screen.getByRole("button"), sidebar: document.getElementById("nav")! };
}

describe("MobileNavToggle", () => {
  it("toggles aria-expanded and the sidebar's data-open", () => {
    const { button, sidebar } = setup();
    expect(button.getAttribute("aria-controls")).toBe("nav");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(sidebar.hasAttribute("data-open")).toBe(true);

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.hasAttribute("data-open")).toBe(false);
  });

  it("closes with Escape and returns focus to the button", () => {
    const { button } = setup();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("closes when tapping outside (scrim)", () => {
    const { button } = setup();
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId("nav-scrim"));
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when navigating from the panel", () => {
    const { button } = setup();
    fireEvent.click(button);
    fireEvent.click(screen.getByText("Home"));
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
