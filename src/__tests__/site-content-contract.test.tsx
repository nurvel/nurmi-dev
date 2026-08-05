import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";

/**
 * Typed / data-driven contract test for siteContent module.
 * Verifies that aboutSiteContent exports the expected typed shape
 * and that the About page renders correctly when driven by it.
 */
describe("siteContent typed contract", () => {
  let siteContent: any;

  beforeEach(async () => {
    // Dynamic import so this test fails if the module doesn't exist yet
    siteContent = await import("../data/siteContent");
  });

  describe("aboutSiteContent shape", () => {
    it("exports aboutSiteContent with profile, roles, focus, recentWork, contacts", () => {
      expect(siteContent.aboutSiteContent).toBeDefined();
      const { aboutSiteContent } = siteContent;

      // Profile fields
      expect(aboutSiteContent.profile.name).toBe("Veli-Pekka Nurmi");
      expect(aboutSiteContent.profile.subtitle).toBe(
        "I work with software systems from problem framing to production."
      );
      expect(aboutSiteContent.profile.avatarAlt).toBe("Veli-Pekka Nurmi");

      // Roles — exactly four
      expect(aboutSiteContent.roles).toEqual([
        "Technical Product Owner",
        "Full-Stack Developer",
        "Head of R&D",
        "Performance Marketer",
      ]);

      // Focus
      expect(aboutSiteContent.focus.title).toBe("Current focus");
      expect(aboutSiteContent.focus.highlights).toEqual([
        "agentic coding",
        "spec-driven development",
      ]);
      expect(aboutSiteContent.focus.linkLabel).toBe("Nitor");
      expect(aboutSiteContent.focus.linkHref).toBe("https://nitor.com/en");

      // Recent work — exactly four items with correct highlights
      expect(aboutSiteContent.recentWork.length).toBe(4);
      expect(aboutSiteContent.recentWork[0].highlight).toBe(
        "Contract monitoring system"
      );
      expect(aboutSiteContent.recentWork[1].highlight).toBe(
        "Configuration UI"
      );
      expect(aboutSiteContent.recentWork[2].highlight).toBe(
        "SaaS marketplace"
      );
      expect(aboutSiteContent.recentWork[3].highlight).toBe("Website & SEO");

      // Contacts — exactly three
      expect(aboutSiteContent.contacts.length).toBe(3);
      expect(aboutSiteContent.contacts[0]).toEqual({
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/veli-pekkanurmi",
      });
      expect(aboutSiteContent.contacts[1]).toEqual({
        label: "Github",
        href: "https://github.com/nurvel",
      });
      expect(aboutSiteContent.contacts[2]).toEqual({
        label: "Email",
        href: "mailto:nurmi.vp@gmail.com",
      });
    });
  });

  describe("About page driven by siteContent", () => {
    beforeEach(async () => {
      // Import About after the module is loaded — it should consume siteContent
      const { default: About } = await import("../pages/About");
      render(
        <ThemeProvider theme={theme}>
          <About />
        </ThemeProvider>
      );
    });

    it("renders profile name from siteContent", () => {
      expect(screen.getByText("Veli-Pekka Nurmi")).toBeInTheDocument();
    });

    it("renders subtitle from siteContent", () => {
      expect(
        screen.getByText(
          "I work with software systems from problem framing to production."
        )
      ).toBeInTheDocument();
    });

    it("renders all four role pills from siteContent data", () => {
      for (const role of siteContent.aboutSiteContent.roles) {
        expect(screen.getByText(role)).toBeInTheDocument();
      }
    });

    it("renders focus highlights from siteContent", () => {
      expect(screen.getByText(/agentic coding/)).toBeInTheDocument();
      expect(
        screen.getByText(/spec-driven development/)
      ).toBeInTheDocument();
    });

    it("renders all recent work highlights from siteContent", () => {
      for (const item of siteContent.aboutSiteContent.recentWork) {
        const paras = document.querySelectorAll("p");
        const found = Array.from(paras).find((p: Element) =>
          p.textContent?.includes(item.highlight)
        );
        expect(found).toBeTruthy();
      }
    });

    it("renders all contact links from siteContent", () => {
      for (const c of siteContent.aboutSiteContent.contacts) {
        expect(screen.getByText(c.label)).toBeInTheDocument();
      }
    });
  });
});
