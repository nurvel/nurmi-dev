import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import theme from "../common/theme";
import About from "../pages/About";
import { aboutSiteContent } from "../data/siteContent";

describe("approved one-page profile content", () => {
  beforeEach(() => render(<ThemeProvider theme={theme}><About /></ThemeProvider>));
  it("renders the new hero and about structure from typed content", () => {
    expect(screen.getByRole("heading", { level: 1, name: "Veli-Pekka Nurmi" })).toBeInTheDocument();
    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText(aboutSiteContent.profile.subtitle)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "About" })).toBeInTheDocument();
  });
  it("renders five titled work cards and preserves the client destination", () => {
    const section = screen.getByRole("heading", { level: 2, name: "Recent work" }).closest("section");
    expect(section).toBeTruthy();
    expect(within(section as HTMLElement).getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Created and optimised/ })).toHaveAttribute("href", "https://kauneushoitolahanna.fi");
  });
  it("exposes contact links with accessible labels and safe external targets", () => {
    const nav = screen.getByRole("navigation", { name: "Contact links" });
    expect(within(nav).getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:nurmi.vp@gmail.com");
    for (const label of ["LinkedIn", "GitHub"]) expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(nav).queryByText(/@/)).not.toBeInTheDocument();
  });
  it("retains exact source-backed prose, emphasis and client/card pairing", () => {
    const about = screen.getByRole("region", { name: "About" });
    const paragraphs = about.querySelectorAll("p");
    expect(paragraphs).toHaveLength(aboutSiteContent.about.length);
    aboutSiteContent.about.forEach((parts, index) => {
      expect(paragraphs[index].textContent).toBe(parts.map(part => part.text).join(""));
    });
    for (const phrase of ["agentic coding", "spec-driven development"]) {
      expect(screen.getByText(phrase).tagName).toBe("STRONG");
    }
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    aboutSiteContent.recentWork.forEach((item, index) => {
      expect(cards[index]).toHaveTextContent(item.client);
      expect(within(cards[index]).getByRole("heading", { level: 3 })).toHaveTextContent(item.title);
      expect(cards[index]).toHaveTextContent(item.description);
      expect([...cards[index].lastElementChild!.children].map(pill => pill.textContent)).toEqual(item.roles);
    });
    expect(document.body.textContent).toContain('#1 ranking for “Kosmetologi Järvenpää”');
    expect(document.body.textContent).not.toMatch(/Built with care|Available for select work/);
  });
  it("uses one page heading and semantic section headings", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByAltText("Veli-Pekka Nurmi portrait")).toHaveAttribute("src", "/portrait-cutout.png");
  });
});
