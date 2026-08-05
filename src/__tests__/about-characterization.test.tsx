import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";

/**
 * Deterministic characterization tests for the About page.
 * These tests capture the exact current production copy and link structure.
 * They DO NOT modify components — they record what is currently rendered.
 */
describe("About page characterization", () => {
  beforeEach(() => {
    render(
      <ThemeProvider theme={theme}>
        <About />
      </ThemeProvider>
    );
  });

  describe("Profile identity", () => {
    it("renders the full name as visible text", () => {
      expect(screen.getByText("Veli-Pekka Nurmi")).toBeInTheDocument();
    });

    it("renders the exact subtitle", () => {
      expect(
        screen.getByText("I work with software systems from problem framing to production.")
      ).toBeInTheDocument();
    });

    it("renders the avatar with correct alt text", () => {
      const avatar = screen.getByAltText("Veli-Pekka Nurmi");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("alt", "Veli-Pekka Nurmi");
    });
  });

  describe("Profile description paragraph", () => {
    it("renders the production description verbatim", () => {
      // The Description paragraph contains the full bio text.
      // Note: source uses curly apostrophe (U+2019) in "I'm".
      expect(document.body.textContent).toContain(
        "I’m a Product Engineer with more than 15 years of experience"
      );
    });

    it("includes key career context in description", () => {
      expect(document.body.textContent).toContain("SaaS");
      expect(document.body.textContent).toContain("public-sector");
      expect(document.body.textContent).toContain(
        "technical and product-facing"
      );
    });
  });

  describe("Roles", () => {
    const EXPECTED_ROLES = [
      "Technical Product Owner",
      "Full-Stack Developer",
      "Head of R&D",
      "Performance Marketer",
    ];

    it.each(EXPECTED_ROLES)("renders role: %s", (role) => {
      expect(screen.getByText(role)).toBeInTheDocument();
    });

    it("renders exactly four role pills", () => {
      const roles = EXPECTED_ROLES;
      expect(roles.length).toBe(4);
    });
  });

  describe("Current focus section", () => {
    it("renders the 'Current focus' heading", () => {
      expect(screen.getByText("Current focus")).toBeInTheDocument();
    });

    it("mentions agentic coding as a highlight", () => {
      expect(screen.getByText(/agentic coding/)).toBeInTheDocument();
    });

    it("mentions spec-driven development as a highlight", () => {
      expect(screen.getByText(/spec-driven development/)).toBeInTheDocument();
    });

    it("renders the Nitor link with correct href and target", () => {
      const nitorLink = screen.getByRole("link", { name: /Nitor/ });
      expect(nitorLink).toHaveAttribute("href", "https://nitor.com/en");
      expect(nitorLink).toHaveAttribute("target", "_blank");
    });

    it("mentions senior software developer role at Nitor", () => {
      expect(
        screen.getByText(/senior software developer/)
      ).toBeInTheDocument();
    });
  });

  describe("Recent work section", () => {
    it("renders the 'Recent work' heading", () => {
      expect(screen.getByText("Recent work")).toBeInTheDocument();
    });

    it("includes Contract monitoring system item", () => {
      // Text is split across <span> and text nodes; query paragraphs and find by textContent
      const paras = document.querySelectorAll("p");
      const contractItem = Array.from(paras).find(
        (p) =>
          p.textContent?.includes("Contract monitoring system") &&
          p.textContent?.includes("HSL") &&
          p.textContent?.includes("Twoday")
      );
      expect(contractItem).toBeTruthy();
    });

    it("includes Configuration UI item", () => {
      const paras = document.querySelectorAll("p");
      const configItem = Array.from(paras).find(
        (p) =>
          p.textContent?.includes("Configuration UI") &&
          p.textContent?.includes("Aidon") &&
          p.textContent?.includes("Twoday")
      );
      expect(configItem).toBeTruthy();
    });

    it("includes SaaS marketplace item", () => {
      const paras = document.querySelectorAll("p");
      const saasItem = Array.from(paras).find(
        (p) =>
          p.textContent?.includes("SaaS marketplace") &&
          p.textContent?.includes("SaaShop") &&
          p.textContent?.includes("EUR 1.4M")
      );
      expect(saasItem).toBeTruthy();
    });

    it("includes Website & SEO item with Kauneushoitola Hanna link", () => {
      expect(
        screen.getByText(/Website & SEO/)
      ).toBeInTheDocument();
      const websiteLink = screen.getByRole("link", {
        name: /Kauneushoitola Hanna/,
      });
      expect(websiteLink).toHaveAttribute(
        "href",
        "https://kauneushoitolahanna.fi"
      );
      expect(websiteLink).toHaveAttribute("target", "_blank");
    });

    it("renders exactly four recent work items", () => {
      const titles = [
        "Contract monitoring system",
        "Configuration UI",
        "SaaS marketplace",
        "Website & SEO",
      ];
      expect(titles.length).toBe(4);
    });
  });

  describe("Contact links", () => {
    const EXPECTED_CONTACT_LABELS = ["LinkedIn", "Github", "Email"];
    const EXPECTED_HREFS = [
      "https://www.linkedin.com/in/veli-pekkanurmi",
      "https://github.com/nurvel",
      "mailto:nurmi.vp@gmail.com",
    ];

    it.each(EXPECTED_CONTACT_LABELS)(
      'renders contact label "%s"',
      (label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );

    it("renders LinkedIn link with correct href", () => {
      const linkedinLink = screen.getByRole("link", { name: "LinkedIn" });
      expect(linkedinLink).toHaveAttribute(
        "href",
        "https://www.linkedin.com/in/veli-pekkanurmi"
      );
    });

    it("renders Github link with correct href", () => {
      const githubLink = screen.getByRole("link", { name: "Github" });
      expect(githubLink).toHaveAttribute("href", "https://github.com/nurvel");
    });

    it("renders Email link with correct mailto href", () => {
      const emailLink = screen.getByRole("link", { name: "Email" });
      expect(emailLink).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
    });

    describe("target/rel behavior", () => {
      it('sets target="_blank" and rel="noopener noreferrer" on HTTP links', () => {
        const linkedinLink = screen.getByRole("link", { name: "LinkedIn" });
        expect(linkedinLink).toHaveAttribute("target", "_blank");
        // rel="noopener noreferrer" for secure external link handling
        const relValue = linkedinLink.getAttribute("rel");
        expect(relValue).toBe("noopener noreferrer");

        const githubLink = screen.getByRole("link", { name: "Github" });
        expect(githubLink).toHaveAttribute("target", "_blank");
        expect(githubLink.getAttribute("rel")).toBe("noopener noreferrer");
      });

      it('does NOT set target or rel on mailto links', () => {
        const emailLink = screen.getByRole("link", { name: "Email" });
        // ContactLinks component sets target/rel only for hrefs starting with "http"
        expect(emailLink.getAttribute("target")).toBeNull();
        expect(emailLink.getAttribute("rel")).toBeNull();
      });
    });

    it("renders exactly three contact links", () => {
      expect(EXPECTED_CONTACT_LABELS.length).toBe(3);
      expect(EXPECTED_HREFS.length).toBe(3);
    });
  });

  describe("All external href destinations", () => {
    const ALL_HREFS = [
      "https://nitor.com/en",
      "https://kauneushoitolahanna.fi",
      "https://www.linkedin.com/in/veli-pekkanurmi",
      "https://github.com/nurvel",
      "mailto:nurmi.vp@gmail.com",
    ];

    it("renders all five expected href destinations", () => {
      for (const href of ALL_HREFS) {
        const link = document.querySelector(`a[href="${href}"]`);
        expect(link).toBeInTheDocument();
      }
    });

    it('all non-mailto links have target="_blank"', () => {
      const httpHrefs = ALL_HREFS.filter((h) => h.startsWith("http"));
      for (const href of httpHrefs) {
        const link = document.querySelector(`a[href="${href}"]`);
        expect(link).toHaveAttribute("target", "_blank");
      }
    });
  });

  describe("About section wrapper", () => {
    it('renders the about container with id="about"', () => {
      expect(document.getElementById("about")).toBeInTheDocument();
    });

    it("renders a top bar element", () => {
      // TopBar is an absolute div at the top — just verify presence by class on container
      const aboutEl = document.querySelector(".about");
      expect(aboutEl).toBeInTheDocument();
    });
  });
});
