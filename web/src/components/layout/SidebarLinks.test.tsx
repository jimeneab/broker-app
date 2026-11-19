import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { navItems } from "./nav-items";
import { SidebarLinks } from "./SidebarLinks";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

function renderAt(path: string) {
  pathname.current = path;
  return render(<SidebarLinks />);
}

function currentLinks() {
  return screen.queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
}

describe("SidebarLinks", () => {
  it("renders the 8 sections: available ones as links, the rest disabled with 'Próximamente'", () => {
    renderAt("/");
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    for (const item of navItems) {
      if (item.available) {
        expect(screen.getByRole("link", { name: item.label })).toHaveProperty("pathname", item.href);
      } else {
        const disabled = screen.getByText(item.label).closest("[aria-disabled]") as HTMLElement;
        expect(disabled.getAttribute("aria-disabled")).toBe("true");
        expect(disabled.closest("a")).toBeNull();
        expect(within(disabled).getByText("Próximamente")).toBeDefined();
      }
    }
  });

  it("since F03 Home and Buscar are available", () => {
    expect(navItems.filter((item) => item.available).map((item) => item.href)).toEqual(["/", "/search"]);
  });

  it("marks Buscar as current on /search", () => {
    renderAt("/search");
    expect(screen.getByRole("link", { name: "Buscar" })).toHaveProperty("pathname", "/search");
    expect(currentLinks().map((link) => link.textContent)).toEqual(["Buscar"]);
  });

  it("marks Home as current only on '/' exactly", () => {
    renderAt("/");
    expect(currentLinks().map((link) => link.textContent)).toEqual(["Home"]);
  });

  it("marks nothing for routes outside the sidebar", () => {
    renderAt("/stocks/AAPL");
    expect(currentLinks()).toEqual([]);
  });

  it.each(["/news", "/news/x"])("matches sections by prefix (%s)", (path) => {
    // Pretend Noticias shipped so it renders as a link.
    const news = navItems.find((item) => item.href === "/news")!;
    news.available = true;
    try {
      renderAt(path);
      expect(currentLinks().map((link) => link.textContent)).toEqual(["Noticias"]);
    } finally {
      news.available = false;
    }
  });

  it("does not treat /newsletter as /news", () => {
    const news = navItems.find((item) => item.href === "/news")!;
    news.available = true;
    try {
      renderAt("/newsletter");
      expect(currentLinks()).toEqual([]);
    } finally {
      news.available = false;
    }
  });
});
