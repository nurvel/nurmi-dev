import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";

describe("approved one-page About page semantics", () => {
  beforeEach(() => render(<ThemeProvider theme={theme}><About /></ThemeProvider>));
  it("shows the contact prompt without a divider above it", () => {
    const contact = screen.getByRole("region", { name: "Contact" });
    expect(within(contact).getByRole("heading", { level: 2 })).toHaveTextContent("Got a product or platform");
    const classes = Array.from(contact.classList);
    const rules = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules, rule => rule.cssText));
    expect(rules.some(rule => classes.some(name => rule.includes(`.${name}`)) && rule.includes("border-top"))).toBe(false);
  });
  it("has a single hero heading and About/Recent work section headings", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Recent work" })).toBeInTheDocument();
  });
  it("preserves the approved profile, role, project and contact copy", () => {
    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("15+ years connecting business goals with technology. Working with software systems from problem framing to production.")).toBeInTheDocument();
    expect(screen.getByText("I work across SaaS platforms, private-sector digital services, and public-sector systems in technical, product, and leadership roles.")).toBeInTheDocument();
    for (const role of ["Technical Product Owner", "Full-Stack Developer", "Head of R&D", "Performance Marketer"]) expect(screen.getAllByText(role).length).toBeGreaterThan(0);
    for (const title of ["Contract monitoring system", "Configuration UI", "SaaS marketplace", "Website & SEO"]) expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
  });
  it("adds an abstract logistics card with the supplied attribution and role", () => {
    expect(screen.getAllByRole("article")).toHaveLength(5);
    const card = screen.getByRole("heading", { level: 3, name: "Logistics visibility platform" }).closest("article")!;
    expect(within(card).getByText("VR LOGISTICS - VIA NITOR")).toBeInTheDocument();
    expect(within(card).getByText("Real-time map-based shipment tracking, schedules, and reporting, available 24/7 on mobile, help streamline and automate logistics operations.")).toBeInTheDocument();
    expect(card.lastElementChild!.firstElementChild).toBe(within(card).getByText("Full-Stack Developer"));
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });
  it("ends each work card with one separate pill per role", () => {
    const expected: Array<[string, string[]]> = [
      ["Logistics visibility platform", ["Full-Stack Developer"]],
      ["Contract monitoring system", ["Technical Product Owner"]],
      ["Configuration UI", ["Full-Stack Developer"]],
      ["SaaS marketplace", ["Head of R&D"]],
      ["Website & SEO", ["Performance Marketer", "Full-Stack Developer"]],
    ];
    for (const [title, roles] of expected) {
      const card = screen.getByRole("heading", { level: 3, name: title }).closest("article")!;
      const pills = [...card.lastElementChild!.children];
      expect(pills.map(pill => pill.textContent)).toEqual(roles);
      expect(pills.every(pill => pill.tagName === "SPAN")).toBe(true);
    }
    const khh = screen.getByRole("heading", { name: "Website & SEO" }).closest("article")!;
    expect(within(khh).queryByText("Performance Marketer & Full-Stack Developer")).not.toBeInTheDocument();
  });
});
