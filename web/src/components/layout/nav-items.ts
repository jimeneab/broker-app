export type NavItem = {
  href: string;
  label: string;
  /** SVG path data, drawn on a 24x24 grid with a 1.5 stroke. */
  icon: string;
  /** Each feature flips its item to true when it ships. */
  available: boolean;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z", available: true },
  { href: "/search", label: "Buscar", icon: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9.5 2.5-4.5-4.5", available: false },
  {
    href: "/favorites",
    label: "Favoritos",
    icon: "m12 3.5 2.6 5.3 5.9.8-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.8z",
    available: false,
  },
  { href: "/news", label: "Noticias", icon: "M4 5h12v14.5H6A2 2 0 0 1 4 17.5zm12 4h4v8.5a2 2 0 0 1-4 0M7.5 9h5m-5 3.5h5m-5 3.5h3", available: false },
  { href: "/simulator", label: "Simulador", icon: "m3.5 16.5 5.5-5.5 4 4 7.5-7.5M15 7.5h5.5V13", available: false },
  { href: "/portfolio", label: "Cartera", icon: "M12 3.5V12h8.5A8.5 8.5 0 1 1 12 3.5zm3 0a8.5 8.5 0 0 1 5.5 5.5H15z", available: false },
  { href: "/financial-freedom", label: "Libertad financiera", icon: "M5.5 20.5v-17m0 1h12l-2.5 4 2.5 4h-12", available: false },
  { href: "/learning", label: "Learning", icon: "M4 5.5A2 2 0 0 1 6 3.5h13.5v15H6a2 2 0 0 0-2 2zm0 15v-15m15.5 13v2.5H6", available: false },
];

/** Exact match for "/", prefix match (by segment) for the rest. */
export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
