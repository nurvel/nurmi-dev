import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";

/**
 * Accessibility and security tests for the About page (task C).
 * - Current focus section is a <section> with an accessible heading
 * - Recent work section is a <section> with an accessible heading
 * - Contact links are wrapped in a <nav aria-label="..."> landmark
 * - All HTTP(S) target="_blank" links have rel="noopener noreferrer"
 * - Mailto links remain plain (no target/rel override)
 */

describe("About page accessibility and link security", () => {
  beforeEach(() => {
    render(
      <ThemeProvider theme={theme}>
        <About />
      </ThemeProvider>
    );
  });

  describe("Semantic sections", () => {
    it('renders "Current focus" inside a <section> element', () => {
      const heading = screen.getByText("Current focus");
      expect(heading).toBeInTheDocument();
      expect(heading.closest("section")).toBeTruthy();
    });

    it('renders "Recent work" inside a <section> element', () => {
      const heading = screen.getByText("Recent work");
      expect(heading).toBeInTheDocument();
      expect(heading.closest("section")).toBeTruthy();
    });

    it("has at least two <section> elements in the About page", () => {
      const sections = document.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Contact navigation landmark", () => {
    it('renders contact links inside a <nav aria-label="..."> element', () => {
      const nav = document.querySelector(
        'nav[aria-label]',
      ) as HTMLDivElement | null;

      expect(nav).toBeTruthy();
    });

    it("contact nav has an aria-label for screen readers", () => {
      const navEl = document.querySelector('nav[aria-label]');
      expect(navEl?.getAttribute("aria-label")).toBeTruthy();
      expect(
        (navEl?.getAttribute("aria-label") ?? "").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Secure links — rel on target=_blank", () => {
    it('gives Nitor link rel="noopener noreferrer"', () => {
      const nitorLink = screen.getByRole("link", { name: /Nitor/ });
      expect(nitorLink).toHaveAttribute("target", "_blank");
      expect(nitorLink).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    });

    it('gives Kauneushoitola Hanna link rel="noopener noreferrer"', () => {
      const websiteLink = screen.getByRole("link", {
        name: /Kauneushoitola Hanna/,
      });
      expect(websiteLink).toHaveAttribute("target", "_blank");
      expect(websiteLink).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    });

    it('gives LinkedIn contact link rel="noopener noreferrer"', () => {
      const linkedin = screen.getByRole("link", { name: "LinkedIn" });
      expect(linkedin).toHaveAttribute("target", "_blank");
      expect(linkedin).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    });

    it('gives Github contact link rel="noopener noreferrer"', () => {
      const github = screen.getByRole("link", { name: "Github" });
      expect(github).toHaveAttribute("target", "_blank");
      expect(github).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    });

    it('does NOT set target/rel on mailto links', () => {
      const email = screen.getByRole("link", { name: "Email" });
      expect(email).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
      expect(email.getAttribute("target")).toBeNull();
      expect(email.getAttribute("rel")).toBeNull();
    });
  });
});
